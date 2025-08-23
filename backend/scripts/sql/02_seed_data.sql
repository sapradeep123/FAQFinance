-- Seed data for development and testing
-- This script inserts sample data for development purposes

-- Insert sample admin user (password: admin123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Admin', 'User', 'ADMIN', 'ACTIVE', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert sample regular users
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'john.doe@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'John', 'Doe', 'USER', 'ACTIVE', true, NOW() - INTERVAL '30 days', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'jane.smith@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Jane', 'Smith', 'USER', 'ACTIVE', true, NOW() - INTERVAL '15 days', NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'mike.johnson@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Mike', 'Johnson', 'USER', 'ACTIVE', false, NOW() - INTERVAL '7 days', NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert sample portfolios
INSERT INTO portfolios (id, user_id, name, description, is_default, created_at, updated_at) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'My Main Portfolio', 'Primary investment portfolio focusing on growth stocks', true, NOW() - INTERVAL '25 days', NOW()),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Tech Stocks', 'Technology sector focused portfolio', false, NOW() - INTERVAL '20 days', NOW()),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Diversified Portfolio', 'Well-balanced portfolio across multiple sectors', true, NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample portfolio holdings
INSERT INTO portfolio_holdings (id, portfolio_id, symbol, quantity, average_cost, total_cost, created_at, updated_at) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'AAPL', 50.000000, 150.25, 7512.50, NOW() - INTERVAL '20 days', NOW()),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'GOOGL', 10.000000, 2750.80, 27508.00, NOW() - INTERVAL '18 days', NOW()),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'MSFT', 25.000000, 320.45, 8011.25, NOW() - INTERVAL '15 days', NOW()),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 'NVDA', 15.000000, 450.30, 6754.50, NOW() - INTERVAL '12 days', NOW()),
('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', 'AMD', 30.000000, 95.75, 2872.50, NOW() - INTERVAL '10 days', NOW()),
('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440003', 'SPY', 100.000000, 420.15, 42015.00, NOW() - INTERVAL '8 days', NOW()),
('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440003', 'VTI', 50.000000, 225.80, 11290.00, NOW() - INTERVAL '5 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample portfolio transactions
INSERT INTO portfolio_transactions (id, portfolio_id, symbol, type, quantity, price, total_amount, fees, notes, transaction_date, created_at) VALUES
('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'AAPL', 'buy', 50.000000, 150.25, 7512.50, 9.99, 'Initial purchase', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'GOOGL', 'buy', 10.000000, 2750.80, 27508.00, 9.99, 'Adding tech exposure', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'MSFT', 'buy', 25.000000, 320.45, 8011.25, 9.99, 'Diversifying tech holdings', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('880e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 'NVDA', 'buy', 15.000000, 450.30, 6754.50, 9.99, 'AI/GPU play', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
('880e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', 'AMD', 'buy', 30.000000, 95.75, 2872.50, 9.99, 'Semiconductor exposure', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('880e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440003', 'SPY', 'buy', 100.000000, 420.15, 42015.00, 9.99, 'Market index exposure', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('880e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440003', 'VTI', 'buy', 50.000000, 225.80, 11290.00, 9.99, 'Total market exposure', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample chat sessions
INSERT INTO chat_sessions (id, user_id, title, model, created_at, updated_at) VALUES
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Investment Strategy Discussion', 'gpt-3.5-turbo', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Market Analysis Chat', 'gpt-4', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
('990e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Portfolio Diversification Help', 'gpt-3.5-turbo', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert sample chat messages
INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'user', 'What are some good investment strategies for a beginner?', NOW() - INTERVAL '5 days'),
('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', 'assistant', 'For beginners, I recommend starting with these key strategies:\n\n1. **Dollar-Cost Averaging**: Invest a fixed amount regularly regardless of market conditions\n2. **Diversification**: Spread investments across different asset classes and sectors\n3. **Index Fund Investing**: Start with low-cost index funds like S&P 500 ETFs\n4. **Emergency Fund First**: Ensure you have 3-6 months of expenses saved\n5. **Long-term Perspective**: Focus on long-term growth rather than short-term gains\n\nWould you like me to elaborate on any of these strategies?', NOW() - INTERVAL '5 days'),
('aa0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440001', 'user', 'Can you explain more about index fund investing?', NOW() - INTERVAL '4 days'),
('aa0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440001', 'assistant', 'Index fund investing is an excellent strategy for beginners:\n\n**What are Index Funds?**\n- Funds that track a market index (like S&P 500)\n- Automatically diversified across hundreds of companies\n- Low management fees (typically 0.03-0.20%)\n\n**Benefits:**\n- Instant diversification\n- Low costs\n- No need to pick individual stocks\n- Historically solid long-term returns\n- Passive management\n\n**Popular Options:**\n- VTI (Total Stock Market)\n- SPY/VOO (S&P 500)\n- VEA (International Developed Markets)\n- VWO (Emerging Markets)\n\n**Getting Started:**\n1. Open a brokerage account\n2. Start with a broad market fund like VTI\n3. Set up automatic investments\n4. Add international exposure over time\n\nThis approach has historically outperformed most actively managed funds!', NOW() - INTERVAL '4 days'),
('aa0e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440002', 'user', 'What do you think about the current market conditions?', NOW() - INTERVAL '3 days'),
('aa0e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440002', 'assistant', 'Current market conditions show several key trends:\n\n**Positive Factors:**\n- Strong corporate earnings in tech sector\n- Resilient consumer spending\n- Innovation in AI and technology\n- Improving supply chain conditions\n\n**Challenges:**\n- Interest rate uncertainty\n- Geopolitical tensions\n- Inflation concerns\n- Market volatility\n\n**Investment Approach:**\n- Maintain long-term perspective\n- Continue dollar-cost averaging\n- Focus on quality companies\n- Keep some cash for opportunities\n- Avoid timing the market\n\n**Sectors to Watch:**\n- Technology (AI, cloud computing)\n- Healthcare (aging demographics)\n- Renewable energy\n- Financial services (rising rates)\n\nRemember, market timing is difficult even for professionals. Staying invested with a diversified portfolio typically yields better long-term results than trying to time market movements.', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample market quotes cache (for testing)
INSERT INTO market_quotes_cache (symbol, price, change, change_percent, volume, market_cap, high_52_week, low_52_week, created_at) VALUES
('AAPL', 175.25, 2.15, 1.24, 45678900, 2750000000000, 198.23, 124.17, NOW()),
('GOOGL', 2845.30, -15.75, -0.55, 1234567, 1800000000000, 3030.93, 2193.62, NOW()),
('MSFT', 345.80, 5.25, 1.54, 23456789, 2560000000000, 384.30, 213.43, NOW()),
('NVDA', 485.60, 12.30, 2.60, 34567890, 1200000000000, 502.66, 108.13, NOW()),
('AMD', 105.45, -2.15, -2.00, 45678901, 170000000000, 164.46, 54.57, NOW()),
('SPY', 435.25, 1.85, 0.43, 56789012, NULL, 459.44, 348.11, NOW()),
('VTI', 235.80, 0.95, 0.40, 12345678, NULL, 249.25, 181.04, NOW())
ON CONFLICT (symbol) DO UPDATE SET
    price = EXCLUDED.price,
    change = EXCLUDED.change,
    change_percent = EXCLUDED.change_percent,
    volume = EXCLUDED.volume,
    market_cap = EXCLUDED.market_cap,
    high_52_week = EXCLUDED.high_52_week,
    low_52_week = EXCLUDED.low_52_week,
    created_at = EXCLUDED.created_at;

-- Insert sample system logs
INSERT INTO system_logs (level, message, metadata, user_id, created_at) VALUES
('info', 'User logged in successfully', '{"ip": "192.168.1.100", "userAgent": "Mozilla/5.0"}', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '1 hour'),
('info', 'Portfolio created', '{"portfolioId": "660e8400-e29b-41d4-a716-446655440001", "name": "My Main Portfolio"}', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '25 days'),
('info', 'Stock purchase executed', '{"symbol": "AAPL", "quantity": 50, "price": 150.25}', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '20 days'),
('info', 'Chat session started', '{"sessionId": "990e8400-e29b-41d4-a716-446655440001", "model": "gpt-3.5-turbo"}', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '5 days'),
('warn', 'Failed login attempt', '{"ip": "192.168.1.200", "email": "invalid@example.com"}', NULL, NOW() - INTERVAL '2 hours'),
('error', 'Market data API rate limit exceeded', '{"endpoint": "/api/quote", "symbol": "TSLA"}', NULL, NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Insert sample API usage logs
INSERT INTO api_usage_logs (endpoint, method, status_code, response_time, user_id, ip_address, created_at) VALUES
('/api/auth/login', 'POST', 200, 245, '550e8400-e29b-41d4-a716-446655440001', '192.168.1.100', NOW() - INTERVAL '1 hour'),
('/api/portfolios', 'GET', 200, 89, '550e8400-e29b-41d4-a716-446655440001', '192.168.1.100', NOW() - INTERVAL '55 minutes'),
('/api/portfolios/660e8400-e29b-41d4-a716-446655440001/holdings', 'GET', 200, 156, '550e8400-e29b-41d4-a716-446655440001', '192.168.1.100', NOW() - INTERVAL '50 minutes'),
('/api/market/quote/AAPL', 'GET', 200, 1234, '550e8400-e29b-41d4-a716-446655440001', '192.168.1.100', NOW() - INTERVAL '45 minutes'),
('/api/chat/sessions', 'POST', 201, 67, '550e8400-e29b-41d4-a716-446655440001', '192.168.1.100', NOW() - INTERVAL '40 minutes'),
('/api/auth/login', 'POST', 401, 123, NULL, '192.168.1.200', NOW() - INTERVAL '2 hours'),
('/api/market/quote/INVALID', 'GET', 404, 89, '550e8400-e29b-41d4-a716-446655440002', '192.168.1.150', NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Display summary of inserted data
SELECT 'Seed data insertion completed successfully!' as status;
SELECT 
    'Users' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 'Portfolios', COUNT(*) FROM portfolios
UNION ALL
SELECT 'Holdings', COUNT(*) FROM portfolio_holdings
UNION ALL
SELECT 'Transactions', COUNT(*) FROM portfolio_transactions
UNION ALL
SELECT 'Chat Sessions', COUNT(*) FROM chat_sessions
UNION ALL
SELECT 'Chat Messages', COUNT(*) FROM chat_messages
UNION ALL
SELECT 'FAQs', COUNT(*) FROM faqs
UNION ALL
SELECT 'System Settings', COUNT(*) FROM system_settings
UNION ALL
SELECT 'System Logs', COUNT(*) FROM system_logs
UNION ALL
SELECT 'API Usage Logs', COUNT(*) FROM api_usage_logs;