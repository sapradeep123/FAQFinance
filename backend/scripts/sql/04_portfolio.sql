-- Portfolio database schema
-- Tables for managing user portfolios and positions

-- Create enum types for portfolio
CREATE TYPE position_status AS ENUM ('ACTIVE', 'SOLD', 'PARTIAL');
CREATE TYPE portfolio_status AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');
CREATE TYPE asset_type AS ENUM ('STOCK', 'ETF', 'MUTUAL_FUND', 'BOND', 'CRYPTO', 'OPTION', 'OTHER');
CREATE TYPE currency_code AS ENUM ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR');

-- Portfolios table - main portfolio container
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'My Portfolio',
    description TEXT,
    base_currency currency_code DEFAULT 'USD',
    status portfolio_status DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    total_value DECIMAL(15,2) DEFAULT 0.00,
    total_cost DECIMAL(15,2) DEFAULT 0.00,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    unrealized_pnl_percent DECIMAL(8,4) DEFAULT 0.0000,
    position_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE
);

-- Positions table - individual holdings within portfolios
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    asset_type asset_type DEFAULT 'STOCK',
    quantity DECIMAL(15,6) NOT NULL CHECK (quantity >= 0),
    average_cost DECIMAL(12,4) NOT NULL CHECK (average_cost >= 0),
    current_price DECIMAL(12,4) DEFAULT 0.0000,
    market_value DECIMAL(15,2) DEFAULT 0.00,
    cost_basis DECIMAL(15,2) GENERATED ALWAYS AS (quantity * average_cost) STORED,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    unrealized_pnl_percent DECIMAL(8,4) DEFAULT 0.0000,
    day_change DECIMAL(15,2) DEFAULT 0.00,
    day_change_percent DECIMAL(8,4) DEFAULT 0.0000,
    status position_status DEFAULT 'ACTIVE',
    currency currency_code DEFAULT 'USD',
    exchange VARCHAR(10),
    sector VARCHAR(100),
    industry VARCHAR(100),
    as_of_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_price_update TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Position history table - track changes over time
CREATE TABLE IF NOT EXISTS position_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    quantity DECIMAL(15,6) NOT NULL,
    average_cost DECIMAL(12,4) NOT NULL,
    current_price DECIMAL(12,4),
    market_value DECIMAL(15,2),
    unrealized_pnl DECIMAL(15,2),
    unrealized_pnl_percent DECIMAL(8,4),
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    change_type VARCHAR(20) DEFAULT 'UPDATE' -- UPDATE, BUY, SELL, SPLIT, DIVIDEND
);

-- Portfolio uploads table - track file uploads
CREATE TABLE IF NOT EXISTS portfolio_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50), -- CSV, XLSX
    upload_status VARCHAR(20) DEFAULT 'PROCESSING', -- PROCESSING, COMPLETED, FAILED
    rows_processed INTEGER DEFAULT 0,
    rows_successful INTEGER DEFAULT 0,
    rows_failed INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Market data cache table - cache price data
CREATE TABLE IF NOT EXISTS market_data_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    exchange VARCHAR(10),
    current_price DECIMAL(12,4),
    previous_close DECIMAL(12,4),
    day_change DECIMAL(12,4),
    day_change_percent DECIMAL(8,4),
    volume BIGINT,
    market_cap BIGINT,
    pe_ratio DECIMAL(8,2),
    dividend_yield DECIMAL(6,4),
    fifty_two_week_high DECIMAL(12,4),
    fifty_two_week_low DECIMAL(12,4),
    currency currency_code DEFAULT 'USD',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(50), -- YAHOO, GOOGLE, FALLBACK
    is_stale BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'
);

-- Portfolio analytics table - store calculated metrics
CREATE TABLE IF NOT EXISTS portfolio_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    total_cost DECIMAL(15,2) NOT NULL,
    unrealized_pnl DECIMAL(15,2) NOT NULL,
    unrealized_pnl_percent DECIMAL(8,4) NOT NULL,
    day_change DECIMAL(15,2) DEFAULT 0.00,
    day_change_percent DECIMAL(8,4) DEFAULT 0.0000,
    position_count INTEGER NOT NULL,
    top_holding_ticker VARCHAR(20),
    top_holding_weight DECIMAL(6,4), -- percentage
    sector_allocation JSONB DEFAULT '{}',
    asset_type_allocation JSONB DEFAULT '{}',
    concentration_risk_score DECIMAL(4,2), -- 0-10 scale
    diversification_score DECIMAL(4,2), -- 0-10 scale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON portfolios(status);
