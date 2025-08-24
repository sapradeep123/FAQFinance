import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { chatService } from '../services/chatService';
import { authenticateToken } from '../middleware/authJWT';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { adminService } from '../services/adminService';
import { newsService } from '../services/newsService';

const router = Router();
// POST /api/chat/news-answer - News grounded JSON answer per contract
router.post('/news-answer',
  body('user_query').isString().trim().isLength({ min: 5, max: 5000 }),
  body('admin_allowed_sites').optional().isArray({ max: 5 }),
  body('region_preference').optional().isIn(['US', 'EU', 'WW']),
  body('time_window_days').optional().isInt({ min: 1, max: 365 }),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const userId = req.user!.userId;
      const { user_query, admin_allowed_sites, region_preference, time_window_days } = req.body as {
        user_query: string;
        admin_allowed_sites?: string[];
        region_preference?: 'US' | 'EU' | 'WW';
        time_window_days?: number;
      };

      // Load admin-configured defaults from system settings
      // Keys: news.allowed_sites (newline or comma-separated), news.region, news.window_days
      let effectiveSites: string[] | undefined = undefined;
      let effectiveRegion: 'US' | 'EU' | 'WW' | undefined = undefined;
      let effectiveWindow: number | undefined = undefined;

      try {
        const settings = await adminService.getSystemSettings();
        const getVal = (key: string) => settings.find((s: any) => s.key === key)?.value as string | undefined;

        if (!admin_allowed_sites) {
          const sitesRaw = getVal('news.allowed_sites');
          if (sitesRaw) {
            const split = sitesRaw
              .split(/\r?\n|,/)
              .map(s => s.trim())
              .filter(Boolean);
            if (split.length > 0) effectiveSites = split.slice(0, 5);
          }
        }

        if (!region_preference) {
          const r = getVal('news.region');
          if (r === 'US' || r === 'EU' || r === 'WW') effectiveRegion = r;
        }

        if (!time_window_days) {
          const w = getVal('news.window_days');
          const n = w ? parseInt(w, 10) : NaN;
          if (!Number.isNaN(n) && n > 0 && n <= 365) effectiveWindow = n;
        }
      } catch (e) {
        // Non-fatal: proceed with provided values or defaults in service
      }

      const result = await newsService.answerFromNews(user_query, {
        admin_allowed_sites: admin_allowed_sites ?? effectiveSites,
        region_preference: region_preference ?? effectiveRegion,
        time_window_days: time_window_days ?? effectiveWindow
      });

      await adminService.logUsage(
        '/api/chat/news-answer',
        'POST',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json(result);
    } catch (error: any) {
      await adminService.logUsage(
        '/api/chat/news-answer',
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


// All chat routes require authentication
router.use(authenticateToken);

// Validation middleware
const createThreadValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('initialMessage')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Initial message must be between 1 and 5000 characters')
];

const sendMessageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  body('context')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Context must be less than 2000 characters')
];

const updateThreadValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
];

