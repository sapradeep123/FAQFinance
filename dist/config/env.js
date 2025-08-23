"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const getEnvVar = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value || defaultValue;
};
const getEnvNumber = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value ? parseInt(value, 10) : defaultValue;
};
const getEnvBoolean = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value ? value.toLowerCase() === 'true' : defaultValue;
};
exports.config = {
    port: getEnvNumber('PORT', 3000),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    database: {
        host: getEnvVar('DB_HOST', 'localhost'),
        port: getEnvNumber('DB_PORT', 5432),
        name: getEnvVar('DB_NAME'),
        user: getEnvVar('DB_USER'),
        password: getEnvVar('DB_PASSWORD'),
        ssl: getEnvBoolean('DB_SSL', false),
    },
    jwt: {
        secret: getEnvVar('JWT_SECRET'),
        expiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
        refreshSecret: getEnvVar('JWT_REFRESH_SECRET'),
        refreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
    },
    corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
    rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
    rateLimitMaxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    marketDataApiKey: getEnvVar('MARKET_DATA_API_KEY', ''),
    llmApiKey: getEnvVar('LLM_API_KEY', ''),
    llmApiUrl: getEnvVar('LLM_API_URL', 'https://api.openai.com/v1'),
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    SERPAPI_KEY: process.env.SERPAPI_KEY,
    FINNHUB_KEY: process.env.FINNHUB_KEY,
    admin: {
        email: getEnvVar('ADMIN_EMAIL', 'admin@example.com'),
        password: getEnvVar('ADMIN_PASSWORD', 'admin123'),
    },
    logLevel: getEnvVar('LOG_LEVEL', 'info'),
};
if (exports.config.nodeEnv === 'production') {
    const requiredVars = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD'
    ];
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            throw new Error(`${varName} is required in production environment`);
        }
    }
}
exports.default = exports.config;
//# sourceMappingURL=env.js.map