"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const authJWT_1 = require("../middleware/authJWT");
const llm_1 = require("../services/llm");
const pool_1 = require("../db/pool");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const llmService = new llm_1.LLMService();
const FINANCE_KEYWORDS = [
    'stock', 'stocks', 'market', 'trading', 'investment', 'portfolio', 'finance', 'financial',
    'equity', 'bond', 'dividend', 'earnings', 'revenue', 'profit', 'loss', 'ticker', 'symbol',
    'price', 'valuation', 'analysis', 'forecast', 'economy', 'economic', 'currency', 'forex',
    'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'fund', 'etf', 'mutual', 'index',
    'bull', 'bear', 'volatility', 'risk', 'return', 'yield', 'interest', 'rate', 'inflation',
    'gdp', 'fed', 'federal', 'reserve', 'bank', 'banking', 'credit', 'debt', 'loan',
    'mortgage', 'insurance', 'retirement', '401k', 'ira', 'pension', 'asset', 'liability',
    'balance', 'sheet', 'income', 'statement', 'cash', 'flow', 'ratio', 'pe', 'pb', 'roe'
];
function isFinanceRelated(question) {
    const lowerQuestion = question.toLowerCase();
    return FINANCE_KEYWORDS.some(keyword => lowerQuestion.includes(keyword));
}
router.post('/ask', authJWT_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { threadId, question } = req.body;
    const userId = req.user.id;
    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question is required and must be a string' });
    }
    if (!isFinanceRelated(question)) {
        return res.status(400).json({
            error: 'Question must be finance-related',
            message: 'Please ask questions about stocks, markets, investments, or other financial topics.'
        });
    }
    try {
        const inquiryResult = await (0, pool_1.query)('INSERT INTO inquiries (thread_id, question) VALUES ($1, $2) RETURNING id', [threadId || (0, uuid_1.v4)(), question]);
        const inquiryId = inquiryResult.rows[0].id;
        const providers = [
            { name: 'openai', model: 'gpt-3.5-turbo' },
            { name: 'openai', model: 'gpt-4' },
            { name: 'anthropic', model: 'claude-3-sonnet' }
        ];
        const providerPromises = providers.map(async (provider) => {
            const startTime = Date.now();
            try {
                const response = await llmService.generateResponse([{ role: 'user', content: question }], provider.model, {
                    systemPrompt: 'You are a helpful financial advisor. Provide accurate, informative responses about finance, investing, and markets.',
                    temperature: 0.7,
                    maxTokens: 500
                });
                const latency = Date.now() - startTime;
                await (0, pool_1.query)('INSERT INTO provider_answers (inquiry_id, provider, model, answer, latency_ms) VALUES ($1, $2, $3, $4, $5)', [inquiryId, provider.name, provider.model, response.message, latency]);
                return {
                    provider: provider.name,
                    model: provider.model,
                    answer: response.message,
                    latency,
                    success: true
                };
            }
            catch (error) {
                console.error(`Provider ${provider.name}/${provider.model} failed:`, error);
                return {
                    provider: provider.name,
                    model: provider.model,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    success: false
                };
            }
        });
        const providerResults = await Promise.allSettled(providerPromises);
        const successfulAnswers = providerResults
            .filter(result => result.status === 'fulfilled' && result.value.success)
            .map(result => result.value);
        if (successfulAnswers.length === 0) {
            return res.status(500).json({ error: 'All providers failed to generate responses' });
        }
        const consolidationPrompt = `
Based on the following responses to the question "${question}", provide a consolidated, comprehensive answer:

${successfulAnswers.map((result, index) => `Response ${index + 1} (${result.provider}/${result.model}):\n${result.answer}`).join('\n\n')}

Consolidated Answer:`;
        const consolidatedResponse = await llmService.generateResponse([{ role: 'user', content: consolidationPrompt }], 'gpt-4', {
            systemPrompt: 'You are an expert financial analyst. Consolidate the given responses into a single, accurate, and comprehensive answer.',
            temperature: 0.3,
            maxTokens: 800
        });
        await (0, pool_1.query)('INSERT INTO consolidated_answers (inquiry_id, answer) VALUES ($1, $2)', [inquiryId, consolidatedResponse.message]);
        const ratingPromises = successfulAnswers.map(async (result) => {
            try {
                const ratingPrompt = `
Rate the following answer to the question "${question}" on a scale of 0-100:

Answer: ${result.answer}

Consider accuracy, completeness, clarity, and relevance. Provide only a number between 0-100 and a brief justification.
Format: SCORE: [number]\nJUSTIFICATION: [brief explanation]`;
                const ratingResponse = await llmService.generateResponse([{ role: 'user', content: ratingPrompt }], 'gpt-3.5-turbo', {
                    systemPrompt: 'You are an expert evaluator of financial advice. Rate answers objectively.',
                    temperature: 0.1,
                    maxTokens: 200
                });
                const scoreMatch = ratingResponse.message.match(/SCORE:\s*(\d+)/);
                const justificationMatch = ratingResponse.message.match(/JUSTIFICATION:\s*(.+)/);
                const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
                const justification = justificationMatch ? justificationMatch[1].trim() : 'No justification provided';
                await (0, pool_1.query)('INSERT INTO provider_ratings (inquiry_id, provider, model, score_percent, justification) VALUES ($1, $2, $3, $4, $5)', [inquiryId, result.provider, result.model, Math.min(100, Math.max(0, score)), justification]);
            }
            catch (error) {
                console.error(`Rating failed for ${result.provider}/${result.model}:`, error);
            }
        });
        await Promise.allSettled(ratingPromises);
        res.status(200).json({
            inquiryId,
            threadId: threadId || inquiryResult.rows[0].thread_id,
            question,
            consolidatedAnswer: consolidatedResponse.message,
            providerResults: successfulAnswers.map(result => ({
                provider: result.provider,
                model: result.model,
                latency: result.latency
            })),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Chat ask error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
router.get('/inquiries', authJWT_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { threadId } = req.query;
    const userId = req.user.id;
    if (!threadId) {
        return res.status(400).json({ error: 'threadId query parameter is required' });
    }
    try {
        const inquiriesResult = await (0, pool_1.query)(`
      SELECT 
        i.id,
        i.thread_id,
        i.question,
        i.created_at,
        ca.answer as consolidated_answer,
        ca.created_at as answer_created_at
      FROM inquiries i
      LEFT JOIN consolidated_answers ca ON i.id = ca.inquiry_id
      WHERE i.thread_id = $1
      ORDER BY i.created_at ASC
    `, [threadId]);
        const inquiries = await Promise.all(inquiriesResult.rows.map(async (inquiry) => {
            const answersResult = await (0, pool_1.query)(`
          SELECT provider, model, answer, latency_ms, created_at
          FROM provider_answers
          WHERE inquiry_id = $1
          ORDER BY created_at ASC
        `, [inquiry.id]);
            const ratingsResult = await (0, pool_1.query)(`
          SELECT provider, model, score_percent, justification, created_at
          FROM provider_ratings
          WHERE inquiry_id = $1
          ORDER BY score_percent DESC
        `, [inquiry.id]);
            return {
                id: inquiry.id,
                threadId: inquiry.thread_id,
                question: inquiry.question,
                createdAt: inquiry.created_at,
                consolidatedAnswer: inquiry.consolidated_answer,
                answerCreatedAt: inquiry.answer_created_at,
                providerAnswers: answersResult.rows,
                providerRatings: ratingsResult.rows
            };
        }));
        res.status(200).json({
            threadId,
            inquiries,
            count: inquiries.length
        });
    }
    catch (error) {
        console.error('Get inquiries error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
//# sourceMappingURL=chat.js.map