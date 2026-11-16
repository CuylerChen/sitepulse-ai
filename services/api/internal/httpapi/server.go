package httpapi

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"sitepulse.ai/api/internal/aireport"
	"sitepulse.ai/api/internal/audit"
	"sitepulse.ai/api/internal/billing"
	"sitepulse.ai/api/internal/config"
	"sitepulse.ai/api/internal/crawler"
	"sitepulse.ai/api/internal/models"
	"sitepulse.ai/api/internal/pagespeed"
	"sitepulse.ai/api/internal/storage"
	"sitepulse.ai/api/internal/urlguard"
)

type Server struct {
	cfg     config.Config
	store   *storage.Store
	log     *slog.Logger
	limiter *limiter
	psi     *pagespeed.Client
	ai      aireport.Generator
}

func New(cfg config.Config, store *storage.Store, log *slog.Logger) *Server {
	return &Server{
		cfg: cfg, store: store, log: log, limiter: newLimiter(),
		psi: &pagespeed.Client{APIKey: cfg.PageSpeedAPIKey, Cache: store},
		ai:  aireport.Generator{APIKey: cfg.LLMAPIKey, BaseURL: cfg.LLMBaseURL, Model: cfg.LLMModel},
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", s.health)
	mux.HandleFunc("POST /v1/audits", s.createAudit)
	mux.HandleFunc("GET /v1/audits", s.listAudits)
	mux.HandleFunc("GET /v1/audits/{id}", s.getAudit)
	mux.HandleFunc("GET /v1/audits/{id}/result", s.getAudit)
	mux.HandleFunc("POST /v1/audits/{id}/retry", s.retryAudit)
	mux.HandleFunc("DELETE /v1/audits/{id}", s.deleteAudit)
	mux.HandleFunc("GET /v1/reports/{id}", s.getAudit)
	mux.HandleFunc("POST /v1/reports/{id}/share", s.shareReport)
	mux.HandleFunc("DELETE /v1/reports/share/{token}", s.revokeShare)
	mux.HandleFunc("GET /v1/public/reports/{token}", s.publicReport)
	mux.HandleFunc("POST /v1/auth/register", s.register)
	mux.HandleFunc("POST /v1/auth/login", s.login)
	mux.HandleFunc("POST /v1/auth/logout", s.logout)
	mux.HandleFunc("GET /v1/users/me", s.me)
	mux.HandleFunc("PATCH /v1/users/me", s.updateMe)
	mux.HandleFunc("GET /v1/usage", s.usage)
	mux.HandleFunc("GET /v1/websites", s.listWebsites)
	mux.HandleFunc("DELETE /v1/websites/{id}", s.deleteWebsite)
	mux.HandleFunc("GET /v1/billing/plans", s.plans)
	mux.HandleFunc("GET /v1/billing/subscription", s.subscription)
	mux.HandleFunc("POST /v1/billing/dev-upgrade", s.devUpgrade)
	mux.HandleFunc("POST /v1/webhooks/waffo", s.waffoWebhook)
	mux.HandleFunc("POST /v1/contact", s.contact)
	return s.wrap(mux)
}

func (s *Server) StartWorkers(ctx context.Context, n int) {
	if n < 1 {
		n = 1
	}
	for i := 0; i < n; i++ {
		go s.worker(ctx, i)
	}
}

func (s *Server) worker(ctx context.Context, id int) {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	workerID := "worker-" + string(rune('a'+id))
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.processJob(ctx, workerID)
		}
	}
}

