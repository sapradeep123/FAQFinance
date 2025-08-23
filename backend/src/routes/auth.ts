import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/authService';
import { authenticateToken, optionalAuth } from '../middleware/authJWT';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { adminService } from '../services/adminService';

const router = Router();

// Validation middleware
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
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

// POST /api/auth/register
router.post('/register', 
  registerValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const result = await authService.register({
        email,
        password,
        firstName,
        lastName
      });

      // Log successful registration
      await adminService.logUsage(
        '/api/auth/register',
        'POST',
        201,
        Date.now() - startTime,
        result.user.id,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            status: result.user.status
          },
          token: result.token,
          refreshToken: result.refreshToken
        }
      });
    } catch (error: any) {
      // Log failed registration
      await adminService.logUsage(
        '/api/auth/register',
        'POST',
        error.statusCode || 500,
        Date.now() - startTime,
        undefined,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// POST /api/auth/login
router.post('/login',
  loginValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { email, password } = req.body;
      
      const result = await authService.login(email, password);

      // Log successful login
      await adminService.logUsage(
        '/api/auth/login',
        'POST',
        200,
        Date.now() - startTime,
        result.user.id,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            status: result.user.status,
            lastLogin: result.user.lastLogin
          },
          token: result.token,
          refreshToken: result.refreshToken
        }
      });
    } catch (error: any) {
      // Log failed login
      await adminService.logUsage(
        '/api/auth/login',
        'POST',
        error.statusCode || 500,
        Date.now() - startTime,
        undefined,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// POST /api/auth/refresh
router.post('/refresh',
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { refreshToken } = req.body;
      
      const result = await authService.refreshToken(refreshToken);

      // Log successful token refresh
      await adminService.logUsage(
        '/api/auth/refresh',
        'POST',
        200,
        Date.now() - startTime,
        result.user.id,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            status: result.user.status
          },
          token: result.token,
          refreshToken: result.refreshToken
        }
      });
    } catch (error: any) {
      // Log failed token refresh
      await adminService.logUsage(
        '/api/auth/refresh',
        'POST',
        error.statusCode || 500,
        Date.now() - startTime,
        undefined,
        req.ip,
        req.get('User-Agent'),
        error.message
      );
      throw error;
    }
  })
);

// POST /api/auth/logout
router.post('/logout',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { refreshToken } = req.body;
      
      await authService.logout(userId, refreshToken);

      // Log successful logout
      await adminService.logUsage(
        '/api/auth/logout',
        'POST',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error: any) {
      // Log failed logout
      await adminService.logUsage(
        '/api/auth/logout',
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

// GET /api/auth/me
router.get('/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      
      const user = await authService.getUserProfile(userId);

      // Log successful profile fetch
      await adminService.logUsage(
        '/api/auth/me',
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
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            preferences: user.preferences
          }
        }
      });
    } catch (error: any) {
      // Log failed profile fetch
      await adminService.logUsage(
        '/api/auth/me',
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

// PUT /api/auth/profile
router.put('/profile',
  authenticateToken,
  updateProfileValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const updates = req.body;
      
      const user = await authService.updateProfile(userId, updates);

      // Log successful profile update
      await adminService.logUsage(
        '/api/auth/profile',
        'PUT',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            preferences: user.preferences
          }
        }
      });
    } catch (error: any) {
      // Log failed profile update
      await adminService.logUsage(
        '/api/auth/profile',
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

// PUT /api/auth/change-password
router.put('/change-password',
  authenticateToken,
  changePasswordValidation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;
      
      await authService.changePassword(userId, currentPassword, newPassword);

      // Log successful password change
      await adminService.logUsage(
        '/api/auth/change-password',
        'PUT',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      // Log failed password change
      await adminService.logUsage(
        '/api/auth/change-password',
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

// GET /api/auth/sessions
router.get('/sessions',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      
      const sessions = await authService.getUserSessions(userId);

      // Log successful sessions fetch
      await adminService.logUsage(
        '/api/auth/sessions',
        'GET',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: { sessions }
      });
    } catch (error: any) {
      // Log failed sessions fetch
      await adminService.logUsage(
        '/api/auth/sessions',
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

// DELETE /api/auth/sessions/:sessionId
router.delete('/sessions/:sessionId',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.userId;
      const { sessionId } = req.params;
      
      await authService.revokeSession(userId, sessionId);

      // Log successful session revocation
      await adminService.logUsage(
        '/api/auth/sessions/:sessionId',
        'DELETE',
        200,
        Date.now() - startTime,
        userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } catch (error: any) {
      // Log failed session revocation
      await adminService.logUsage(
        '/api/auth/sessions/:sessionId',
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

// GET /api/auth/verify-token (for frontend to check token validity)
router.get('/verify-token',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const isValid = !!req.user;
      
      // Log token verification
      await adminService.logUsage(
        '/api/auth/verify-token',
        'GET',
        200,
        Date.now() - startTime,
        req.user?.userId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          valid: isValid,
          user: req.user ? {
            id: req.user.userId,
            email: req.user.email,
            role: req.user.role
          } : null
        }
      });
    } catch (error: any) {
      // Log failed token verification
      await adminService.logUsage(
        '/api/auth/verify-token',
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