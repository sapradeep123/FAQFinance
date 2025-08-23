-- FAQ database schema
-- Standard finance FAQs organized by categories

-- Create enum for FAQ categories
CREATE TYPE faq_category AS ENUM ('BANKING', 'LOANS', 'INVESTMENTS', 'TAX', 'CARDS', 'GENERAL');
CREATE TYPE faq_status AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');

-- FAQs table
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category faq_category NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[], -- Array of keywords for search
    status faq_status DEFAULT 'ACTIVE',
    sort_order INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_status ON faqs(status);
CREATE INDEX IF NOT EXISTS idx_faqs_sort_order ON faqs(sort_order);
CREATE INDEX IF NOT EXISTS idx_faqs_keywords ON faqs USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_faqs_question_text ON faqs USING GIN(to_tsvector('english', question));
CREATE INDEX IF NOT EXISTS idx_faqs_answer_text ON faqs USING GIN(to_tsvector('english', answer));

-- Trigger for updated_at
CREATE TRIGGER update_faqs_updated_at 
    BEFORE UPDATE ON faqs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample FAQs

-- Banking FAQs
INSERT INTO faqs (category, question, answer, keywords, sort_order) VALUES
('BANKING', 'What is the difference between a checking and savings account?', 
 'A checking account is designed for frequent transactions like paying bills and making purchases, while a savings account is meant for storing money and earning interest with limited monthly transactions.', 
 ARRAY['checking', 'savings', 'account', 'difference', 'transactions'], 1),

('BANKING', 'How do I choose the right bank?', 
 'Consider factors like fees, interest rates, ATM network, online banking features, customer service, and branch locations. Compare different banks and credit unions to find the best fit for your needs.', 
 ARRAY['choose', 'bank', 'fees', 'interest', 'ATM', 'online banking'], 2),

('BANKING', 'What are overdraft fees and how can I avoid them?', 
 'Overdraft fees are charged when you spend more money than you have in your account. Avoid them by monitoring your balance, setting up account alerts, linking a savings account for overdraft protection, or opting out of overdraft coverage.', 
 ARRAY['overdraft', 'fees', 'avoid', 'balance', 'protection'], 3);

-- Loans FAQs
INSERT INTO faqs (category, question, answer, keywords, sort_order) VALUES
('LOANS', 'What factors affect my credit score?', 
 'Your credit score is affected by payment history (35%), credit utilization (30%), length of credit history (15%), types of credit (10%), and new credit inquiries (10%). Pay bills on time and keep credit utilization low for the best score.', 
 ARRAY['credit score', 'factors', 'payment history', 'utilization', 'credit history'], 1),

('LOANS', 'Should I get a fixed or variable rate mortgage?', 
 'Fixed-rate mortgages offer stable payments but typically start with higher rates. Variable rates start lower but can increase over time. Choose fixed if you prefer predictability, variable if you expect rates to stay low or plan to move soon.', 
 ARRAY['mortgage', 'fixed rate', 'variable rate', 'payments', 'interest'], 2),

('LOANS', 'How much house can I afford?', 
 'Generally, your total monthly housing costs should not exceed 28% of your gross monthly income. Consider the down payment, closing costs, property taxes, insurance, and maintenance when determining affordability.', 
 ARRAY['house', 'afford', 'income', 'housing costs', 'down payment'], 3);

-- Investments FAQs
INSERT INTO faqs (category, question, answer, keywords, sort_order) VALUES
('INVESTMENTS', 'What is the difference between stocks and bonds?', 
 'Stocks represent ownership in a company and offer potential for higher returns but with more risk. Bonds are loans to companies or governments that typically provide steady income with lower risk but lower potential returns.', 
 ARRAY['stocks', 'bonds', 'difference', 'ownership', 'risk', 'returns'], 1),

