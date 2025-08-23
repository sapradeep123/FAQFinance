-- Portfolio database schema
-- Tables for managing portfolios and positions

CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name TEXT,
    base_ccy TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolios(id),
    ticker TEXT,
    qty NUMERIC,
    avg_cost NUMERIC,
    as_of_date DATE,
    source_row JSONB,
    UNIQUE(portfolio_id, ticker, as_of_date)
);

-- Create indexes for better performance
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_created_at ON portfolios(created_at);
CREATE INDEX idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX idx_positions_ticker ON positions(ticker);
CREATE INDEX idx_positions_as_of_date ON positions(as_of_date);

COMMIT;