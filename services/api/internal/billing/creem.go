package billing

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	APIKey        string
	BaseURL       string
	WebhookSecret string
	ProductID     string
	HTTP          *http.Client
}

func (c Client) Enabled() bool {
	return c.APIKey != "" && c.ProductID != ""
}

func (c Client) Checkout(ctx context.Context, userID, email, successURL string) (string, error) {
	if !c.Enabled() {
		return "", errors.New("billing is not configured")
	}
	body, _ := json.Marshal(map[string]any{
		"product_id":  c.ProductID,
		"request_id":  userID,
		"success_url": successURL,
		"customer":    map[string]string{"email": email},
		"metadata":    map[string]string{"user_id": userID},
	})
	var parsed struct {
		CheckoutURL string `json:"checkout_url"`
	}
	if err := c.post(ctx, "/v1/checkouts", body, &parsed); err != nil {
		return "", err
	}
	if parsed.CheckoutURL == "" {
		return "", errors.New("checkout did not return a URL")
	}
	return parsed.CheckoutURL, nil
}

func (c Client) Portal(ctx context.Context, customerID string) (string, error) {
	if c.APIKey == "" || customerID == "" {
		return "", errors.New("billing portal is not available")
	}
	body, _ := json.Marshal(map[string]string{"customer_id": customerID})
	var parsed struct {
		Link string `json:"customer_portal_link"`
	}
	if err := c.post(ctx, "/v1/customers/billing", body, &parsed); err != nil {
		return "", err
	}
	if parsed.Link == "" {
		return "", errors.New("billing portal is not available")
	}
	return parsed.Link, nil
}

func (c Client) post(ctx context.Context, path string, body []byte, dest any) error {
	if c.HTTP == nil {
		c.HTTP = &http.Client{Timeout: 15 * time.Second}
	}
	base := c.BaseURL
	if base == "" {
		base = "https://api.creem.io"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(base, "/")+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("x-api-key", c.APIKey)
	req.Header.Set("Content-Type", "application/json")
	res, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode >= 300 {
		return fmt.Errorf("billing provider returned %d", res.StatusCode)
	}
	return json.Unmarshal(raw, dest)
}

func VerifySignature(secret string, body []byte, header string) bool {
	if secret == "" || header == "" {
		return false
	}
	header = strings.TrimPrefix(strings.TrimSpace(header), "sha256=")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(strings.ToLower(header)))
}

type Event struct {
	ID         string
	Type       string
	UserID     string
	Email      string
	CustomerID string
	SubID      string
	Status     string
	Grant      bool
	Revoke     bool
}

func ParseEvent(body []byte) (Event, error) {
	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return Event{}, err
	}
	ev := Event{
		ID:   firstString(raw, "id", "event_id"),
		Type: firstString(raw, "eventType", "event_type", "type"),
	}
	obj, _ := raw["object"].(map[string]any)
	ev.UserID = findUserID(raw, obj)
	ev.Email = findEmail(raw, obj)
	ev.CustomerID = findID(obj, "customer")
	ev.SubID = findID(obj, "subscription")
	if ev.SubID == "" && obj != nil {
		if firstString(obj, "object") == "subscription" {
			ev.SubID = firstString(obj, "id")
			ev.Status = firstString(obj, "status")
		}
	}
	if ev.Status == "" && obj != nil {
		if sub, ok := obj["subscription"].(map[string]any); ok {
			ev.Status = firstString(sub, "status")
		}
	}
	switch ev.Type {
	case "checkout.completed", "subscription.paid", "subscription.active":
		ev.Grant = true
	case "subscription.canceled", "subscription.expired":
		ev.Revoke = true
	}
	if ev.ID == "" || ev.Type == "" {
		return Event{}, errors.New("webhook payload is missing an event id")
	}
	return ev, nil
}

func findUserID(raw map[string]any, obj map[string]any) string {
	candidates := []map[string]any{raw, obj}
	if obj != nil {
		if sub, ok := obj["subscription"].(map[string]any); ok {
			candidates = append(candidates, sub)
		}
		if md, ok := obj["metadata"].(map[string]any); ok {
			candidates = append(candidates, md)
		}
	}
	if md, ok := raw["metadata"].(map[string]any); ok {
		candidates = append(candidates, md)
	}
	for _, c := range candidates {
		if c == nil {
			continue
		}
		if id := firstString(c, "user_id", "userId", "referenceId"); id != "" {
			return id
		}
		if md, ok := c["metadata"].(map[string]any); ok {
			if id := firstString(md, "user_id", "userId", "referenceId"); id != "" {
				return id
			}
		}
	}
	return ""
}

func findEmail(raw map[string]any, obj map[string]any) string {
	for _, c := range []map[string]any{obj, raw} {
		if c == nil {
			continue
		}
		if email := firstString(c, "email"); email != "" {
			return email
		}
		if cust, ok := c["customer"].(map[string]any); ok {
			if email := firstString(cust, "email"); email != "" {
				return email
			}
		}
	}
	return ""
}

func findID(obj map[string]any, key string) string {
	if obj == nil {
		return ""
	}
	switch v := obj[key].(type) {
	case string:
		return v
	case map[string]any:
		return firstString(v, "id")
	default:
		return ""
	}
}

func firstString(m map[string]any, keys ...string) string {
	if m == nil {
		return ""
	}
	for _, key := range keys {
		if s, ok := m[key].(string); ok && s != "" {
			return s
		}
	}
	return ""
}
