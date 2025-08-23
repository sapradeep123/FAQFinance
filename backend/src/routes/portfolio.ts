import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { portfolioService } from '../services/portfolioService';
import { authenticateToken } from '../middleware/authJWT';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { adminService } from '../services/adminService';

const router = Router();

// All portfolio routes require authentication
router.use(authenticateToken);

// Validation middleware
const createPortfolioValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Portfolio name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'])
    .withMessage('Currency must be a valid currency code')
];

const updatePortfolioValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Portfolio name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'])
    .withMessage('Currency must be a valid currency code')
];

const addPositionValidation = [
  body('ticker')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Ticker must be between 1 and 10 characters'),
  body('quantity')
    .isFloat({ min: 0.000001 })
    .withMessage('Quantity must be a positive number'),
  body('averagePrice')
    .isFloat({ min: 0.01 })
    .withMessage('Average price must be a positive number'),
  body('sector')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Sector must be less than 50 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

const updatePositionValidation = [
  body('quantity')
    .optional()
    .isFloat({ min: 0.000001 })
    .withMessage('Quantity must be a positive number'),
  body('averagePrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Average price must be a positive number'),
  body('sector')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Sector must be less than 50 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

const getPortfoliosValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

const getPositionsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

const getHistoryValidation = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
];

// Helper function to handle validation errors
const handleValidationErrors = (req: Request, res: Response, next: any) => {
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

// POST /api/portfolio - Create a new portfolio
router.post('/',
  createPortfolioValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { name, description, currency } = req.body;
      
      const portfolio = await portfolioService.createPortfolio(userId, {
        name,
        description,
        currency: currency || 'USD'
      });

      // Log successful portfolio creation
      await adminService.logUsage(
        '/api/portfolio',
        'POST',
        201,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: 'Portfolio created successfully',
        data: { portfolio }
      });
    } catch (error: any) {
      // Log failed portfolio creation
      await adminService.logUsage(
        '/api/portfolio',
        'POST',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// GET /api/portfolio - Get user's portfolios
router.get('/',
  getPortfoliosValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const portfolios = await portfolioService.getUserPortfolios(userId, limit, offset);

      // Log successful portfolios fetch
      await adminService.logUsage(
        '/api/portfolio',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          portfolios,
          pagination: {
            limit,
            offset,
            hasMore: portfolios.length === limit
          }
        }
      });
    } catch (error: any) {
      // Log failed portfolios fetch
      await adminService.logUsage(
        '/api/portfolio',
        'GET',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// GET /api/portfolio/:portfolioId - Get a specific portfolio
router.get('/:portfolioId',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId } = req.params;
      
      const portfolio = await portfolioService.getPortfolio(portfolioId, userId);
      
      if (!portfolio) {
        throw createError(404, 'Portfolio not found');
      }

      // Log successful portfolio fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { portfolio }
      });
    } catch (error: any) {
      // Log failed portfolio fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId',
        'GET',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// PUT /api/portfolio/:portfolioId - Update a portfolio
router.put('/:portfolioId',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  updatePortfolioValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId } = req.params;
      const updates = req.body;
      
      const portfolio = await portfolioService.updatePortfolio(portfolioId, userId, updates);

      // Log successful portfolio update
      await adminService.logUsage(
        '/api/portfolio/:portfolioId',
        'PUT',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Portfolio updated successfully',
        data: { portfolio }
      });
    } catch (error: any) {
      // Log failed portfolio update
      await adminService.logUsage(
        '/api/portfolio/:portfolioId',
        'PUT',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// DELETE /api/portfolio/:portfolioId - Delete a portfolio
router.delete('/:portfolioId',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId } = req.params;
      
      await portfolioService.deletePortfolio(portfolioId, userId);

      // Log successful portfolio deletion
      await adminService.logUsage(
        '/api/portfolio/:portfolioId',
        'DELETE',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Portfolio deleted successfully'
      });
    } catch (error: any) {
      // Log failed portfolio deletion
      await adminService.logUsage(
        '/api/portfolio/:portfolioId',
        'DELETE',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// GET /api/portfolio/:portfolioId/positions - Get portfolio positions
router.get('/:portfolioId/positions',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  getPositionsValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const positions = await portfolioService.getPortfolioPositions(portfolioId, userId, limit, offset);

      // Log successful positions fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/positions',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          positions,
          pagination: {
            limit,
            offset,
            hasMore: positions.length === limit
          }
        }
      });
    } catch (error: any) {
      // Log failed positions fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/positions',
        'GET',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// POST /api/portfolio/:portfolioId/positions - Add a position to portfolio
router.post('/:portfolioId/positions',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  addPositionValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId } = req.params;
      const positionData = req.body;
      
      const position = await portfolioService.addPosition(portfolioId, userId, positionData);

      // Log successful position addition
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/positions',
        'POST',
        201,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: 'Position added successfully',
        data: { position }
      });
    } catch (error: any) {
      // Log failed position addition
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/positions',
        'POST',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// GET /api/portfolio/:portfolioId/positions/:positionId - Get a specific position
router.get('/:portfolioId/positions/:positionId',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  param('positionId').isUUID().withMessage('Invalid position ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId, positionId } = req.params;
      
      const position = await portfolioService.getPosition(positionId, portfolioId, userId);
      
      if (!position) {
        throw createError(404, 'Position not found');
      }

      // Log successful position fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/positions/:positionId',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { position }
      });
    } catch (error: any) {
      // Log failed position fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/positions/:positionId',
        'GET',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// PUT /api/portfolio/:portfolioId/positions/:positionId - Update a position
router.put('/:portfolioId/positions/:positionId',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  param('positionId').isUUID().withMessage('Invalid position ID'),
  updatePositionValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId, positionId } = req.params;
      const updates = req.body;
      
      const position = await portfolioService.updatePosition(positionId, portfolioId, userId, updates);

      // Log successful position update
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/positions/:positionId',
        'PUT',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Position updated successfully',
        data: { position }
      });
    } catch (error: any) {
      // Log failed position update
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/positions/:positionId',
        'PUT',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// DELETE /api/portfolio/:portfolioId/positions/:positionId - Remove a position
router.delete('/:portfolioId/positions/:positionId',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  param('positionId').isUUID().withMessage('Invalid position ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId, positionId } = req.params;
      
      await portfolioService.removePosition(positionId, portfolioId, userId);

      // Log successful position removal
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/positions/:positionId',
        'DELETE',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Position removed successfully'
      });
    } catch (error: any) {
      // Log failed position removal
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/positions/:positionId',
        'DELETE',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// POST /api/portfolio/:portfolioId/refresh - Refresh portfolio data
router.post('/:portfolioId/refresh',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId } = req.params;
      
      const portfolio = await portfolioService.refreshPortfolioData(portfolioId, userId);

      // Log successful portfolio refresh
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/refresh',
        'POST',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Portfolio data refreshed successfully',
        data: { portfolio }
      });
    } catch (error: any) {
      // Log failed portfolio refresh
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/refresh',
        'POST',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// GET /api/portfolio/:portfolioId/summary - Get portfolio summary
router.get('/:portfolioId/summary',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId } = req.params;
      
      const summary = await portfolioService.getPortfolioSummary(portfolioId, userId);

      // Log successful summary fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/summary',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { summary }
      });
    } catch (error: any) {
      // Log failed summary fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/summary',
        'GET',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// GET /api/portfolio/:portfolioId/analytics - Get portfolio analytics
router.get('/:portfolioId/analytics',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId } = req.params;
      
      const analytics = await portfolioService.getPortfolioAnalytics(portfolioId, userId);

      // Log successful analytics fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/analytics',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error: any) {
      // Log failed analytics fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/analytics',
        'GET',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// GET /api/portfolio/:portfolioId/history - Get position history
router.get('/:portfolioId/history',
  param('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  getHistoryValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { portfolioId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const limit = parseInt(req.query.limit as string) || 500;
      
      const history = await portfolioService.getPositionHistory(portfolioId, userId, days, limit);

      // Log successful history fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/history',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          history,
          parameters: {
            days,
            limit
          }
        }
      });
    } catch (error: any) {
      // Log failed history fetch
      await adminService.logUsage(
        '/api/portfolio/:portfolioId/history',
        'GET',
        error.statusCode || 500,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

export default router;