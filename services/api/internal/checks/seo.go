package checks

import (
	"net/url"
	"strconv"
	"strings"

	"sitepulse.ai/api/internal/crawler"
	"sitepulse.ai/api/internal/models"
)

type SEOInput struct {
	Page        *crawler.Page
	FinalURL    *url.URL
	Status      int
	Redirects   []string
	Robots      crawler.Robots
	RobotsState string
	XRobots     string
	SitemapOK   bool
	SitemapURL  string
}

func SEO(in SEOInput) []models.Check {
	page := in.Page
	if page == nil {
		page = &crawler.Page{}
	}
	var out []models.Check
	out = append(out, httpStatus(in.Status))
	out = append(out, httpsCheck(in.FinalURL))
	out = append(out, redirectCheck(in.Redirects))
	out = append(out, titleCheck(page.Title))
	out = append(out, descriptionCheck(page.MetaDescription))
	out = append(out, h1Check(page.H1))
	out = append(out, canonicalCheck(page.Canonical, in.FinalURL))
	out = append(out, indexability(in))
	out = append(out, sitemapCheck(in.SitemapOK, in.SitemapURL))
	out = append(out, altCheck(page.Images))
	out = append(out, openGraph(page.OpenGraph))
	out = append(out, schemaCheck(page))
	out = append(out, viewportCheck(page.Viewport))
	out = append(out, internalLinks(page.Links))
	return out
}

func httpStatus(status int) models.Check {
	c := models.Check{
		Category: "seo", CheckKey: "seo.http_status", MaxScore: 0, Severity: models.SeverityInfo,
		Title: "Homepage responded successfully", Description: "The submitted homepage returned a successful HTTP status.",
		Evidence: map[string]any{"status_code": status}, Recommendation: "Keep the homepage returning HTTP 200.",
		Status: models.StatusPass,
	}
	if status == 0 {
		c.Status = models.StatusUnknown
		c.Severity = models.SeverityHigh
		c.Title = "Homepage status is unknown"
		c.Description = "SitePulse could not record an HTTP status."
		return c
	}
	if status >= 400 {
		c.Status = models.StatusFail
		c.Severity = models.SeverityCritical
		c.Title = "Homepage returned an error status"
		c.Description = "Search and AI crawlers may not be able to use a page that returns an error."
		c.Recommendation = "Open the URL in a private window. If it is a 404, restore the homepage template. If it is a login wall, serve a public homepage at this URL. Crawlers will not pass a password form."
	} else if status >= 300 {
		c.Status = models.StatusWarning
		c.Severity = models.SeverityMedium
		c.Title = "Homepage did not finish on a success status"
	}
	return c
}

func httpsCheck(final *url.URL) models.Check {
	c := models.Check{
		Category: "seo", CheckKey: "seo.https", MaxScore: 10, Score: 10, Status: models.StatusPass, Severity: models.SeverityInfo,
		Title: "HTTPS is enabled", Description: "The final homepage URL uses HTTPS.",
		Recommendation: "Keep the certificate valid and redirect HTTP to HTTPS.",
		Evidence:       map[string]any{},
	}
	if final == nil || final.Scheme != "https" {
		c.Score = 0
		c.Status = models.StatusFail
		c.Severity = models.SeverityHigh
		c.Title = "HTTPS is missing"
		c.Description = "The homepage is not served over HTTPS."
		c.Recommendation = "Install a TLS certificate (Let's Encrypt is enough), then add a single 301 from http:// to https:// on the same host."
	}
	if final != nil {
		c.Evidence["scheme"] = final.Scheme
	}
	return c
}

