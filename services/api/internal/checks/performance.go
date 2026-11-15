package checks

import (
	"fmt"

	"sitepulse.ai/api/internal/models"
)

func Performance(report *models.PerformanceReport) []models.Check {
	if report == nil || !report.Available {
		reason := "PageSpeed data is not available for this scan."
		if report != nil && report.Reason != "" {
			reason = report.Reason
		}
		return []models.Check{{
			Category: "performance", CheckKey: "performance.unavailable", Status: models.StatusUnknown, Severity: models.SeverityMedium,
			Title: "PageSpeed data is not available", Description: reason,
			Evidence: map[string]any{"available": false},
			Recommendation: "Retry the audit later. SitePulse does not invent Lighthouse scores when PageSpeed does not return them.",
		}}
	}
	var out []models.Check
	if report.Mobile != nil {
		out = append(out, metricChecks("mobile", report.Mobile)...)
	}
	if report.Desktop != nil {
		out = append(out, metricChecks("desktop", report.Desktop)...)
	}
	if report.OriginTTFBMs != nil {
		out = append(out, models.Check{
			Category: "performance", CheckKey: "performance.origin_ttfb", Status: models.StatusPass, Severity: models.SeverityInfo,
			Title: "Origin response time was measured", Description: "This is the time until the first byte from the homepage fetch. It is not a Lighthouse score.",
			Evidence: map[string]any{"ttfb_ms": *report.OriginTTFBMs}, Recommendation: "Use the PageSpeed metrics above for lab performance, not this single fetch.",
		})
	}
	return out
}

func metricChecks(strategy string, psi *models.PSIResult) []models.Check {
	label := strategy
	var out []models.Check
	if psi.PerformanceScore != nil {
		out = append(out, scoreCheck(strategy, label, *psi.PerformanceScore))
	}
	out = append(out, durationCheck("performance."+strategy+".lcp", "LCP", label, psi.LCPMs, 2500, 4000))
	out = append(out, clsCheck(strategy, psi.CLS))
	out = append(out, durationCheck("performance."+strategy+".inp", "INP", label, psi.INPMs, 200, 500))
	out = append(out, durationCheck("performance."+strategy+".fcp", "FCP", label, psi.FCPMs, 1800, 3000))
	out = append(out, durationCheck("performance."+strategy+".ttfb", "TTFB", label, psi.TTFBMs, 800, 1800))
	if psi.FieldData == "not_available" || psi.FieldData == "" {
		out = append(out, models.Check{
			Category: "performance", CheckKey: "performance." + strategy + ".field_data", Status: models.StatusUnknown, Severity: models.SeverityInfo,
			Title: label + " field data is not available", Description: "Chrome UX Report data was not included for this URL. Lab data is shown separately when present.",
			Evidence: map[string]any{"field_data": "not_available", "strategy": strategy},
			Recommendation: "Do not treat missing field data as a pass or a fail.",
		})
	}
	return out
}

func scoreCheck(strategy, label string, score int) models.Check {
	c := models.Check{
		Category: "performance", CheckKey: "performance." + strategy + ".score", MaxScore: 0,
		Evidence: map[string]any{"score": score, "strategy": strategy},
		Title: fmt.Sprintf("%s performance score is %d", titleStrategy(label), score),
		Description: "This is the Lighthouse performance score returned by PageSpeed Insights.",
		Recommendation: "Start with the largest content and layout metrics before chasing small audits.",
	}
	switch {
	case score >= 90:
		c.Status, c.Severity = models.StatusPass, models.SeverityInfo
	case score >= 50:
		c.Status, c.Severity = models.StatusWarning, models.SeverityMedium
	default:
		c.Status, c.Severity = models.StatusFail, models.SeverityHigh
	}
	return c
}

func durationCheck(key, name, strategy string, value *int, good, poor int) models.Check {
	c := models.Check{
		Category: "performance", CheckKey: key, MaxScore: 0,
		Evidence: map[string]any{"strategy": strategy},
		Recommendation: "Improve " + name + " on " + strategy + " if it is above the usual threshold.",
	}
	if value == nil {
		c.Status, c.Severity = models.StatusUnknown, models.SeverityInfo
		c.Title = name + " is not available on " + strategy
		c.Description = "PageSpeed did not return this metric. It is shown as not available."
		c.Evidence["available"] = false
		return c
	}
	c.Evidence["ms"] = *value
	c.Title = fmt.Sprintf("%s on %s is %d ms", name, strategy, *value)
	c.Description = fmt.Sprintf("Lab %s from PageSpeed. Good is at or below %d ms.", name, good)
	switch {
	case *value <= good:
		c.Status, c.Severity = models.StatusPass, models.SeverityInfo
	case *value <= poor:
		c.Status, c.Severity = models.StatusWarning, models.SeverityMedium
	default:
		c.Status, c.Severity = models.StatusFail, models.SeverityHigh
	}
	return c
}

func clsCheck(strategy string, value *float64) models.Check {
	c := models.Check{
		Category: "performance", CheckKey: "performance." + strategy + ".cls", MaxScore: 0,
		Evidence: map[string]any{"strategy": strategy},
		Recommendation: "Reserve space for images, ads, and late-loading banners.",
	}
	if value == nil {
		c.Status, c.Severity = models.StatusUnknown, models.SeverityInfo
		c.Title = "CLS is not available on " + strategy
		c.Description = "PageSpeed did not return CLS."
		return c
	}
	c.Evidence["cls"] = *value
	c.Title = fmt.Sprintf("CLS on %s is %.3f", strategy, *value)
	c.Description = "Cumulative layout shift from the PageSpeed lab run."
	switch {
	case *value <= 0.1:
		c.Status, c.Severity = models.StatusPass, models.SeverityInfo
	case *value <= 0.25:
		c.Status, c.Severity = models.StatusWarning, models.SeverityMedium
	default:
		c.Status, c.Severity = models.StatusFail, models.SeverityHigh
	}
	return c
}

func titleStrategy(s string) string {
	if s == "" {
		return "Performance"
	}
	return stringsTitle(s)
}

func stringsTitle(s string) string {
	if s == "" {
		return s
	}
	return string(s[0]-32) + s[1:]
}