func (s *Server) processJob(ctx context.Context, workerID string) {
	job, err := s.store.ClaimJob(ctx, workerID)
	if err != nil || job == nil {
		return
	}
	defer func() {
		if rec := recover(); rec != nil {
			_ = s.store.FailAudit(context.Background(), job.AuditID, "the audit stopped unexpectedly", false)
		}
	}()
	rawURL, _, err := s.store.AuditRequest(ctx, job.AuditID)
	if err != nil {
		_ = s.store.FailAudit(ctx, job.AuditID, "the audit request could not be loaded", false)
		return
	}
	runCtx, cancel := context.WithTimeout(ctx, 80*time.Second)
	defer cancel()
	ai := s.ai
	if tokens, err := s.store.MonthlyTokens(ctx); err == nil && tokens >= s.cfg.AIMonthlyTokenCap {
		ai.APIKey = ""
	}
	result, err := audit.Execute(runCtx, rawURL, audit.Options{
		Fetcher: &crawler.Fetcher{}, PageSpeed: s.psi, AI: ai, IncludePerformance: true,
		Progress: func(stage string) { _ = s.store.SetProgress(ctx, job.AuditID, stage) },
	})
	if err != nil {
		retry := job.Attempt < 2 && !errors.Is(err, urlguard.ErrBlocked) && !errors.Is(err, urlguard.ErrInvalidURL)
		_ = s.store.FailAudit(ctx, job.AuditID, err.Error(), retry)
		return
	}
	token, err := storage.RandomToken(18)
	if err != nil {
		_ = s.store.FailAudit(ctx, job.AuditID, "could not create a report link", true)
		return
	}
	report := models.Report{
		Audit: models.AuditView{
			FinalURL: result.FinalURL, Domain: result.Domain, Platform: result.Platform, Scores: &result.Scores,
			Grade: result.Scores.Grade, GradeLabel: result.Scores.GradeLabel, OverallScore: result.Scores.Overall,
		},
		Checks: result.Checks, AIReport: &result.AIReport, Performance: result.Performance,
	}
	if err := s.store.SaveResult(ctx, job.AuditID, report, result.AIMeta, token); err != nil {
		s.log.Error("save audit", "err", err, "audit_id", job.AuditID)
		_ = s.store.FailAudit(ctx, job.AuditID, "the report could not be saved", true)
	}
}

func (s *Server) wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := "req_" + randHex(6)
		w.Header().Set("X-Request-Id", reqID)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		ctx := context.WithValue(r.Context(), ctxKey{}, reqID)
		if r.Method != http.MethodGet && r.Method != http.MethodHead && r.URL.Path != "/v1/webhooks/waffo" {
			if !s.originOK(r) {
				writeErr(w, reqID, http.StatusForbidden, "FORBIDDEN", "This request was rejected.")
				return
			}
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) originOK(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	allowed, err := url.Parse(s.cfg.AppBaseURL)
	if err != nil {
		return false
	}
	return strings.EqualFold(u.Host, allowed.Host)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.store.Pool.Ping(r.Context()); err != nil {
		writeErr(w, reqID(r), http.StatusServiceUnavailable, "UNAVAILABLE", "Database is not reachable.")
		return
	}
	writeOK(w, reqID(r), map[string]string{"status": "ok"})
}

func (s *Server) createAudit(w http.ResponseWriter, r *http.Request) {
	owner := s.owner(w, r)
	ip := clientIP(r)
	if !s.limiter.allow("audit:"+ip, 8, 10*time.Minute) {
		writeErr(w, reqID(r), http.StatusTooManyRequests, "RATE_LIMITED", "Too many audits from this network. Try again in a few minutes.")
		return
	}
	var body struct {
		URL   string `json:"url"`
		Focus string `json:"focus"`
	}
	if err := decode(r, &body); err != nil {
		writeErr(w, reqID(r), http.StatusBadRequest, "INVALID_URL", "Please enter a valid public website URL.")
		return
	}
	normalized, err := urlguard.Normalize(body.URL)
	if err != nil {
		writeErr(w, reqID(r), http.StatusBadRequest, codeForURL(err), err.Error())
		return
	}
	validated, err := urlguard.Validate(r.Context(), normalized, nil)
	if err != nil {
		writeErr(w, reqID(r), http.StatusBadRequest, codeForURL(err), err.Error())
		return
	}
	id, err := s.store.CreateAudit(r.Context(), owner, validated.URL.String(), validated.Host, body.Focus)
	if err != nil {
		if errors.Is(err, storage.ErrQuota) {
			writeErr(w, reqID(r), http.StatusPaymentRequired, "QUOTA_EXCEEDED", "You have used this month's audits. Create a free account or upgrade to Pro for 30 audits a month.")
			return
		}
		if errors.Is(err, storage.ErrInProgress) {
			writeErr(w, reqID(r), http.StatusConflict, "AUDIT_IN_PROGRESS", "An audit is already running. Wait for it to finish.")
			return
		}
		s.log.Error("create audit", "err", err)
		writeErr(w, reqID(r), http.StatusInternalServerError, "AUDIT_FAILED", "The audit could not be created.")
		return
	}
	estimate := 20
	if s.cfg.PageSpeedAPIKey != "" {
		estimate = 45
	}
	writeOK(w, reqID(r), map[string]any{"audit_id": id, "status": "pending", "estimated_seconds": estimate})
}

