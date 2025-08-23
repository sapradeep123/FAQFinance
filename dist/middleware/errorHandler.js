"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
const env_1 = require("../config/env");
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const handleDatabaseError = (error) => {
    if (error.code === '23505') {
        return new AppError('Duplicate entry found', 409);
    }
    if (error.code === '23503') {
        return new AppError('Referenced record not found', 400);
    }
    if (error.code === '23502') {
        return new AppError('Required field is missing', 400);
    }
    if (error.code === '42P01') {
        return new AppError('Database table not found', 500);
    }
    if (error.code === '42703') {
        return new AppError('Database column not found', 500);
    }
    return new AppError('Database operation failed', 500);
};
const handleJWTError = (error) => {
    if (error.name === 'TokenExpiredError') {
        return new AppError('Token has expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
        return new AppError('Invalid token', 401);
    }
    if (error.name === 'NotBeforeError') {
        return new AppError('Token not active yet', 401);
    }
    return new AppError('Token verification failed', 401);
};
const handleValidationError = (error) => {
    const errors = Object.values(error.errors).map((err) => err.message);
    const message = `Invalid input data: ${errors.join(', ')}`;
    return new AppError(message, 400);
};
const sendErrorDev = (err, req, res) => {
    const errorResponse = {
        error: err.name || 'Error',
        message: err.message,
        statusCode: err.statusCode,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        stack: err.stack
    };
    console.error('🚨 Error Details:', errorResponse);
    res.status(err.statusCode).json(errorResponse);
};
const sendErrorProd = (err, req, res) => {
    if (err.isOperational) {
        const errorResponse = {
            error: 'Error',
            message: err.message,
            statusCode: err.statusCode,
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
        res.status(err.statusCode).json(errorResponse);
    }
    else {
        console.error('🚨 Unknown Error:', err);
        const errorResponse = {
            error: 'Internal Server Error',
            message: 'Something went wrong on our end',
            statusCode: 500,
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
        res.status(500).json(errorResponse);
    }
};
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    console.error('🚨 Error caught by global handler:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    if (err.name === 'CastError') {
        error = new AppError('Invalid ID format', 400);
    }
    if (err.code && err.code.startsWith('23')) {
        error = handleDatabaseError(err);
    }
    if (err.name === 'ValidationError') {
        error = handleValidationError(err);
    }
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
        error = handleJWTError(err);
    }
    if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
        error = new AppError('Invalid JSON format', 400);
    }
    if (!error.statusCode) {
        error = new AppError(error.message || 'Internal Server Error', 500);
    }
    if (env_1.config.nodeEnv === 'development') {
        sendErrorDev(error, req, res);
    }
    else {
        sendErrorProd(error, req, res);
    }
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const notFound = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};
exports.notFound = notFound;
exports.default = {
    AppError,
    errorHandler: exports.errorHandler,
    asyncHandler: exports.asyncHandler,
    notFound: exports.notFound
};
//# sourceMappingURL=errorHandler.js.map