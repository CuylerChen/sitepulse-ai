package audit

import (
	"context"
	"strings"
	"time"

	"sitepulse.ai/api/internal/aireport"
	"sitepulse.ai/api/internal/checks"
	"sitepulse.ai/api/internal/crawler"
	"sitepulse.ai/api/internal/models"
	"sitepulse.ai/api/internal/pagespeed"
	"sitepulse.ai/api/internal/score"
	"sitepulse.ai/api/internal/urlguard"
)

type Options struct {
	Fetcher   *crawler.Fetcher
	PageSpeed *pagespeed.Client
	AI        aireport.Generator
	Progress  func(string)
	IncludePerformance bool
}

type Result struct {
	RequestedURL string
	FinalURL     string
	Domain       string
	Platform     string
	Checks       []models.Check
	Scores       models.Scores
	Performance  *models.PerformanceReport
	AIReport     models.AIReport
	AIMeta       models.AIMeta
	Page         *crawler.Page
}

func Execute(ctx context.Context, raw string, opts Options) (*Result, error) {
	progress(opts, "validating")
	if opts.Fetcher == nil {
		opts.Fetcher = &crawler.Fetcher{}
	}
	validated, err := urlguard.Validate(ctx, raw, opts.Fetcher.Resolver)
	if err != nil {
		return nil, err
	}
	progress(opts, "fetching")
	fetchCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	pageRes, err := opts.Fetcher.Fetch(fetchCtx, validated.URL.String(), crawler.MaxBodyBytes)
	cancel()
	if err != nil {
		return nil, err
	}
	if pageRes.FinalURL == nil {
		return nil, urlguard.ErrInvalidURL
	}
	if _, err := urlguard.Validate(ctx, pageRes.FinalURL.String(), opts.Fetcher.Resolver); err != nil {
		return nil, err
	}
	ct := strings.ToLower(pageRes.ContentType)
	body := pageRes.Body
	if len(body) > crawler.MaxHTMLParse {
		body = body[:crawler.MaxHTMLParse]
	}
	if ct != "" && !strings.Contains(ct, "html") && !strings.Contains(ct, "xml") && !looksLikeHTML(body) {
		return nil, errNotHTML
	}
	page := crawler.ParseHTML(pageRes.FinalURL, body)
	origin := pageRes.FinalURL.Scheme + "://" + pageRes.FinalURL.Host
	robotsState := "ok"
	var robots crawler.Robots
	robotsRes, robotsErr := opts.Fetcher.Fetch(ctx, origin+"/robots.txt", crawler.MaxRobots)
	if robotsErr != nil {
		robotsState = "error"
	} else if robotsRes.Status == 404 {
		robotsState = "missing"
	} else if robotsRes.Status >= 400 {
		robotsState = "error"
	} else {
		robots = crawler.ParseRobots(string(robotsRes.Body))
	}
	sitemapOK := false
	sitemapURL := ""
	candidates := append([]string{}, robots.Sitemaps...)
	candidates = append(candidates, origin+"/sitemap.xml")
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		checked, err := urlguard.Validate(ctx, candidate, opts.Fetcher.Resolver)
		if err != nil || !urlguard.SameHost(checked.Host, pageRes.FinalURL.Hostname()) {
			continue
		}
		sm, err := opts.Fetcher.Fetch(ctx, checked.URL.String(), crawler.MaxSitemap)
		if err != nil || sm.Status >= 400 {
			continue
		}
		text := strings.ToLower(string(sm.Body))
		if strings.Contains(text, "<urlset") || strings.Contains(text, "<sitemapindex") {
			sitemapOK = true
			sitemapURL = checked.URL.Host
			break
		}
	}
	progress(opts, "analyzing")
	seoChecks := checks.SEO(checks.SEOInput{
		Page: page, FinalURL: pageRes.FinalURL, Status: pageRes.Status, Redirects: pageRes.Redirects,
		Robots: robots, RobotsState: robotsState, XRobots: crawler.SafeHeader(pageRes.Headers, "X-Robots-Tag"),
		SitemapOK: sitemapOK, SitemapURL: sitemapURL,
	})
	aiChecks := checks.AIReadiness(checks.AIInput{Page: page, Robots: robots, RobotsState: robotsState, Indexable: checks.Indexable(seoChecks)})
	contentChecks := checks.Content(page)
	shopifyChecks := checks.Shopify(page, pageRes.FinalURL)
	perf := &models.PerformanceReport{Available: false, Reason: "PageSpeed Insights was not requested for this scan."}
	var perfChecks []models.Check
	if opts.IncludePerformance {
		progress(opts, "performance")
		perf = runPageSpeed(ctx, opts.PageSpeed, pageRes.FinalURL.String())
		if pageRes.TTFB > 0 {
			ms := int(pageRes.TTFB / time.Millisecond)
			perf.OriginTTFBMs = &ms
		}
		perfChecks = checks.Performance(perf)
	}
	all := append([]models.Check{}, seoChecks...)
	all = append(all, aiChecks...)
	all = append(all, contentChecks...)
	all = append(all, shopifyChecks...)
	all = append(all, perfChecks...)
	scores := score.Compute(all, perf.Available)
	progress(opts, "insights")
	aiCtx, aiCancel := context.WithTimeout(ctx, 20*time.Second)
	report, meta := opts.AI.Enhance(aiCtx, pageRes.FinalURL.String(), all)
	aiCancel()
	platform := "custom"
	if page.Shopify {
		platform = "shopify"
	}
	return &Result{
		RequestedURL: validated.URL.String(),
		FinalURL:     stripQuery(pageRes.FinalURL.String()),
		Domain:       pageRes.FinalURL.Hostname(),
		Platform:     platform,
		Checks:       all,
		Scores:       scores,
		Performance:  perf,
		AIReport:     report,
		AIMeta:       meta,
		Page:         page,
	}, nil
}