func redirectCheck(chain []string) models.Check {
	c := models.Check{
		Category: "seo", CheckKey: "seo.redirect", MaxScore: 0, Status: models.StatusPass, Severity: models.SeverityInfo,
		Title: "No extra redirect hops", Description: "The homepage resolved without a long redirect chain.",
		Recommendation: "Point ads, menus, and canonical tags at the final URL.",
		Evidence:       map[string]any{"hops": len(chain)},
	}
	if len(chain) > 1 {
		c.Status = models.StatusWarning
		c.Severity = models.SeverityMedium
		c.Title = "Redirect chain is longer than one hop"
		c.Description = "Extra redirects slow the first response and can waste crawler budget."
		c.Recommendation = "Redirect once, directly to the final HTTPS URL."
	} else if len(chain) == 1 {
		c.Title = "Homepage redirects once"
		c.Description = "One redirect is acceptable when it lands on the canonical HTTPS URL."
	}
	return c
}

func titleCheck(title string) models.Check {
	n := len(title)
	c := models.Check{
		Category: "seo", CheckKey: "seo.title", MaxScore: 15, Evidence: map[string]any{"length": n, "present": title != ""},
		Recommendation: "Use one unique title of about 30 to 60 characters that states the page topic.",
	}
	if title != "" {
		c.Evidence["title"] = title
	}
	switch {
	case title == "":
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityHigh
		c.Title = "Title tag is missing"
		c.Description = "The homepage has no title tag. Search results and AI crawlers then have to guess the page name."
		c.Recommendation = "Add one <title> in the homepage template: business name, then what you sell. Keep it around 30 to 60 characters. Example: Northwind Coffee | Beans roasted in Portland."
	case n >= 30 && n <= 60:
		c.Status, c.Score, c.Severity = models.StatusPass, 15, models.SeverityInfo
		c.Title = "Title length looks useful"
		c.Description = "The title is present and within a practical length."
	case n >= 15 && n <= 70:
		c.Status, c.Score, c.Severity = models.StatusWarning, 10, models.SeverityMedium
		c.Title = "Title length is outside the ideal range"
		c.Description = "The title is " + strconv.Itoa(n) + " characters. The usual useful range is about 30 to 60."
		c.Recommendation = "Edit the homepage title so it names the business and the offer, then trim it to about 30 to 60 characters. Confirm only one <title> tag is in the HTML."
	default:
		c.Status, c.Score, c.Severity = models.StatusWarning, 5, models.SeverityMedium
		c.Title = "Title is very short or very long"
		c.Description = "The title is " + strconv.Itoa(n) + " characters, which is easy to truncate or ignore."
		c.Recommendation = "Replace a theme default or a slogan-only title with the business name plus the offer. Keep it readable in one line."
	}
	return c
}

func descriptionCheck(desc string) models.Check {
	n := len(desc)
	c := models.Check{
		Category: "seo", CheckKey: "seo.meta_description", MaxScore: 10, Evidence: map[string]any{"length": n, "present": desc != ""},
		Recommendation: "Add a unique meta description of about 70 to 160 characters.",
	}
	if desc != "" {
		c.Evidence["description"] = desc
	}
	switch {
	case desc == "":
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityHigh
		c.Title = "Meta description is missing"
		c.Description = "The homepage does not contain a meta description, so search engines pick a random snippet."
		c.Recommendation = "Add <meta name=\"description\" content=\"...\"> with one or two sentences: what you sell, who it is for, and a reason to click. Keep it about 70 to 160 characters."
	case n >= 70 && n <= 160:
		c.Status, c.Score, c.Severity = models.StatusPass, 10, models.SeverityInfo
		c.Title = "Meta description is present"
		c.Description = "The description is present and within a practical length."
	case n >= 40 && n <= 200:
		c.Status, c.Score, c.Severity = models.StatusWarning, 6, models.SeverityMedium
		c.Title = "Meta description length needs a pass"
		c.Description = "The description is " + strconv.Itoa(n) + " characters. The usual useful range is about 70 to 160."
		c.Recommendation = "Rewrite the meta description to match the visible offer and land between 70 and 160 characters."
	default:
		c.Status, c.Score, c.Severity = models.StatusWarning, 3, models.SeverityMedium
		c.Title = "Meta description is very short or very long"
		c.Description = "The description is " + strconv.Itoa(n) + " characters, so it is unlikely to be shown in full."
		c.Recommendation = "Replace a truncated or empty-feeling description with two concrete sentences about the offer."
	}
	return c
}