func (s *Server) getAudit(w http.ResponseWriter, r *http.Request) {
	owner := s.owner(w, r)
	report, err := s.store.LoadReport(r.Context(), r.PathValue("id"), &owner)
	if err != nil {
		s.auditErr(w, r, err)
		return
	}
	s.decorate(&report)
	writeOK(w, reqID(r), report)
}

func (s *Server) listAudits(w http.ResponseWriter, r *http.Request) {
	owner := s.owner(w, r)
	items, err := s.store.ListAudits(r.Context(), owner)
	if err != nil {
		writeErr(w, reqID(r), http.StatusInternalServerError, "AUDIT_FAILED", "Audits could not be loaded.")
		return
	}
	if items == nil {
		items = []storage.AuditSummary{}
	}
	used, limit, period, _ := s.store.Usage(r.Context(), owner)
	plan := owner.Plan
	if owner.UserID == "" {
		plan = "anonymous"
	}
	writeOK(w, reqID(r), map[string]any{"audits": items, "usage": map[string]any{"used": used, "limit": limit, "period": period, "plan": plan, "authenticated": owner.UserID != ""}})
}

func (s *Server) retryAudit(w http.ResponseWriter, r *http.Request) {
	owner := s.owner(w, r)
	if err := s.store.Requeue(r.Context(), r.PathValue("id"), owner); err != nil {
		s.auditErr(w, r, err)
		return
	}
	writeOK(w, reqID(r), map[string]string{"status": "pending"})
}

func (s *Server) deleteAudit(w http.ResponseWriter, r *http.Request) {
	owner := s.owner(w, r)
	if err := s.store.DeleteAudit(r.Context(), r.PathValue("id"), owner); err != nil {
		s.auditErr(w, r, err)
		return
	}
	writeOK(w, reqID(r), map[string]bool{"deleted": true})
}

func (s *Server) shareReport(w http.ResponseWriter, r *http.Request) {
	owner := s.owner(w, r)
	var body struct {
		IsPublic bool `json:"is_public"`
	}
	_ = decode(r, &body)
	info, err := s.store.SetShare(r.Context(), r.PathValue("id"), owner, body.IsPublic)
	if err != nil {
		s.auditErr(w, r, err)
		return
	}
	info.URL = storage.FormatShareURL(s.cfg.AppBaseURL, info.Token)
	writeOK(w, reqID(r), info)
}

func (s *Server) revokeShare(w http.ResponseWriter, r *http.Request) {
	owner := s.owner(w, r)
	if err := s.store.RevokeShare(r.Context(), r.PathValue("token"), owner); err != nil {
		s.auditErr(w, r, err)
		return
	}
	writeOK(w, reqID(r), map[string]bool{"revoked": true})
}

