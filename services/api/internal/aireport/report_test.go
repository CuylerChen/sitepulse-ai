package aireport

import (
	"strings"
	"testing"

	"sitepulse.ai/api/internal/models"
)

func TestRulesPutsConcreteStepsOnMissingTitle(t *testing.T) {
	checks := []models.Check{{
		CheckKey: "seo.title", Status: models.StatusFail, Severity: models.SeverityHigh,
		Title: "Title tag is missing", Description: "The homepage has no title tag.",
		Recommendation: "Add one title tag.",
		Evidence:       map[string]any{"length": 0},
	}}
	report, _ := Rules("https://example.com", checks)
	if len(report.Issues) != 1 {
		t.Fatalf("issues=%d", len(report.Issues))
	}
	if report.Issues[0].RecommendedFix == "" || len(report.Issues[0].ImplementationSteps) < 3 {
		t.Fatalf("%+v", report.Issues[0])
	}
	joined := strings.Join(report.Issues[0].ImplementationSteps, " ")
	if !strings.Contains(joined, "title") {
		t.Fatalf("steps=%q", joined)
	}
}

func TestRulesSkipsOptionalNoise(t *testing.T) {
	checks := []models.Check{
		{CheckKey: "content.faq", Status: models.StatusWarning, Severity: models.SeverityLow, Title: "No FAQ"},
		{CheckKey: "performance.unavailable", Status: models.StatusUnknown, Severity: models.SeverityMedium, Title: "No PageSpeed"},
		{CheckKey: "seo.http_status", Status: models.StatusFail, Severity: models.SeverityCritical, Title: "Homepage returned an error status", Recommendation: "Fix status."},
	}
	report, _ := Rules("https://example.com", checks)
	if len(report.Issues) != 1 || report.Issues[0].CheckKey != "seo.http_status" {
		t.Fatalf("%+v", report.Issues)
	}
}
