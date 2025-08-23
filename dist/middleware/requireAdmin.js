"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.requireAdmin = void 0;
const pool_1 = require("../db/pool");
const requireAdmin = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const result = await pool_1.pool.query('SELECT role FROM users WHERE id = $1', [user.id]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        const userRole = result.rows[0].role;
        if (userRole !== 'admin') {
            return res.status(403).json({
                error: 'Admin access required',
                message: 'This endpoint requires administrator privileges'
            });
        }
        req.user = {
            ...user,
            role: userRole
        };
        next();
    }
    catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.requireAdmin = requireAdmin;
const isAdmin = async (userId) => {
    try {
        const result = await pool_1.pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        return result.rows.length > 0 && result.rows[0].role === 'admin';
    }
    catch (error) {
        console.error('Admin check error:', error);
        return false;
    }
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=requireAdmin.js.map