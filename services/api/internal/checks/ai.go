package checks

import (
	"strings"

	"sitepulse.ai/api/internal/crawler"
	"sitepulse.ai/api/internal/models"
)

type AIInput struct {
	Page        *crawler.Page
	Robots      crawler.Robots
	RobotsState string
	Indexable   bool
}

type botSpec struct {
	Key      string
	Name     string
	MaxScore int
	Weighted bool
}

var weightedBots = []botSpec{
	{Key: "ai.oai_searchbot", Name: "OAI-SearchBot", MaxScore: 20, Weighted: true},
	{Key: "ai.claude_searchbot", Name: "Claude-SearchBot", MaxScore: 15, Weighted: true},
	{Key: "ai.perplexitybot", Name: "PerplexityBot", MaxScore: 15, Weighted: true},
}

var infoBots = []botSpec{
	{Key: "ai.gptbot", Name: "GPTBot", MaxScore: 0},
	{Key: "ai.claudebot", Name: "ClaudeBot", MaxScore: 0},
	{Key: "ai.google_extended", Name: "Google-Extended", MaxScore: 0},
}

func AIReadiness(in AIInput) []models.Check {
	page := in.Page
	if page == nil {
		page = &crawler.Page{}
	}
	var out []models.Check
	for _, bot := range append(weightedBots, infoBots...) {
		out = append(out, crawlerRule(in, bot))
	}
	out = append(out, contentStructure(page))
	out = append(out, aiSchema(page))
	out = append(out, brandEntity(page))
	out = append(out, contentAccess(page, in.Indexable))
	return out
}

func crawlerRule(in AIInput, bot botSpec) models.Check {
	c := models.Check{
		Category: "ai", CheckKey: bot.Key, MaxScore: bot.MaxScore,
		Evidence: map[string]any{"user_agent": bot.Name, "robots_fetch": in.RobotsState},
		Recommendation: "Add an explicit Allow rule for " + bot.Name + " only if you want that crawler to fetch public pages. Allowing a crawler is not the same as being cited.",
	}
	if in.RobotsState == "error" {
		c.Status, c.Score, c.Severity = models.StatusUnknown, 0, models.SeverityMedium
		c.Title = bot.Name + " rule is unknown"
		c.Description = "robots.txt could not be read, so this crawler rule is unknown. Unknown is not treated as allowed."
		return c
	}
	access, rule := in.Robots.Evaluate(bot.Name, "/")
	c.Evidence["access"] = string(access)
	c.Evidence["rule"] = rule
	if in.RobotsState == "missing" {
		c.Status = models.StatusPass
		c.Score = bot.MaxScore
		c.Severity = models.SeverityInfo
		c.Title = bot.Name + " is not blocked"
		c.Description = "No robots.txt was found. That usually means crawlers are not explicitly blocked. It does not prove the crawler has visited."
		if bot.MaxScore == 0 {
			c.Severity = models.SeverityInfo
		}
		return c
	}
	switch access {
	case crawler.AccessBlocked:
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityHigh
		c.Title = bot.Name + " is blocked"
		c.Description = bot.Name + " is disallowed from the homepage. This does not say whether the bot previously crawled the site."
		c.Recommendation = "If you want " + bot.Name + " to fetch public pages, remove the disallow rule for that exact user-agent. Do not treat GPTBot and OAI-SearchBot as the same bot."
	default:
		c.Status, c.Score, c.Severity = models.StatusPass, bot.MaxScore, models.SeverityInfo
		c.Title = bot.Name + " is allowed by robots.txt"
		c.Description = "The robots rule does not block " + bot.Name + ". Permission is not proof of crawling, indexing, or recommendation."
	}
	return c
}

