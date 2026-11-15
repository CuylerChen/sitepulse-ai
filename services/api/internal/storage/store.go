package storage

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"sitepulse.ai/api/internal/models"
)

var (
	ErrQuota      = errors.New("monthly audit limit reached")
	ErrInProgress = errors.New("an audit is already running")
	ErrNotFound   = errors.New("not found")
	ErrForbidden  = errors.New("forbidden")
)

type Store struct {
	Pool *pgxpool.Pool
}

type Owner struct {
	UserID   string
	AnonHash string
	Plan     string
}

func Connect(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{Pool: pool}, nil
}

func (s *Store) Close() { s.Pool.Close() }

func (s *Store) Migrate(ctx context.Context) error {
	_, err := s.Pool.Exec(ctx, migrationSQL)
	return err
}

type User struct {
	ID    string
	Email string
	Name  string
	Plan  string
	Hash  string
}

func (s *Store) CreateUser(ctx context.Context, email, name, passwordHash string) (User, error) {
	var u User
	err := s.Pool.QueryRow(ctx, `
		INSERT INTO users (email, name, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id::text, email, COALESCE(name, ''), plan, password_hash
	`, email, name, passwordHash).Scan(&u.ID, &u.Email, &u.Name, &u.Plan, &u.Hash)
	return u, err
}

