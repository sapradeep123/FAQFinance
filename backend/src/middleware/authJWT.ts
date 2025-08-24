import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/config';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    iat?: number;
    exp?: number;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  iat?: number;
  exp?: number;
}

// Generate JWT token
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, jwtConfig.secret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw createError('Invalid token', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw createError('Invalid token', 401);
    } else {
      throw createError('Token verification failed', 401);
    }
  }
};

// Authentication middleware
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw createError('Access token required', 401);
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    
    console.log('✅ User authenticated:', { id: decoded.id, email: decoded.email, role: decoded.role });
    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication middleware (doesn't throw error if no token)
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
      console.log('✅ Optional auth - User authenticated:', { id: decoded.id, email: decoded.email, role: decoded.role });
    } else {
      console.log('ℹ️ Optional auth - No token provided');
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just log them
    console.log('⚠️ Optional auth - Token verification failed:', (error as Error).message);
    next();
  }
};

// Extract user ID from token (utility function)
export const extractUserId = (req: AuthenticatedRequest): string => {
  if (!req.user?.id) {
    throw createError('User not authenticated', 401);
  }
  return req.user.id;
};

// Check if user has specific role
export const hasRole = (req: AuthenticatedRequest, role: 'USER' | 'ADMIN'): boolean => {
  return req.user?.role === role;
};

// Check if user is admin
export const isAdmin = (req: AuthenticatedRequest): boolean => {
  return hasRole(req, 'ADMIN');
};