CREATE INDEX IF NOT EXISTS idx_portfolios_updated_at ON portfolios(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_is_default ON portfolios(is_default);

CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_ticker ON positions(ticker);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_asset_type ON positions(asset_type);
CREATE INDEX IF NOT EXISTS idx_positions_updated_at ON positions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_ticker_portfolio ON positions(ticker, portfolio_id);

CREATE INDEX IF NOT EXISTS idx_position_history_position_id ON position_history(position_id);
CREATE INDEX IF NOT EXISTS idx_position_history_portfolio_id ON position_history(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_position_history_ticker ON position_history(ticker);
CREATE INDEX IF NOT EXISTS idx_position_history_snapshot_date ON position_history(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_uploads_portfolio_id ON portfolio_uploads(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_uploads_user_id ON portfolio_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_uploads_status ON portfolio_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_portfolio_uploads_created_at ON portfolio_uploads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_data_cache_ticker ON market_data_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_last_updated ON market_data_cache(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_is_stale ON market_data_cache(is_stale);

CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_portfolio_id ON portfolio_analytics(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_calculation_date ON portfolio_analytics(calculation_date DESC);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_unique_ticker_portfolio 
    ON positions(portfolio_id, ticker) 
    WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_data_cache_unique_ticker 
    ON market_data_cache(ticker, exchange);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_analytics_unique_date 
    ON portfolio_analytics(portfolio_id, calculation_date);

-- Triggers for updated_at
CREATE TRIGGER update_portfolios_updated_at 
    BEFORE UPDATE ON portfolios 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at 
    BEFORE UPDATE ON positions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update portfolio totals when positions change
CREATE OR REPLACE FUNCTION update_portfolio_totals()
RETURNS TRIGGER AS $$
DECLARE
    portfolio_record RECORD;
BEGIN
    -- Get the portfolio ID from either NEW or OLD record
    IF TG_OP = 'DELETE' THEN
        SELECT id INTO portfolio_record FROM portfolios WHERE id = OLD.portfolio_id;
    ELSE
        SELECT id INTO portfolio_record FROM portfolios WHERE id = NEW.portfolio_id;
    END IF;
    
    -- Update portfolio totals
    UPDATE portfolios 
    SET 
        total_value = COALESCE((
            SELECT SUM(market_value) 
            FROM positions 
            WHERE portfolio_id = portfolio_record.id 
            AND status = 'ACTIVE'
        ), 0),
        total_cost = COALESCE((
            SELECT SUM(cost_basis) 
            FROM positions 
            WHERE portfolio_id = portfolio_record.id 
            AND status = 'ACTIVE'
        ), 0),
        unrealized_pnl = COALESCE((
            SELECT SUM(unrealized_pnl) 
            FROM positions 
            WHERE portfolio_id = portfolio_record.id 
            AND status = 'ACTIVE'
        ), 0),
        position_count = COALESCE((
            SELECT COUNT(*) 
            FROM positions 
            WHERE portfolio_id = portfolio_record.id 
            AND status = 'ACTIVE'
        ), 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = portfolio_record.id;
    
    -- Update unrealized P&L percentage
    UPDATE portfolios 
    SET unrealized_pnl_percent = CASE 
        WHEN total_cost > 0 THEN (unrealized_pnl / total_cost) * 100 
        ELSE 0 
    END
    WHERE id = portfolio_record.id;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update portfolio totals when positions change
CREATE TRIGGER update_portfolio_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_totals();

-- Function to create position history snapshot
CREATE OR REPLACE FUNCTION create_position_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create snapshot for significant changes
    IF TG_OP = 'UPDATE' AND (
        OLD.quantity != NEW.quantity OR 
        OLD.average_cost != NEW.average_cost OR 
        ABS(OLD.current_price - NEW.current_price) > 0.01
    ) THEN
        INSERT INTO position_history (
            position_id, portfolio_id, ticker, quantity, average_cost, 
            current_price, market_value, unrealized_pnl, unrealized_pnl_percent,
            snapshot_date, change_type
        ) VALUES (
            NEW.id, NEW.portfolio_id, NEW.ticker, NEW.quantity, NEW.average_cost,
            NEW.current_price, NEW.market_value, NEW.unrealized_pnl, NEW.unrealized_pnl_percent,
            CURRENT_DATE, 'UPDATE'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create position history snapshots
CREATE TRIGGER create_position_snapshot_trigger
    AFTER UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION create_position_snapshot();

-- Function to mark stale market data
CREATE OR REPLACE FUNCTION mark_stale_market_data()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE market_data_cache 
    SET is_stale = TRUE 
    WHERE last_updated < CURRENT_TIMESTAMP - INTERVAL '1 hour'
    AND is_stale = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_portfolio_data(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up old position history (keep last year)
    DELETE FROM position_history 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old portfolio analytics (keep last 2 years)
    DELETE FROM portfolio_analytics 
    WHERE calculation_date < CURRENT_DATE - INTERVAL '1 day' * (days_to_keep * 2);
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old market data cache (keep last 30 days)
    DELETE FROM market_data_cache 
    WHERE last_updated < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;