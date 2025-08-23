-- Database migration scripts
-- This file contains migration scripts for schema updates
-- Each migration should be idempotent and include version tracking

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64)
);

-- Migration: v1.0.1 - Add user preferences
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'v1.0.1') THEN
        -- Add user preferences table
        CREATE TABLE IF NOT EXISTS user_preferences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
            language VARCHAR(10) DEFAULT 'en',
            timezone VARCHAR(50) DEFAULT 'UTC',
            email_notifications BOOLEAN DEFAULT true,
            push_notifications BOOLEAN DEFAULT true,
            default_portfolio_view VARCHAR(20) DEFAULT 'summary' CHECK (default_portfolio_view IN ('summary', 'detailed', 'performance')),
            currency VARCHAR(3) DEFAULT 'USD',
            date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
            number_format VARCHAR(20) DEFAULT 'US',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        );

        -- Create index on user_id
        CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

        -- Add trigger for updated_at
        CREATE TRIGGER update_user_preferences_updated_at
            BEFORE UPDATE ON user_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Insert default preferences for existing users
        INSERT INTO user_preferences (user_id)
        SELECT id FROM users
        ON CONFLICT (user_id) DO NOTHING;

        -- Record migration
        INSERT INTO schema_migrations (version, description, checksum) 
        VALUES ('v1.0.1', 'Add user preferences table', 'a1b2c3d4e5f6');
        
        RAISE NOTICE 'Migration v1.0.1 applied successfully';
    ELSE
        RAISE NOTICE 'Migration v1.0.1 already applied, skipping';
    END IF;
END
$$;

-- Migration: v1.0.2 - Add portfolio performance tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'v1.0.2') THEN
        -- Add portfolio performance snapshots table
        CREATE TABLE IF NOT EXISTS portfolio_performance_snapshots (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
            snapshot_date DATE NOT NULL,
            total_value DECIMAL(15,2) NOT NULL,
            total_cost DECIMAL(15,2) NOT NULL,
            total_gain_loss DECIMAL(15,2) NOT NULL,
            total_gain_loss_percent DECIMAL(8,4) NOT NULL,
            day_change DECIMAL(15,2) DEFAULT 0,
            day_change_percent DECIMAL(8,4) DEFAULT 0,
            holdings_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(portfolio_id, snapshot_date)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_portfolio_performance_portfolio_id ON portfolio_performance_snapshots(portfolio_id);
        CREATE INDEX IF NOT EXISTS idx_portfolio_performance_date ON portfolio_performance_snapshots(snapshot_date);
        CREATE INDEX IF NOT EXISTS idx_portfolio_performance_portfolio_date ON portfolio_performance_snapshots(portfolio_id, snapshot_date);

        -- Add watchlist table
        CREATE TABLE IF NOT EXISTS user_watchlists (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            symbol VARCHAR(10) NOT NULL,
            added_price DECIMAL(10,4),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, symbol)
        );

        -- Create index on user_id and symbol
        CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON user_watchlists(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_watchlists_symbol ON user_watchlists(symbol);

        -- Record migration
        INSERT INTO schema_migrations (version, description, checksum) 
        VALUES ('v1.0.2', 'Add portfolio performance tracking and watchlists', 'b2c3d4e5f6g7');
        
        RAISE NOTICE 'Migration v1.0.2 applied successfully';
    ELSE
        RAISE NOTICE 'Migration v1.0.2 already applied, skipping';
    END IF;
END
$$;

-- Migration: v1.0.3 - Add audit logging
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'v1.0.3') THEN
        -- Add audit log table
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            table_name VARCHAR(50) NOT NULL,
            record_id UUID NOT NULL,
            action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
            old_values JSONB,
            new_values JSONB,
            changed_by UUID REFERENCES users(id),
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address INET,
            user_agent TEXT
        );

        -- Create indexes for audit logs
        CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

        -- Add notification preferences
        ALTER TABLE user_preferences 
        ADD COLUMN IF NOT EXISTS portfolio_alerts BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS price_alerts BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS news_alerts BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS weekly_summary BOOLEAN DEFAULT true;

        -- Record migration
        INSERT INTO schema_migrations (version, description, checksum) 
        VALUES ('v1.0.3', 'Add audit logging and notification preferences', 'c3d4e5f6g7h8');
        
        RAISE NOTICE 'Migration v1.0.3 applied successfully';
    ELSE
        RAISE NOTICE 'Migration v1.0.3 already applied, skipping';
    END IF;
END
$$;

-- Migration: v1.0.4 - Add market alerts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'v1.0.4') THEN
        -- Add price alerts table
        CREATE TABLE IF NOT EXISTS price_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            symbol VARCHAR(10) NOT NULL,
            alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'percent_change', 'volume_spike')),
            target_value DECIMAL(15,4) NOT NULL,
            current_value DECIMAL(15,4),
            is_active BOOLEAN DEFAULT true,
            triggered_at TIMESTAMP,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
        CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
        CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = true;

        -- Add trigger for updated_at
        CREATE TRIGGER update_price_alerts_updated_at
            BEFORE UPDATE ON price_alerts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Add market news cache table
        CREATE TABLE IF NOT EXISTS market_news_cache (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            summary TEXT,
            url TEXT NOT NULL,
            source VARCHAR(100),
            published_at TIMESTAMP,
            symbols TEXT[], -- Array of related symbols
            sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(url)
        );

        -- Create indexes for news
        CREATE INDEX IF NOT EXISTS idx_market_news_published_at ON market_news_cache(published_at);
        CREATE INDEX IF NOT EXISTS idx_market_news_symbols ON market_news_cache USING GIN(symbols);
        CREATE INDEX IF NOT EXISTS idx_market_news_source ON market_news_cache(source);

        -- Record migration
        INSERT INTO schema_migrations (version, description, checksum) 
        VALUES ('v1.0.4', 'Add price alerts and market news cache', 'd4e5f6g7h8i9');
        
        RAISE NOTICE 'Migration v1.0.4 applied successfully';
    ELSE
        RAISE NOTICE 'Migration v1.0.4 already applied, skipping';
    END IF;
END
$$;

-- Function to get migration status
CREATE OR REPLACE FUNCTION get_migration_status()
RETURNS TABLE(
    version VARCHAR(50),
    description TEXT,
    applied_at TIMESTAMP,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.version,
        sm.description,
        sm.applied_at,
        'APPLIED' as status
    FROM schema_migrations sm
    ORDER BY sm.applied_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback migration (use with caution)
CREATE OR REPLACE FUNCTION rollback_migration(migration_version VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    migration_exists BOOLEAN;
BEGIN
    -- Check if migration exists
    SELECT EXISTS(
        SELECT 1 FROM schema_migrations 
        WHERE version = migration_version
    ) INTO migration_exists;
    
    IF NOT migration_exists THEN
        RAISE NOTICE 'Migration % not found', migration_version;
        RETURN FALSE;
    END IF;
    
    -- Log rollback attempt
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('warn', 'Migration rollback attempted', 
            json_build_object('version', migration_version, 'timestamp', NOW()));
    
    -- Note: Actual rollback logic should be implemented based on specific migration
    -- This is a placeholder that removes the migration record
    DELETE FROM schema_migrations WHERE version = migration_version;
    
    RAISE NOTICE 'Migration % rolled back (record removed)', migration_version;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Display current migration status
SELECT 'Migration scripts loaded successfully!' as status;
SELECT * FROM get_migration_status();