package models

import "time"

const (
	StatusPass    = "pass"
	StatusWarning = "warning"
	StatusFail    = "fail"
	StatusUnknown = "unknown"

	SeverityCritical = "critical"
	SeverityHigh     = "high"
	SeverityMedium   = "medium"
	SeverityLow      = "low"
	SeverityInfo     = "info"
)

type Check struct {
	Category       string         `json:"category"`
	CheckKey       string         `json:"check_key"`
	Status         string         `json:"status"`
	Score          int            `json:"score"`
	MaxScore       int            `json:"max_score"`
	Severity       string         `json:"severity"`
	Title          string         `json:"title"`
	Description    string         `json:"description"`
	Evidence       map[string]any `json:"evidence"`
	Recommendation string         `json:"recommendation"`
}

type Scores struct {
	SEO         *int               `json:"seo"`
	Performance *int               `json:"performance"`
	AIReadiness *int               `json:"ai_readiness"`
	Content     *int               `json:"content"`
	Overall     *int               `json:"overall"`
	Grade       string             `json:"grade"`
	GradeLabel  string             `json:"grade_label"`
	Weights     map[string]float64 `json:"weights"`
	Notes       []string           `json:"notes,omitempty"`
}

type PSIResult struct {
	PerformanceScore   *int    `json:"performance_score"`
	AccessibilityScore *int    `json:"accessibility_score"`
	BestPracticesScore *int    `json:"best_practices_score"`
	SEOScore           *int    `json:"seo_score"`
	LCPMs              *int    `json:"lcp_ms"`
	CLS                *float64 `json:"cls"`
	INPMs              *int    `json:"inp_ms"`
	FCPMs              *int    `json:"fcp_ms"`
	TTFBMs             *int    `json:"ttfb_ms"`
	FieldData          string  `json:"field_data"`
}

type PerformanceReport struct {
	Available bool       `json:"available"`
	Reason    string     `json:"reason,omitempty"`
	Mobile    *PSIResult `json:"mobile"`
	Desktop   *PSIResult `json:"desktop"`
	OriginTTFBMs *int    `json:"origin_ttfb_ms,omitempty"`
}

type Issue struct {
	CheckKey            string   `json:"check_key"`
	Severity            string   `json:"severity"`
	Problem             string   `json:"problem"`
	Impact              string   `json:"impact"`
	RecommendedFix      string   `json:"recommended_fix"`
	ImplementationSteps []string `json:"implementation_steps"`
	SuggestedCopy       string   `json:"suggested_copy,omitempty"`
}

type QuickWin struct {
	CheckKey string `json:"check_key"`
	Title    string `json:"title"`
	Action   string `json:"action"`
}

type AIReport struct {
	Version  string `json:"version"`
	Summary  struct {
		Headline    string `json:"headline"`
		Description string `json:"description"`
		TopPriority string `json:"top_priority"`
	} `json:"summary"`
	Issues      []Issue   `json:"issues"`
	QuickWins   []QuickWin `json:"quick_wins"`
	Disclaimers []string  `json:"disclaimers"`
}

type AIMeta struct {
	Model         string
	PromptVersion string
	InputTokens   int
	OutputTokens  int
	Source        string
}

type ShareInfo struct {
	Token    string `json:"token"`
	IsPublic bool   `json:"is_public"`
	URL      string `json:"url"`
}

type AuditView struct {
	ID            string    `json:"id"`
	RequestedURL  string    `json:"requested_url"`
	FinalURL      string    `json:"final_url,omitempty"`
	Domain        string    `json:"domain,omitempty"`
	Status        string    `json:"status"`
	Progress      string    `json:"progress"`
	OverallScore  *int      `json:"overall_score"`
	Grade         string    `json:"grade,omitempty"`
	GradeLabel    string    `json:"grade_label,omitempty"`
	Scores        *Scores   `json:"scores,omitempty"`
	Platform      string    `json:"platform,omitempty"`
	ScannedAt     *time.Time `json:"scanned_at,omitempty"`
	ErrorMessage  string    `json:"error_message,omitempty"`
	CreatedAt     time.Time `json:"created_at,omitempty"`
}

type Report struct {
	Audit       AuditView          `json:"audit"`
	Checks      []Check            `json:"checks,omitempty"`
	AIReport    *AIReport          `json:"ai_report,omitempty"`
	Performance *PerformanceReport `json:"performance,omitempty"`
	Share       *ShareInfo         `json:"share,omitempty"`
	Disclaimer  string             `json:"disclaimer,omitempty"`
}

const Disclaimer = "AI Readiness measures whether crawlers can access and understand the site. It is not a ranking in ChatGPT, Google, or Perplexity, and it is not a promise of traffic."

func IntPtr(v int) *int { return &v }

func GradeFor(score int) (grade, label string) {
	switch {
	case score >= 90:
		return "Excellent", "Strong technical foundation"
	case score >= 75:
		return "Good", "Good, but needs work"
	case score >= 60:
		return "Needs work", "Several important gaps"
	case score >= 40:
		return "Poor", "Significant issues to fix"
	default:
		return "Critical", "Major blockers found"
	}
}
