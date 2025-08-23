"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientConfig = exports.DEFAULTS = exports.EXTERNAL_SERVICES = exports.FEATURES = exports.IS_PRODUCTION = exports.IS_DEVELOPMENT = exports.APP_ENV = exports.API_BASE_URL = void 0;
exports.API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
exports.APP_ENV = import.meta.env.MODE || 'development';
exports.IS_DEVELOPMENT = exports.APP_ENV === 'development';
exports.IS_PRODUCTION = exports.APP_ENV === 'production';
exports.FEATURES = {
    ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    ENABLE_DEBUG_LOGS: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' || exports.IS_DEVELOPMENT,
    ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true' || exports.IS_DEVELOPMENT,
};
exports.EXTERNAL_SERVICES = {
    YAHOO_FINANCE_API: 'https://query1.finance.yahoo.com/v8/finance/chart/',
    GOOGLE_FINANCE_API: 'https://www.google.com/finance/quote/',
};
exports.DEFAULTS = {
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    DEBOUNCE_DELAY: 300,
};
if (!exports.API_BASE_URL) {
    console.warn('API_BASE_URL is not configured. Using default localhost:8080');
}
exports.clientConfig = {
    API_BASE_URL: exports.API_BASE_URL,
    APP_ENV: exports.APP_ENV,
    IS_DEVELOPMENT: exports.IS_DEVELOPMENT,
    IS_PRODUCTION: exports.IS_PRODUCTION,
    FEATURES: exports.FEATURES,
    EXTERNAL_SERVICES: exports.EXTERNAL_SERVICES,
    DEFAULTS: exports.DEFAULTS,
};
exports.default = exports.clientConfig;
//# sourceMappingURL=clientEnv.js.map