func h1Check(h1 []string) models.Check {
	c := models.Check{
		Category: "seo", CheckKey: "seo.h1", MaxScore: 10, Evidence: map[string]any{"count": len(h1)},
		Recommendation: "Use one clear H1 that matches the page topic.",
	}
	switch len(h1) {
	case 0:
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityHigh
		c.Title = "H1 is missing"
		c.Description = "The homepage has no H1 heading."
		c.Recommendation = "Add one H1 in the template that matches the title and names the offer. Do not put that sentence only inside an image."
	case 1:
		c.Status, c.Score, c.Severity = models.StatusPass, 10, models.SeverityInfo
		c.Title = "One H1 is present"
		c.Description = "The homepage has a single H1."
	default:
		c.Status, c.Score, c.Severity = models.StatusWarning, 5, models.SeverityMedium
		c.Title = "Multiple H1 headings"
		c.Description = "The page has " + strconv.Itoa(len(h1)) + " H1 headings, so the main topic is harder to identify."
		c.Recommendation = "Keep the one H1 that states the offer. Change the others to H2."
	}
	return c
}

func canonicalCheck(canonical string, final *url.URL) models.Check {
	c := models.Check{
		Category: "seo", CheckKey: "seo.canonical", MaxScore: 10, Evidence: map[string]any{"present": canonical != ""},
		Recommendation: "Add a canonical link to the preferred homepage URL.",
	}
	if canonical == "" {
		c.Status, c.Score, c.Severity = models.StatusWarning, 0, models.SeverityMedium
		c.Title = "Canonical link is missing"
		c.Description = "The homepage does not declare a canonical URL."
		c.Recommendation = "Add <link rel=\"canonical\" href=\"https://your-domain.com/\"> pointing at the final HTTPS homepage, including the trailing slash you actually use."
		return c
	}
	u, err := url.Parse(canonical)
	same := err == nil && final != nil && strings.EqualFold(u.Hostname(), final.Hostname())
	c.Evidence["same_host"] = same
	if err == nil && u.IsAbs() && same {
		c.Status, c.Score, c.Severity = models.StatusPass, 10, models.SeverityInfo
		c.Title = "Canonical link points at this site"
		c.Description = "A canonical URL is present on the same host."
		return c
	}
	c.Status, c.Score, c.Severity = models.StatusWarning, 4, models.SeverityMedium
	c.Title = "Canonical link needs review"
	c.Description = "The canonical URL is missing a host, is relative, or points somewhere else."
	c.Recommendation = "Set an absolute HTTPS canonical URL on the same host."
	return c
}

func indexability(in SEOInput) models.Check {
	robotsMeta := strings.ToLower(in.Page.MetaRobots + " " + in.XRobots)
	c := models.Check{
		Category: "seo", CheckKey: "seo.robots_indexability", MaxScore: 15,
		Evidence:       map[string]any{"robots_fetch": in.RobotsState, "meta_robots": strings.TrimSpace(in.Page.MetaRobots)},
		Recommendation: "Allow Googlebot to fetch the homepage and remove noindex if this page should be searchable.",
	}
	if strings.Contains(robotsMeta, "noindex") {
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityCritical
		c.Title = "Homepage is marked noindex"
		c.Description = "A noindex directive tells search engines not to index this page. robots.txt cannot undo that."
		c.Recommendation = "Search the theme and SEO app for noindex. Remove it from the live homepage, then view source and confirm the robots meta tag is index,follow."
		return c
	}
	if in.RobotsState == "error" {
		c.Status, c.Score, c.Severity = models.StatusUnknown, 0, models.SeverityMedium
		c.Title = "robots.txt could not be read"
		c.Description = "Indexability is unknown because robots.txt did not return a reliable response."
		c.Recommendation = "Publish a reachable robots.txt or confirm the server is not blocking it."
		return c
	}
	access, rule := in.Robots.Evaluate("Googlebot", "/")
	c.Evidence["googlebot"] = string(access)
	c.Evidence["googlebot_rule"] = rule
	if in.RobotsState == "missing" {
		c.Status, c.Score, c.Severity = models.StatusWarning, 10, models.SeverityLow
		c.Title = "robots.txt was not found"
		c.Description = "Crawlers generally treat a missing robots.txt as allowed, but an explicit file is clearer."
		c.Recommendation = "Add a robots.txt that allows the crawlers you want and lists your sitemap."
		return c
	}
	if access == crawler.AccessBlocked {
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityCritical
		c.Title = "Googlebot is blocked in robots.txt"
		c.Description = "The homepage path is disallowed for Googlebot."
		c.Recommendation = "Open /robots.txt. Find User-agent: Googlebot (or a wildcard that catches it) and remove Disallow: / for the homepage. Keep staging blocks only on the staging host."
		return c
	}
	c.Status, c.Score, c.Severity = models.StatusPass, 15, models.SeverityInfo
	c.Title = "Homepage looks indexable"
	c.Description = "No noindex directive was found, and Googlebot is not blocked from the homepage."
	return c
}

