"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const portfolioService_1 = require("../services/portfolioService");
const authJWT_1 = require("../middleware/authJWT");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
const portfolioService = new portfolioService_1.PortfolioService();
router.use(authJWT_1.authJWT);
router.post('/upload', (req, res, next) => {
    portfolioService.getUploadMiddleware()(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        try {
            const userId = req.user.id;
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            const positions = await portfolioService.parseUploadedFile(file);
            if (positions.length === 0) {
                return res.status(400).json({ error: 'No valid positions found in file' });
            }
            let portfolioResult = await pool_1.pool.query('SELECT id FROM portfolios WHERE user_id = $1 AND name = $2', [userId, 'Default Portfolio']);
            let portfolioId;
            if (portfolioResult.rows.length === 0) {
                const createResult = await pool_1.pool.query('INSERT INTO portfolios (user_id, name, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id', [userId, 'Default Portfolio', 'Automatically created portfolio']);
                portfolioId = createResult.rows[0].id;
            }
            else {
                portfolioId = portfolioResult.rows[0].id;
            }
            await portfolioService.upsertPositions(userId, portfolioId, positions);
            res.json({
                message: 'Portfolio uploaded successfully',
                portfolioId,
                positionsCount: positions.length,
                positions: positions.map(p => ({
                    symbol: p.symbol,
                    quantity: p.quantity,
                    avgCost: p.avgCost
                }))
            });
        }
        catch (error) {
            console.error('Portfolio upload error:', error);
            res.status(500).json({
                error: 'Failed to process portfolio upload',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
});
router.get('/:id/summary', async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolioId = parseInt(req.params.id);
        if (isNaN(portfolioId)) {
            return res.status(400).json({ error: 'Invalid portfolio ID' });
        }
        const summary = await portfolioService.getPortfolioSummary(userId, portfolioId);
        res.json({
            portfolioId,
            summary: {
                totalValue: summary.totalValue,
                totalCost: summary.totalCost,
                totalUnrealizedPnL: summary.totalUnrealizedPnL,
                totalUnrealizedPnLPercent: summary.totalUnrealizedPnLPercent,
                positionsCount: summary.positions.length
            },
            positions: summary.positions.map(position => ({
                symbol: position.symbol,
                quantity: position.quantity,
                avgCost: position.avgCost,
                currentPrice: position.currentPrice,
                marketValue: position.marketValue,
                unrealizedPnL: position.unrealizedPnL,
                unrealizedPnLPercent: position.unrealizedPnLPercent
            })),
            allocation: summary.allocation,
            warnings: summary.warnings
        });
    }
    catch (error) {
        console.error('Portfolio summary error:', error);
        if (error instanceof Error && error.message === 'Portfolio not found or access denied') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({
            error: 'Failed to get portfolio summary',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/ask', async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolioId = parseInt(req.params.id);
        const { question, threadId } = req.body;
        if (isNaN(portfolioId)) {
            return res.status(400).json({ error: 'Invalid portfolio ID' });
        }
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({ error: 'Question is required' });
        }
        const portfolioKeywords = [
            'portfolio', 'position', 'holding', 'stock', 'investment', 'allocation',
            'diversification', 'risk', 'performance', 'return', 'profit', 'loss',
            'buy', 'sell', 'rebalance', 'sector', 'market', 'price', 'value'
        ];
        const questionLower = question.toLowerCase();
        const isPortfolioRelated = portfolioKeywords.some(keyword => questionLower.includes(keyword));
        if (!isPortfolioRelated) {
            return res.status(400).json({
                error: 'Question must be related to portfolio management, investments, or financial analysis'
            });
        }
        const result = await portfolioService.askPortfolioQuestion(userId, portfolioId, question.trim(), threadId);
        res.json({
            portfolioId,
            question: question.trim(),
            answer: result.answer,
            threadId: result.threadId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Portfolio question error:', error);
        if (error instanceof Error && error.message === 'Portfolio not found or access denied') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({
            error: 'Failed to process portfolio question',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool_1.pool.query(`SELECT id, name, description, created_at, updated_at,
       (SELECT COUNT(*) FROM positions WHERE portfolio_id = portfolios.id) as positions_count
       FROM portfolios WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
        res.json({
            portfolios: result.rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description,
                positionsCount: parseInt(row.positions_count),
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }))
        });
    }
    catch (error) {
        console.error('List portfolios error:', error);
        res.status(500).json({
            error: 'Failed to list portfolios',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Portfolio name is required' });
        }
        const result = await pool_1.pool.query('INSERT INTO portfolios (user_id, name, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *', [userId, name.trim(), description || null]);
        const portfolio = result.rows[0];
        res.status(201).json({
            id: portfolio.id,
            name: portfolio.name,
            description: portfolio.description,
            positionsCount: 0,
            createdAt: portfolio.created_at,
            updatedAt: portfolio.updated_at
        });
    }
    catch (error) {
        console.error('Create portfolio error:', error);
        res.status(500).json({
            error: 'Failed to create portfolio',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolioId = parseInt(req.params.id);
        if (isNaN(portfolioId)) {
            return res.status(400).json({ error: 'Invalid portfolio ID' });
        }
        const result = await pool_1.pool.query('DELETE FROM portfolios WHERE id = $1 AND user_id = $2 RETURNING id', [portfolioId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or access denied' });
        }
        res.json({ message: 'Portfolio deleted successfully' });
    }
    catch (error) {
        console.error('Delete portfolio error:', error);
        res.status(500).json({
            error: 'Failed to delete portfolio',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=portfolio.js.map