func (s *Store) UserByEmail(ctx context.Context, email string) (User, error) {
	var u User
	err := s.Pool.QueryRow(ctx, `
		SELECT id::text, email, COALESCE(name, ''), plan, password_hash
		FROM users WHERE email = $1
	`, email).Scan(&u.ID, &u.Email, &u.Name, &u.Plan, &u.Hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}

func (s *Store) UserByID(ctx context.Context, id string) (User, error) {
	var u User
	err := s.Pool.QueryRow(ctx, `
		SELECT id::text, email, COALESCE(name, ''), plan, password_hash FROM users WHERE id = $1::uuid
	`, id).Scan(&u.ID, &u.Email, &u.Name, &u.Plan, &u.Hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}

func (s *Store) UpdateUser(ctx context.Context, id, name, passwordHash string) error {
	if passwordHash != "" {
		_, err := s.Pool.Exec(ctx, `UPDATE users SET name = COALESCE(NULLIF($2, ''), name), password_hash = $3, updated_at = NOW() WHERE id = $1::uuid`, id, name, passwordHash)
		return err
	}
	_, err := s.Pool.Exec(ctx, `UPDATE users SET name = $2, updated_at = NOW() WHERE id = $1::uuid`, id, name)
	return err
}

func (s *Store) CreateSession(ctx context.Context, userID, tokenHash string, expires time.Time) error {
	_, err := s.Pool.Exec(ctx, `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1::uuid, $2, $3)`, userID, tokenHash, expires)
	return err
}

func (s *Store) UserBySession(ctx context.Context, tokenHash string) (User, error) {
	var u User
	err := s.Pool.QueryRow(ctx, `
		SELECT u.id::text, u.email, COALESCE(u.name, ''), u.plan, u.password_hash
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > NOW()
	`, tokenHash).Scan(&u.ID, &u.Email, &u.Name, &u.Plan, &u.Hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}

func (s *Store) DeleteSession(ctx context.Context, tokenHash string) error {
	_, err := s.Pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}

func (s *Store) ClaimAnonymous(ctx context.Context, userID, anonHash string) error {
	if anonHash == "" {
		return nil
	}
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `UPDATE websites SET user_id = $1::uuid, anon_key = NULL WHERE anon_key = $2 AND user_id IS NULL`, userID, anonHash); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE audits SET user_id = $1::uuid, anon_key = NULL WHERE anon_key = $2 AND user_id IS NULL`, userID, anonHash); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE usage_records SET user_id = $1::uuid, anon_key = NULL WHERE anon_key = $2 AND user_id IS NULL`, userID, anonHash); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func LimitForPlan(plan string) int {
	switch plan {
	case "pro", "agency":
		return 30
	default:
		return 3
	}
}

func (s *Store) CreateAudit(ctx context.Context, owner Owner, requestedURL, domain, focus string) (string, error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)
	lockKey := owner.UserID
	if lockKey == "" {
		lockKey = owner.AnonHash
	}
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey); err != nil {
		return "", err
	}
	var running int
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM audits
		WHERE status IN ('pending', 'running')
		  AND (($1::uuid IS NOT NULL AND user_id = $1::uuid) OR ($1::uuid IS NULL AND anon_key = $2))
	`, uuidArg(owner.UserID), owner.AnonHash).Scan(&running); err != nil {
		return "", err
	}
	if running > 0 {
		return "", ErrInProgress
	}
	used, err := countUsage(ctx, tx, owner)
	if err != nil {
		return "", err
	}
	if used >= LimitForPlan(owner.Plan) {
		return "", ErrQuota
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO usage_records (user_id, anon_key, action, quantity)
		VALUES ($1::uuid, NULLIF($2, ''), 'audit', 1)
	`, uuidArg(owner.UserID), owner.AnonHash); err != nil {
		return "", err
	}
	var websiteID string
	err = tx.QueryRow(ctx, `
		SELECT id::text FROM websites
		WHERE domain = $3
		  AND (($1::uuid IS NOT NULL AND user_id = $1::uuid) OR ($1::uuid IS NULL AND anon_key = $2))
		LIMIT 1
	`, uuidArg(owner.UserID), owner.AnonHash, domain).Scan(&websiteID)
	if errors.Is(err, pgx.ErrNoRows) {
		err = tx.QueryRow(ctx, `
			INSERT INTO websites (user_id, anon_key, domain, url)
			VALUES ($1::uuid, NULLIF($2, ''), $3, $4)
			RETURNING id::text
		`, uuidArg(owner.UserID), owner.AnonHash, domain, requestedURL).Scan(&websiteID)
	}
	if err != nil {
		return "", err
	}
	var auditID string
	cfg, _ := json.Marshal(map[string]string{"focus": focus})
	err = tx.QueryRow(ctx, `
		INSERT INTO audits (website_id, user_id, anon_key, requested_url, domain, status, progress, scan_config)
		VALUES ($1::uuid, $2::uuid, NULLIF($3, ''), $4, $5, 'pending', 'queued', $6::jsonb)
		RETURNING id::text
	`, websiteID, uuidArg(owner.UserID), owner.AnonHash, requestedURL, domain, cfg).Scan(&auditID)
	if err != nil {
		return "", err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO audit_jobs (audit_id) VALUES ($1::uuid)`, auditID); err != nil {
		return "", err
	}
	return auditID, tx.Commit(ctx)
}

func countUsage(ctx context.Context, tx pgx.Tx, owner Owner) (int, error) {
	var used int
	err := tx.QueryRow(ctx, `
		SELECT COALESCE(SUM(quantity), 0) FROM usage_records
		WHERE action = 'audit'
		  AND created_at >= date_trunc('month', NOW())
		  AND (($1::uuid IS NOT NULL AND user_id = $1::uuid) OR ($1::uuid IS NULL AND anon_key = $2))
	`, uuidArg(owner.UserID), owner.AnonHash).Scan(&used)
	return used, err
}

func (s *Store) Usage(ctx context.Context, owner Owner) (used, limit int, period string, err error) {
	limit = LimitForPlan(owner.Plan)
	period = time.Now().UTC().Format("2006-01")
	err = s.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(quantity), 0) FROM usage_records
		WHERE action = 'audit' AND created_at >= date_trunc('month', NOW())
		  AND (($1::uuid IS NOT NULL AND user_id = $1::uuid) OR ($1::uuid IS NULL AND anon_key = $2))
	`, uuidArg(owner.UserID), owner.AnonHash).Scan(&used)
	return used, limit, period, err
}

type Job struct {
	ID      string
	AuditID string
	Attempt int
}

