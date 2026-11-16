package billing

import "testing"

func TestParseActivatedEvent(t *testing.T) {
	body := []byte(`{
	  "id": "evt_1",
	  "eventType": "subscription.activated",
	  "data": {
	    "orderId": "ORD_1",
	    "orderStatus": "active",
	    "buyerEmail": "a@example.com",
	    "merchantProvidedBuyerIdentity": "user-1",
	    "orderMerchantExternalId": "user-1",
	    "orderMetadata": {"user_id": "user-1"},
	    "currentPeriodEnd": "2026-12-16T00:00:00Z"
	  }
	}`)
	ev, err := ParseEvent(body)
	if err != nil {
		t.Fatal(err)
	}
	if !ev.Grant || ev.Revoke || ev.UserID != "user-1" || ev.SubID != "ORD_1" || ev.PeriodEnd == nil {
		t.Fatalf("%+v", ev)
	}
}

func TestParseCanceledEvent(t *testing.T) {
	body := []byte(`{"id":"evt_2","eventType":"subscription.canceled","data":{"orderId":"ORD_1","buyerEmail":"a@example.com","merchantProvidedBuyerIdentity":"user-1"}}`)
	ev, err := ParseEvent(body)
	if err != nil {
		t.Fatal(err)
	}
	if !ev.Revoke || ev.Grant || ev.Status != "canceled" {
		t.Fatalf("%+v", ev)
	}
}

func TestParseDateOnlyPeriodEnd(t *testing.T) {
	body := []byte(`{"id":"evt_4","eventType":"subscription.activated","data":{"orderId":"ORD_1","merchantProvidedBuyerIdentity":"11111111-1111-1111-1111-111111111111","currentPeriodEnd":"2026-12-16"}}`)
	ev, err := ParseEvent(body)
	if err != nil {
		t.Fatal(err)
	}
	if ev.PeriodEnd == nil {
		t.Fatal("expected period end")
	}
	if !IsUUID(ev.UserID) {
		t.Fatalf("expected uuid user id, got %q", ev.UserID)
	}
}

func TestParseCancelingKeepsAccess(t *testing.T) {
	body := []byte(`{"id":"evt_3","eventType":"subscription.canceling","data":{"orderId":"ORD_1","merchantProvidedBuyerIdentity":"user-1"}}`)
	ev, err := ParseEvent(body)
	if err != nil {
		t.Fatal(err)
	}
	if ev.Grant || ev.Revoke || ev.Status != "canceling" {
		t.Fatalf("%+v", ev)
	}
}
