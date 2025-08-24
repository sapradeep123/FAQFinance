-- FAQ Categories table with soft delete
CREATE TABLE IF NOT EXISTS faq_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default categories if not present
INSERT INTO faq_categories (name, sort_order)
SELECT v, i
FROM (VALUES
  ('BANKING', 1),
  ('LOANS', 2),
  ('INVESTMENTS', 3),
  ('TAX', 4),
  ('CARDS', 5),
  ('GENERAL', 6)
) AS s(v,i)
ON CONFLICT (name) DO NOTHING;

-- Ensure faqs.category matches categories; keep as TEXT but validate in app layer