('INVESTMENTS', 'How should I diversify my investment portfolio?', 
 'Diversify across asset classes (stocks, bonds, real estate), geographic regions (domestic, international), company sizes (large, mid, small cap), and sectors. Consider your age, risk tolerance, and investment timeline when allocating assets.', 
 ARRAY['diversify', 'portfolio', 'asset classes', 'risk tolerance', 'allocation'], 2),

('INVESTMENTS', 'What is dollar-cost averaging?', 
 'Dollar-cost averaging is investing a fixed amount regularly regardless of market conditions. This strategy can reduce the impact of market volatility by buying more shares when prices are low and fewer when prices are high.', 
 ARRAY['dollar cost averaging', 'investing', 'market volatility', 'strategy'], 3);

-- Tax FAQs
INSERT INTO faqs (category, question, answer, keywords, sort_order) VALUES
('TAX', 'What tax deductions can I claim?', 
 'Common deductions include mortgage interest, state and local taxes, charitable donations, medical expenses exceeding 7.5% of AGI, and business expenses. You can choose between standard deduction or itemizing deductions.', 
 ARRAY['tax deductions', 'mortgage interest', 'charitable donations', 'medical expenses', 'standard deduction'], 1),

('TAX', 'Should I contribute to a traditional or Roth IRA?', 
 'Traditional IRA contributions may be tax-deductible now but taxed in retirement. Roth IRA contributions are made with after-tax dollars but withdrawals in retirement are tax-free. Consider your current vs. expected future tax bracket.', 
 ARRAY['IRA', 'traditional', 'Roth', 'tax deductible', 'retirement', 'tax bracket'], 2),

('TAX', 'When should I start tax planning?', 
 'Tax planning should be year-round, not just at tax time. Review your situation quarterly, especially after major life events like marriage, having children, buying a home, or changing jobs.', 
 ARRAY['tax planning', 'year round', 'life events', 'quarterly'], 3);

-- Cards FAQs
INSERT INTO faqs (category, question, answer, keywords, sort_order) VALUES
('CARDS', 'How do I choose the right credit card?', 
 'Consider your spending habits, credit score, desired rewards (cash back, travel, points), annual fees, interest rates, and special benefits. Match the card features to your lifestyle and financial goals.', 
 ARRAY['credit card', 'choose', 'rewards', 'cash back', 'travel', 'annual fees'], 1),

('CARDS', 'How can I improve my credit utilization ratio?', 
 'Keep your credit utilization below 30% of your credit limit, ideally below 10%. Pay down balances, request credit limit increases, or spread balances across multiple cards. Pay off balances before statement closing dates.', 
 ARRAY['credit utilization', 'ratio', 'credit limit', 'balances', 'improve'], 2),

('CARDS', 'What should I do if my credit card is stolen?', 
 'Immediately contact your credit card company to report the theft and freeze the card. Monitor your statements for unauthorized charges, file a police report if needed, and consider placing a fraud alert on your credit reports.', 
 ARRAY['credit card', 'stolen', 'fraud', 'report', 'unauthorized charges'], 3);

-- General FAQs
INSERT INTO faqs (category, question, answer, keywords, sort_order) VALUES
('GENERAL', 'How much should I have in an emergency fund?', 
 'Aim for 3-6 months of living expenses in an easily accessible savings account. If you have irregular income or job instability, consider saving 6-12 months of expenses.', 
 ARRAY['emergency fund', 'savings', 'living expenses', 'months'], 1),

('GENERAL', 'What is compound interest and why is it important?', 
 'Compound interest is earning interest on both your principal and previously earned interest. It accelerates wealth building over time, making early and consistent investing crucial for long-term financial success.', 
 ARRAY['compound interest', 'wealth building', 'investing', 'long term'], 2),

('GENERAL', 'How do I create a budget?', 
 'Track your income and expenses for a month, categorize spending, identify areas to cut back, and allocate money to needs, wants, and savings. Use the 50/30/20 rule as a starting point: 50% needs, 30% wants, 20% savings.', 
 ARRAY['budget', 'income', 'expenses', 'savings', '50/30/20 rule'], 3);

COMMIT;