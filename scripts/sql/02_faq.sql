-- FAQ database schema
-- FAQs table for storing frequently asked questions

CREATE TABLE faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL
);

-- Create index for better performance
CREATE INDEX idx_faqs_category ON faqs(category);

COMMIT;