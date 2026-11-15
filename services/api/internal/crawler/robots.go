package crawler

import (
	"regexp"
	"strings"
)

type robotsRule struct {
	Allow   bool
	Path    string
	Pattern string
}

type robotsGroup struct {
	Agents  []string
	Rules   []robotsRule
	started bool
}

type Robots struct {
	Groups   []robotsGroup
	Sitemaps []string
	RawBytes int
}

func ParseRobots(text string) Robots {
	var out Robots
	out.RawBytes = len(text)
	cur := -1
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if i := strings.Index(line, "#"); i >= 0 {
			line = strings.TrimSpace(line[:i])
		}
		if line == "" {
			continue
		}
		key, value, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		key = strings.ToLower(strings.TrimSpace(key))
		value = strings.TrimSpace(value)
		switch key {
		case "user-agent":
			if cur < 0 || out.Groups[cur].started {
				out.Groups = append(out.Groups, robotsGroup{})
				cur = len(out.Groups) - 1
			}
			out.Groups[cur].Agents = append(out.Groups[cur].Agents, value)
		case "allow", "disallow":
			if cur < 0 {
				continue
			}
			out.Groups[cur].started = true
			if value == "" {
				continue
			}
			out.Groups[cur].Rules = append(out.Groups[cur].Rules, robotsRule{Allow: key == "allow", Path: value, Pattern: value})
		case "sitemap":
			if value != "" {
				out.Sitemaps = append(out.Sitemaps, value)
			}
		}
	}
	return out
}

type Access string

const (
	AccessAllowed Access = "allowed"
	AccessBlocked Access = "blocked"
	AccessUnknown Access = "unknown"
)

func (r Robots) Evaluate(userAgent, path string) (Access, string) {
	if path == "" {
		path = "/"
	}
	groups := matchingGroups(r.Groups, userAgent)
	if len(groups) == 0 {
		return AccessAllowed, "no matching rule"
	}
	type best struct {
		allow  bool
		length int
		rule   string
		set    bool
	}
	var winner best
	for _, g := range groups {
		for _, rule := range g.Rules {
			if !pathMatches(rule.Pattern, path) {
				continue
			}
			length := len(rule.Pattern)
			ruleText := "Disallow: " + rule.Pattern
			if rule.Allow {
				ruleText = "Allow: " + rule.Pattern
			}
			if !winner.set || length > winner.length || (length == winner.length && rule.Allow && !winner.allow) {
				winner = best{allow: rule.Allow, length: length, rule: ruleText, set: true}
			}
		}
	}
	if !winner.set {
		return AccessAllowed, "no matching path rule"
	}
	if winner.allow {
		return AccessAllowed, winner.rule
	}
	return AccessBlocked, winner.rule
}

func matchingGroups(groups []robotsGroup, userAgent string) []robotsGroup {
	ua := strings.ToLower(userAgent)
	var specific []robotsGroup
	var wildcard []robotsGroup
	for _, g := range groups {
		for _, agent := range g.Agents {
			a := strings.ToLower(strings.TrimSpace(agent))
			if a == "*" {
				wildcard = append(wildcard, g)
				break
			}
			if a == ua || strings.HasPrefix(ua, a) {
				specific = append(specific, g)
				break
			}
		}
	}
	if len(specific) > 0 {
		return specific
	}
	return wildcard
}

func pathMatches(pattern, path string) bool {
	if pattern == "" {
		return true
	}
	end := strings.HasSuffix(pattern, "$")
	if end {
		pattern = strings.TrimSuffix(pattern, "$")
	}
	var b strings.Builder
	b.WriteString("^")
	for _, r := range pattern {
		if r == '*' {
			b.WriteString(".*")
			continue
		}
		b.WriteString(regexp.QuoteMeta(string(r)))
	}
	if end {
		b.WriteString("$")
	}
	re, err := regexp.Compile(b.String())
	if err != nil {
		return false
	}
	return re.MatchString(path)
}
