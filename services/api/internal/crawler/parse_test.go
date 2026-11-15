package crawler

import (
	"net/url"
	"strings"
	"testing"
)

func TestParseHTMLExtractsAuditSignals(t *testing.T) {
	raw := `<!doctype html><html><head>
<title>Hats for rainy days</title>
<meta name="description" content="Shop waterproof hats.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:title" content="Hats">
<meta property="og:description" content="Shop hats">
<meta property="og:image" content="https://shop.example/hat.jpg">
<link rel="canonical" href="https://shop.example/">
<script type="application/ld+json">{"@type":"Organization","name":"Hat Shop"}</script>
</head><body>
<h1>Waterproof hats</h1>
<h2>Best sellers</h2>
<img src="/hat.jpg" alt="navy hat">
<img src="/logo.svg">
<a href="/products/navy">Navy hat</a>
<a href="https://other.example/out">Out</a>
<p>Practical waterproof hats for daily wear and travel. Designed for city rain.</p>
</body></html>`
	base, _ := url.Parse("https://shop.example/")
	page := ParseHTML(base, []byte(raw))
	if page.Title != "Hats for rainy days" || page.MetaDescription == "" || len(page.H1) != 1 {
		t.Fatalf("%+v", page)
	}
	if page.Canonical != "https://shop.example/" {
		t.Fatal(page.Canonical)
	}
	if !page.Images[0].HasAlt || page.Images[1].HasAlt {
		t.Fatalf("alt detection %+v", page.Images)
	}
	internal := 0
	for _, l := range page.Links {
		if l.Internal {
			internal++
		}
	}
	if internal != 1 {
		t.Fatalf("internal links %d", internal)
	}
	if !HasSchema(page.SchemaTypes, "Organization") {
		t.Fatal(page.SchemaTypes)
	}
	if page.WordCount < 5 {
		t.Fatal(page.WordCount, page.Text)
	}
	if strings.Contains(page.Text, "application/ld+json") {
		t.Fatal("script leaked into text")
	}
}
