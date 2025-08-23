-- Chat database schema
-- Tables for handling chat inquiries, provider responses, and consolidated answers

-- Create enum types for chat
CREATE TYPE inquiry_type AS ENUM ('GENERAL', 'PORTFOLIO_SPECIFIC');
CREATE TYPE inquiry_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE provider_name AS ENUM ('YAHOO', 'GOOGLE', 'FALLBACK');
CREATE TYPE provider_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'TIMEOUT');

-- Chat threads table
CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE
);

-- Inquiries table - stores user questions
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL, -- For portfolio-specific questions
    question TEXT NOT NULL,
    inquiry_type inquiry_type DEFAULT 'GENERAL',
    status inquiry_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}' -- Store additional context
);

-- Provider answers table - stores responses from each provider
CREATE TABLE IF NOT EXISTS provider_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    provider provider_name NOT NULL,
    status provider_status DEFAULT 'PENDING',
    answer TEXT,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    raw_response JSONB, -- Store full API response
    tokens_used INTEGER DEFAULT 0
);

-- Consolidated answers table - stores the final consolidated response
CREATE TABLE IF NOT EXISTS consolidated_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    consolidated_answer TEXT NOT NULL,
    consolidation_method VARCHAR(50) DEFAULT 'weighted_average',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_time_ms INTEGER,
    sources_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- Provider ratings table - stores ratings from providers about consolidated answers
CREATE TABLE IF NOT EXISTS provider_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consolidated_answer_id UUID NOT NULL REFERENCES consolidated_answers(id) ON DELETE CASCADE,
    provider provider_name NOT NULL,
    correctness_percentage DECIMAL(5,2), -- 0.00 to 100.00
    rating_explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    error_message TEXT
);

-- Chat messages table - for storing the conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
    consolidated_answer_id UUID REFERENCES consolidated_answers(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_edited BOOLEAN DEFAULT FALSE,
    edit_history JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id ON chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at ON chat_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_archived ON chat_threads(is_archived);

CREATE INDEX IF NOT EXISTS idx_inquiries_thread_id ON inquiries(thread_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_type ON inquiries(inquiry_type);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_portfolio_id ON inquiries(portfolio_id);

CREATE INDEX IF NOT EXISTS idx_provider_answers_inquiry_id ON provider_answers(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_provider_answers_provider ON provider_answers(provider);
CREATE INDEX IF NOT EXISTS idx_provider_answers_status ON provider_answers(status);
CREATE INDEX IF NOT EXISTS idx_provider_answers_created_at ON provider_answers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consolidated_answers_inquiry_id ON consolidated_answers(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_answers_created_at ON consolidated_answers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_ratings_consolidated_answer_id ON provider_ratings(consolidated_answer_id);
CREATE INDEX IF NOT EXISTS idx_provider_ratings_provider ON provider_ratings(provider);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_question_text ON inquiries USING GIN(to_tsvector('english', question));
CREATE INDEX IF NOT EXISTS idx_consolidated_answers_text ON consolidated_answers USING GIN(to_tsvector('english', consolidated_answer));
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_text ON chat_messages USING GIN(to_tsvector('english', content));

-- Triggers for updated_at
CREATE TRIGGER update_chat_threads_updated_at 
    BEFORE UPDATE ON chat_threads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at 
    BEFORE UPDATE ON inquiries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_answers_updated_at 
    BEFORE UPDATE ON provider_answers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consolidated_answers_updated_at 
    BEFORE UPDATE ON consolidated_answers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update thread message count and last message time
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_threads 
        SET 
            message_count = message_count + 1,
            last_message_at = NEW.created_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.thread_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chat_threads 
        SET 
            message_count = GREATEST(message_count - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.thread_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update thread stats when messages are added/removed
CREATE TRIGGER update_thread_stats_trigger
    AFTER INSERT OR DELETE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_stats();

-- Function to clean up old chat data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_chat_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Delete old archived threads and their related data
    DELETE FROM chat_threads 
    WHERE is_archived = TRUE 
    AND updated_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up orphaned records (should be handled by CASCADE, but just in case)
    DELETE FROM provider_answers 
    WHERE inquiry_id NOT IN (SELECT id FROM inquiries);
    
    DELETE FROM consolidated_answers 
    WHERE inquiry_id NOT IN (SELECT id FROM inquiries);
    
    DELETE FROM provider_ratings 
    WHERE consolidated_answer_id NOT IN (SELECT id FROM consolidated_answers);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;