package pagespeed

import "testing"

func TestParseDoesNotInventMissingFieldData(t *testing.T) {
	body := []byte(`{
	  "lighthouseResult": {
	    "categories": {"performance": {"score": 0.72}, "seo": {"score": 0.91}},
	    "audits": {
	      "largest-contentful-paint": {"numericValue": 2400},
	      "cumulative-layout-shift": {"numericValue": 0.04}
	    }
	  }
	}`)
	got, err := Parse(body)
	if err != nil {
		t.Fatal(err)
	}
	if got.PerformanceScore == nil || *got.PerformanceScore != 72 {
		t.Fatalf("score %+v", got.PerformanceScore)
	}
	if got.INPMs != nil || got.FieldData != "not_available" {
		t.Fatalf("invented data: %+v", got)
	}
	if got.LCPMs == nil || *got.LCPMs != 2400 {
		t.Fatalf("lcp %+v", got.LCPMs)
	}
}