func (s *Server) publicReport(w http.ResponseWriter, r *http.Request) {
	report, err := s.store.PublicReport(r.Context(), r.PathValue("token"))
	if err != nil {
		writeErr(w, reqID(r), http.StatusNotFound, "NOT_FOUND", "This report is not public.")
		return
	}
	s.decorate(&report)
	writeOK(w, reqID(r), report)
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if err := decode(r, &body); err != nil {
		writeErr(w, reqID(r), http.StatusBadRequest, "INVALID_INPUT", "Enter an email and a password of at least 8 characters.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if !strings.Contains(email, "@") || len(email) > 255 || len(body.Password) < 8 {
		writeErr(w, reqID(r), http.StatusBadRequest, "INVALID_INPUT", "Enter an email and a password of at least 8 characters.")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 12)
	if err != nil {
		writeErr(w, reqID(r), http.StatusInternalServerError, "AUTH_FAILED", "The account could not be created.")
		return
	}
	user, err := s.store.CreateUser(r.Context(), email, truncate(body.Name, 100), string(hash))
	if err != nil {
		writeErr(w, reqID(r), http.StatusConflict, "EMAIL_TAKEN", "That email is already registered.")
		return
	}
	s.startSession(w, r, user.ID)
	writeOK(w, reqID(r), map[string]any{"id": user.ID, "email": user.Email, "name": user.Name, "plan": user.Plan})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	if !s.limiter.allow("login:"+clientIP(r), 10, 10*time.Minute) {
		writeErr(w, reqID(r), http.StatusTooManyRequests, "RATE_LIMITED", "Too many login attempts. Try again later.")
		return
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decode(r, &body); err != nil {
		writeErr(w, reqID(r), http.StatusBadRequest, "INVALID_INPUT", "Email or password is incorrect.")
		return
	}
	user, err := s.store.UserByEmail(r.Context(), strings.ToLower(strings.TrimSpace(body.Email)))
	if err != nil || bcrypt.CompareHashAndPassword([]byte(user.Hash), []byte(body.Password)) != nil {
		writeErr(w, reqID(r), http.StatusUnauthorized, "INVALID_LOGIN", "Email or password is incorrect.")
		return
	}
	s.startSession(w, r, user.ID)
	writeOK(w, reqID(r), map[string]any{"id": user.ID, "email": user.Email, "name": user.Name, "plan": user.Plan})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie("sp_session"); err == nil {
		_ = s.store.DeleteSession(r.Context(), storage.HashToken(c.Value))
	}
	http.SetCookie(w, clearCookie("sp_session", s.cfg.AppEnv == "production"))
	writeOK(w, reqID(r), map[string]bool{"ok": true})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(r)
	if !ok {
		writeErr(w, reqID(r), http.StatusUnauthorized, "UNAUTHORIZED", "Sign in to continue.")
		return
	}
	writeOK(w, reqID(r), map[string]any{"authenticated": true, "id": user.ID, "email": user.Email, "name": user.Name, "plan": user.Plan})
}

func (s *Server) updateMe(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(r)
	if !ok {
		writeErr(w, reqID(r), http.StatusUnauthorized, "UNAUTHORIZED", "Sign in to continue.")
		return
	}
	var body struct {
		Name            string `json:"name"`
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := decode(r, &body); err != nil {
		writeErr(w, reqID(r), http.StatusBadRequest, "INVALID_INPUT", "The profile could not be updated.")
		return
	}
	passwordHash := ""
	if body.NewPassword != "" {
		if len(body.NewPassword) < 8 || bcrypt.CompareHashAndPassword([]byte(user.Hash), []byte(body.CurrentPassword)) != nil {
			writeErr(w, reqID(r), http.StatusBadRequest, "INVALID_INPUT", "Current password is incorrect, or the new password is too short.")
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), 12)
		if err != nil {
			writeErr(w, reqID(r), http.StatusInternalServerError, "AUTH_FAILED", "The password could not be changed.")
			return
		}
		passwordHash = string(hash)
	}
	if err := s.store.UpdateUser(r.Context(), user.ID, truncate(body.Name, 100), passwordHash); err != nil {
		writeErr(w, reqID(r), http.StatusInternalServerError, "AUTH_FAILED", "The profile could not be updated.")
		return
	}
	writeOK(w, reqID(r), map[string]bool{"updated": true})
}

func (s *Server) usage(w http.ResponseWriter, r *http.Request) {
	owner := s.owner(w, r)
	used, limit, period, err := s.store.Usage(r.Context(), owner)
	if err != nil {
		writeErr(w, reqID(r), http.StatusInternalServerError, "USAGE_FAILED", "Usage could not be loaded.")
		return
	}
	plan := owner.Plan
	if owner.UserID == "" {
		plan = "anonymous"
	}
	writeOK(w, reqID(r), map[string]any{"authenticated": owner.UserID != "", "plan": plan, "used": used, "limit": limit, "period": period})
}

func (s *Server) listWebsites(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(r)
	if !ok {
		writeErr(w, reqID(r), http.StatusUnauthorized, "UNAUTHORIZED", "Sign in to see saved websites.")
		return
	}
	items, err := s.store.ListWebsites(r.Context(), user.ID)
	if err != nil {
		writeErr(w, reqID(r), http.StatusInternalServerError, "WEBSITE_FAILED", "Websites could not be loaded.")
		return
	}
	if items == nil {
		items = []storage.Website{}
	}
	writeOK(w, reqID(r), map[string]any{"websites": items})
}

func (s *Server) deleteWebsite(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(r)
	if !ok {
		writeErr(w, reqID(r), http.StatusUnauthorized, "UNAUTHORIZED", "Sign in to continue.")
		return
	}
	if err := s.store.DeleteWebsite(r.Context(), r.PathValue("id"), user.ID); err != nil {
		writeErr(w, reqID(r), http.StatusNotFound, "NOT_FOUND", "That website was not found.")
		return
	}
	writeOK(w, reqID(r), map[string]bool{"deleted": true})
}

func (s *Server) plans(w http.ResponseWriter, r *http.Request) {
	writeOK(w, reqID(r), map[string]any{"plans": []map[string]any{
		{"id": "free", "name": "Free", "price_monthly": 0, "available": true, "description": "Try the audit on your own site.", "features": []string{"3 audits per month", "Homepage SEO and AI readiness checks", "Shareable report", "Rule-based fixes"}},
		{"id": "pro", "name": "Pro", "price_monthly": 19, "available": true, "description": "For store owners who audit more than one page a month.", "features": []string{"30 audits per month", "Full AI suggestions when a model is configured", "Audit history", "Printable report", "Public report links"}},
		{"id": "agency", "name": "Agency", "price_monthly": 49, "available": false, "description": "Client reports and white-label export are planned, not sold yet.", "features": []string{"Multiple client sites", "White-label reports", "Coming soon"}},
	}})
}

func (s *Server) subscription(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(r)
	if !ok {
		writeErr(w, reqID(r), http.StatusUnauthorized, "UNAUTHORIZED", "Sign in to see billing.")
		return
	}
	sub, err := s.store.LatestSubscription(r.Context(), user.ID)
	if err != nil {
		writeErr(w, reqID(r), http.StatusInternalServerError, "BILLING_FAILED", "Subscription could not be loaded.")
		return
	}
	writeOK(w, reqID(r), map[string]any{"plan": user.Plan, "status": sub.Status, "provider": sub.Provider, "current_period_end": sub.CurrentPeriodEnd})
}

func (s *Server) devUpgrade(w http.ResponseWriter, r *http.Request) {
	if s.cfg.AppEnv == "production" {
		writeErr(w, reqID(r), http.StatusNotFound, "NOT_FOUND", "Not found.")
		return
	}
	user, ok := s.currentUser(r)
	if !ok {
		writeErr(w, reqID(r), http.StatusUnauthorized, "UNAUTHORIZED", "Sign in first.")
		return
	}
	if err := s.store.SetPlan(r.Context(), user.ID, "pro", "dev", "", "", "active", nil); err != nil {
		writeErr(w, reqID(r), http.StatusInternalServerError, "BILLING_FAILED", "The development upgrade failed.")
		return
	}
	writeOK(w, reqID(r), map[string]string{"plan": "pro"})
}

func (s *Server) waffoWebhook(w http.ResponseWriter, r *http.Request) {
	if !s.internalWebhookOK(r) {
		writeErr(w, reqID(r), http.StatusUnauthorized, "INVALID_WEBHOOK", "Webhook signature is invalid.")
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeErr(w, reqID(r), http.StatusBadRequest, "INVALID_WEBHOOK", "Webhook body could not be read.")
		return
	}
	ev, err := billing.ParseEvent(body)
	if err != nil {
		writeErr(w, reqID(r), http.StatusBadRequest, "INVALID_WEBHOOK", "Webhook payload is invalid.")
		return
	}
	_, err = s.store.RecordPaymentEvent(r.Context(), ev.ID, ev.Type, body, func(ctx context.Context, _ pgx.Tx) error {
		return s.applyBilling(ctx, ev)
	})
	if err != nil {
		s.log.Error("webhook", "err", err, "event", ev.ID)
		writeErr(w, reqID(r), http.StatusInternalServerError, "WEBHOOK_FAILED", "Webhook could not be processed.")
		return
	}
	writeOK(w, reqID(r), map[string]bool{"received": true})
}

func (s *Server) internalWebhookOK(r *http.Request) bool {
	secret := s.cfg.BillingWebhookSecret
	if secret != "" {
		got := r.Header.Get("X-Sitepulse-Webhook")
		return subtle.ConstantTimeCompare([]byte(got), []byte(secret)) == 1
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	return host == "127.0.0.1" || host == "::1"
}

func (s *Server) applyBilling(ctx context.Context, ev billing.Event) error {
	userID := ev.UserID
	if userID != "" && !billing.IsUUID(userID) {
		userID = ""
	}
	if userID != "" {
		if _, err := s.store.UserByID(ctx, userID); err != nil {
			userID = ""
		}
	}
	if userID == "" && ev.Email != "" {
		id, err := s.store.UserIDByEmail(ctx, strings.ToLower(ev.Email))
		if err == nil {
			userID = id
		}
	}
	if userID == "" {
		return nil
	}
	plan, status := "free", ev.Status
	switch {
	case ev.Grant:
		plan = "pro"
		if status == "" {
			status = "active"
		}
	case ev.Revoke:
		plan = "free"
		if status == "" {
			status = "canceled"
		}
	case ev.Status == "canceling":
		plan, status = "pro", "canceling"
	default:
		return nil
	}
	return s.store.SetPlan(ctx, userID, plan, "waffo", ev.SubID, ev.CustomerID, status, ev.PeriodEnd)
}

func (s *Server) contact(w http.ResponseWriter, r *http.Request) {
	if !s.limiter.allow("contact:"+clientIP(r), 5, time.Hour) {
		writeErr(w, reqID(r), http.StatusTooManyRequests, "RATE_LIMITED", "Too many messages. Email support@sitepulse.ai instead.")
		return
	}
	var body struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Message string `json:"message"`
	}
	if err := decode(r, &body); err != nil || !strings.Contains(body.Email, "@") || len(strings.TrimSpace(body.Message)) < 8 {
		writeErr(w, reqID(r), http.StatusBadRequest, "INVALID_INPUT", "Enter an email and a short message.")
		return
	}
	if err := s.store.SaveContact(r.Context(), truncate(body.Name, 100), strings.ToLower(body.Email), truncate(body.Message, 4000)); err != nil {
		writeErr(w, reqID(r), http.StatusInternalServerError, "CONTACT_FAILED", "The message could not be saved.")
		return
	}
	writeOK(w, reqID(r), map[string]bool{"sent": true})
}

func (s *Server) owner(w http.ResponseWriter, r *http.Request) storage.Owner {
	if user, ok := s.currentUser(r); ok {
		return storage.Owner{UserID: user.ID, Plan: user.Plan}
	}
	anon := ""
	if c, err := r.Cookie("sp_anon"); err == nil && len(c.Value) >= 20 {
		anon = storage.HashToken(c.Value)
	} else {
		raw, err := storage.RandomToken(18)
		if err == nil {
			http.SetCookie(w, sessionCookie("sp_anon", raw, s.cfg.AppEnv == "production", 365*24*time.Hour))
			anon = storage.HashToken(raw)
		}
	}
	return storage.Owner{AnonHash: anon, Plan: "free"}
}

func (s *Server) currentUser(r *http.Request) (storage.User, bool) {
	c, err := r.Cookie("sp_session")
	if err != nil || c.Value == "" {
		return storage.User{}, false
	}
	user, err := s.store.UserBySession(r.Context(), storage.HashToken(c.Value))
	return user, err == nil
}

func (s *Server) startSession(w http.ResponseWriter, r *http.Request, userID string) {
	raw, err := storage.RandomToken(32)
	if err != nil {
		return
	}
	_ = s.store.CreateSession(r.Context(), userID, storage.HashToken(raw), time.Now().Add(30*24*time.Hour))
	http.SetCookie(w, sessionCookie("sp_session", raw, s.cfg.AppEnv == "production", 30*24*time.Hour))
	if c, err := r.Cookie("sp_anon"); err == nil {
		_ = s.store.ClaimAnonymous(r.Context(), userID, storage.HashToken(c.Value))
	}
}

func (s *Server) decorate(report *models.Report) {
	report.Disclaimer = models.Disclaimer
	if report.Share != nil && report.Share.Token != "" {
		report.Share.URL = storage.FormatShareURL(s.cfg.AppBaseURL, report.Share.Token)
	}
	if report.Checks == nil {
		report.Checks = []models.Check{}
	}
}

func (s *Server) auditErr(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, storage.ErrNotFound):
		writeErr(w, reqID(r), http.StatusNotFound, "NOT_FOUND", "That audit was not found.")
	case errors.Is(err, storage.ErrForbidden):
		writeErr(w, reqID(r), http.StatusForbidden, "FORBIDDEN", "That audit belongs to another session.")
	default:
		writeErr(w, reqID(r), http.StatusInternalServerError, "AUDIT_FAILED", "The audit could not be loaded.")
	}
}

