"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const authJWT_1 = require("../middleware/authJWT");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
class AuthService {
    async register(data) {
        const { email, password, firstName, lastName } = data;
        const existingUser = await (0, pool_1.query)('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            throw new errorHandler_1.AppError('User already exists with this email', 409);
        }
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        const userResult = await (0, pool_1.query)(`INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'user', true, false, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at`, [email.toLowerCase(), hashedPassword, firstName, lastName]);
        const user = userResult.rows[0];
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        const accessToken = (0, authJWT_1.generateToken)(tokenPayload);
        const refreshToken = (0, authJWT_1.generateRefreshToken)(tokenPayload);
        await (0, pool_1.query)('INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())', [user.id, refreshToken]);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isActive: user.is_active,
                emailVerified: user.email_verified,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: '24h'
            }
        };
    }
    async login(email, password) {
        const userResult = await (0, pool_1.query)('SELECT id, email, password, first_name, last_name, role, is_active, email_verified, created_at, updated_at FROM users WHERE email = $1', [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        }
        const user = userResult.rows[0];
        if (!user.is_active) {
            throw new errorHandler_1.AppError('Account is deactivated. Please contact support.', 401);
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        }
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        const accessToken = (0, authJWT_1.generateToken)(tokenPayload);
        const refreshToken = (0, authJWT_1.generateRefreshToken)(tokenPayload);
        await (0, pool_1.query)('INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())', [user.id, refreshToken]);
        await (0, pool_1.query)('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isActive: user.is_active,
                emailVerified: user.email_verified,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: '24h'
            }
        };
    }
    async refreshToken(refreshToken) {
        try {
            const decoded = (0, authJWT_1.verifyRefreshToken)(refreshToken);
            const tokenResult = await (0, pool_1.query)('SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()', [refreshToken]);
            if (tokenResult.rows.length === 0) {
                throw new errorHandler_1.AppError('Invalid or expired refresh token', 401);
            }
            const userResult = await (0, pool_1.query)('SELECT id, email, role, is_active FROM users WHERE id = $1', [decoded.id]);
            if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
                throw new errorHandler_1.AppError('User not found or inactive', 401);
            }
            const user = userResult.rows[0];
            const tokenPayload = {
                id: user.id,
                email: user.email,
                role: user.role
            };
            const newAccessToken = (0, authJWT_1.generateToken)(tokenPayload);
            const newRefreshToken = (0, authJWT_1.generateRefreshToken)(tokenPayload);
            await (0, pool_1.transaction)(async (client) => {
                await client.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
                await client.query('INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())', [user.id, newRefreshToken]);
            });
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresIn: '24h'
            };
        }
        catch (error) {
            throw new errorHandler_1.AppError('Invalid or expired refresh token', 401);
        }
    }
    async logout(userId, refreshToken) {
        if (refreshToken) {
            await (0, pool_1.query)('DELETE FROM refresh_tokens WHERE user_id = $1 AND token = $2', [userId, refreshToken]);
        }
        else {
            await (0, pool_1.query)('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
        }
    }
    async getUserProfile(userId) {
        const result = await (0, pool_1.query)('SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        const user = result.rows[0];
        return {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            isActive: user.is_active,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };
    }
    async updateUserProfile(userId, updateData) {
        const { firstName, lastName, email } = updateData;
        if (email) {
            const existingUser = await (0, pool_1.query)('SELECT id FROM users WHERE email = $1 AND id != $2', [email.toLowerCase(), userId]);
            if (existingUser.rows.length > 0) {
                throw new errorHandler_1.AppError('Email is already taken by another user', 409);
            }
        }
        const result = await (0, pool_1.query)(`UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at`, [firstName, lastName, email?.toLowerCase(), userId]);
        if (result.rows.length === 0) {
            return null;
        }
        const user = result.rows[0];
        return {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            isActive: user.is_active,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const userResult = await (0, pool_1.query)('SELECT password FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, userResult.rows[0].password);
        if (!isCurrentPasswordValid) {
            throw new errorHandler_1.AppError('Current password is incorrect', 400);
        }
        const saltRounds = 12;
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, saltRounds);
        await (0, pool_1.query)('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedNewPassword, userId]);
        await (0, pool_1.query)('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    }
    async requestPasswordReset(email) {
        const userResult = await (0, pool_1.query)('SELECT id FROM users WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            return;
        }
        const userId = userResult.rows[0].id;
        const resetToken = (0, authJWT_1.generateToken)({ id: userId, email, role: 'user' });
        await (0, pool_1.query)('INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\', NOW())', [userId, resetToken]);
        console.log(`Password reset token for ${email}: ${resetToken}`);
    }
    async resetPassword(token, newPassword) {
        const tokenResult = await (0, pool_1.query)('SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()', [token]);
        if (tokenResult.rows.length === 0) {
            throw new errorHandler_1.AppError('Invalid or expired reset token', 400);
        }
        const userId = tokenResult.rows[0].user_id;
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, saltRounds);
        await (0, pool_1.transaction)(async (client) => {
            await client.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, userId]);
            await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
        });
    }
    async verifyEmail(token) {
        const tokenResult = await (0, pool_1.query)('SELECT user_id FROM email_verification_tokens WHERE token = $1 AND expires_at > NOW()', [token]);
        if (tokenResult.rows.length === 0) {
            throw new errorHandler_1.AppError('Invalid or expired verification token', 400);
        }
        const userId = tokenResult.rows[0].user_id;
        await (0, pool_1.transaction)(async (client) => {
            await client.query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1', [userId]);
            await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
        });
    }
}
exports.AuthService = AuthService;
exports.default = AuthService;
//# sourceMappingURL=auth.js.map