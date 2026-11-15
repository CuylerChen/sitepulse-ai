package urlguard

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
	"time"
	"unicode"
)

const maxURLLength = 2048

var (
	ErrInvalidURL = errors.New("Please enter a valid public website URL.")
	ErrBlocked    = errors.New("That address cannot be scanned. Use a public website URL.")
)

var blockedHosts = map[string]struct{}{
	"localhost":               {},
	"localhost.localdomain":   {},
	"metadata.google.internal": {},
	"metadata.google.com":     {},
	"instance-data":           {},
}

var blockedSuffixes = []string{
	".local",
	".localhost",
	".internal",
	".intranet",
	".lan",
	".home",
	".corp",
	".localdomain",
}

var blockedNets []*net.IPNet

func init() {
	for _, cidr := range []string{
		"0.0.0.0/8",
		"100.64.0.0/10",
		"169.254.0.0/16",
		"192.0.0.0/24",
		"192.0.2.0/24",
		"198.18.0.0/15",
		"198.51.100.0/24",
		"203.0.113.0/24",
		"224.0.0.0/4",
		"240.0.0.0/4",
		"255.255.255.255/32",
		"100.100.100.200/32",
		"::1/128",
		"fc00::/7",
		"fe80::/10",
		"2001:db8::/32",
		"ff00::/8",
	} {
		_, n, err := net.ParseCIDR(cidr)
		if err != nil {
			panic(err)
		}
		blockedNets = append(blockedNets, n)
	}
}

type Resolver interface {
	LookupIPAddr(ctx context.Context, host string) ([]net.IPAddr, error)
}

type Result struct {
	URL      *url.URL
	Host     string
	Port     string
	IPs      []net.IP
	Original string
}

func Normalize(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || len(raw) > maxURLLength {
		return "", ErrInvalidURL
	}
	if strings.ContainsAny(raw, " \t\r\n") {
		return "", ErrInvalidURL
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return "", ErrInvalidURL
	}
	scheme := strings.ToLower(u.Scheme)
	if scheme != "http" && scheme != "https" {
		return "", ErrInvalidURL
	}
	if u.User != nil {
		return "", ErrBlocked
	}
	host := strings.TrimSuffix(strings.ToLower(u.Hostname()), ".")
	if host == "" || !validHostname(host) {
		return "", ErrInvalidURL
	}
	port := u.Port()
	if port != "" && port != "80" && port != "443" {
		return "", ErrBlocked
	}
	if scheme == "http" && port == "443" {
		return "", ErrBlocked
	}
	if scheme == "https" && port == "80" {
		return "", ErrBlocked
	}
	u.Scheme = scheme
	u.Host = host
	if port != "" {
		u.Host = net.JoinHostPort(host, port)
	}
	u.Fragment = ""
	return u.String(), nil
}

func Validate(ctx context.Context, raw string, resolver Resolver) (*Result, error) {
	normalized, err := Normalize(raw)
	if err != nil {
		return nil, err
	}
	u, err := url.Parse(normalized)
	if err != nil {
		return nil, ErrInvalidURL
	}
	host := u.Hostname()
	if blockedHost(host) {
		return nil, ErrBlocked
	}
	port := u.Port()
	if port == "" {
		if u.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}
	if ip := net.ParseIP(host); ip != nil {
		if BlockedIP(ip) {
			return nil, ErrBlocked
		}
		return &Result{URL: u, Host: host, Port: port, IPs: []net.IP{ip}, Original: raw}, nil
	}
	if resolver == nil {
		resolver = net.DefaultResolver
	}
	lookupCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	addrs, err := resolver.LookupIPAddr(lookupCtx, host)
	if err != nil || len(addrs) == 0 {
		return nil, fmt.Errorf("%w The domain could not be resolved.", ErrInvalidURL)
	}
	ips := make([]net.IP, 0, len(addrs))
	for _, addr := range addrs {
		if BlockedIP(addr.IP) {
			return nil, ErrBlocked
		}
		ips = append(ips, addr.IP)
	}
	return &Result{URL: u, Host: host, Port: port, IPs: ips, Original: raw}, nil
}

func BlockedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() || ip.IsInterfaceLocalMulticast() {
		return true
	}
	if v4 := ip.To4(); v4 != nil {
		ip = v4
	}
	for _, n := range blockedNets {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

func blockedHost(host string) bool {
	if _, ok := blockedHosts[host]; ok {
		return true
	}
	for _, suffix := range blockedSuffixes {
		if strings.HasSuffix(host, suffix) {
			return true
		}
	}
	return false
}

func validHostname(host string) bool {
	if net.ParseIP(host) != nil {
		return true
	}
	if len(host) > 253 {
		return false
	}
	labels := strings.Split(host, ".")
	if len(labels) < 2 {
		return false
	}
	for _, label := range labels {
		if label == "" || len(label) > 63 {
			return false
		}
		if strings.Contains(label, "0x") || strings.Contains(label, "%") {
			return false
		}
		for i, r := range label {
			if unicode.IsLetter(r) || unicode.IsDigit(r) {
				continue
			}
			if r == '-' && i > 0 && i < len(label)-1 {
				continue
			}
			return false
		}
	}
	last := labels[len(labels)-1]
	hasLetter := false
	for _, r := range last {
		if unicode.IsLetter(r) {
			hasLetter = true
			break
		}
	}
	return hasLetter
}

func SameHost(a, b string) bool {
	return strings.EqualFold(strings.TrimSuffix(a, "."), strings.TrimSuffix(b, "."))
}
