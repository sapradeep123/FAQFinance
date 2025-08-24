import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { createError } from './errorHandler';

// Custom error class for application errors
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Create error with status code
export const createError = (message: string, statusCode: number): AppError => {
  return new AppError(message, statusCode);
};

// Global error handling middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // JWT errors
  if (err instanceof jwt.JsonWebTokenError) {
    error = createError('Invalid token', 401);
  } else if (err instanceof jwt.TokenExpiredError) {
    error = createError('Token expired', 401);
  } else if (err instanceof jwt.NotBeforeError) {
    error = createError('Token not active', 401);
  }

  // Database errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    if (err.message.includes('UNIQUE constraint failed')) {
      error = createError('Resource already exists', 409);
    } else if (err.message.includes('FOREIGN KEY constraint failed')) {
      error = createError('Referenced resource does not exist', 400);
    } else if (err.message.includes('NOT NULL constraint failed')) {
      error = createError('Required field is missing', 400);
    } else {
      error = createError('Database constraint violation', 400);
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message).join(', ');
    error = createError(message, 400);
  }

  // Cast errors (usually from invalid ObjectId)
  if (err.name === 'CastError') {
    error = createError('Invalid resource identifier', 400);
  }

  // Duplicate key errors
  if (err.code === 11000) {
    error = createError('Resource already exists', 409);
  }

  // Default error
  if (!error.statusCode) {
    error.statusCode = 500;
    error.message = 'Internal server error';
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      ...(config.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

// 404 handler for undefined routes
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = createError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};