func (s *Store) ClaimJob(ctx context.Context, worker string) (*Job, error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var job Job
	err = tx.QueryRow(ctx, `
		WITH next AS (
			SELECT id FROM audit_jobs
			WHERE attempts < max_attempts
			  AND (status = 'queued' OR (status = 'running' AND locked_until < NOW()))
			ORDER BY created_at
			FOR UPDATE SKIP LOCKED
			LIMIT 1
		)
		UPDATE audit_jobs j
		SET status = 'running', locked_until = NOW() + INTERVAL '2 minutes', locked_by = $1,
		    attempts = attempts + 1, updated_at = NOW()
		FROM next
		WHERE j.id = next.id
		RETURNING j.id::text, j.audit_id::text, j.attempts
	`, worker).Scan(&job.ID, &job.AuditID, &job.Attempt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE audits SET status = 'running', progress = 'validating', started_at = COALESCE(started_at, NOW()) WHERE id = $1::uuid`, job.AuditID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &job, nil
}

func (s *Store) AuditRequest(ctx context.Context, id string) (url, focus string, err error) {
	var cfg []byte
	err = s.Pool.QueryRow(ctx, `SELECT requested_url, scan_config FROM audits WHERE id = $1::uuid`, id).Scan(&url, &cfg)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", ErrNotFound
	}
	var parsed struct {
		Focus string `json:"focus"`
	}
	_ = json.Unmarshal(cfg, &parsed)
	if parsed.Focus == "" {
		parsed.Focus = "full"
	}
	return url, parsed.Focus, err
}

func (s *Store) SetProgress(ctx context.Context, auditID, progress string) error {
	_, err := s.Pool.Exec(ctx, `UPDATE audits SET progress = $2 WHERE id = $1::uuid AND status = 'running'`, auditID, progress)
	return err
}

func (s *Store) SaveResult(ctx context.Context, auditID string, result models.Report, meta models.AIMeta, shareToken string) error {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	perf, _ := json.Marshal(result.Performance)
	scores := result.Audit.Scores
	_, err = tx.Exec(ctx, `
		UPDATE audits SET status = 'completed', progress = 'completed', final_url = $2, domain = $3,
		  overall_score = $4, seo_score = $5, performance_score = $6, ai_readiness_score = $7, content_score = $8,
		  grade = $9, grade_label = $10, platform = $11, performance = $12::jsonb, completed_at = NOW(), error_message = NULL
		WHERE id = $1::uuid
	`, auditID, result.Audit.FinalURL, result.Audit.Domain, scores.Overall, scores.SEO, scores.Performance, scores.AIReadiness, scores.Content, scores.Grade, scores.GradeLabel, result.Audit.Platform, perf)
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM audit_checks WHERE audit_id = $1::uuid`, auditID); err != nil {
		return err
	}
	for _, c := range result.Checks {
		ev, _ := json.Marshal(sanitizeEvidence(c.Evidence))
		if _, err := tx.Exec(ctx, `
			INSERT INTO audit_checks (audit_id, category, check_key, status, score, max_score, severity, title, description, evidence, recommendation)
			VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
		`, auditID, c.Category, c.CheckKey, c.Status, clampScore(c.Score), clampScore(c.MaxScore), c.Severity, truncate(c.Title, 255), c.Description, ev, c.Recommendation); err != nil {
			return err
		}
	}
	reportJSON, _ := json.Marshal(result.AIReport)
	if _, err := tx.Exec(ctx, `
		INSERT INTO ai_reports (audit_id, summary, report_data, model, prompt_version, input_tokens, output_tokens)
		VALUES ($1::uuid, $2, $3::jsonb, $4, $5, $6, $7)
		ON CONFLICT (audit_id) DO UPDATE SET summary = EXCLUDED.summary, report_data = EXCLUDED.report_data,
		  model = EXCLUDED.model, prompt_version = EXCLUDED.prompt_version, input_tokens = EXCLUDED.input_tokens, output_tokens = EXCLUDED.output_tokens
	`, auditID, result.AIReport.Summary.Headline, reportJSON, meta.Model, meta.PromptVersion, meta.InputTokens, meta.OutputTokens); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO shared_reports (audit_id, share_token, is_public)
		VALUES ($1::uuid, $2, FALSE)
		ON CONFLICT (audit_id) DO NOTHING
	`, auditID, shareToken); err != nil {
		return err
	}
	if result.Audit.Platform != "" {
		_, _ = tx.Exec(ctx, `UPDATE websites SET platform = $2 WHERE id = (SELECT website_id FROM audits WHERE id = $1::uuid)`, auditID, result.Audit.Platform)
	}
	if _, err := tx.Exec(ctx, `UPDATE audit_jobs SET status = 'completed', locked_until = NULL, updated_at = NOW() WHERE audit_id = $1::uuid`, auditID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Store) FailAudit(ctx context.Context, auditID, message string, retry bool) error {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if retry {
		if _, err := tx.Exec(ctx, `
			UPDATE audit_jobs SET status = 'queued', locked_until = NOW() + INTERVAL '5 seconds', last_error = $2, updated_at = NOW()
			WHERE audit_id = $1::uuid AND attempts < max_attempts
		`, auditID, message); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE audits SET status = 'pending', progress = 'queued', error_message = $2 WHERE id = $1::uuid`, auditID, message); err != nil {
			return err
		}
	} else {
		if _, err := tx.Exec(ctx, `UPDATE audits SET status = 'failed', progress = 'failed', error_message = $2, completed_at = NOW() WHERE id = $1::uuid`, auditID, message); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE audit_jobs SET status = 'failed', last_error = $2, updated_at = NOW() WHERE audit_id = $1::uuid`, auditID, message); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *Store) Requeue(ctx context.Context, auditID string, owner Owner) error {
	tag, err := s.Pool.Exec(ctx, `
		UPDATE audits SET status = 'pending', progress = 'queued', error_message = NULL, started_at = NULL, completed_at = NULL
		WHERE id = $1::uuid AND status = 'failed'
		  AND (($2::uuid IS NOT NULL AND user_id = $2::uuid) OR ($2::uuid IS NULL AND anon_key = $3))
	`, auditID, uuidArg(owner.UserID), owner.AnonHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	_, err = s.Pool.Exec(ctx, `
		UPDATE audit_jobs SET status = 'queued', attempts = 0, locked_until = NULL, last_error = NULL, updated_at = NOW()
		WHERE audit_id = $1::uuid
	`, auditID)
	return err
}

type auditRow struct {
	models.AuditView
	UserID   *string
	AnonKey  *string
	PerfJSON []byte
	Scores   models.Scores
}

func (s *Store) LoadReport(ctx context.Context, auditID string, owner *Owner) (models.Report, error) {
	row, err := s.loadAudit(ctx, auditID)
	if err != nil {
		return models.Report{}, err
	}
	if owner != nil && !owns(row, *owner) {
		return models.Report{}, ErrForbidden
	}
	return s.hydrate(ctx, row)
}

func (s *Store) loadAudit(ctx context.Context, auditID string) (auditRow, error) {
	var row auditRow
	var overall, seo, perf, ai, content *int
	var scanned *time.Time
	err := s.Pool.QueryRow(ctx, `
		SELECT id::text, requested_url, COALESCE(final_url, ''), COALESCE(domain, ''), status, progress,
		       overall_score, seo_score, performance_score, ai_readiness_score, content_score,
		       COALESCE(grade, ''), COALESCE(grade_label, ''), COALESCE(platform, ''), COALESCE(error_message, ''),
		       completed_at, created_at, user_id::text, anon_key, COALESCE(performance, 'null'::jsonb)
		FROM audits WHERE id = $1::uuid
	`, auditID).Scan(&row.ID, &row.RequestedURL, &row.FinalURL, &row.Domain, &row.Status, &row.Progress, &overall, &seo, &perf, &ai, &content, &row.Grade, &row.GradeLabel, &row.Platform, &row.ErrorMessage, &scanned, &row.CreatedAt, &row.UserID, &row.AnonKey, &row.PerfJSON)
	if errors.Is(err, pgx.ErrNoRows) {
		return auditRow{}, ErrNotFound
	}
	if err != nil {
		return auditRow{}, err
	}
	row.OverallScore = overall
	row.ScannedAt = scanned
	row.Scores = models.Scores{SEO: seo, Performance: perf, AIReadiness: ai, Content: content, Overall: overall, Grade: row.Grade, GradeLabel: row.GradeLabel}
	row.AuditView.Scores = &row.Scores
	return row, nil
}

func (s *Store) hydrate(ctx context.Context, row auditRow) (models.Report, error) {
	report := models.Report{Audit: row.AuditView, Disclaimer: models.Disclaimer}
	if row.Status != "completed" {
		return report, nil
	}
	checks, err := s.checks(ctx, row.ID)
	if err != nil {
		return models.Report{}, err
	}
	report.Checks = checks
	var raw []byte
	err = s.Pool.QueryRow(ctx, `SELECT report_data FROM ai_reports WHERE audit_id = $1::uuid`, row.ID).Scan(&raw)
	if err == nil {
		var ai models.AIReport
		if json.Unmarshal(raw, &ai) == nil {
			report.AIReport = &ai
		}
	}
	if len(row.PerfJSON) > 0 {
		var perf models.PerformanceReport
		if json.Unmarshal(row.PerfJSON, &perf) == nil {
			report.Performance = &perf
		}
	}
	share, err := s.share(ctx, row.ID)
	if err == nil {
		report.Share = &share
	}
	return report, nil
}

func (s *Store) checks(ctx context.Context, auditID string) ([]models.Check, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT category, check_key, status, score, max_score, severity, title, description, evidence, recommendation
		FROM audit_checks WHERE audit_id = $1::uuid ORDER BY created_at
	`, auditID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Check
	for rows.Next() {
		var c models.Check
		var ev []byte
		if err := rows.Scan(&c.Category, &c.CheckKey, &c.Status, &c.Score, &c.MaxScore, &c.Severity, &c.Title, &c.Description, &ev, &c.Recommendation); err != nil {
			return nil, err
		}
		c.Evidence = map[string]any{}
		_ = json.Unmarshal(ev, &c.Evidence)
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) share(ctx context.Context, auditID string) (models.ShareInfo, error) {
	var info models.ShareInfo
	err := s.Pool.QueryRow(ctx, `SELECT share_token, is_public FROM shared_reports WHERE audit_id = $1::uuid`, auditID).Scan(&info.Token, &info.IsPublic)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ShareInfo{}, ErrNotFound
	}
	return info, err
}