func contentStructure(page *crawler.Page) models.Check {
	score := 0
	if len(page.H1) == 1 {
		score += 5
	}
	if len(page.H2) > 0 {
		score += 4
	}
	if page.WordCount >= 150 {
		score += 6
	} else if page.WordCount >= 60 {
		score += 3
	}
	c := models.Check{
		Category: "ai", CheckKey: "ai.content_structure", MaxScore: 15, Score: score,
		Evidence: map[string]any{"h1": len(page.H1), "h2": len(page.H2), "words": page.WordCount},
		Recommendation: "Use one H1, supporting H2s, and enough visible text for a crawler that does not run JavaScript.",
	}
	switch {
	case score >= 13:
		c.Status, c.Severity = models.StatusPass, models.SeverityInfo
		c.Title = "Content structure is readable"
		c.Description = "Headings and visible text give crawlers a clear page outline."
	case score >= 6:
		c.Status, c.Severity = models.StatusWarning, models.SeverityMedium
		c.Title = "Content structure is thin"
		c.Description = "The page has some structure, but headings or visible text are limited."
	default:
		c.Status, c.Severity = models.StatusFail, models.SeverityHigh
		c.Title = "Content structure is hard to parse"
		c.Description = "A crawler that only reads HTML will see little organized content."
	}
	return c
}

func aiSchema(page *crawler.Page) models.Check {
	base := schemaCheck(page)
	c := base
	c.Category = "ai"
	c.CheckKey = "ai.schema"
	c.MaxScore = 15
	if base.Score == 5 {
		c.Score = 5
	}
	c.Description = base.Description + " Structured data helps machines identify the page. It does not guarantee a citation."
	return c
}

func brandEntity(page *crawler.Page) models.Check {
	hasOrg := crawler.HasSchema(page.SchemaTypes, "Organization", "LocalBusiness", "OnlineStore", "Store", "WebSite")
	hasName := page.OpenGraph["og:site_name"] != "" || page.Title != ""
	c := models.Check{
		Category: "ai", CheckKey: "ai.brand_entity", MaxScore: 10,
		Evidence: map[string]any{"organization_or_website_schema": hasOrg, "og_site_name": page.OpenGraph["og:site_name"] != ""},
		Recommendation: "Add Organization or WebSite JSON-LD with the business name, URL, and logo.",
	}
	switch {
	case hasOrg:
		c.Status, c.Score, c.Severity = models.StatusPass, 10, models.SeverityInfo
		c.Title = "A brand or site entity is marked up"
		c.Description = "JSON-LD identifies an organization, store, or website."
	case hasName && page.OpenGraph["og:site_name"] != "":
		c.Status, c.Score, c.Severity = models.StatusWarning, 6, models.SeverityLow
		c.Title = "Site name is present, entity markup is not"
		c.Description = "og:site_name is set, but Organization or WebSite JSON-LD was not found."
	default:
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityMedium
		c.Title = "Brand entity information is missing"
		c.Description = "The HTML does not identify the business in structured data."
	}
	return c
}

func contentAccess(page *crawler.Page, indexable bool) models.Check {
	c := models.Check{
		Category: "ai", CheckKey: "ai.content_accessibility", MaxScore: 10,
		Evidence: map[string]any{"words": page.WordCount, "indexable": indexable},
		Recommendation: "Put the main offer in HTML, not only in a script that runs after load.",
	}
	if !indexable {
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityHigh
		c.Title = "Important content may be blocked from indexing"
		c.Description = "A noindex directive or a blocked search crawler limits how the page can be reused."
		return c
	}
	if page.WordCount < 40 {
		c.Status, c.Score, c.Severity = models.StatusFail, 2, models.SeverityHigh
		c.Title = "Very little text is visible without JavaScript"
		c.Description = "SitePulse does not execute JavaScript. AI crawlers may also miss content that only appears after scripts run."
		return c
	}
	if page.WordCount < 120 {
		c.Status, c.Score, c.Severity = models.StatusWarning, 7, models.SeverityMedium
		c.Title = "Visible text is limited"
		c.Description = "Some text is in the HTML, but the page is thin for a crawler that does not run scripts."
		return c
	}
	c.Status, c.Score, c.Severity = models.StatusPass, 10, models.SeverityInfo
	c.Title = "Main text is available in HTML"
	c.Description = "A non-JavaScript fetch can read a meaningful amount of page text."
	return c
}

func Indexable(checks []models.Check) bool {
	for _, c := range checks {
		if c.CheckKey == "seo.robots_indexability" && (c.Status == models.StatusFail) {
			return false
		}
	}
	return true
}

func Excerpt(text string, limit int) string {
	text = strings.Join(strings.Fields(text), " ")
	if len(text) <= limit {
		return text
	}
	return text[:limit]
}
