-- Admin database schema
-- Tables for API configurations, usage logs, and metrics

-- Create enum types for admin
CREATE TYPE api_provider_type AS ENUM ('YAHOO', 'GOOGLE', 'FALLBACK');
CREATE TYPE api_status AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'RATE_LIMITED');
CREATE TYPE log_level AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');
CREATE TYPE action_type AS ENUM ('LOGIN', 'LOGOUT', 'CHAT_QUERY', 'PORTFOLIO_UPLOAD', 'ADMIN_ACTION', 'API_CALL', 'ERROR');
CREATE TYPE metric_type AS ENUM ('API_LATENCY', 'API_SUCCESS_RATE', 'USER_ACTIVITY', 'SYSTEM_HEALTH');

-- API configurations table - store provider settings
CREATE TABLE IF NOT EXISTS api_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider api_provider_type NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    api_key_encrypted TEXT, -- Encrypted API key
    api_key_hash VARCHAR(64), -- Hash for verification without decryption
    status api_status DEFAULT 'ACTIVE',
    priority INTEGER DEFAULT 1, -- Lower number = higher priority
    timeout_ms INTEGER DEFAULT 30000,
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    max_retries INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    headers JSONB DEFAULT '{}', -- Additional headers
    config JSONB DEFAULT '{}', -- Provider-specific configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    last_health_check TIMESTAMP WITH TIME ZONE,
    health_check_status VARCHAR(20) DEFAULT 'UNKNOWN', -- OK, WARNING, ERROR
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Usage logs table - track all system activities
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    action action_type NOT NULL,
    resource VARCHAR(255), -- What was accessed (endpoint, file, etc.)
    method VARCHAR(10), -- HTTP method or action type
    status_code INTEGER, -- HTTP status or custom status code
    duration_ms INTEGER, -- How long the action took
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255), -- For tracing requests
    api_provider api_provider_type, -- If action involved API call
    tokens_used INTEGER DEFAULT 0, -- For LLM API calls
    cost_cents INTEGER DEFAULT 0, -- Estimated cost in cents
    error_message TEXT,
    request_payload JSONB, -- Sanitized request data
    response_payload JSONB, -- Sanitized response data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    log_level log_level DEFAULT 'INFO',
    tags VARCHAR(255)[], -- For categorization and filtering
    metadata JSONB DEFAULT '{}'
);

