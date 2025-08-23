-- Chat database schema
-- Tables for managing chat inquiries, provider answers, consolidated answers, and ratings

CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT,
    question TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE provider_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES inquiries(id),
    provider TEXT,
    model TEXT,
    answer TEXT,
    latency_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE consolidated_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES inquiries(id),
    answer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE provider_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES inquiries(id),
    provider TEXT,
    model TEXT,
    score_percent INT CHECK (score_percent BETWEEN 0 AND 100),
    justification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_inquiries_thread_id ON inquiries(thread_id);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at);
CREATE INDEX idx_provider_answers_inquiry_id ON provider_answers(inquiry_id);
CREATE INDEX idx_provider_answers_provider ON provider_answers(provider);
CREATE INDEX idx_consolidated_answers_inquiry_id ON consolidated_answers(inquiry_id);
CREATE INDEX idx_provider_ratings_inquiry_id ON provider_ratings(inquiry_id);
CREATE INDEX idx_provider_ratings_provider ON provider_ratings(provider);

COMMIT;