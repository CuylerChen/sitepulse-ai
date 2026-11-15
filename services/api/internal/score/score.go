package score

import (
	"sitepulse.ai/api/internal/models"
)

func Compute(checks []models.Check, performanceAvailable bool) models.Scores {
	seo := sum(checks, "seo")
	ai := sum(checks, "ai")
	content := sum(checks, "content")
	out := models.Scores{
		SEO:         models.IntPtr(seo),
		AIReadiness: models.IntPtr(ai),
		Content:     models.IntPtr(content),
		Weights: map[string]float64{
			"seo":         0.35,
			"performance": 0.25,
			"ai_readiness": 0.30,
			"content":     0.10,
		},
	}
	if !performanceAvailable {
		out.Performance = nil
		out.Notes = append(out.Notes, "Performance is not included because PageSpeed data was not available. The other weights were renormalized. No performance score was invented.")
		out.Weights = map[string]float64{
			"seo":          0.35 / 0.75,
			"performance":  0,
			"ai_readiness": 0.30 / 0.75,
			"content":      0.10 / 0.75,
		}
		overall := int(round(float64(seo)*out.Weights["seo"] + float64(ai)*out.Weights["ai_readiness"] + float64(content)*out.Weights["content"]))
		out.Overall = models.IntPtr(clamp(overall))
	} else {
		perf := performanceScore(checks)
		out.Performance = models.IntPtr(perf)
		overall := int(round(0.35*float64(seo) + 0.25*float64(perf) + 0.30*float64(ai) + 0.10*float64(content)))
		out.Overall = models.IntPtr(clamp(overall))
	}
	if httpFailed(checks) && out.SEO != nil && *out.SEO > 40 {
		capped := 40
		out.SEO = &capped
		out.Notes = append(out.Notes, "SEO score is capped because the homepage returned an error status.")
		return recompute(out, performanceAvailable)
	}
	grade, label := models.GradeFor(*out.Overall)
	out.Grade = grade
	out.GradeLabel = label
	return out
}

func recompute(in models.Scores, performanceAvailable bool) models.Scores {
	seo, ai, content := *in.SEO, *in.AIReadiness, *in.Content
	if !performanceAvailable {
		overall := int(round(float64(seo)*in.Weights["seo"] + float64(ai)*in.Weights["ai_readiness"] + float64(content)*in.Weights["content"]))
		in.Overall = models.IntPtr(clamp(overall))
	} else {
		perf := 0
		if in.Performance != nil {
			perf = *in.Performance
		}
		overall := int(round(0.35*float64(seo) + 0.25*float64(perf) + 0.30*float64(ai) + 0.10*float64(content)))
		in.Overall = models.IntPtr(clamp(overall))
	}
	in.Grade, in.GradeLabel = models.GradeFor(*in.Overall)
	return in
}

func sum(checks []models.Check, category string) int {
	total := 0
	max := 0
	for _, c := range checks {
		if c.Category != category || c.MaxScore <= 0 {
			continue
		}
		total += c.Score
		max += c.MaxScore
	}
	if max == 0 {
		return 0
	}
	if max == 100 {
		return clamp(total)
	}
	return clamp(int(round(float64(total) / float64(max) * 100)))
}

func performanceScore(checks []models.Check) int {
	var mobile, desktop *int
	for _, c := range checks {
		if c.CheckKey == "performance.mobile.score" {
			if v, ok := c.Evidence["score"].(int); ok {
				mobile = &v
			}
		}
		if c.CheckKey == "performance.desktop.score" {
			if v, ok := c.Evidence["score"].(int); ok {
				desktop = &v
			}
		}
	}
	switch {
	case mobile != nil && desktop != nil:
		return clamp(int(round(0.6*float64(*mobile) + 0.4*float64(*desktop))))
	case mobile != nil:
		return clamp(*mobile)
	case desktop != nil:
		return clamp(*desktop)
	default:
		return 0
	}
}

func httpFailed(checks []models.Check) bool {
	for _, c := range checks {
		if c.CheckKey == "seo.http_status" && c.Status == models.StatusFail {
			return true
		}
	}
	return false
}

func clamp(v int) int {
	if v < 0 {
		return 0
	}
	if v > 100 {
		return 100
	}
	return v
}

func round(v float64) float64 {
	if v < 0 {
		return float64(int(v - 0.5))
	}
	return float64(int(v + 0.5))
}
