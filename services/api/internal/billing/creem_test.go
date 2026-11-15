package billing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func hmacHex(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func TestParseCheckoutEvent(t *testing.T) {
	body := []byte(`{
	  "id": "evt_1",
	  "eventType": "checkout.completed",
	  "object": {
	    "metadata": {"user_id": "user-1"},
	    "customer": {"id": "cust_1", "email": "a@example.com"},
	    "subscription": {"id": "sub_1", "status": "active"}
	  }
	}`)
	ev, err := ParseEvent(body)
	if err != nil {
		t.Fatal(err)
	}
	if !ev.Grant || ev.UserID != "user-1" || ev.CustomerID != "cust_1" || ev.SubID != "sub_1" {
		t.Fatalf("%+v", ev)
	}
}

func TestSignature(t *testing.T) {
	body := []byte(`{"id":"evt_1"}`)
	secret := "whsec_test"
	mac := hmacHex(secret, body)
	if !VerifySignature(secret, body, mac) {
		t.Fatal("expected valid signature")
	}
	if VerifySignature(secret, body, "deadbeef") {
		t.Fatal("expected invalid signature to fail")
	}
}