func sitemapCheck(ok bool, raw string) models.Check {
	c := models.Check{
		Category: "seo", CheckKey: "seo.sitemap", MaxScore: 0, Status: models.StatusWarning, Severity: models.SeverityLow,
		Title: "Sitemap was not found", Description: "SitePulse did not find a readable sitemap on this host.",
		Recommendation: "Publish sitemap.xml and reference it in robots.txt.",
		Evidence:       map[string]any{"found": ok},
	}
	if ok {
		c.Status = models.StatusPass
		c.Severity = models.SeverityInfo
		c.Title = "Sitemap is readable"
		c.Description = "A sitemap response was found on this host."
		c.Evidence["same_host"] = true
		_ = raw
	}
	return c
}

func altCheck(images []crawler.Image) models.Check {
	total := len(images)
	missing := 0
	for _, img := range images {
		if !img.HasAlt {
			missing++
		}
	}
	c := models.Check{
		Category: "seo", CheckKey: "seo.images_alt", MaxScore: 5,
		Evidence:       map[string]any{"images": total, "missing_alt": missing},
		Recommendation: "Add an alt attribute to every informational image. Use an empty alt only for decorative images.",
	}
	if total == 0 {
		c.Status, c.Score, c.Severity = models.StatusPass, 5, models.SeverityInfo
		c.Title = "No images to check"
		c.Description = "The homepage HTML did not include img elements."
		return c
	}
	covered := float64(total-missing) / float64(total)
	c.Evidence["coverage"] = covered
	switch {
	case covered >= 0.9:
		c.Status, c.Score, c.Severity = models.StatusPass, 5, models.SeverityInfo
		c.Title = "Most images have alt text"
		c.Description = "Alt coverage is at least 90 percent."
	case covered >= 0.5:
		c.Status, c.Score, c.Severity = models.StatusWarning, 3, models.SeverityMedium
		c.Title = "Some images are missing alt text"
		c.Description = "Alt coverage is between 50 and 90 percent."
	default:
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityHigh
		c.Title = "Many images are missing alt text"
		c.Description = strconv.Itoa(missing) + " of " + strconv.Itoa(total) + " images have no alt attribute."
		c.Recommendation = "In the theme, add alt text that names the product or scene. Use alt=\"\" only on decorative images. In Shopify, fill alt on the product media, not only in a page builder preview."
	}
	return c
}

