package crawler

import "testing"

func TestRobotsSeparatesGPTBotFromSearchBot(t *testing.T) {
	text := `
User-agent: *
Disallow:

User-agent: GPTBot
Disallow: /

User-agent: OAI-SearchBot
Allow: /
`
	r := ParseRobots(text)
	gpt, rule := r.Evaluate("GPTBot", "/")
	if gpt != AccessBlocked {
		t.Fatalf("GPTBot %s %s", gpt, rule)
	}
	search, _ := r.Evaluate("OAI-SearchBot", "/")
	if search != AccessAllowed {
		t.Fatalf("OAI-SearchBot %s", search)
	}
	claude, _ := r.Evaluate("Claude-SearchBot", "/")
	if claude != AccessAllowed {
		t.Fatalf("Claude-SearchBot should be implicitly allowed, got %s", claude)
	}
}

func TestRobotsLongestMatchAndAllowWinsTie(t *testing.T) {
	text := `
User-agent: *
Disallow: /private
Allow: /private/public
Disallow: /shop
Allow: /shop
`
	r := ParseRobots(text)
	if access, _ := r.Evaluate("PerplexityBot", "/private/secret"); access != AccessBlocked {
		t.Fatalf("got %s", access)
	}
	if access, _ := r.Evaluate("PerplexityBot", "/private/public"); access != AccessAllowed {
		t.Fatalf("longer allow should win, got %s", access)
	}
	if access, rule := r.Evaluate("PerplexityBot", "/shop"); access != AccessAllowed {
		t.Fatalf("equal length allow should win, got %s %s", access, rule)
	}
}

func TestRobotsStarAndEndAnchor(t *testing.T) {
	text := `
User-agent: *
Disallow: /*.pdf$
Allow: /docs
`
	r := ParseRobots(text)
	if access, _ := r.Evaluate("ClaudeBot", "/files/a.pdf"); access != AccessBlocked {
		t.Fatal("pdf should be blocked")
	}
	if access, _ := r.Evaluate("ClaudeBot", "/docs"); access != AccessAllowed {
		t.Fatal("docs should be allowed")
	}
}

func TestSitemapLines(t *testing.T) {
	r := ParseRobots("Sitemap: https://example.com/sitemap.xml\n")
	if len(r.Sitemaps) != 1 {
		t.Fatal(r.Sitemaps)
	}
}