func (s *Store) SetShare(ctx context.Context, auditID string, owner Owner, public bool) (models.ShareInfo, error) {
	row, err := s.loadAudit(ctx, auditID)
	if err != nil {
		return models.ShareInfo{}, err
	}
	if !owns(row, owner) {
		return models.ShareInfo{}, ErrForbidden
	}
	token, err := RandomToken(18)
	if err != nil {
		return models.ShareInfo{}, err
	}
	var info models.ShareInfo
	err = s.Pool.QueryRow(ctx, `
		INSERT INTO shared_reports (audit_id, share_token, is_public, revoked_at)
		VALUES ($1::uuid, $2, $3, CASE WHEN $3 THEN NULL ELSE NOW() END)
		ON CONFLICT (audit_id) DO UPDATE SET is_public = EXCLUDED.is_public, revoked_at = EXCLUDED.revoked_at
		RETURNING share_token, is_public
	`, auditID, token, public).Scan(&info.Token, &info.IsPublic)
	return info, err
}

func (s *Store) RevokeShare(ctx context.Context, token string, owner Owner) error {
	tag, err := s.Pool.Exec(ctx, `
		UPDATE shared_reports sr SET is_public = FALSE, revoked_at = NOW()
		FROM audits a
		WHERE sr.share_token = $1 AND sr.audit_id = a.id
		  AND (($2::uuid IS NOT NULL AND a.user_id = $2::uuid) OR ($2::uuid IS NULL AND a.anon_key = $3))
	`, token, uuidArg(owner.UserID), owner.AnonHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) PublicReport(ctx context.Context, token string) (models.Report, error) {
	var auditID string
	var public bool
	err := s.Pool.QueryRow(ctx, `SELECT audit_id::text, is_public FROM shared_reports WHERE share_token = $1`, token).Scan(&auditID, &public)
	if errors.Is(err, pgx.ErrNoRows) || !public {
		return models.Report{}, ErrNotFound
	}
	if err != nil {
		return models.Report{}, err
	}
	report, err := s.LoadReport(ctx, auditID, nil)
	if err != nil {
		return models.Report{}, err
	}
	report.Audit.RequestedURL = report.Audit.Domain
	return report, nil
}

type AuditSummary struct {
	ID           string     `json:"id"`
	Domain       string     `json:"domain"`
	RequestedURL string     `json:"requested_url"`
	Status       string     `json:"status"`
	OverallScore *int       `json:"overall_score"`
	Grade        string     `json:"grade"`
	CreatedAt    time.Time  `json:"created_at"`
	Platform     string     `json:"platform"`
}

func (s *Store) ListAudits(ctx context.Context, owner Owner) ([]AuditSummary, error) {
	limit := 3
	if owner.Plan == "pro" || owner.Plan == "agency" {
		limit = 100
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT id::text, COALESCE(domain, ''), requested_url, status, overall_score, COALESCE(grade, ''), created_at, COALESCE(platform, '')
		FROM audits
		WHERE ($1::uuid IS NOT NULL AND user_id = $1::uuid) OR ($1::uuid IS NULL AND anon_key = $2)
		ORDER BY created_at DESC
		LIMIT $3
	`, uuidArg(owner.UserID), owner.AnonHash, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AuditSummary
	for rows.Next() {
		var item AuditSummary
		if err := rows.Scan(&item.ID, &item.Domain, &item.RequestedURL, &item.Status, &item.OverallScore, &item.Grade, &item.CreatedAt, &item.Platform); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) DeleteAudit(ctx context.Context, id string, owner Owner) error {
	tag, err := s.Pool.Exec(ctx, `
		DELETE FROM audits WHERE id = $1::uuid
		  AND (($2::uuid IS NOT NULL AND user_id = $2::uuid) OR ($2::uuid IS NULL AND anon_key = $3))
	`, id, uuidArg(owner.UserID), owner.AnonHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type Website struct {
	ID           string    `json:"id"`
	Domain       string    `json:"domain"`
	URL          string    `json:"url"`
	Platform     string    `json:"platform"`
	LatestScore  *int      `json:"latest_score"`
	CreatedAt    time.Time `json:"created_at"`
}

func (s *Store) ListWebsites(ctx context.Context, userID string) ([]Website, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT w.id::text, w.domain, w.url, w.platform, w.created_at,
		       (SELECT overall_score FROM audits a WHERE a.website_id = w.id AND a.status = 'completed' ORDER BY a.created_at DESC LIMIT 1)
		FROM websites w WHERE w.user_id = $1::uuid ORDER BY w.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Website
	for rows.Next() {
		var w Website
		if err := rows.Scan(&w.ID, &w.Domain, &w.URL, &w.Platform, &w.CreatedAt, &w.LatestScore); err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

func (s *Store) DeleteWebsite(ctx context.Context, id, userID string) error {
	tag, err := s.Pool.Exec(ctx, `DELETE FROM websites WHERE id = $1::uuid AND user_id = $2::uuid`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) SetPlan(ctx context.Context, userID, plan, provider, subID, customerID, status string) error {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `UPDATE users SET plan = $2, updated_at = NOW() WHERE id = $1::uuid`, userID, plan); err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO subscriptions (user_id, provider, provider_subscription_id, provider_customer_id, plan, status)
		VALUES ($1::uuid, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6)
	`, userID, provider, subID, customerID, plan, status)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type Subscription struct {
	Plan             string     `json:"plan"`
	Status           string     `json:"status"`
	Provider         string     `json:"provider"`
	CustomerID       string     `json:"-"`
	CurrentPeriodEnd *time.Time `json:"current_period_end"`
}

func (s *Store) LatestSubscription(ctx context.Context, userID string) (Subscription, error) {
	var sub Subscription
	var end *time.Time
	err := s.Pool.QueryRow(ctx, `
		SELECT plan, status, provider, COALESCE(provider_customer_id, ''), current_period_end
		FROM subscriptions WHERE user_id = $1::uuid ORDER BY created_at DESC LIMIT 1
	`, userID).Scan(&sub.Plan, &sub.Status, &sub.Provider, &sub.CustomerID, &end)
	if errors.Is(err, pgx.ErrNoRows) {
		u, uerr := s.UserByID(ctx, userID)
		if uerr != nil {
			return Subscription{}, uerr
		}
		return Subscription{Plan: u.Plan, Status: "none", Provider: ""}, nil
	}
	sub.CurrentPeriodEnd = end
	return sub, err
}

func (s *Store) RecordPaymentEvent(ctx context.Context, eventID, eventType string, payload []byte, apply func(ctx context.Context, tx pgx.Tx) error) (bool, error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)
	var inserted string
	err = tx.QueryRow(ctx, `
		INSERT INTO payment_events (provider_event_id, event_type, payload)
		VALUES ($1, $2, $3::jsonb)
		ON CONFLICT (provider_event_id) DO NOTHING
		RETURNING id::text
	`, eventID, eventType, payload).Scan(&inserted)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, tx.Commit(ctx)
	}
	if err != nil {
		return false, err
	}
	if apply != nil {
		if err := apply(ctx, tx); err != nil {
			return false, err
		}
	}
	if _, err := tx.Exec(ctx, `UPDATE payment_events SET processed_at = NOW() WHERE provider_event_id = $1`, eventID); err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}