func runPageSpeed(ctx context.Context, client *pagespeed.Client, rawURL string) *models.PerformanceReport {
	out := &models.PerformanceReport{Available: false, Reason: "PageSpeed Insights is not configured. Lab scores are not available for this scan."}
	if client == nil || client.APIKey == "" {
		return out
	}
	type result struct {
		strategy string
		psi      *models.PSIResult
		err      error
	}
	ch := make(chan result, 2)
	for _, strategy := range []string{"mobile", "desktop"} {
		strategy := strategy
		go func() {
			psiCtx, cancel := context.WithTimeout(ctx, 32*time.Second)
			defer cancel()
			psi, err := client.Run(psiCtx, rawURL, strategy)
			ch <- result{strategy, psi, err}
		}()
	}
	var firstErr error
	for i := 0; i < 2; i++ {
		item := <-ch
		if item.err != nil {
			if firstErr == nil {
				firstErr = item.err
			}
			continue
		}
		out.Available = true
		if item.strategy == "mobile" {
			out.Mobile = item.psi
		} else {
			out.Desktop = item.psi
		}
	}
	if !out.Available {
		out.Reason = "PageSpeed Insights did not return a usable result. No performance score was invented."
		if firstErr != nil {
			out.Reason = "PageSpeed Insights did not return a usable result. No performance score was invented."
		}
	}
	return out
}

func progress(opts Options, stage string) {
	if opts.Progress != nil {
		opts.Progress(stage)
	}
}

func looksLikeHTML(body []byte) bool {
	s := strings.ToLower(string(body[:min(len(body), 500)]))
	return strings.Contains(s, "<html") || strings.Contains(s, "<!doctype html") || strings.Contains(s, "<head")
}

func stripQuery(raw string) string {
	if i := strings.Index(raw, "?"); i >= 0 {
		return raw[:i]
	}
	return raw
}

type plainError string

func (e plainError) Error() string { return string(e) }

const errNotHTML plainError = "that URL did not return an HTML page"
