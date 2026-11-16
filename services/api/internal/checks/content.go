package checks

import (
	"strconv"
	"strings"

	"sitepulse.ai/api/internal/crawler"
	"sitepulse.ai/api/internal/models"
)

func Content(page *crawler.Page) []models.Check {
	if page == nil {
		page = &crawler.Page{}
	}
	return []models.Check{
		wordCount(page),
		headings(page),
		faq(page),
		textAccess(page),
		contentLinks(page),
	}
}

func wordCount(page *crawler.Page) models.Check {
	n := page.WordCount
	c := models.Check{
		Category: "content", CheckKey: "content.word_count", MaxScore: 30,
		Evidence:       map[string]any{"words": n},
		Recommendation: "Put the offer in the HTML itself: business name, what you sell, and who it is for. Aim for a few hundred words. Do not leave that sentence only inside a hero image or a script.",
	}
	switch {
	case n >= 300:
		c.Status, c.Score, c.Severity = models.StatusPass, 30, models.SeverityInfo
		c.Title = "Page has substantial visible text"
		c.Description = "The HTML includes enough words to describe the page."
	case n >= 100:
		c.Status, c.Score, c.Severity = models.StatusWarning, 18, models.SeverityMedium
		c.Title = "Visible text is moderate"
		c.Description = "This fetch found about " + strconv.Itoa(n) + " words. A homepage that names the offer in HTML is easier for search and AI crawlers to quote."
		c.Recommendation = "Add a short paragraph in the template: who you are, what you sell, and who it is for. Publish it in HTML, then view source to confirm it is there without clicking."
	default:
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityHigh
		c.Title = "Visible text is thin"
		c.Description = "This fetch found about " + strconv.Itoa(n) + " readable words. A crawler that does not run JavaScript will see almost nothing to quote."
		c.Recommendation = "Move the main headline and offer into the theme HTML. Disable JavaScript in the browser, reload, and confirm you can still read what the business sells."
	}
	return c
}

func headings(page *crawler.Page) models.Check {
	c := models.Check{
		Category: "content", CheckKey: "content.headings", MaxScore: 25,
		Evidence:       map[string]any{"h1": len(page.H1), "h2": len(page.H2)},
		Recommendation: "Use one H1 and H2s that break the page into real sections.",
	}
	switch {
	case len(page.H1) == 1 && len(page.H2) > 0:
		c.Status, c.Score, c.Severity = models.StatusPass, 25, models.SeverityInfo
		c.Title = "Heading outline is clear"
		c.Description = "The page has one H1 and at least one H2."
	case len(page.H1) == 1:
		c.Status, c.Score, c.Severity = models.StatusWarning, 15, models.SeverityLow
		c.Title = "H1 is present, sections are thin"
		c.Description = "There is one H1, but no H2 sections were found."
	default:
		c.Status, c.Score, c.Severity = models.StatusFail, 5, models.SeverityMedium
		c.Title = "Heading outline needs work"
		c.Description = "The page has " + strconv.Itoa(len(page.H1)) + " H1 heading(s). One H1 that matches the offer is easier to quote."
		c.Recommendation = "Keep a single H1 with the page topic. Turn extra H1s into H2s. If there is no H1, add one in the template, not only in a banner image."
		if len(page.H1) == 0 {
			c.Score = 0
			c.Title = "H1 is missing"
			c.Description = "No H1 was found in the HTML."
		}
	}
	return c
}

func faq(page *crawler.Page) models.Check {
	hasSchema := crawler.HasSchema(page.SchemaTypes, "FAQPage")
	questions := 0
	for _, h := range append(append([]string{}, page.H2...), page.H3...) {
		if strings.Contains(h, "?") {
			questions++
		}
	}
	c := models.Check{
		Category: "content", CheckKey: "content.faq", MaxScore: 15,
		Evidence:       map[string]any{"faq_schema": hasSchema, "question_headings": questions},
		Recommendation: "Add a short FAQ in HTML and FAQPage JSON-LD when the answers are real.",
	}
	switch {
	case hasSchema:
		c.Status, c.Score, c.Severity = models.StatusPass, 15, models.SeverityInfo
		c.Title = "FAQ structured data is present"
		c.Description = "FAQPage JSON-LD was found. This does not guarantee an AI citation."
	case questions >= 2:
		c.Status, c.Score, c.Severity = models.StatusWarning, 8, models.SeverityLow
		c.Title = "Question headings exist without FAQ schema"
		c.Description = "The page has question-like headings, but no FAQPage JSON-LD."
	default:
		c.Status, c.Score, c.Severity = models.StatusPass, 4, models.SeverityInfo
		c.Title = "FAQ content is optional"
		c.Description = "No FAQ was found. That is fine on a homepage that already states the offer in ordinary copy."
		c.Recommendation = "Add an FAQ only if customers ask the same questions. Write the answers in HTML first, then add FAQPage JSON-LD that matches those answers."
	}
	return c
}

func textAccess(page *crawler.Page) models.Check {
	c := models.Check{
		Category: "content", CheckKey: "content.text_access", MaxScore: 20,
		Evidence:       map[string]any{"words": page.WordCount},
		Recommendation: "Render the primary copy in the initial HTML.",
	}
	if page.WordCount < 40 {
		c.Status, c.Score, c.Severity = models.StatusFail, 0, models.SeverityHigh
		c.Title = "Text may be hidden behind JavaScript"
		c.Description = "The fetched HTML has almost no readable words. SitePulse does not run scripts, and many AI crawlers also start with a simple fetch."
		c.Recommendation = "Render the headline, offer, and primary links in the first HTML response. In Shopify, use the theme editor or a section that outputs text on the server, not only a client app block."
		return c
	}
	c.Status, c.Score, c.Severity = models.StatusPass, 20, models.SeverityInfo
	c.Title = "Readable text is in the HTML"
	c.Description = "The fetch found readable words without running scripts."
	return c
}

func contentLinks(page *crawler.Page) models.Check {
	n := 0
	for _, l := range page.Links {
		if l.Internal {
			n++
		}
	}
	c := models.Check{
		Category: "content", CheckKey: "content.internal_links", MaxScore: 10,
		Evidence:       map[string]any{"internal_links": n},
		Recommendation: "Link related products, policies, and guides from this page.",
	}
	if n >= 3 {
		c.Status, c.Score, c.Severity = models.StatusPass, 10, models.SeverityInfo
		c.Title = "Related pages are linked"
		c.Description = "Internal links give crawlers a path beyond this page."
		return c
	}
	c.Status, c.Score, c.Severity = models.StatusWarning, 4, models.SeverityLow
	c.Title = "Few related links"
	c.Description = "Only " + strconv.Itoa(n) + " internal link(s) were found in the HTML."
	c.Recommendation = "Add ordinary <a href> links to the main collection, a key product, shipping, and about pages. Buttons that only run a script do not count."
	return c
}
