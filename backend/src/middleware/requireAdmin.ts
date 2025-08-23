import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, isAdmin } from './authJWT';
import { createError } from './errorHandler';

// Middleware to require admin role
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    if (!isAdmin(req)) {
      console.log('❌ Access denied - Admin role required:', { 
        userId: req.user.id, 
        userRole: req.user.role,
        requiredRole: 'ADMIN',
        endpoint: req.originalUrl,
        method: req.method
      });
      throw createError('Admin access required', 403);
    }

    console.log('✅ Admin access granted:', { 
      userId: req.user.id, 
      email: req.user.email,
      endpoint: req.originalUrl,
      method: req.method
    });
    
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to require user to be owner or admin
export const requireOwnerOrAdmin = (userIdParam: string = 'id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw createError('Authentication required', 401);
      }

      const targetUserId = req.params[userIdParam];
      const isOwner = req.user.id === targetUserId;
      const isUserAdmin = isAdmin(req);

      if (!isOwner && !isUserAdmin) {
        console.log('❌ Access denied - Owner or Admin role required:', { 
          userId: req.user.id, 
          targetUserId,
          userRole: req.user.role,
          endpoint: req.originalUrl,
          method: req.method
        });
        throw createError('Access denied - you can only access your own resources or need admin privileges', 403);
      }

      console.log('✅ Owner/Admin access granted:', { 
        userId: req.user.id, 
        targetUserId,
        isOwner,
        isAdmin: isUserAdmin,
        endpoint: req.originalUrl,
        method: req.method
      });
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default requireAdmin;