func (s *Store) UserIDByEmail(ctx context.Context, email string) (string, error) {
	var id string
	err := s.Pool.QueryRow(ctx, `SELECT id::text FROM users WHERE email = $1`, email).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return id, err
}

func (s *Store) SaveContact(ctx context.Context, name, email, message string) error {
	_, err := s.Pool.Exec(ctx, `INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3)`, name, email, message)
	return err
}

func (s *Store) MonthlyTokens(ctx context.Context) (int, error) {
	var n int
	err := s.Pool.QueryRow(ctx, `SELECT COALESCE(SUM(input_tokens + output_tokens), 0) FROM ai_reports WHERE created_at >= date_trunc('month', NOW())`).Scan(&n)
	return n, err
}

func (s *Store) Get(ctx context.Context, key, strategy string) ([]byte, bool) {
	var payload []byte
	var fetched time.Time
	err := s.Pool.QueryRow(ctx, `SELECT payload, fetched_at FROM pagespeed_cache WHERE url_hash = $1 AND strategy = $2`, key, strategy).Scan(&payload, &fetched)
	if err != nil || time.Since(fetched) > 24*time.Hour {
		return nil, false
	}
	return payload, true
}

func (s *Store) Put(ctx context.Context, key, strategy string, payload []byte) {
	_, _ = s.Pool.Exec(ctx, `
		INSERT INTO pagespeed_cache (url_hash, strategy, payload, fetched_at)
		VALUES ($1, $2, $3::jsonb, NOW())
		ON CONFLICT (url_hash, strategy) DO UPDATE SET payload = EXCLUDED.payload, fetched_at = NOW()
	`, key, strategy, payload)
}

