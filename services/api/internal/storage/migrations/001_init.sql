CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100),
    password_hash TEXT NOT NULL,
    plan VARCHAR(30) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
    auth_provider VARCHAR(30) NOT NULL DEFAULT 'email',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    anon_key TEXT,
    domain VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    name VARCHAR(255),
    platform VARCHAR(30) NOT NULL DEFAULT 'custom' CHECK (platform IN ('custom', 'shopify')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT websites_owner CHECK (user_id IS NOT NULL OR anon_key IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS websites_user_id_idx ON websites (user_id);
CREATE INDEX IF NOT EXISTS websites_anon_key_idx ON websites (anon_key);

CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID REFERENCES websites(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    anon_key TEXT,
    requested_url TEXT NOT NULL,
    final_url TEXT,
    domain VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress VARCHAR(40) NOT NULL DEFAULT 'queued',
    overall_score SMALLINT CHECK (overall_score IS NULL OR overall_score BETWEEN 0 AND 100),
    seo_score SMALLINT CHECK (seo_score IS NULL OR seo_score BETWEEN 0 AND 100),
    performance_score SMALLINT CHECK (performance_score IS NULL OR performance_score BETWEEN 0 AND 100),
    ai_readiness_score SMALLINT CHECK (ai_readiness_score IS NULL OR ai_readiness_score BETWEEN 0 AND 100),
    content_score SMALLINT CHECK (content_score IS NULL OR content_score BETWEEN 0 AND 100),
    grade VARCHAR(40),
    grade_label VARCHAR(80),
    platform VARCHAR(30),
    scan_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    performance JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT audits_owner CHECK (user_id IS NOT NULL OR anon_key IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS audits_user_created_idx ON audits (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audits_anon_created_idx ON audits (anon_key, created_at DESC);
CREATE INDEX IF NOT EXISTS audits_website_id_idx ON audits (website_id);
CREATE INDEX IF NOT EXISTS audits_status_idx ON audits (status);

CREATE TABLE IF NOT EXISTS audit_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL UNIQUE REFERENCES audits(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 2,
    locked_until TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_jobs_claim_idx ON audit_jobs (status, created_at);

CREATE TABLE IF NOT EXISTS audit_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    category VARCHAR(40) NOT NULL,
    check_key VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('pass', 'warning', 'fail', 'unknown')),
    score SMALLINT NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    max_score SMALLINT NOT NULL DEFAULT 0 CHECK (max_score BETWEEN 0 AND 100),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommendation TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_checks_audit_id_idx ON audit_checks (audit_id);
CREATE UNIQUE INDEX IF NOT EXISTS audit_checks_unique ON audit_checks (audit_id, check_key);

CREATE TABLE IF NOT EXISTS ai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL UNIQUE REFERENCES audits(id) ON DELETE CASCADE,
    summary TEXT,
    report_data JSONB NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_version VARCHAR(30) NOT NULL,
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL UNIQUE REFERENCES audits(id) ON DELETE CASCADE,
    share_token VARCHAR(80) NOT NULL UNIQUE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,
    provider_subscription_id VARCHAR(255),
    provider_customer_id VARCHAR(255),
    plan VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);

CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(80) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    anon_key TEXT,
    action VARCHAR(40) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT usage_owner CHECK (user_id IS NOT NULL OR anon_key IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS usage_user_created_idx ON usage_records (user_id, created_at);
CREATE INDEX IF NOT EXISTS usage_anon_created_idx ON usage_records (anon_key, created_at);

CREATE TABLE IF NOT EXISTS pagespeed_cache (
    url_hash TEXT NOT NULL,
    strategy VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (url_hash, strategy)
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
