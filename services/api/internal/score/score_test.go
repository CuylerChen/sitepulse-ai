package score

import (
	"net/url"
	"testing"

	"sitepulse.ai/api/internal/checks"
	"sitepulse.ai/api/internal/crawler"
	"sitepulse.ai/api/internal/models"
)

func TestWeightsAndPerfectScores(t *testing.T) {
	page := &crawler.Page{
		Title:           "Practical tools for independent stores online",
		MetaDescription: "Find clear fixes for SEO, speed, and AI crawler access. Built for store owners who want a short report.",
		Viewport:        "width=device-width",
		Canonical:       "https://shop.example/",
		H1:              []string{"Store tools"},
		H2:              []string{"Audits", "Fixes"},
		OpenGraph:       map[string]string{"og:title": "Store", "og:description": "Tools", "og:image": "https://shop.example/a.jpg", "og:site_name": "Store"},
		SchemaTypes:     []string{"Organization", "WebSite"},
		WordCount:       320,
		Text:            "A long enough page about independent stores and the tools they use every week to improve product pages and policies.",
		Images:          []crawler.Image{{HasAlt: true}},
		Links:           []crawler.Link{{Internal: true}, {Internal: true}, {Internal: true}, {Internal: true}, {Internal: true}},
	}
	robots := crawler.ParseRobots("User-agent: *\nAllow: /\n")
	final, _ := url.Parse("https://shop.example/")
	seo := checks.SEO(checks.SEOInput{Page: page, FinalURL: final, Status: 200, Robots: robots, RobotsState: "ok", SitemapOK: true})
	ai := checks.AIReadiness(checks.AIInput{Page: page, Robots: robots, RobotsState: "ok", Indexable: true})
	content := checks.Content(page)
	all := append(append(seo, ai...), content...)
	got := Compute(all, false)
	if *got.SEO < 90 || *got.AIReadiness < 90 || *got.Content < 80 {
		t.Fatalf("unexpected module scores seo=%d ai=%d content=%d", *got.SEO, *got.AIReadiness, *got.Content)
	}
	if got.Performance != nil {
		t.Fatal("performance should stay nil when unavailable")
	}
	if got.Overall == nil || *got.Overall < 80 {
		t.Fatalf("overall %+v", got)
	}
}

func TestDoesNotTreatUnknownCrawlerAsAllowedScore(t *testing.T) {
	page := &crawler.Page{Title: "Hi there from the store", H1: []string{"Hi"}, WordCount: 20}
	ai := checks.AIReadiness(checks.AIInput{Page: page, RobotsState: "error"})
	for _, c := range ai {
		if c.CheckKey == "ai.oai_searchbot" {
			if c.Status != models.StatusUnknown || c.Score != 0 {
				t.Fatalf("unknown crawler scored as allowed: %+v", c)
			}
		}
	}
}
