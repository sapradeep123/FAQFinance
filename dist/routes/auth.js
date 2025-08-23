"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const authJWT_1 = require("../middleware/authJWT");
const authService_1 = require("../services/authService");
const router = (0, express_1.Router)();
router.post('/signup', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({
            error: 'Missing required fields',
            message: 'Username, email, and password are required'
        });
    }
    const result = await (0, authService_1.signup)({ username, email, password });
    res.status(201).json({
        message: 'User registered successfully',
        user: result.user,
        token: result.token
    });
}));
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            error: 'Missing credentials',
            message: 'Email and password are required'
        });
    }
    const result = await (0, authService_1.login)(email, password);
    res.status(200).json({
        message: 'Login successful',
        user: result.user,
        token: result.token
    });
}));
router.get('/me', authJWT_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const user = await (0, authService_1.me)(userId);
    res.status(200).json({
        user
    });
}));
router.patch('/profile', authJWT_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const updateData = req.body;
    const user = await (0, authService_1.updateProfile)(userId, updateData);
    res.status(200).json({
        message: 'Profile updated successfully',
        user
    });
}));
router.patch('/password', authJWT_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            error: 'Missing passwords',
            message: 'Current password and new password are required'
        });
    }
    await (0, authService_1.changePassword)(userId, currentPassword, newPassword);
    res.status(200).json({
        message: 'Password changed successfully'
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map