-- Metrics rollup table - aggregated metrics for dashboards
CREATE TABLE IF NOT EXISTS metrics_rollup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type metric_type NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    time_bucket TIMESTAMP WITH TIME ZONE NOT NULL, -- Hourly/daily buckets
    bucket_size VARCHAR(10) NOT NULL, -- 'hour', 'day', 'week', 'month'
    api_provider api_provider_type, -- NULL for non-API metrics
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for system-wide metrics
    value_count INTEGER DEFAULT 0,
    value_sum DECIMAL(15,4) DEFAULT 0,
    value_avg DECIMAL(15,4) DEFAULT 0,
    value_min DECIMAL(15,4) DEFAULT 0,
    value_max DECIMAL(15,4) DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
    p50_latency DECIMAL(10,2), -- Median latency in ms
    p95_latency DECIMAL(10,2), -- 95th percentile latency in ms
    p99_latency DECIMAL(10,2), -- 99th percentile latency in ms
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- System health table - track system status
CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component VARCHAR(100) NOT NULL, -- 'database', 'api_yahoo', 'api_google', etc.
    status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'down'
    response_time_ms INTEGER,
    error_message TEXT,
    last_check TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    consecutive_failures INTEGER DEFAULT 0,
    last_success TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Rate limiting table - track API usage per user/provider
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_provider api_provider_type NOT NULL,
    time_window TIMESTAMP WITH TIME ZONE NOT NULL, -- Start of the time window
    window_size VARCHAR(10) NOT NULL, -- 'minute', 'hour', 'day'
    request_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    last_request TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin notifications table - system alerts and notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'INFO', -- INFO, WARNING, ERROR, CRITICAL
    category VARCHAR(50), -- 'system', 'security', 'performance', 'api'
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_configs_provider ON api_configs(provider);
CREATE INDEX IF NOT EXISTS idx_api_configs_status ON api_configs(status);
CREATE INDEX IF NOT EXISTS idx_api_configs_priority ON api_configs(priority);
CREATE INDEX IF NOT EXISTS idx_api_configs_updated_at ON api_configs(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action ON usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_provider ON usage_logs(api_provider);
CREATE INDEX IF NOT EXISTS idx_usage_logs_status_code ON usage_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_usage_logs_request_id ON usage_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_session_id ON usage_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_log_level ON usage_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_usage_logs_tags ON usage_logs USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_metrics_rollup_metric_type ON metrics_rollup(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_rollup_time_bucket ON metrics_rollup(time_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_rollup_api_provider ON metrics_rollup(api_provider);
CREATE INDEX IF NOT EXISTS idx_metrics_rollup_bucket_size ON metrics_rollup(bucket_size);
CREATE INDEX IF NOT EXISTS idx_metrics_rollup_user_id ON metrics_rollup(user_id);

CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health(component);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);
CREATE INDEX IF NOT EXISTS idx_system_health_last_check ON system_health(last_check DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_provider ON rate_limits(user_id, api_provider);
CREATE INDEX IF NOT EXISTS idx_rate_limits_time_window ON rate_limits(time_window DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_is_blocked ON rate_limits(is_blocked);
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated_at ON rate_limits(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON admin_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_category ON admin_notifications(category);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_expires_at ON admin_notifications(expires_at);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_health_unique_component 
    ON system_health(component);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_unique_window 
    ON rate_limits(user_id, api_provider, time_window, window_size);

CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_rollup_unique 
    ON metrics_rollup(metric_type, metric_name, time_bucket, bucket_size, COALESCE(api_provider::text, ''), COALESCE(user_id::text, ''));

-- Triggers for updated_at
CREATE TRIGGER update_api_configs_updated_at 
    BEFORE UPDATE ON api_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at 
    BEFORE UPDATE ON rate_limits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create system health check
CREATE OR REPLACE FUNCTION update_system_health(
    component_name VARCHAR(100),
    health_status VARCHAR(20),
    response_time INTEGER DEFAULT NULL,
    error_msg TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_health (component, status, response_time_ms, error_message, last_check, consecutive_failures, last_success)
    VALUES (
        component_name, 
        health_status, 
        response_time, 
        error_msg, 
        CURRENT_TIMESTAMP,
        CASE WHEN health_status = 'healthy' THEN 0 ELSE 1 END,
        CASE WHEN health_status = 'healthy' THEN CURRENT_TIMESTAMP ELSE NULL END
    )
    ON CONFLICT (component) DO UPDATE SET
        status = EXCLUDED.status,
        response_time_ms = EXCLUDED.response_time_ms,
        error_message = EXCLUDED.error_message,
        last_check = EXCLUDED.last_check,
        consecutive_failures = CASE 
            WHEN EXCLUDED.status = 'healthy' THEN 0 
            ELSE system_health.consecutive_failures + 1 
        END,
        last_success = CASE 
            WHEN EXCLUDED.status = 'healthy' THEN EXCLUDED.last_check 
            ELSE system_health.last_success 
        END;
END;
$$ LANGUAGE plpgsql;

-- Function to log usage
CREATE OR REPLACE FUNCTION log_usage(
    p_user_id UUID,
    p_action action_type,
    p_resource VARCHAR(255) DEFAULT NULL,
    p_method VARCHAR(10) DEFAULT NULL,
    p_status_code INTEGER DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL,
    p_api_provider api_provider_type DEFAULT NULL,
    p_tokens_used INTEGER DEFAULT 0,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO usage_logs (
        user_id, action, resource, method, status_code, duration_ms,
        api_provider, tokens_used, error_message, metadata,
        log_level
    ) VALUES (
        p_user_id, p_action, p_resource, p_method, p_status_code, p_duration_ms,
        p_api_provider, p_tokens_used, p_error_message, p_metadata,
        CASE 
            WHEN p_status_code >= 500 OR p_error_message IS NOT NULL THEN 'ERROR'
            WHEN p_status_code >= 400 THEN 'WARN'
            ELSE 'INFO'
        END
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update rate limits
CREATE OR REPLACE FUNCTION update_rate_limit(
    p_user_id UUID,
    p_api_provider api_provider_type,
    p_window_size VARCHAR(10),
    p_tokens_used INTEGER DEFAULT 1,
    p_cost_cents INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$ -- Returns TRUE if within limits, FALSE if blocked
DECLARE
    time_window_start TIMESTAMP WITH TIME ZONE;
    current_count INTEGER;
    limit_exceeded BOOLEAN := FALSE;
BEGIN
    -- Calculate time window start based on window size
    CASE p_window_size
        WHEN 'minute' THEN time_window_start := date_trunc('minute', CURRENT_TIMESTAMP);
        WHEN 'hour' THEN time_window_start := date_trunc('hour', CURRENT_TIMESTAMP);
        WHEN 'day' THEN time_window_start := date_trunc('day', CURRENT_TIMESTAMP);
        ELSE time_window_start := date_trunc('hour', CURRENT_TIMESTAMP);
    END CASE;
    
    -- Insert or update rate limit record
    INSERT INTO rate_limits (
        user_id, api_provider, time_window, window_size, 
        request_count, token_count, cost_cents, last_request
    ) VALUES (
        p_user_id, p_api_provider, time_window_start, p_window_size,
        1, p_tokens_used, p_cost_cents, CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id, api_provider, time_window, window_size) DO UPDATE SET
        request_count = rate_limits.request_count + 1,
        token_count = rate_limits.token_count + p_tokens_used,
        cost_cents = rate_limits.cost_cents + p_cost_cents,
        last_request = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Check if limits are exceeded (implement your logic here)
    -- This is a simplified example
    SELECT request_count INTO current_count 
    FROM rate_limits 
    WHERE user_id = p_user_id 
    AND api_provider = p_api_provider 
    AND time_window = time_window_start 
    AND window_size = p_window_size;
    
    -- Simple rate limiting logic (customize based on your needs)
    IF current_count > 100 THEN -- Example limit
        limit_exceeded := TRUE;
        UPDATE rate_limits 
        SET is_blocked = TRUE, blocked_until = CURRENT_TIMESTAMP + INTERVAL '1 hour'
        WHERE user_id = p_user_id 
        AND api_provider = p_api_provider 
        AND time_window = time_window_start 
        AND window_size = p_window_size;
    END IF;
    
    RETURN NOT limit_exceeded;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_admin_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up old usage logs
    DELETE FROM usage_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old metrics rollup (keep longer for historical data)
    DELETE FROM metrics_rollup 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * (days_to_keep * 4);
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old rate limits
    DELETE FROM rate_limits 
    WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up expired notifications
    DELETE FROM admin_notifications 
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default API configurations
INSERT INTO api_configs (provider, name, base_url, status, priority, timeout_ms, config) VALUES
('YAHOO', 'Yahoo Finance API', 'https://query1.finance.yahoo.com', 'ACTIVE', 1, 30000, '{"version": "v8", "format": "json"}'),
('GOOGLE', 'Google Finance API', 'https://www.google.com/finance', 'ACTIVE', 2, 30000, '{"version": "v1", "format": "json"}'),
('FALLBACK', 'Fallback Mock API', 'http://localhost:8080/api/mock', 'ACTIVE', 3, 10000, '{"mock": true, "delay_ms": 500}')
ON CONFLICT (provider) DO NOTHING;

-- Initialize system health for key components
SELECT update_system_health('database', 'healthy', 10, NULL);
SELECT update_system_health('api_yahoo', 'unknown', NULL, 'Not tested yet');
SELECT update_system_health('api_google', 'unknown', NULL, 'Not tested yet');
SELECT update_system_health('api_fallback', 'healthy', 50, NULL);

COMMIT;