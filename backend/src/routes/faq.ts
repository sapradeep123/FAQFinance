import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateToken, optionalAuth } from '../middleware/authJWT';
import { requireAdmin } from '../middleware/requireAdmin';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { adminService } from '../services/adminService';
import { query as dbQuery } from '../config/database';

const router = Router();

// Local helpers for typed access to req.user
const hasUser = (req: Request): boolean => Boolean((req as any).user);
const getUserId = (req: Request): string | undefined => {
  const u = (req as any).user;
  return u?.userId !== undefined && u?.userId !== null ? String(u.userId) : undefined;
};

// Validation middleware
const createFaqValidation = [
  body('category')
    .isString()
    .trim()
    .custom(async (value) => {
      const res = await dbQuery('SELECT 1 FROM faq_categories WHERE name = $1 AND is_active = TRUE', [value]);
      if (res.rows.length === 0) throw new Error('Category does not exist or is inactive');
      return true;
    }),
  body('question')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Question must be between 10 and 500 characters'),
  body('answer')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Answer must be between 10 and 2000 characters'),
  body('keywords')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Keywords must be less than 500 characters'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

const updateFaqValidation = [
  body('category')
    .optional()
    .custom(async (value) => {
      const res = await dbQuery('SELECT 1 FROM faq_categories WHERE name = $1 AND is_active = TRUE', [value]);
      if (res.rows.length === 0) throw new Error('Category does not exist or is inactive');
      return true;
    }),
  body('question')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Question must be between 10 and 500 characters'),
  body('answer')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Answer must be between 10 and 2000 characters'),
  body('keywords')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Keywords must be less than 500 characters'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

const getFaqsValidation = [
  query('category')
    .optional()
    .custom(async (value) => {
      const res = await dbQuery('SELECT 1 FROM faq_categories WHERE name = $1', [value]);
      if (res.rows.length === 0) throw new Error('Category does not exist');
      return true;
    }),
  query('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'ALL'])
    .withMessage('Status must be ACTIVE, INACTIVE, or ALL'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

const searchFaqsValidation = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  query('category')
    .optional()
    .custom(async (value) => {
      const res = await dbQuery('SELECT 1 FROM faq_categories WHERE name = $1', [value]);
      if (res.rows.length === 0) throw new Error('Category does not exist');
      return true;
    }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// Helper function to handle validation errors
const handleValidationErrors = (req: Request, res: Response, next: any): any => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/faq - Get FAQs (public endpoint with optional auth)
router.get('/',
  optionalAuth,
  getFaqsValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const category = req.query.category as string;
      const status = (req.query.status as string) || 'ACTIVE';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      let query = `
        SELECT id, category, question, answer, keywords, sort_order, status, created_at, updated_at
        FROM faqs
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }
      
      if (status !== 'ALL') {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      query += ` ORDER BY sort_order ASC, created_at DESC`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const result = await dbQuery(query, params);
      const faqs = result.rows;

      // Log successful FAQs fetch
      if (hasUser(req)) {
        await adminService.logUsage(
          '/api/faq',
          'GET',
          200,
          Date.now() - startTime,
          getUserId(req),
          req.ip,
          req.get('User-Agent')
        );
      }

      res.json({
        success: true,
        data: {
          faqs,
          pagination: {
            limit,
            offset,
            hasMore: faqs.length === limit
          },
          filters: {
            category,
            status
          }
        }
      });
    } catch (error: any) {
      // Log failed FAQs fetch
      if (hasUser(req)) {
        await adminService.logUsage(
          '/api/faq',
          'GET',
          error.statusCode || 500,
          Date.now() - startTime,
          getUserId(req),
          req.ip,
          req.get('User-Agent'),
          error.message
        );
      }
      throw error;
    }
  })
);

// GET /api/faq/search - Search FAQs (public endpoint with optional auth)
router.get('/search',
  optionalAuth,
  searchFaqsValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const searchQuery = req.query.q as string;
      const category = req.query.category as string;
      const limit = parseInt(req.query.limit as string) || 20;
      
      let query = `
        SELECT id, category, question, answer, keywords, sort_order, status, created_at, updated_at,
               ts_rank(to_tsvector('english', question || ' ' || answer || ' ' || COALESCE(keywords, '')), 
                      plainto_tsquery('english', $1)) as rank
        FROM faqs
        WHERE status = 'ACTIVE'
          AND to_tsvector('english', question || ' ' || answer || ' ' || COALESCE(keywords, '')) 
              @@ plainto_tsquery('english', $1)
      `;
      const params: any[] = [searchQuery];
      let paramIndex = 2;
      
      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }
      
      query += ` ORDER BY rank DESC, sort_order ASC`;
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
      
      const result = await dbQuery(query, params);
      const faqs = result.rows.map((row: any) => {
        const { rank, ...faq } = row;
        return faq;
      });

      // Log successful FAQ search
      if (hasUser(req)) {
        await adminService.logUsage(
          '/api/faq/search',
          'GET',
          200,
          Date.now() - startTime,
          getUserId(req),
          req.ip,
          req.get('User-Agent')
        );
      }

      res.json({
        success: true,
        data: {
          faqs,
          query: searchQuery,
          category,
          limit
        }
      });
    } catch (error: any) {
      // Log failed FAQ search
      if (hasUser(req)) {
        await adminService.logUsage(
          '/api/faq/search',
          'GET',
          error.statusCode || 500,
          Date.now() - startTime,
          getUserId(req),
          req.ip,
          req.get('User-Agent'),
          error.message
        );
      }
      throw error;
    }
  })
);

// GET /api/faq/categories - Get FAQ categories with counts (public endpoint)
router.get('/categories',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const result = await dbQuery(`
        SELECT c.name as category,
               COALESCE(f.total_count,0) as total_count,
               COALESCE(f.active_count,0) as active_count
        FROM faq_categories c
        LEFT JOIN (
          SELECT category, COUNT(*) as total_count,
                 COUNT(*) FILTER (WHERE status='ACTIVE') as active_count
          FROM faqs
          GROUP BY category
        ) f ON f.category = c.name
        WHERE c.is_active = TRUE
        ORDER BY c.sort_order, c.name
      `);
      const categories = result.rows;

      // Log successful categories fetch
      if (hasUser(req)) {
        await adminService.logUsage(
          '/api/faq/categories',
          'GET',
          200,
          Date.now() - startTime,
          getUserId(req),
          req.ip,
          req.get('User-Agent')
        );
      }

      res.json({
        success: true,
        data: { categories }
      });
    } catch (error: any) {
      // Log failed categories fetch
      if (hasUser(req)) {
        await adminService.logUsage(
          '/api/faq/categories',
          'GET',
          error.statusCode || 500,
          Date.now() - startTime,
          getUserId(req),
          req.ip,
          req.get('User-Agent'),
          error.message
        );
      }
      throw error;
    }
  })
);

// GET /api/faq/:faqId - Get a specific FAQ (public endpoint with optional auth)
router.get('/:faqId',
  optionalAuth,
  param('faqId').isUUID().withMessage('Invalid FAQ ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { faqId } = req.params;
      
      const query = `
        SELECT id, category, question, answer, keywords, sort_order, status, created_at, updated_at
        FROM faqs
        WHERE id = $1
      `;
      
      const result = await dbQuery(query, [faqId]);
      
      if (result.rows.length === 0) {
        throw createError('FAQ not found', 404);
      }
      
      const faq = result.rows[0];
      
      // Only return inactive FAQs to admins
      const u: any = (req as any).user;
      if (faq.status === 'INACTIVE' && (!u || u.role !== 'ADMIN')) {
        throw createError('FAQ not found', 404);
      }

      // Log successful FAQ fetch
      if (hasUser(req)) {
        await adminService.logUsage(
          '/api/faq/:faqId',
          'GET',
          200,
          Date.now() - startTime,
          getUserId(req),
          req.ip,
          req.get('User-Agent')
        );
      }

      res.json({
        success: true,
        data: { faq }
      });
    } catch (error: any) {
      // Log failed FAQ fetch
      if (hasUser(req)) {
        await adminService.logUsage(
          '/api/faq/:faqId',
          'GET',
          error.statusCode || 500,
          Date.now() - startTime,
          getUserId(req),
          req.ip,
          req.get('User-Agent'),
          error.message
        );
      }
      throw error;
    }
  })
);

// Admin-only routes below this point
router.use(authenticateToken);
router.use(requireAdmin);

// POST /api/faq/generate - Generate an FAQ using GPT providers (admin only)
router.post('/generate',
  body('prompt').isString().trim().isLength({ min: 10, max: 1000 }),
  body('category').optional().isString().trim(),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const { prompt, category, save } = req.body as { prompt: string; category?: string; save?: boolean };

      // Use Postgres FTS first to suggest similar FAQs to avoid duplication
      const similar = await dbQuery(`
        SELECT id, category, question, answer, sort_order
        FROM faqs
        WHERE to_tsvector('english', question || ' ' || answer || ' ' || COALESCE(keywords, ''))
              @@ plainto_tsquery('english', $1)
        ORDER BY sort_order ASC
        LIMIT 3
      `, [prompt]);

      // Call LLM providers via admin-configured GPTs
      // Import lazily to avoid cycle
      const { llmService } = await import('../services/llmService');
      const providerResponses = await llmService.askAllProviders(prompt, undefined, getUserId(req));

      // Choose first/highest-confidence response for suggested FAQ
      const best = providerResponses.find(r => !r.error && r.answer) || providerResponses[0];
      const suggestedQuestion = prompt;
      const suggestedAnswer = best?.answer || 'Unable to generate an answer at this time.';

      let createdFaq: any | undefined;
      if (save) {
        // Validate category if provided
        if (category) {
          const catRes = await dbQuery('SELECT 1 FROM faq_categories WHERE name = $1 AND is_active = TRUE', [category]);
          if (catRes.rows.length === 0) {
            throw createError('Category does not exist or is inactive', 400);
          }
        }
        const insert = await dbQuery(
          `INSERT INTO faqs (category, question, answer, keywords, sort_order, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, category, question, answer, keywords, sort_order, status, created_at, updated_at`,
          [category || 'GENERAL', suggestedQuestion, suggestedAnswer, '', 0, 'ACTIVE']
        );
        createdFaq = insert.rows[0];
      }

      // Log usage
      await adminService.logUsage(
        '/api/faq/generate',
        'POST',
        200,
        Date.now() - startTime,
        getUserId(req),
        req.ip,
        req.get('User-Agent')
      );

      res.status(200).json({
        success: true,
        message: 'Generated FAQ suggestion',
        data: {
          suggestion: {
            question: suggestedQuestion,
            answer: suggestedAnswer,
            provider: best?.provider,
            confidence: best?.confidence || 0
          },
          similar: similar.rows,
          saved: Boolean(createdFaq),
          faq: createdFaq
        }
      });
    } catch (error: any) {
      await adminService.logUsage(
        '/api/faq/generate',
        'POST',
        error.statusCode || 500,
        Date.now() - startTime,
        getUserId(req),
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// POST /api/faq - Create a new FAQ (admin only)
router.post('/',
  createFaqValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { category, question, answer, keywords, sortOrder, status } = req.body;
      
      const query = `
        INSERT INTO faqs (category, question, answer, keywords, sort_order, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, category, question, answer, keywords, sort_order, status, created_at, updated_at
      `;
      
      const result = await dbQuery(query, [
        question,
        answer,
        category,
        keywords || '',
        sortOrder || 0,
        status || 'ACTIVE'
      ]);
      
      const faq = result.rows[0];

      // Log successful FAQ creation
      await adminService.logUsage(
        '/api/faq',
        'POST',
        201,
        Date.now() - startTime,
        getUserId(req)!,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: 'FAQ created successfully',
        data: { faq }
      });
    } catch (error: any) {
      // Log failed FAQ creation
      await adminService.logUsage(
        '/api/faq',
        'POST',
        error.statusCode || 500,
        Date.now() - startTime,
        getUserId(req),
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// PUT /api/faq/:faqId - Update an FAQ (admin only)
router.put('/:faqId',
  param('faqId').isUUID().withMessage('Invalid FAQ ID'),
  updateFaqValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { faqId } = req.params;
      const updates = req.body;
      
      // Build dynamic update query
      const updateFields = [];
      const params = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          const dbField = key === 'sortOrder' ? 'sort_order' : key;
          updateFields.push(`${dbField} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
      
      if (updateFields.length === 0) {
        throw createError('No valid fields to update', 400);
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(faqId);
      
      const query = `
        UPDATE faqs
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, category, question, answer, keywords, sort_order, status, created_at, updated_at
      `;
      
      const result = await dbQuery(query, params);
      
      if (result.rows.length === 0) {
        throw createError('FAQ not found', 404);
      }
      
      const faq = result.rows[0];

      // Log successful FAQ update
      await adminService.logUsage(
        '/api/faq/:faqId',
        'PUT',
        200,
        Date.now() - startTime,
        getUserId(req)!,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'FAQ updated successfully',
        data: { faq }
      });
    } catch (error: any) {
      // Log failed FAQ update
      await adminService.logUsage(
        '/api/faq/:faqId',
        'PUT',
        error.statusCode || 500,
        Date.now() - startTime,
        getUserId(req),
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// DELETE /api/faq/:faqId - Delete an FAQ (admin only)
router.delete('/:faqId',
  param('faqId').isUUID().withMessage('Invalid FAQ ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { faqId } = req.params;
      
      const query = 'DELETE FROM faqs WHERE id = $1 RETURNING id';
      const result = await dbQuery(query, [faqId]);
      
      if (result.rows.length === 0) {
        throw createError('FAQ not found', 404);
      }

      // Log successful FAQ deletion
      await adminService.logUsage(
        '/api/faq/:faqId',
        'DELETE',
        200,
        Date.now() - startTime,
        getUserId(req)!,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'FAQ deleted successfully'
      });
    } catch (error: any) {
      // Log failed FAQ deletion
      await adminService.logUsage(
        '/api/faq/:faqId',
        'DELETE',
        error.statusCode || 500,
        Date.now() - startTime,
        getUserId(req),
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

export default router;