func codeForURL(err error) string {
	if errors.Is(err, urlguard.ErrBlocked) {
		return "BLOCKED_URL"
	}
	return "INVALID_URL"
}

func decode(r *http.Request, dest any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	return dec.Decode(dest)
}

func writeOK(w http.ResponseWriter, reqID string, data any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"success": true, "data": data, "error": nil, "request_id": reqID})
}

func writeErr(w http.ResponseWriter, reqID string, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "data": nil, "error": map[string]string{"code": code, "message": message}, "request_id": reqID})
}

type ctxKey struct{}

func reqID(r *http.Request) string {
	if v, ok := r.Context().Value(ctxKey{}).(string); ok {
		return v
	}
	return "req_unknown"
}

func sessionCookie(name, value string, secure bool, ttl time.Duration) *http.Cookie {
	return &http.Cookie{Name: name, Value: value, Path: "/", HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode, MaxAge: int(ttl.Seconds())}
}

func clearCookie(name string, secure bool) *http.Cookie {
	return &http.Cookie{Name: name, Value: "", Path: "/", HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode, MaxAge: -1}
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	if host == "127.0.0.1" || host == "::1" {
		if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
			return strings.TrimSpace(strings.Split(fwd, ",")[0])
		}
	}
	return host
}

func randHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n]
}

type limiter struct {
	mu   sync.Mutex
	hits map[string][]time.Time
}

func newLimiter() *limiter { return &limiter{hits: map[string][]time.Time{}} }

func (l *limiter) allow(key string, max int, window time.Duration) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	cut := now.Add(-window)
	kept := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if t.After(cut) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= max {
		l.hits[key] = kept
		return false
	}
	l.hits[key] = append(kept, now)
	return true
}
