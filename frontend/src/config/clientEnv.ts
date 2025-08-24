// Client-side environment configuration
// This file handles environment variables available in the browser

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Other client-side environment variables
export const APP_ENV = import.meta.env.MODE || 'development';
export const IS_DEVELOPMENT = APP_ENV === 'development';
export const IS_PRODUCTION = APP_ENV === 'production';

// Feature flags (can be controlled via environment variables)
export const FEATURES = {
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG_LOGS: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' || IS_DEVELOPMENT,
  ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true' || IS_DEVELOPMENT,
};

// External service URLs (if needed)
export const EXTERNAL_SERVICES = {
  YAHOO_FINANCE_API: 'https://query1.finance.yahoo.com/v8/finance/chart/',
  GOOGLE_FINANCE_API: 'https://www.google.com/finance/quote/',
};

// Default configuration values
export const DEFAULTS = {
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  DEBOUNCE_DELAY: 300, // milliseconds
};

// Validation
if (!API_BASE_URL) {
  console.warn('API_BASE_URL is not configured. Using default localhost:5000/api');
}

// Export all as a single config object for convenience
export const clientConfig = {
  API_BASE_URL,
  APP_ENV,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  FEATURES,
  EXTERNAL_SERVICES,
  DEFAULTS,
};

export default clientConfig;