const getThreadsValidation = [
  query('status')
    .optional()
    .isIn(['ACTIVE', 'ARCHIVED', 'ALL'])
    .withMessage('Status must be ACTIVE, ARCHIVED, or ALL'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

const getMessagesValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
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

// POST /api/chat/threads - Create a new chat thread
router.post('/threads',
  createThreadValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { title, initialMessage } = req.body;
      
      const thread = await chatService.createThread(userId, {
        title,
        initialMessage
      });

      // Log successful thread creation
      await adminService.logUsage(
        '/api/chat/threads',
        'POST',
        201,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: 'Chat thread created successfully',
        data: { thread }
      });
    } catch (error: any) {
      // Log failed thread creation
      await adminService.logUsage(
        '/api/chat/threads',
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

// GET /api/chat/threads - Get user's chat threads
router.get('/threads',
  getThreadsValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const status = (req.query.status as 'ACTIVE' | 'ARCHIVED' | 'ALL') || 'ACTIVE';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const threads = await chatService.getUserThreads(userId, status, limit, offset);

      // Log successful threads fetch
      await adminService.logUsage(
        '/api/chat/threads',
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
          threads,
          pagination: {
            limit,
            offset,
            hasMore: threads.length === limit
          }
        }
      });
    } catch (error: any) {
      // Log failed threads fetch
      await adminService.logUsage(
        '/api/chat/threads',
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

// GET /api/chat/threads/:threadId - Get a specific thread
router.get('/threads/:threadId',
  param('threadId').isUUID().withMessage('Invalid thread ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { threadId } = req.params;
      
      const thread = await chatService.getThread(threadId, userId);
      
      if (!thread) {
        throw createError(404, 'Thread not found');
      }

      // Log successful thread fetch
      await adminService.logUsage(
        '/api/chat/threads/:threadId',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { thread }
      });
    } catch (error: any) {
      // Log failed thread fetch
      await adminService.logUsage(
        '/api/chat/threads/:threadId',
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

// PUT /api/chat/threads/:threadId - Update thread title
router.put('/threads/:threadId',
  param('threadId').isUUID().withMessage('Invalid thread ID'),
  updateThreadValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { threadId } = req.params;
      const { title } = req.body;
      
      const thread = await chatService.updateThreadTitle(threadId, userId, title);

      // Log successful thread update
      await adminService.logUsage(
        '/api/chat/threads/:threadId',
        'PUT',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Thread updated successfully',
        data: { thread }
      });
    } catch (error: any) {
      // Log failed thread update
      await adminService.logUsage(
        '/api/chat/threads/:threadId',
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

// POST /api/chat/threads/:threadId/archive - Archive a thread
router.post('/threads/:threadId/archive',
  param('threadId').isUUID().withMessage('Invalid thread ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { threadId } = req.params;
      
      await chatService.archiveThread(threadId, userId);

      // Log successful thread archive
      await adminService.logUsage(
        '/api/chat/threads/:threadId/archive',
        'POST',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Thread archived successfully'
      });
    } catch (error: any) {
      // Log failed thread archive
      await adminService.logUsage(
        '/api/chat/threads/:threadId/archive',
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

// DELETE /api/chat/threads/:threadId - Delete a thread
router.delete('/threads/:threadId',
  param('threadId').isUUID().withMessage('Invalid thread ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { threadId } = req.params;
      
      await chatService.deleteThread(threadId, userId);

      // Log successful thread deletion
      await adminService.logUsage(
        '/api/chat/threads/:threadId',
        'DELETE',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Thread deleted successfully'
      });
    } catch (error: any) {
      // Log failed thread deletion
      await adminService.logUsage(
        '/api/chat/threads/:threadId',
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

// GET /api/chat/threads/:threadId/messages - Get messages for a thread
router.get('/threads/:threadId/messages',
  param('threadId').isUUID().withMessage('Invalid thread ID'),
  getMessagesValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { threadId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const messages = await chatService.getThreadMessages(threadId, userId, limit, offset);

      // Log successful messages fetch
      await adminService.logUsage(
        '/api/chat/threads/:threadId/messages',
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
          messages,
          pagination: {
            limit,
            offset,
            hasMore: messages.length === limit
          }
        }
      });
    } catch (error: any) {
      // Log failed messages fetch
      await adminService.logUsage(
        '/api/chat/threads/:threadId/messages',
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

// POST /api/chat/threads/:threadId/messages - Send a message
router.post('/threads/:threadId/messages',
  param('threadId').isUUID().withMessage('Invalid thread ID'),
  sendMessageValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { threadId } = req.params;
      const { content, context } = req.body;
      
      const result = await chatService.sendMessage(threadId, userId, {
        content,
        context
      });

      // Log successful message send
      await adminService.logUsage(
        '/api/chat/threads/:threadId/messages',
        'POST',
        201,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          userMessage: result.userMessage,
          assistantMessage: result.assistantMessage,
          inquiry: result.inquiry,
          validationResult: result.validationResult
        }
      });
    } catch (error: any) {
      // Handle prompt validation errors specially
      if (error.statusCode === 400 && error.data?.validationResult) {
        // Log validation failure
        await adminService.logUsage(
          '/api/chat/threads/:threadId/messages',
          'POST',
          400,
          Date.now() - startTime,
          req.user?.userId,
          req.ip,
          req.get('User-Agent'),
          'Non-financial content detected'
        );

        return res.status(400).json({
          success: false,
          message: 'Non-financial content detected',
          error: {
            type: 'VALIDATION_ERROR',
            validationResult: error.data.validationResult,
            systemMessage: error.data.systemMessage
          }
        });
      }

      // Log other failed message sends
      await adminService.logUsage(
        '/api/chat/threads/:threadId/messages',
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

// GET /api/chat/inquiries/:inquiryId - Get detailed inquiry information
router.get('/inquiries/:inquiryId',
  param('inquiryId').isUUID().withMessage('Invalid inquiry ID'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { inquiryId } = req.params;
      
      const inquiryDetails = await chatService.getInquiryDetails(inquiryId, userId);

      // Log successful inquiry fetch
      await adminService.logUsage(
        '/api/chat/inquiries/:inquiryId',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: inquiryDetails
      });
    } catch (error: any) {
      // Log failed inquiry fetch
      await adminService.logUsage(
        '/api/chat/inquiries/:inquiryId',
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

// GET /api/chat/search - Search through chat threads and messages
router.get('/search',
  searchValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const threads = await chatService.searchThreads(userId, query, limit);

      // Log successful search
      await adminService.logUsage(
        '/api/chat/search',
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
          threads,
          query,
          limit
        }
      });
    } catch (error: any) {
      // Log failed search
      await adminService.logUsage(
        '/api/chat/search',
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

// GET /api/chat/statistics - Get user's chat statistics
router.get('/statistics',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      
      const statistics = await chatService.getChatStatistics(userId);

      // Log successful statistics fetch
      await adminService.logUsage(
        '/api/chat/statistics',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { statistics }
      });
    } catch (error: any) {
      // Log failed statistics fetch
      await adminService.logUsage(
        '/api/chat/statistics',
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