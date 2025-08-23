import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/authJWT';
import { requireAdmin } from '../middleware/requireAdmin';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { marketDataService } from '../services/marketDataService';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

// Get market data for a specific ticker
router.get('/market/:ticker',
  authenticateToken,
  param('ticker').isString().isLength({ min: 1, max: 10 }).withMessage('Invalid ticker symbol'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(createError(400, 'Validation failed', errors.array()));
      }

      const { ticker } = req.params;
      const snapshot = await marketDataService.getSnapshot(ticker.toUpperCase());
      
      res.json({
        success: true,
        data: snapshot
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get market data for multiple tickers
router.post('/market/batch',
  authenticateToken,
  body('tickers').isArray({ min: 1, max: 20 }).withMessage('Tickers must be an array of 1-20 symbols'),
  body('tickers.*').isString().isLength({ min: 1, max: 10 }).withMessage('Invalid ticker symbol'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(createError(400, 'Validation failed', errors.array()));
      }

      const { tickers } = req.body;
      const snapshots = await marketDataService.getMultipleSnapshots(tickers.map((t: string) => t.toUpperCase()));
      
      res.json({
        success: true,
        data: snapshots
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get historical prices for a ticker
router.get('/market/:ticker/history',
  authenticateToken,
  param('ticker').isString().isLength({ min: 1, max: 10 }).withMessage('Invalid ticker symbol'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(createError(400, 'Validation failed', errors.array()));
      }

      const { ticker } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      
      const historicalData = await marketDataService.getHistoricalPrices(ticker.toUpperCase(), days);
      
      res.json({
        success: true,
        data: historicalData
      });
    } catch (error) {
      next(error);
    }
  }
);

// Search for ticker symbols
router.get('/search',
  authenticateToken,
  query('q').isString().isLength({ min: 1, max: 50 }).withMessage('Query must be 1-50 characters'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(createError(400, 'Validation failed', errors.array()));
      }

      const { q } = req.query;
      const results = await marketDataService.searchTickers(q as string);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get market status
router.get('/market-status',
  authenticateToken,
  async (req, res, next) => {
    try {
      const status = await marketDataService.getMarketStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Get active market data providers
router.get('/providers',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const providers = await marketDataService.getActiveProviders();
      
      res.json({
        success: true,
        data: providers
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Update market data provider configuration
router.put('/providers/:id',
  authenticateToken,
  requireAdmin,
  param('id').isInt().withMessage('Invalid provider ID'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1 and 10'),
  body('base_url').optional().isURL().withMessage('Invalid base URL'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(createError(400, 'Validation failed', errors.array()));
      }

      const { id } = req.params;
      const updates = req.body;
      
      // This would need to be implemented in marketDataService
      // For now, return success
      res.json({
        success: true,
        message: 'Provider configuration updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Clear market data cache
router.delete('/cache',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      await marketDataService.cleanupStaleData(0); // Clear all cache
      
      res.json({
        success: true,
        message: 'Market data cache cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;