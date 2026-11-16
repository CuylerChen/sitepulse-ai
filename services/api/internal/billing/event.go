package billing

import (
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"time"
)

var uuidRe = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

func IsUUID(value string) bool {
	return uuidRe.MatchString(strings.TrimSpace(value))
}

type Event struct {
	ID         string
	Type       string
	UserID     string
	Email      string
	CustomerID string
	SubID      string
	Status     string
	PeriodEnd  *time.Time
	Grant      bool
	Revoke     bool
}

func ParseEvent(body []byte) (Event, error) {
	var raw struct {
		ID        string `json:"id"`
		EventType string `json:"eventType"`
		EventID   string `json:"eventId"`
		Data      struct {
			OrderID                       string            `json:"orderId"`
			OrderStatus                   string            `json:"orderStatus"`
			BuyerEmail                    string            `json:"buyerEmail"`
			MerchantProvidedBuyerIdentity string            `json:"merchantProvidedBuyerIdentity"`
			OrderMerchantExternalID       string            `json:"orderMerchantExternalId"`
			OrderMetadata                 map[string]string `json:"orderMetadata"`
			CurrentPeriodEnd              string            `json:"currentPeriodEnd"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return Event{}, err
	}
	ev := Event{
		ID:         firstNonEmpty(raw.ID, raw.EventID),
		Type:       raw.EventType,
		Email:      strings.ToLower(strings.TrimSpace(raw.Data.BuyerEmail)),
		CustomerID: raw.Data.MerchantProvidedBuyerIdentity,
		SubID:      raw.Data.OrderID,
		Status:     raw.Data.OrderStatus,
	}
	if raw.Data.OrderMetadata != nil {
		ev.UserID = firstNonEmpty(raw.Data.OrderMetadata["user_id"], raw.Data.OrderMetadata["userId"])
	}
	if ev.UserID == "" {
		ev.UserID = firstNonEmpty(raw.Data.OrderMerchantExternalID, raw.Data.MerchantProvidedBuyerIdentity)
	}
	if ev.Status == "" {
		ev.Status = statusFor(ev.Type)
	}
	ev.PeriodEnd = parseTime(raw.Data.CurrentPeriodEnd)
	switch ev.Type {
	case "subscription.activated", "subscription.payment_succeeded", "subscription.renewed", "subscription.recovered", "subscription.uncanceled", "subscription.plan_changed":
		ev.Grant = true
	case "subscription.canceled", "subscription.past_due", "refund.succeeded":
		ev.Revoke = true
	case "subscription.canceling":
		ev.Status = "canceling"
	}
	if ev.ID == "" || ev.Type == "" {
		return Event{}, errors.New("webhook payload is missing an event id")
	}
	return ev, nil
}

func statusFor(eventType string) string {
	switch eventType {
	case "subscription.activated", "subscription.payment_succeeded", "subscription.renewed", "subscription.recovered", "subscription.uncanceled", "subscription.plan_changed":
		return "active"
	case "subscription.canceling":
		return "canceling"
	case "subscription.canceled", "refund.succeeded":
		return "canceled"
	case "subscription.past_due":
		return "past_due"
	default:
		return ""
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func parseTime(value string) *time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	for _, layout := range []string{time.RFC3339, time.RFC3339Nano, "2006-01-02"} {
		if t, err := time.Parse(layout, value); err == nil {
			return &t
		}
	}
	return nil
}