func owns(row auditRow, owner Owner) bool {
	if owner.UserID != "" && row.UserID != nil && *row.UserID == owner.UserID {
		return true
	}
	if owner.UserID == "" && owner.AnonHash != "" && row.AnonKey != nil && *row.AnonKey == owner.AnonHash {
		return true
	}
	return false
}

func sanitizeEvidence(in map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range in {
		if sensitiveKey(k) {
			continue
		}
		switch t := v.(type) {
		case string:
			out[k] = truncate(t, 300)
		case bool, int, int64, float64, float32:
			out[k] = t
		case []string:
			if len(t) > 12 {
				t = t[:12]
			}
			out[k] = t
		case []any:
			var items []string
			for _, item := range t {
				if s, ok := item.(string); ok {
					items = append(items, truncate(s, 80))
				}
				if len(items) == 12 {
					break
				}
			}
			out[k] = items
		}
	}
	return out
}

func sensitiveKey(k string) bool {
	switch k {
	case "set_cookie", "authorization", "cookie", "email", "token", "html", "raw_html":
		return true
	default:
		return false
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func clampScore(v int) int {
	if v < 0 {
		return 0
	}
	if v > 100 {
		return 100
	}
	return v
}

func RandomToken(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func Period() string { return time.Now().UTC().Format("2006-01") }

func uuidArg(id string) any {
	if id == "" {
		return nil
	}
	return id
}

func FormatShareURL(base, token string) string {
	return fmt.Sprintf("%s/report/%s", trimRightSlash(base), token)
}

func trimRightSlash(s string) string {
	for len(s) > 1 && s[len(s)-1] == '/' {
		s = s[:len(s)-1]
	}
	return s
}
