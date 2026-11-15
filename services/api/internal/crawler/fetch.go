package crawler

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptrace"
	"net/url"
	"strings"
	"time"

	"sitepulse.ai/api/internal/urlguard"
)

const (
	MaxBodyBytes = 5 * 1024 * 1024
	MaxHTMLParse = 2 * 1024 * 1024
	MaxRobots    = 512 * 1024
	MaxSitemap   = 1 * 1024 * 1024
	MaxRedirects = 3
	FetchTimeout = 10 * time.Second
	UserAgent    = "SitePulseBot/1.0 (+https://sitepulse.ai/bot; single-page audit requested by the site visitor)"
)

type FetchResult struct {
	Status      int
	FinalURL    *url.URL
	Headers     http.Header
	Body        []byte
	Truncated   bool
	Redirects   []string
	TTFB        time.Duration
	ContentType string
}

type Fetcher struct {
	Resolver urlguard.Resolver
}

func (f *Fetcher) Fetch(ctx context.Context, raw string, limit int64) (*FetchResult, error) {
	validated, err := urlguard.Validate(ctx, raw, f.Resolver)
	if err != nil {
		return nil, err
	}
	client := f.client(limit)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, validated.URL.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", UserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	var ttfb time.Duration
	start := time.Now()
	trace := &httptrace.ClientTrace{
		GotFirstResponseByte: func() {
			ttfb = time.Since(start)
		},
	}
	req = req.WithContext(httptrace.WithClientTrace(req.Context(), trace))
	res, err := client.Do(req)
	if err != nil {
		return nil, friendlyFetchError(err)
	}
	defer res.Body.Close()
	body, truncated, err := readLimited(res.Body, limit)
	if err != nil {
		return nil, err
	}
	finalURL := res.Request.URL
	if finalURL == nil {
		finalURL = validated.URL
	}
	redirects := redirectChain(res)
	return &FetchResult{
		Status:      res.StatusCode,
		FinalURL:    finalURL,
		Headers:     res.Header.Clone(),
		Body:        body,
		Truncated:   truncated,
		Redirects:   redirects,
		TTFB:        ttfb,
		ContentType: res.Header.Get("Content-Type"),
	}, nil
}

func (f *Fetcher) client(limit int64) *http.Client {
	transport := &http.Transport{
		Proxy: nil,
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, err
			}
			if port != "80" && port != "443" {
				return nil, urlguard.ErrBlocked
			}
			scheme := "https"
			if port == "80" {
				scheme = "http"
			}
			target := (&url.URL{Scheme: scheme, Host: net.JoinHostPort(host, port)}).String()
			validated, err := urlguard.Validate(ctx, target, f.Resolver)
			if err != nil {
				return nil, err
			}
			ip := validated.IPs[0]
			dialer := &net.Dialer{Timeout: FetchTimeout}
			return dialer.DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
		},
		TLSHandshakeTimeout:   FetchTimeout,
		ResponseHeaderTimeout: FetchTimeout,
		DisableKeepAlives:     true,
		MaxIdleConns:          0,
	}
	return &http.Client{
		Timeout:   FetchTimeout,
		Transport: transport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= MaxRedirects {
				return errors.New("this site redirected too many times")
			}
			if _, err := urlguard.Validate(req.Context(), req.URL.String(), f.Resolver); err != nil {
				return err
			}
			req.Header.Set("User-Agent", UserAgent)
			return nil
		},
	}
}

func readLimited(r io.Reader, limit int64) ([]byte, bool, error) {
	if limit <= 0 {
		limit = MaxBodyBytes
	}
	buf, err := io.ReadAll(io.LimitReader(r, limit+1))
	if err != nil {
		return nil, false, errors.New("the site response could not be read")
	}
	if int64(len(buf)) > limit {
		return buf[:limit], true, nil
	}
	return buf, false, nil
}

func redirectChain(res *http.Response) []string {
	var chain []string
	for res != nil && res.Request != nil {
		chain = append([]string{res.Request.URL.String()}, chain...)
		res = res.Request.Response
		if len(chain) > MaxRedirects+1 {
			break
		}
	}
	if len(chain) <= 1 {
		return nil
	}
	return chain[:len(chain)-1]
}

func friendlyFetchError(err error) error {
	msg := err.Error()
	switch {
	case errors.Is(err, urlguard.ErrBlocked), errors.Is(err, urlguard.ErrInvalidURL):
		return err
	case strings.Contains(msg, "too many times"):
		return errors.New("this site redirected too many times")
	case strings.Contains(strings.ToLower(msg), "timeout") || errors.Is(err, context.DeadlineExceeded):
		return errors.New("the site took too long to respond")
	default:
		return fmt.Errorf("the site could not be reached")
	}
}

func SafeHeader(h http.Header, key string) string {
	if h == nil {
		return ""
	}
	return strings.TrimSpace(h.Get(key))
}
