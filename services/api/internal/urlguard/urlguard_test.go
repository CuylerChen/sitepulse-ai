package urlguard

import (
	"context"
	"net"
	"testing"
)

type fakeResolver struct {
	ips []net.IP
	err error
}

func (f fakeResolver) LookupIPAddr(ctx context.Context, host string) ([]net.IPAddr, error) {
	if f.err != nil {
		return nil, f.err
	}
	out := make([]net.IPAddr, len(f.ips))
	for i, ip := range f.ips {
		out[i] = net.IPAddr{IP: ip}
	}
	return out, nil
}

func TestNormalizeAddsHTTPS(t *testing.T) {
	got, err := Normalize("Example.com/path")
	if err != nil {
		t.Fatal(err)
	}
	if got != "https://example.com/path" {
		t.Fatalf("got %s", got)
	}
}

func TestRejectsPrivateAndMetadata(t *testing.T) {
	ctx := context.Background()
	cases := []string{
		"http://127.0.0.1",
		"http://localhost",
		"http://10.1.2.3",
		"http://192.168.1.10",
		"http://169.254.169.254",
		"http://metadata.google.internal",
		"https://example.com:8080",
		"file:///etc/passwd",
		"http://user:pass@example.com",
		"http://2130706433",
	}
	for _, raw := range cases {
		if _, err := Validate(ctx, raw, fakeResolver{ips: []net.IP{net.ParseIP("1.1.1.1")}}); err == nil {
			t.Fatalf("expected block for %s", raw)
		}
	}
}

func TestRejectsMixedDNS(t *testing.T) {
	_, err := Validate(context.Background(), "https://shop.example", fakeResolver{ips: []net.IP{
		net.ParseIP("1.1.1.1"),
		net.ParseIP("10.0.0.4"),
	}})
	if err == nil {
		t.Fatal("expected mixed public/private DNS to be blocked")
	}
}

func TestAllowsPublicIP(t *testing.T) {
	res, err := Validate(context.Background(), "https://shop.example/products/hat", fakeResolver{ips: []net.IP{net.ParseIP("93.184.216.34")}})
	if err != nil {
		t.Fatal(err)
	}
	if res.Port != "443" || res.Host != "shop.example" {
		t.Fatalf("%+v", res)
	}
}

func TestBlockedIP(t *testing.T) {
	if !BlockedIP(net.ParseIP("100.64.0.1")) || !BlockedIP(net.ParseIP("100.100.100.200")) || !BlockedIP(net.ParseIP("::1")) {
		t.Fatal("expected special ranges to be blocked")
	}
	if BlockedIP(net.ParseIP("8.8.8.8")) {
		t.Fatal("public IP should be allowed")
	}
}
