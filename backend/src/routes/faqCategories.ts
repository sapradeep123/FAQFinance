import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/authJWT';
import { requireAdmin } from '../middleware/requireAdmin';
import { asyncHandler } from '../middleware/errorHandler';
import { query as dbQuery } from '../config/database';

const router = Router();

const validate = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/faq/categories/list - list all categories (admin)
router.get('/list', asyncHandler(async (_req, res) => {
  const result = await dbQuery('SELECT id, name, sort_order, is_active, created_at, updated_at FROM faq_categories ORDER BY sort_order, name');
  res.json({ success: true, data: { categories: result.rows } });
}));

// POST /api/faq/categories - create category
router.post('/'
  , body('name').trim().isLength({ min: 2, max: 50 })
  , body('sort_order').optional().isInt({ min: 0 })
  , validate
  , asyncHandler(async (req, res) => {
    const { name, sort_order } = req.body;
    const result = await dbQuery(
      `INSERT INTO faq_categories (name, sort_order) VALUES ($1, $2)
       RETURNING id, name, sort_order, is_active, created_at, updated_at`,
      [name, sort_order ?? 0]
    );
    res.status(201).json({ success: true, data: { category: result.rows[0] } });
  })
);

// PUT /api/faq/categories/:id - update name/sort_order/is_active
router.put('/:id'
  , param('id').isUUID()
  , body('name').optional().trim().isLength({ min: 2, max: 50 })
  , body('sort_order').optional().isInt({ min: 0 })
  , body('is_active').optional().isBoolean()
  , validate
  , asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(updates)) {
      fields.push(`${k} = $${i++}`);
      values.push(v);
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No updates' });
    fields.push('updated_at = NOW()');
    values.push(id);
    const result = await dbQuery(
      `UPDATE faq_categories SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, name, sort_order, is_active, created_at, updated_at`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { category: result.rows[0] } });
  })
);

// DELETE /api/faq/categories/:id - soft delete
router.delete('/:id'
  , param('id').isUUID()
  , validate
  , asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await dbQuery(
      `UPDATE faq_categories SET is_active = FALSE, updated_at = NOW() WHERE id = $1
       RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Category archived' });
  })
);

export default router;