func openGraph(og map[string]string) models.Check {
	if og == nil {
		og = map[string]string{}
	}
	hasTitle := og["og:title"] != ""
	hasDesc := og["og:description"] != ""
	hasImage := og["og:image"] != ""
	count := 0
	for _, ok := range []bool{hasTitle, hasDesc, hasImage} {
		if ok {
			count++
		}
	}
	c := models.Check{
		Category: "seo", CheckKey: "seo.open_graph", MaxScore: 5,
		Evidence:       map[string]any{"og_title": hasTitle, "og_description": hasDesc, "og_image": hasImage},
		Recommendation: "Add og:title, og:description, and og:image so shared links have a useful card.",
	}
	switch count {
	case 3:
		c.Status, c.Score, c.Severity = models.StatusPass, 5, models.SeverityInfo
		c.Title = "Open Graph tags are complete"
		c.Description = "Title, description, and image tags are present."
	case 0:
		c.Status, c.Score, c.Severity = models.StatusWarning, 0, models.SeverityLow
		c.Title = "Open Graph tags are missing"
		c.Description = "Shared links may fall back to a plain URL."
	default:
		c.Status, c.Score, c.Severity = models.StatusWarning, 2, models.SeverityLow
		c.Title = "Open Graph tags are incomplete"
		c.Description = "Some social preview tags are present, but title, description, and image are not all set."
	}
	return c
}

func schemaCheck(page *crawler.Page) models.Check {
	c := models.Check{
		Category: "seo", CheckKey: "seo.schema", MaxScore: 15,
		Evidence:       map[string]any{"types": page.SchemaTypes, "invalid_blocks": page.JSONLDErrors},
		Recommendation: "Add valid JSON-LD for the organization, website, or product.",
	}
	if page.JSONLDErrors > 0 && len(page.SchemaTypes) == 0 {
		c.Status, c.Score, c.Severity = models.StatusWarning, 5, models.SeverityMedium
		c.Title = "Structured data could not be parsed"
		c.Description = "A JSON-LD block was found, but it is not valid JSON."
		return c
	}
	if len(page.SchemaTypes) == 0 {
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityHigh
		c.Title = "Structured data is missing"
		c.Description = "The homepage has no valid JSON-LD types."
		c.Recommendation = "Add one JSON-LD script for Organization or WebSite with name, url, and logo. Paste it in the theme <head>, validate the JSON, then view source to confirm it is in the first HTML response."
		return c
	}
	c.Status, c.Score, c.Severity = models.StatusPass, 15, models.SeverityInfo
	c.Title = "Structured data is present"
	c.Description = "At least one valid JSON-LD type was found."
	return c
}

func viewportCheck(viewport string) models.Check {
	c := models.Check{
		Category: "seo", CheckKey: "seo.viewport", MaxScore: 0, Status: models.StatusPass, Severity: models.SeverityInfo,
		Title: "Mobile viewport is set", Description: "A viewport meta tag is present.",
		Recommendation: "Keep a device-width viewport so phones can lay the page out.",
		Evidence:       map[string]any{"present": viewport != ""},
	}
	if viewport == "" {
		c.Status = models.StatusWarning
		c.Severity = models.SeverityMedium
		c.Title = "Mobile viewport is missing"
		c.Description = "Without a viewport tag, phones may render the desktop layout."
		c.Recommendation = "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."
	}
	return c
}

func internalLinks(links []crawler.Link) models.Check {
	n := 0
	for _, l := range links {
		if l.Internal {
			n++
		}
	}
	c := models.Check{
		Category: "seo", CheckKey: "seo.internal_links", MaxScore: 5, Evidence: map[string]any{"internal_links": n},
		Recommendation: "Link from the homepage to the main products, collections, or articles.",
	}
	switch {
	case n >= 5:
		c.Status, c.Score, c.Severity = models.StatusPass, 5, models.SeverityInfo
		c.Title = "Homepage links into the site"
		c.Description = "Several internal links were found."
	case n >= 1:
		c.Status, c.Score, c.Severity = models.StatusWarning, 3, models.SeverityLow
		c.Title = "Homepage has few internal links"
		c.Description = "Only a small number of internal links were found."
	default:
		c.Status, c.Score, c.Severity = models.StatusWarning, 0, models.SeverityMedium
		c.Title = "No internal links found"
		c.Description = "The homepage HTML does not link to other pages on this host."
	}
	return c
}
