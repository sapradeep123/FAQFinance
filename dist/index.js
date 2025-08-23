"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const authService_1 = require("./services/authService");
const auth_1 = __importDefault(require("./routes/auth"));
const faq_1 = __importDefault(require("./routes/faq"));
const chat_1 = __importDefault(require("./routes/chat"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: env_1.config.rateLimitWindowMs,
    max: env_1.config.rateLimitMaxRequests,
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);
app.use((0, cors_1.default)({
    origin: env_1.config.corsOrigin,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env_1.config.nodeEnv,
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/faq', faq_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/portfolio', portfolio_1.default);
app.use('/api/admin', admin_1.default);
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
    });
});
app.use(errorHandler_1.errorHandler);
const initializeApp = async () => {
    try {
        await (0, authService_1.seedUsers)();
        console.log('✅ Database initialization completed');
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error);
    }
};
const PORT = env_1.config.port || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${env_1.config.nodeEnv}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    await initializeApp();
});
exports.default = app;
//# sourceMappingURL=index.js.map