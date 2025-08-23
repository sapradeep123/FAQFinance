"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const authJWT_1 = require("../middleware/authJWT");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { category, search, limit = '10', offset = '0' } = req.query;
    let queryText = `
    SELECT id, question, answer, category, tags, created_at, updated_at, is_active
    FROM faqs 
    WHERE is_active = true
  `;
    const queryParams = [];
    let paramCount = 0;
    if (category) {
        paramCount++;
        queryText += ` AND category = $${paramCount}`;
        queryParams.push(category);
    }
    if (search) {
        paramCount++;
        queryText += ` AND (question ILIKE $${paramCount} OR answer ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
    }
    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), parseInt(offset));
    const result = await (0, pool_1.query)(queryText, queryParams);
    let countQuery = 'SELECT COUNT(*) FROM faqs WHERE is_active = true';
    const countParams = [];
    let countParamCount = 0;
    if (category) {
        countParamCount++;
        countQuery += ` AND category = $${countParamCount}`;
        countParams.push(category);
    }
    if (search) {
        countParamCount++;
        countQuery += ` AND (question ILIKE $${countParamCount} OR answer ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
    }
    const countResult = await (0, pool_1.query)(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    res.status(200).json({
        faqs: result.rows,
        pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + parseInt(limit) < total
        }
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const result = await (0, pool_1.query)('SELECT id, question, answer, category, tags, created_at, updated_at FROM faqs WHERE id = $1 AND is_active = true', [id]);
    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'FAQ not found',
            message: 'The requested FAQ does not exist or is not active'
        });
    }
    res.status(200).json({
        faq: result.rows[0]
    });
}));
router.get('/categories/list', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await (0, pool_1.query)('SELECT DISTINCT category, COUNT(*) as count FROM faqs WHERE is_active = true GROUP BY category ORDER BY category');
    res.status(200).json({
        categories: result.rows
    });
}));
router.post('/', authJWT_1.authenticateToken, authJWT_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { question, answer, category, tags } = req.body;
    if (!question || !answer || !category) {
        return res.status(400).json({
            error: 'Missing required fields',
            message: 'Question, answer, and category are required'
        });
    }
    const result = await (0, pool_1.query)(`INSERT INTO faqs (question, answer, category, tags, created_by) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING id, question, answer, category, tags, created_at, is_active`, [question, answer, category, tags || [], req.user.id]);
    res.status(201).json({
        message: 'FAQ created successfully',
        faq: result.rows[0]
    });
}));
router.put('/:id', authJWT_1.authenticateToken, authJWT_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { question, answer, category, tags, is_active } = req.body;
    const result = await (0, pool_1.query)(`UPDATE faqs 
     SET question = COALESCE($1, question),
         answer = COALESCE($2, answer),
         category = COALESCE($3, category),
         tags = COALESCE($4, tags),
         is_active = COALESCE($5, is_active),
         updated_at = NOW()
     WHERE id = $6
     RETURNING id, question, answer, category, tags, created_at, updated_at, is_active`, [question, answer, category, tags, is_active, id]);
    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'FAQ not found',
            message: 'The requested FAQ does not exist'
        });
    }
    res.status(200).json({
        message: 'FAQ updated successfully',
        faq: result.rows[0]
    });
}));
router.delete('/:id', authJWT_1.authenticateToken, authJWT_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const result = await (0, pool_1.query)('DELETE FROM faqs WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'FAQ not found',
            message: 'The requested FAQ does not exist'
        });
    }
    res.status(200).json({
        message: 'FAQ deleted successfully'
    });
}));
router.get('/admin/all', authJWT_1.authenticateToken, authJWT_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = '10', offset = '0' } = req.query;
    const result = await (0, pool_1.query)(`SELECT f.*, u.email as created_by_email 
     FROM faqs f 
     LEFT JOIN users u ON f.created_by = u.id 
     ORDER BY f.created_at DESC 
     LIMIT $1 OFFSET $2`, [parseInt(limit), parseInt(offset)]);
    const countResult = await (0, pool_1.query)('SELECT COUNT(*) FROM faqs');
    const total = parseInt(countResult.rows[0].count);
    res.status(200).json({
        faqs: result.rows,
        pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + parseInt(limit) < total
        }
    });
}));
exports.default = router;
//# sourceMappingURL=faq.js.map