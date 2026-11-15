package pagespeed

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"sitepulse.ai/api/internal/models"
)

type Client struct {
	APIKey string
	HTTP   *http.Client
	Cache  Cache
}

type Cache interface {
	Get(ctx context.Context, key, strategy string) ([]byte, bool)
	Put(ctx context.Context, key, strategy string, payload []byte)
}

func (c *Client) Run(ctx context.Context, rawURL, strategy string) (*models.PSIResult, error) {
	if c.APIKey == "" {
		return nil, fmt.Errorf("pagespeed api key is not configured")
	}
	if c.HTTP == nil {
		c.HTTP = &http.Client{Timeout: 35 * time.Second}
	}
	key := hashURL(rawURL)
	if c.Cache != nil {
		if payload, ok := c.Cache.Get(ctx, key, strategy); ok {
			var cached models.PSIResult
			if json.Unmarshal(payload, &cached) == nil {
				return &cached, nil
			}
		}
	}
	q := url.Values{}
	q.Set("url", rawURL)
	q.Set("strategy", strategy)
	q.Set("key", c.APIKey)
	for _, category := range []string{"PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"} {
		q.Add("category", category)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?"+q.Encode(), nil)
	if err != nil {
		return nil, err
	}
	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("pagespeed returned %d", res.StatusCode)
	}
	parsed, err := Parse(body)
	if err != nil {
		return nil, err
	}
	if c.Cache != nil {
		if encoded, err := json.Marshal(parsed); err == nil {
			c.Cache.Put(ctx, key, strategy, encoded)
		}
	}
	return parsed, nil
}

func hashURL(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func Parse(body []byte) (*models.PSIResult, error) {
	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	out := &models.PSIResult{FieldData: "not_available"}
	lh, _ := raw["lighthouseResult"].(map[string]any)
	cats, _ := lh["categories"].(map[string]any)
	out.PerformanceScore = categoryScore(cats, "performance")
	out.AccessibilityScore = categoryScore(cats, "accessibility")
	out.BestPracticesScore = categoryScore(cats, "best-practices")
	out.SEOScore = categoryScore(cats, "seo")
	audits, _ := lh["audits"].(map[string]any)
	out.LCPMs = auditMS(audits, "largest-contentful-paint")
	out.FCPMs = auditMS(audits, "first-contentful-paint")
	out.TTFBMs = auditMS(audits, "server-response-time")
	out.INPMs = auditMS(audits, "interaction-to-next-paint")
	if v := auditNumber(audits, "cumulative-layout-shift"); v != nil {
		out.CLS = v
	}
	if exp, ok := raw["loadingExperience"].(map[string]any); ok {
		if metrics, ok := exp["metrics"].(map[string]any); ok && len(metrics) > 0 {
			out.FieldData = "available"
		}
	}
	if out.PerformanceScore == nil && out.LCPMs == nil {
		return nil, fmt.Errorf("pagespeed payload did not include lighthouse scores")
	}
	return out, nil
}

func categoryScore(cats map[string]any, name string) *int {
	cat, _ := cats[name].(map[string]any)
	score, ok := cat["score"].(float64)
	if !ok {
		return nil
	}
	v := int(score*100 + 0.5)
	return &v
}

func auditMS(audits map[string]any, name string) *int {
	n := auditNumber(audits, name)
	if n == nil {
		return nil
	}
	v := int(*n + 0.5)
	return &v
}

func auditNumber(audits map[string]any, name string) *float64 {
	audit, _ := audits[name].(map[string]any)
	switch v := audit["numericValue"].(type) {
	case float64:
		return &v
	case string:
		f, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return nil
		}
		return &f
	default:
		return nil
	}
}
