-- Admin database schema
-- Tables for API configurations, usage logs, and metrics rollup

CREATE TABLE api_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT,
    enabled BOOLEAN DEFAULT true,
    base_url TEXT,
    api_key TEXT,
    model_or_variant TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE metrics_rollup (
    day DATE PRIMARY KEY,
    hits_yahoo INT DEFAULT 0,
    hits_google INT DEFAULT 0,
    hits_fallback INT DEFAULT 0,
    avg_latency_ms INT DEFAULT 0,
    errors INT DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX idx_api_configs_provider_name ON api_configs(provider_name);
CREATE INDEX idx_api_configs_enabled ON api_configs(enabled);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_action ON usage_logs(action);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_metrics_rollup_day ON metrics_rollup(day);

COMMIT;