import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { adminService } from '../services/adminService';
import { authenticateToken } from '../middleware/authJWT';
import { requireAdmin } from '../middleware/requireAdmin';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Validation middleware
const createApiConfigValidation = [
  body('provider')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Provider must be between 1 and 50 characters'),
  body('endpoint')
    .trim()
    .isURL()
    .withMessage('Endpoint must be a valid URL'),
  body('apiKey')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('API key is required'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('rateLimitPerMinute')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Rate limit must be between 1 and 10000'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Priority must be between 1 and 100')
];

const updateApiConfigValidation = [
  body('endpoint')
    .optional()
    .trim()
    .isURL()
    .withMessage('Endpoint must be a valid URL'),
  body('apiKey')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('API key must be provided if updating'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('rateLimitPerMinute')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Rate limit must be between 1 and 10000'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Priority must be between 1 and 100')
];

const createNotificationValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('type')
    .isIn(['INFO', 'WARNING', 'ERROR', 'SUCCESS'])
    .withMessage('Type must be INFO, WARNING, ERROR, or SUCCESS'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Priority must be LOW, MEDIUM, HIGH, or CRITICAL')
];

const getLogsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('endpoint')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Endpoint filter must be between 1 and 200 characters'),
  query('method')
    .optional()
    .isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    .withMessage('Method must be a valid HTTP method'),
  query('statusCode')
    .optional()
    .isInt({ min: 100, max: 599 })
    .withMessage('Status code must be between 100 and 599'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

const getMetricsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('granularity')
    .optional()
    .isIn(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'])
    .withMessage('Granularity must be HOURLY, DAILY, WEEKLY, or MONTHLY')
];

const getUserActivityValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
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

// GET /api/admin/stats - Get system statistics
router.get('/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const stats = await adminService.getSystemStats();

      // Log successful stats fetch
      await adminService.logUsage(
        '/api/admin/stats',
        'GET',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error: any) {
      // Log failed stats fetch
      await adminService.logUsage(
        '/api/admin/stats',
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

// GET /api/admin/health - Get system health status
router.get('/health',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const health = await adminService.getSystemHealth();

      // Log successful health check
      await adminService.logUsage(
        '/api/admin/health',
        'GET',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { health }
      });
    } catch (error: any) {
      // Log failed health check
      await adminService.logUsage(
        '/api/admin/health',
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

// GET /api/admin/api-configs - Get API configurations
router.get('/api-configs',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const configs = await adminService.getApiConfigs();

      // Log successful configs fetch
      await adminService.logUsage(
        '/api/admin/api-configs',
        'GET',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { configs }
      });
    } catch (error: any) {
      // Log failed configs fetch
      await adminService.logUsage(
        '/api/admin/api-configs',
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

// POST /api/admin/api-configs - Create API configuration
router.post('/api-configs',
  createApiConfigValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const configData = req.body;
      const config = await adminService.createApiConfig(configData);

      // Log successful config creation
      await adminService.logUsage(
        '/api/admin/api-configs',
        'POST',
        201,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: 'API configuration created successfully',
        data: { config }
      });
    } catch (error: any) {
      // Log failed config creation
      await adminService.logUsage(
        '/api/admin/api-configs',
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

// PUT /api/admin/api-configs/:configId - Update API configuration
router.put('/api-configs/:configId',
  param('configId').isUUID().withMessage('Invalid config ID'),
  updateApiConfigValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { configId } = req.params;
      const updates = req.body;
      const config = await adminService.updateApiConfig(configId, updates);

      // Log successful config update
      await adminService.logUsage(
        '/api/admin/api-configs/:configId',
        'PUT',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'API configuration updated successfully',
        data: { config }
      });
    } catch (error: any) {
      // Log failed config update
      await adminService.logUsage(
        '/api/admin/api-configs/:configId',
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

// DELETE /api/admin/api-configs/:configId - Delete API configuration
router.delete('/api-configs/:configId',
  param('configId').isUUID().withMessage('Invalid config ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { configId } = req.params;
      await adminService.deleteApiConfig(configId);

      // Log successful config deletion
      await adminService.logUsage(
        '/api/admin/api-configs/:configId',
        'DELETE',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'API configuration deleted successfully'
      });
    } catch (error: any) {
      // Log failed config deletion
      await adminService.logUsage(
        '/api/admin/api-configs/:configId',
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

// GET /api/admin/logs - Get usage logs
router.get('/logs',
  getLogsValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        endpoint: req.query.endpoint as string,
        method: req.query.method as string,
        statusCode: req.query.statusCode ? parseInt(req.query.statusCode as string) : undefined,
        limit: parseInt(req.query.limit as string) || 100,
        offset: parseInt(req.query.offset as string) || 0
      };
      
      const logs = await adminService.getUsageLogs(filters);

      // Log successful logs fetch
      await adminService.logUsage(
        '/api/admin/logs',
        'GET',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          logs,
          filters,
          pagination: {
            limit: filters.limit,
            offset: filters.offset,
            hasMore: logs.length === filters.limit
          }
        }
      });
    } catch (error: any) {
      // Log failed logs fetch
      await adminService.logUsage(
        '/api/admin/logs',
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

// GET /api/admin/metrics - Get system metrics
router.get('/metrics',
  getMetricsValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        granularity: (req.query.granularity as 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY') || 'DAILY'
      };
      
      const metrics = await adminService.getMetrics(filters);

      // Log successful metrics fetch
      await adminService.logUsage(
        '/api/admin/metrics',
        'GET',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          metrics,
          filters
        }
      });
    } catch (error: any) {
      // Log failed metrics fetch
      await adminService.logUsage(
        '/api/admin/metrics',
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

// POST /api/admin/metrics/generate - Generate metrics rollup
router.post('/metrics/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      await adminService.generateMetrics();

      // Log successful metrics generation
      await adminService.logUsage(
        '/api/admin/metrics/generate',
        'POST',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Metrics generated successfully'
      });
    } catch (error: any) {
      // Log failed metrics generation
      await adminService.logUsage(
        '/api/admin/metrics/generate',
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

// GET /api/admin/notifications - Get admin notifications
router.get('/notifications',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';
      
      const notifications = await adminService.getNotifications(limit, offset, unreadOnly);

      // Log successful notifications fetch
      await adminService.logUsage(
        '/api/admin/notifications',
        'GET',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            limit,
            offset,
            hasMore: notifications.length === limit
          }
        }
      });
    } catch (error: any) {
      // Log failed notifications fetch
      await adminService.logUsage(
        '/api/admin/notifications',
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

// POST /api/admin/notifications - Create admin notification
router.post('/notifications',
  createNotificationValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const notificationData = req.body;
      const notification = await adminService.createNotification(notificationData);

      // Log successful notification creation
      await adminService.logUsage(
        '/api/admin/notifications',
        'POST',
        201,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: { notification }
      });
    } catch (error: any) {
      // Log failed notification creation
      await adminService.logUsage(
        '/api/admin/notifications',
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

// PUT /api/admin/notifications/:notificationId/read - Mark notification as read
router.put('/notifications/:notificationId/read',
  param('notificationId').isUUID().withMessage('Invalid notification ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { notificationId } = req.params;
      await adminService.markNotificationAsRead(notificationId);

      // Log successful notification mark as read
      await adminService.logUsage(
        '/api/admin/notifications/:notificationId/read',
        'PUT',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      // Log failed notification mark as read
      await adminService.logUsage(
        '/api/admin/notifications/:notificationId/read',
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

// DELETE /api/admin/notifications/:notificationId - Delete notification
router.delete('/notifications/:notificationId',
  param('notificationId').isUUID().withMessage('Invalid notification ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { notificationId } = req.params;
      await adminService.deleteNotification(notificationId);

      // Log successful notification deletion
      await adminService.logUsage(
        '/api/admin/notifications/:notificationId',
        'DELETE',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error: any) {
      // Log failed notification deletion
      await adminService.logUsage(
        '/api/admin/notifications/:notificationId',
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

// GET /api/admin/user-activity - Get user activity data
router.get('/user-activity',
  getUserActivityValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: parseInt(req.query.limit as string) || 100
      };
      
      const activity = await adminService.getUserActivity(filters);

      // Log successful user activity fetch
      await adminService.logUsage(
        '/api/admin/user-activity',
        'GET',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          activity,
          filters
        }
      });
    } catch (error: any) {
      // Log failed user activity fetch
      await adminService.logUsage(
        '/api/admin/user-activity',
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

// POST /api/admin/cleanup - Clean up old data
router.post('/cleanup',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const daysToKeep = parseInt(req.body.daysToKeep as string) || 90;
      await adminService.cleanupOldData(daysToKeep);

      // Log successful cleanup
      await adminService.logUsage(
        '/api/admin/cleanup',
        'POST',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: `Old data cleaned up successfully (kept last ${daysToKeep} days)`
      });
    } catch (error: any) {
      // Log failed cleanup
      await adminService.logUsage(
        '/api/admin/cleanup',
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

// GET /api/admin/rate-limits - Check rate limits
router.get('/rate-limits',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const identifier = req.query.identifier as string || req.ip;
      const rateLimitInfo = await adminService.checkRateLimit(identifier);

      // Log successful rate limit check
      await adminService.logUsage(
        '/api/admin/rate-limits',
        'GET',
        200,
        Date.now() - startTime,
        req.user!.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { rateLimitInfo }
      });
    } catch (error: any) {
      // Log failed rate limit check
      await adminService.logUsage(
        '/api/admin/rate-limits',
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