"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminService_1 = require("../services/adminService");
const authJWT_1 = require("../middleware/authJWT");
const requireAdmin_1 = require("../middleware/requireAdmin");
const router = (0, express_1.Router)();
const adminService = new adminService_1.AdminService();
router.use(authJWT_1.authJWT);
router.use(requireAdmin_1.requireAdmin);
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                error: 'Invalid pagination parameters',
                message: 'Page must be >= 1, limit must be between 1 and 100'
            });
        }
        const result = await adminService.getUsers(page, limit);
        res.json({
            users: result.users,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: 'Failed to retrieve users',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.patch('/users/:id/role', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        if (!role || typeof role !== 'string') {
            return res.status(400).json({
                error: 'Role is required',
                message: 'Role must be a valid string (user, admin, premium)'
            });
        }
        const adminUser = req.user;
        if (userId === adminUser.id && role !== 'admin') {
            return res.status(400).json({
                error: 'Cannot change own role',
                message: 'Administrators cannot change their own role'
            });
        }
        const updatedUser = await adminService.updateUserRole(userId, role.toLowerCase());
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        await adminService.logEvent('info', `User role updated: ${updatedUser.email} -> ${role}`, adminUser.id, req.originalUrl, req.ip, req.get('User-Agent'));
        res.json({
            message: 'User role updated successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Update user role error:', error);
        if (error instanceof Error && error.message.includes('Invalid role')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({
            error: 'Failed to update user role',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/api-configs', async (req, res) => {
    try {
        await adminService.initializeApiConfigs();
        const configs = await adminService.getApiConfigs();
        res.json({
            configs
        });
    }
    catch (error) {
        console.error('Get API configs error:', error);
        res.status(500).json({
            error: 'Failed to retrieve API configurations',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/api-configs', async (req, res) => {
    try {
        const { configs } = req.body;
        if (!Array.isArray(configs)) {
            return res.status(400).json({
                error: 'Invalid request format',
                message: 'configs must be an array'
            });
        }
        for (const config of configs) {
            if (!config.id || typeof config.id !== 'number') {
                return res.status(400).json({
                    error: 'Invalid config format',
                    message: 'Each config must have a valid id'
                });
            }
            if (config.provider && !['Yahoo', 'Google', 'Fallback'].includes(config.provider)) {
                return res.status(400).json({
                    error: 'Invalid provider',
                    message: 'Provider must be one of: Yahoo, Google, Fallback'
                });
            }
            if (config.priority !== undefined && (typeof config.priority !== 'number' || config.priority < 1)) {
                return res.status(400).json({
                    error: 'Invalid priority',
                    message: 'Priority must be a positive number'
                });
            }
        }
        const updatedConfigs = await adminService.updateApiConfigs(configs);
        const adminUser = req.user;
        await adminService.logEvent('info', `API configurations updated by admin`, adminUser.id, req.originalUrl, req.ip, req.get('User-Agent'));
        res.json({
            message: 'API configurations updated successfully',
            configs: updatedConfigs
        });
    }
    catch (error) {
        console.error('Update API configs error:', error);
        res.status(500).json({
            error: 'Failed to update API configurations',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/metrics', async (req, res) => {
    try {
        const metrics = await adminService.getSystemMetrics();
        res.json({
            metrics,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Get metrics error:', error);
        res.status(500).json({
            error: 'Failed to retrieve system metrics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        if (limit < 1 || limit > 200) {
            return res.status(400).json({
                error: 'Invalid limit parameter',
                message: 'Limit must be between 1 and 200'
            });
        }
        const logs = await adminService.getLogs(limit);
        res.json({
            logs,
            count: logs.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            error: 'Failed to retrieve system logs',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const metrics = await adminService.getSystemMetrics();
        const recentLogs = await adminService.getLogs(10);
        const errorLogs = recentLogs.filter(log => log.level === 'error').length;
        const warningLogs = recentLogs.filter(log => log.level === 'warn').length;
        res.json({
            overview: {
                totalUsers: metrics.totalUsers,
                activeUsers: metrics.activeUsers,
                totalPortfolios: metrics.totalPortfolios,
                totalInquiries: metrics.totalInquiries
            },
            system: {
                uptime: metrics.systemUptime,
                databaseConnections: metrics.databaseConnections,
                apiCallsToday: metrics.apiCallsToday
            },
            health: {
                recentErrors: errorLogs,
                recentWarnings: warningLogs,
                status: errorLogs === 0 ? 'healthy' : 'warning'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            error: 'Failed to retrieve system statistics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map