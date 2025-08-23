-- Migration: v1.0.5 - Add GPT configurations and system settings
-- This migration adds tables for managing GPT API configurations and system settings

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'v1.0.5') THEN
        -- Add GPT configurations table
        CREATE TABLE IF NOT EXISTS gpt_configs (
            id SERIAL PRIMARY KEY,
            provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
            api_key TEXT NOT NULL,
            model VARCHAR(100) NOT NULL,
            is_active BOOLEAN DEFAULT true,
            max_tokens INTEGER DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 8000),
            temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(provider, model)
        );

        -- Create indexes for GPT configs
        CREATE INDEX IF NOT EXISTS idx_gpt_configs_provider ON gpt_configs(provider);
        CREATE INDEX IF NOT EXISTS idx_gpt_configs_active ON gpt_configs(is_active) WHERE is_active = true;

        -- Add trigger for updated_at
        CREATE TRIGGER update_gpt_configs_updated_at
            BEFORE UPDATE ON gpt_configs
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Update system_settings table structure if needed
        -- Add unique constraint on key if not exists
        DO $inner$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'system_settings_key_key' 
                AND table_name = 'system_settings'
            ) THEN
                ALTER TABLE system_settings ADD CONSTRAINT system_settings_key_key UNIQUE (key);
            END IF;
        END
        $inner$;

        -- Insert default system settings for financial data sources
        INSERT INTO system_settings (key, value, category, description) VALUES
        ('finance_data_sources_enabled', 'true', 'finance', 'Enable financial data source integration'),
        ('yahoo_finance_enabled', 'true', 'finance', 'Enable Yahoo Finance data source'),
        ('google_finance_enabled', 'true', 'finance', 'Enable Google Finance data source'),
        ('finance_only_responses', 'true', 'ai', 'Restrict AI responses to finance-related topics only'),
        ('default_gpt_provider', 'openai', 'ai', 'Default GPT provider to use for responses'),
        ('max_financial_search_results', '10', 'finance', 'Maximum number of financial search results to include in GPT context'),
        ('financial_data_cache_duration', '300', 'finance', 'Cache duration for financial data in seconds')
        ON CONFLICT (key) DO NOTHING;

        -- Insert default GPT configurations (with placeholder API keys)
        INSERT INTO gpt_configs (provider, api_key, model, is_active, max_tokens, temperature) VALUES
        ('openai', 'your-openai-api-key-here', 'gpt-3.5-turbo', false, 2000, 0.7),
        ('openai', 'your-openai-api-key-here', 'gpt-4', false, 2000, 0.7),
        ('anthropic', 'your-anthropic-api-key-here', 'claude-3-sonnet-20240229', false, 2000, 0.7),
        ('anthropic', 'your-anthropic-api-key-here', 'claude-3-haiku-20240307', false, 2000, 0.7),
        ('google', 'your-google-api-key-here', 'gemini-pro', false, 2000, 0.7),
        ('google', 'your-google-api-key-here', 'gemini-pro-vision', false, 2000, 0.7)
        ON CONFLICT (provider, model) DO NOTHING;

        -- Record migration
        INSERT INTO schema_migrations (version, description, checksum) 
        VALUES ('v1.0.5', 'Add GPT configurations and system settings for financial AI', 'd5e6f7g8h9i0');
        
        RAISE NOTICE 'Migration v1.0.5 applied successfully';
    ELSE
        RAISE NOTICE 'Migration v1.0.5 already applied, skipping';
    END IF;
END
$$;

-- Display current GPT configurations
SELECT 'GPT Configuration Migration completed!' as status;
SELECT provider, model, is_active FROM gpt_configs ORDER BY provider, model;