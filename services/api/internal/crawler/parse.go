package crawler

import (
	"bytes"
	"encoding/json"
	"net/url"
	"strings"

	"golang.org/x/net/html"
)

type Image struct {
	Src    string
	Alt    string
	HasAlt bool
}

type Link struct {
	Href     string
	Internal bool
	Text     string
}

type Page struct {
	Title           string
	MetaDescription string
	MetaRobots      string
	Viewport        string
	Canonical       string
	H1              []string
	H2              []string
	H3              []string
	Images          []Image
	Links           []Link
	JSONLD          []json.RawMessage
	JSONLDErrors    int
	SchemaTypes     []string
	OpenGraph       map[string]string
	Text            string
	WordCount       int
	Shopify         bool
	Generator       string
}

func ParseHTML(base *url.URL, body []byte) *Page {
	if len(body) > MaxHTMLParse {
		body = body[:MaxHTMLParse]
	}
	page := &Page{OpenGraph: map[string]string{}}
	doc, err := html.Parse(bytes.NewReader(body))
	if err != nil {
		return page
	}
	lower := strings.ToLower(string(body))
	page.Shopify = strings.Contains(lower, "cdn.shopify.com") || strings.Contains(lower, "shopify.theme") || strings.Contains(lower, "myshopify.com")
	var text []string
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "script", "style", "noscript":
				if n.Data == "script" && strings.EqualFold(attr(n, "type"), "application/ld+json") {
					raw := strings.TrimSpace(nodeText(n))
					if raw != "" {
						var tmp any
						if err := json.Unmarshal([]byte(raw), &tmp); err != nil {
							page.JSONLDErrors++
						} else {
							page.JSONLD = append(page.JSONLD, json.RawMessage(raw))
							page.SchemaTypes = append(page.SchemaTypes, schemaTypes(tmp)...)
						}
					}
				}
				return
			case "title":
				if page.Title == "" {
					page.Title = clean(nodeText(n))
				}
			case "meta":
				name := strings.ToLower(attr(n, "name"))
				prop := strings.ToLower(attr(n, "property"))
				content := attr(n, "content")
				switch {
				case name == "description" && page.MetaDescription == "":
					page.MetaDescription = clean(content)
				case name == "robots":
					page.MetaRobots = content
				case name == "viewport":
					page.Viewport = content
				case name == "generator":
					page.Generator = content
					if strings.Contains(strings.ToLower(content), "shopify") {
						page.Shopify = true
					}
				case strings.HasPrefix(prop, "og:"):
					page.OpenGraph[prop] = content
				}
			case "link":
				if strings.EqualFold(attr(n, "rel"), "canonical") || strings.Contains(strings.ToLower(attr(n, "rel")), "canonical") {
					if page.Canonical == "" {
						page.Canonical = resolve(base, attr(n, "href"))
					}
				}
			case "h1", "h2", "h3":
				textValue := clean(nodeText(n))
				if textValue != "" {
					switch n.Data {
					case "h1":
						page.H1 = append(page.H1, textValue)
					case "h2":
						page.H2 = append(page.H2, textValue)
					case "h3":
						page.H3 = append(page.H3, textValue)
					}
				}
			case "img":
				src := resolve(base, attr(n, "src"))
				_, has := lookupAttr(n, "alt")
				page.Images = append(page.Images, Image{Src: src, Alt: attr(n, "alt"), HasAlt: has})
			case "a":
				href := attr(n, "href")
				if href != "" && !strings.HasPrefix(strings.ToLower(href), "javascript:") && !strings.HasPrefix(strings.ToLower(href), "mailto:") && !strings.HasPrefix(strings.ToLower(href), "tel:") {
					abs := resolve(base, href)
					internal := false
					if u, err := url.Parse(abs); err == nil && base != nil && urlguardHost(u.Hostname(), base.Hostname()) {
						internal = true
					}
					page.Links = append(page.Links, Link{Href: stripQuery(abs), Internal: internal, Text: clean(nodeText(n))})
				}
			}
		}
		if n.Type == html.TextNode {
			parent := n.Parent
			if parent != nil && parent.Data != "script" && parent.Data != "style" {
				if t := clean(n.Data); t != "" {
					text = append(text, t)
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)
	joined := clean(strings.Join(text, " "))
	if len(joined) > 4000 {
		joined = joined[:4000]
	}
	page.Text = joined
	page.WordCount = len(strings.Fields(joined))
	page.SchemaTypes = unique(page.SchemaTypes)
	return page
}

func schemaTypes(v any) []string {
	var out []string
	switch t := v.(type) {
	case []any:
		for _, item := range t {
			out = append(out, schemaTypes(item)...)
		}
	case map[string]any:
		if typ, ok := t["@type"]; ok {
			out = append(out, typeNames(typ)...)
		}
		if graph, ok := t["@graph"]; ok {
			out = append(out, schemaTypes(graph)...)
		}
	}
	return out
}

func typeNames(v any) []string {
	switch t := v.(type) {
	case string:
		return []string{t}
	case []any:
		var out []string
		for _, item := range t {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

func attr(n *html.Node, key string) string {
	v, _ := lookupAttr(n, key)
	return v
}

func lookupAttr(n *html.Node, key string) (string, bool) {
	for _, a := range n.Attr {
		if strings.EqualFold(a.Key, key) {
			return a.Val, true
		}
	}
	return "", false
}

func nodeText(n *html.Node) string {
	var b strings.Builder
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.TextNode {
			b.WriteString(n.Data)
			b.WriteByte(' ')
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(n)
	return b.String()
}

func clean(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

func resolve(base *url.URL, href string) string {
	href = strings.TrimSpace(href)
	if href == "" || base == nil {
		return href
	}
	u, err := url.Parse(href)
	if err != nil {
		return href
	}
	return base.ResolveReference(u).String()
}

func stripQuery(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	u.RawQuery = ""
	u.Fragment = ""
	return u.String()
}

func urlguardHost(a, b string) bool {
	return strings.EqualFold(strings.TrimSuffix(a, "."), strings.TrimSuffix(b, "."))
}

func unique(in []string) []string {
	seen := map[string]struct{}{}
	var out []string
	for _, s := range in {
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}

func HasSchema(types []string, names ...string) bool {
	for _, t := range types {
		for _, name := range names {
			if strings.EqualFold(t, name) {
				return true
			}
		}
	}
	return false
}
