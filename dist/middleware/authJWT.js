"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateRefreshToken = exports.generateToken = exports.optionalAuth = exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({
            error: 'Access token required',
            message: 'Please provide a valid access token'
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwt.secret);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                error: 'Token expired',
                message: 'Access token has expired, please refresh your token'
            });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(403).json({
                error: 'Invalid token',
                message: 'Access token is invalid'
            });
        }
        else {
            res.status(500).json({
                error: 'Token verification failed',
                message: 'An error occurred while verifying the token'
            });
        }
    }
};
exports.authenticateToken = authenticateToken;
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            error: 'Authentication required',
            message: 'Please authenticate first'
        });
        return;
    }
    if (req.user.role !== 'admin') {
        res.status(403).json({
            error: 'Admin access required',
            message: 'This endpoint requires admin privileges'
        });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        next();
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwt.secret);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };
    }
    catch (error) {
        console.warn('Optional auth token verification failed:', error);
    }
    next();
};
exports.optionalAuth = optionalAuth;
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.config.jwt.secret, {
        expiresIn: env_1.config.jwt.expiresIn
    });
};
exports.generateToken = generateToken;
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.config.jwt.refreshSecret, {
        expiresIn: env_1.config.jwt.refreshExpiresIn
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env_1.config.jwt.refreshSecret);
};
exports.verifyRefreshToken = verifyRefreshToken;
exports.default = {
    authenticateToken: exports.authenticateToken,
    requireAdmin: exports.requireAdmin,
    optionalAuth: exports.optionalAuth,
    generateToken: exports.generateToken,
    generateRefreshToken: exports.generateRefreshToken,
    verifyRefreshToken: exports.verifyRefreshToken
};
//# sourceMappingURL=authJWT.js.map