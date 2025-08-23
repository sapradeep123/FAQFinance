"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
class AdminService {
    async getDashboardStats() {
        const [userStats, portfolioStats, chatStats, transactionStats] = await Promise.all([
            this.getUserStats(),
            this.getPortfolioStats(),
            this.getChatStats(),
            this.getTransactionStats()
        ]);
        const systemHealth = await this.getSystemHealth();
        const recentActivity = await this.getRecentActivity();
        return {
            totalUsers: userStats.total,
            activeUsers: userStats.active,
            totalPortfolios: portfolioStats.total,
            totalChatSessions: chatStats.total,
            totalTransactions: transactionStats.total,
            systemHealth,
            recentActivity
        };
    }
    async getUsers(page = 1, limit = 20, search, role, isActive) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (search) {
            whereClause += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        if (role) {
            whereClause += ` AND u.role = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }
        if (isActive !== undefined) {
            whereClause += ` AND u.is_active = $${paramIndex}`;
            params.push(isActive);
            paramIndex++;
        }
        const countQuery = `SELECT COUNT(*) FROM users u ${whereClause}`;
        const countResult = await (0, pool_1.query)(countQuery, params);
        const total = parseInt(countResult.rows[0].count);
        const usersQuery = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
        u.email_verified, u.last_login_at, u.created_at,
        COUNT(DISTINCT p.id) as portfolio_count,
        COUNT(DISTINCT cs.id) as chat_session_count
      FROM users u
      LEFT JOIN portfolios p ON u.id = p.user_id
      LEFT JOIN chat_sessions cs ON u.id = cs.user_id
      ${whereClause}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
               u.email_verified, u.last_login_at, u.created_at
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(limit, offset);
        const usersResult = await (0, pool_1.query)(usersQuery, params);
        const users = usersResult.rows.map(row => ({
            id: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            role: row.role,
            isActive: row.is_active,
            emailVerified: row.email_verified,
            lastLoginAt: row.last_login_at,
            createdAt: row.created_at,
            portfolioCount: parseInt(row.portfolio_count),
            chatSessionCount: parseInt(row.chat_session_count)
        }));
        return {
            users,
            total,
            page,
            limit
        };
    }
    async updateUserStatus(userId, isActive) {
        const result = await (0, pool_1.query)('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [isActive, userId]);
        if (result.rowCount === 0) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        await this.logActivity('info', `User ${userId} status changed to ${isActive ? 'active' : 'inactive'}`);
    }
    async updateUserRole(userId, role) {
        const validRoles = ['user', 'admin', 'moderator'];
        if (!validRoles.includes(role)) {
            throw new errorHandler_1.AppError('Invalid role', 400);
        }
        const result = await (0, pool_1.query)('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, userId]);
        if (result.rowCount === 0) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        await this.logActivity('info', `User ${userId} role changed to ${role}`);
    }
    async deleteUser(userId) {
        await (0, pool_1.transaction)(async (client) => {
            await client.query('DELETE FROM portfolio_transactions WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = $1)', [userId]);
            await client.query('DELETE FROM portfolio_holdings WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = $1)', [userId]);
            await client.query('DELETE FROM portfolios WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = $1)', [userId]);
            await client.query('DELETE FROM chat_sessions WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
            const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
            if (result.rowCount === 0) {
                throw new errorHandler_1.AppError('User not found', 404);
            }
        });
        await this.logActivity('warn', `User ${userId} deleted`);
    }
    async exportUserData(userId) {
        const userResult = await (0, pool_1.query)('SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        const user = userResult.rows[0];
        const portfoliosResult = await (0, pool_1.query)('SELECT * FROM portfolios WHERE user_id = $1', [userId]);
        const chatSessionsResult = await (0, pool_1.query)('SELECT id, title, model, created_at FROM chat_sessions WHERE user_id = $1', [userId]);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                createdAt: user.created_at
            },
            portfolios: portfoliosResult.rows,
            chatSessions: chatSessionsResult.rows,
            exportedAt: new Date()
        };
    }
    async getSystemLogs(page = 1, limit = 50, level, startDate, endDate) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (level) {
            whereClause += ` AND level = $${paramIndex}`;
            params.push(level);
            paramIndex++;
        }
        if (startDate) {
            whereClause += ` AND created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            whereClause += ` AND created_at <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }
        const countQuery = `SELECT COUNT(*) FROM system_logs ${whereClause}`;
        const countResult = await (0, pool_1.query)(countQuery, params);
        const total = parseInt(countResult.rows[0].count);
        const logsQuery = `
      SELECT * FROM system_logs 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(limit, offset);
        const logsResult = await (0, pool_1.query)(logsQuery, params);
        const logs = logsResult.rows.map(row => ({
            id: row.id,
            level: row.level,
            message: row.message,
            metadata: row.metadata,
            userId: row.user_id,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            createdAt: row.created_at
        }));
        return {
            logs,
            total,
            page,
            limit
        };
    }
    async logActivity(level, message, metadata, userId, ipAddress, userAgent) {
        await (0, pool_1.query)(`INSERT INTO system_logs (level, message, metadata, user_id, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`, [level, message, metadata ? JSON.stringify(metadata) : null, userId, ipAddress, userAgent]);
    }
    async getSystemSettings(category) {
        let query_str = 'SELECT * FROM system_settings';
        const params = [];
        if (category) {
            query_str += ' WHERE category = $1';
            params.push(category);
        }
        query_str += ' ORDER BY category, key';
        const result = await (0, pool_1.query)(query_str, params);
        return result.rows.map(row => ({
            id: row.id,
            key: row.key,
            value: row.value,
            description: row.description,
            category: row.category,
            isPublic: row.is_public,
            updatedAt: row.updated_at,
            updatedBy: row.updated_by
        }));
    }
    async updateSystemSetting(key, value, updatedBy, description, category = 'general') {
        await (0, pool_1.query)(`INSERT INTO system_settings (key, value, description, category, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       description = EXCLUDED.description,
       category = EXCLUDED.category,
       updated_by = EXCLUDED.updated_by,
       updated_at = EXCLUDED.updated_at`, [key, value, description, category, updatedBy]);
        await this.logActivity('info', `System setting '${key}' updated`, { key, value, category });
    }
    async getApiUsageStats(startDate, endDate) {
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (startDate) {
            whereClause += ` AND created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            whereClause += ` AND created_at <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }
        const result = await (0, pool_1.query)(`SELECT 
         endpoint,
         method,
         COUNT(*) as total_requests,
         AVG(response_time) as average_response_time,
         (COUNT(*) FILTER (WHERE status_code >= 400))::float / COUNT(*) * 100 as error_rate,
         MAX(created_at) as last_accessed
       FROM api_usage_logs
       ${whereClause}
       GROUP BY endpoint, method
       ORDER BY total_requests DESC`, params);
        return result.rows.map(row => ({
            endpoint: row.endpoint,
            method: row.method,
            totalRequests: parseInt(row.total_requests),
            averageResponseTime: parseFloat(row.average_response_time),
            errorRate: parseFloat(row.error_rate),
            lastAccessed: row.last_accessed
        }));
    }
    async createDatabaseBackup() {
        const backupId = `backup_${Date.now()}`;
        const filename = `${backupId}.sql`;
        await this.logActivity('info', 'Database backup created', { backupId, filename });
        return { backupId, filename };
    }
    async getSystemHealth() {
        try {
            await (0, pool_1.query)('SELECT 1');
            const memoryUsage = process.memoryUsage();
            const uptime = process.uptime();
            return {
                database: 'healthy',
                memory: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
                cpu: 0,
                uptime: Math.round(uptime)
            };
        }
        catch (error) {
            return {
                database: 'error',
                memory: 0,
                cpu: 0,
                uptime: 0
            };
        }
    }
    async sendSystemNotification(type, title, message, targetUsers) {
        await this.logActivity('info', 'System notification sent', {
            type,
            title,
            message,
            targetUsers: targetUsers?.length || 'all'
        });
    }
    async getUserStats() {
        const result = await (0, pool_1.query)('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM users');
        return {
            total: parseInt(result.rows[0].total),
            active: parseInt(result.rows[0].active)
        };
    }
    async getPortfolioStats() {
        const result = await (0, pool_1.query)('SELECT COUNT(*) as total FROM portfolios');
        return { total: parseInt(result.rows[0].total) };
    }
    async getChatStats() {
        const result = await (0, pool_1.query)('SELECT COUNT(*) as total FROM chat_sessions');
        return { total: parseInt(result.rows[0].total) };
    }
    async getTransactionStats() {
        const result = await (0, pool_1.query)('SELECT COUNT(*) as total FROM portfolio_transactions');
        return { total: parseInt(result.rows[0].total) };
    }
    async getRecentActivity() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [newUsers, newPortfolios, newChatSessions] = await Promise.all([
            (0, pool_1.query)('SELECT COUNT(*) as count FROM users WHERE created_at >= $1', [oneDayAgo]),
            (0, pool_1.query)('SELECT COUNT(*) as count FROM portfolios WHERE created_at >= $1', [oneDayAgo]),
            (0, pool_1.query)('SELECT COUNT(*) as count FROM chat_sessions WHERE created_at >= $1', [oneDayAgo])
        ]);
        return {
            newUsers: parseInt(newUsers.rows[0].count),
            newPortfolios: parseInt(newPortfolios.rows[0].count),
            newChatSessions: parseInt(newChatSessions.rows[0].count),
            period: '24h'
        };
    }
}
exports.AdminService = AdminService;
exports.default = AdminService;
//# sourceMappingURL=admin.js.map