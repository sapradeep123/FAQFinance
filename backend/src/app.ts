import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/config';
import { errorHandler } from './middleware/errorHandler';
import { adminService } from './services/adminService';

// Import routes
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import portfolioRoutes from './routes/portfolio';
import adminRoutes from './routes/admin';
import faqRoutes from './routes/faq';
import financialDataRoutes from './routes/financialData';

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    if (config.NODE_ENV === 'production') {
      // Add production origins here
      allowedOrigins.push(
        // Add your production domain(s)
      );
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to use user ID if authenticated
  keyGenerator: (req) => {
    return req.user?.userId || req.ip;
  },
  // Skip rate limiting for certain endpoints in development
  skip: (req) => {
    if (config.NODE_ENV === 'development') {
      return req.path.startsWith('/api/health') || req.path.startsWith('/api/faq');
    }
    return false;
  }
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Custom logging middleware for API usage
app.use(async (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    // Log API usage asynchronously (don't wait for it)
    setImmediate(async () => {
      try {
        const responseTime = Date.now() - startTime;
        const userId = (req as any).user?.userId;
        const userAgent = req.get('User-Agent');
        const endpoint = req.path;
        const method = req.method;
        const statusCode = res.statusCode;
        const ip = req.ip;
        
        // Only log API endpoints, skip static files and health checks
        if (endpoint.startsWith('/api/') && !endpoint.startsWith('/api/health')) {
          await adminService.logUsage(
            endpoint,
            method,
            statusCode,
            responseTime,
            userId,
            ip,
            userAgent
          );
        }
      } catch (error) {
        console.error('Error logging API usage:', error);
      }
    });
  };
  
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/financial-data', financialDataRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Financial Advisory Platform API',
    version: '1.0.0',
    endpoints: {
      auth: {
        base: '/api/auth',
        description: 'Authentication and user management',
        endpoints: [
          'POST /register - Register new user',
          'POST /login - User login',
          'POST /refresh - Refresh access token',
          'POST /logout - User logout',
          'GET /profile - Get user profile',
          'PUT /profile - Update user profile',
          'PUT /change-password - Change password',
          'GET /sessions - Get user sessions',
          'DELETE /sessions/:sessionId - Delete session',
          'POST /verify-token - Verify token'
        ]
      },
      chat: {
        base: '/api/chat',
        description: 'Chat threads and AI conversations',
        endpoints: [
          'POST /threads - Create chat thread',
          'GET /threads - Get user threads',
          'GET /threads/:id - Get specific thread',
          'PUT /threads/:id - Update thread',
          'DELETE /threads/:id - Delete thread',
          'POST /threads/:id/archive - Archive thread',
          'GET /threads/:id/messages - Get thread messages',
          'POST /threads/:id/messages - Send message',
          'GET /inquiries/:id - Get inquiry details',
          'GET /search - Search threads',
          'GET /statistics - Get chat statistics'
        ]
      },
      portfolio: {
        base: '/api/portfolio',
        description: 'Portfolio and position management',
        endpoints: [
          'POST / - Create portfolio',
          'GET / - Get user portfolios',
          'GET /:id - Get specific portfolio',
          'PUT /:id - Update portfolio',
          'DELETE /:id - Delete portfolio',
          'GET /:id/positions - Get portfolio positions',
          'POST /:id/positions - Add position',
          'GET /:id/positions/:posId - Get specific position',
          'PUT /:id/positions/:posId - Update position',
          'DELETE /:id/positions/:posId - Remove position',
          'POST /:id/refresh - Refresh portfolio data',
          'GET /:id/summary - Get portfolio summary',
          'GET /:id/analytics - Get portfolio analytics',
          'GET /:id/history - Get position history'
        ]
      },
      faq: {
        base: '/api/faq',
        description: 'Frequently Asked Questions (public + admin)',
        endpoints: [
          'GET / - Get FAQs (public)',
          'GET /search - Search FAQs (public)',
          'GET /categories - Get FAQ categories (public)',
          'GET /:id - Get specific FAQ (public)',
          'POST / - Create FAQ (admin)',
          'PUT /:id - Update FAQ (admin)',
          'DELETE /:id - Delete FAQ (admin)'
        ]
      },
      admin: {
        base: '/api/admin',
        description: 'Administrative functions (admin only)',
        endpoints: [
          'GET /stats - Get system statistics',
          'GET /health - Get system health',
          'GET /api-configs - Get API configurations',
          'POST /api-configs - Create API configuration',
          'PUT /api-configs/:id - Update API configuration',
          'DELETE /api-configs/:id - Delete API configuration',
          'GET /logs - Get usage logs',
          'GET /metrics - Get system metrics',
          'POST /metrics/generate - Generate metrics',
          'GET /notifications - Get admin notifications',
          'POST /notifications - Create notification',
          'PUT /notifications/:id/read - Mark notification as read',
          'DELETE /notifications/:id - Delete notification',
          'GET /user-activity - Get user activity',
          'POST /cleanup - Clean up old data',
          'GET /rate-limits - Check rate limits'
        ]
      }
    },
    documentation: {
      authentication: 'Most endpoints require JWT token in Authorization header: Bearer <token>',
      rateLimit: 'API is rate limited to prevent abuse',
      cors: 'CORS is configured for local development and production domains',
      errors: 'All endpoints return consistent error format with success, message, and optional errors fields'
    }
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.path}`,
    availableEndpoints: '/api'
  });
});

// Serve static files in production
if (config.NODE_ENV === 'production') {
  app.use(express.static('public'));
  
  // Catch all handler for SPA
  app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
  });
}

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production, just log the error
  if (config.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Exit the process for uncaught exceptions
  process.exit(1);
});

export default app;