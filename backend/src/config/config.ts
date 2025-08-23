import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  // Server Configuration
  PORT: number;
  NODE_ENV: string;
  
  // Database Configuration
  DATABASE_URL: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;
  
  // JWT Configuration
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // API Provider Configuration
  YAHOO_API_KEY: string;
  GOOGLE_API_KEY: string;
  FALLBACK_API_KEY: string;
  
  // CORS Configuration
  CORS_ORIGIN: string;
  
  // File Upload Configuration
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Security
  BCRYPT_ROUNDS: number;
  
  // Admin Configuration
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  
  // Feature Flags
  ENABLE_MOCK_DATA: boolean;
  ENABLE_RATE_LIMITING: boolean;
  ENABLE_LOGGING: boolean;
  
  // Logging
  LOG_LEVEL: string;
}

// Parse DATABASE_URL if provided, otherwise use individual DB config
function parseDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      return {
        DB_HOST: url.hostname,
        DB_PORT: parseInt(url.port) || 5432,
        DB_NAME: url.pathname.slice(1), // Remove leading slash
        DB_USER: url.username,
        DB_PASSWORD: url.password,
        DB_SSL: url.searchParams.get('sslmode') === 'require'
      };
    } catch (error) {
      console.warn('Invalid DATABASE_URL format, falling back to individual DB config');
    }
  }
  
  return {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432'),
    DB_NAME: process.env.DB_NAME || 'financial_advisory_platform',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
    DB_SSL: process.env.DB_SSL === 'true'
  };
}

const dbConfig = parseDatabaseConfig();

export const config: Config = {
  // Server Configuration
  PORT: parseInt(process.env.PORT || '5000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || `postgres://${dbConfig.DB_USER}:${dbConfig.DB_PASSWORD}@${dbConfig.DB_HOST}:${dbConfig.DB_PORT}/${dbConfig.DB_NAME}`,
  ...dbConfig,
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-jwt-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // API Provider Configuration
  YAHOO_API_KEY: process.env.YAHOO_API_KEY || 'mock-yahoo-api-key',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || 'mock-google-api-key',
  FALLBACK_API_KEY: process.env.FALLBACK_API_KEY || 'mock-fallback-api-key',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // File Upload Configuration
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  
  // Admin Configuration
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  
  // Feature Flags
  ENABLE_MOCK_DATA: process.env.ENABLE_MOCK_DATA === 'true',
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  ENABLE_LOGGING: process.env.ENABLE_LOGGING !== 'false',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// Validate required configuration
function validateConfig() {
  const requiredFields = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];
  
  const missingFields = requiredFields.filter(field => {
    const value = config[field as keyof Config];
    return !value || (typeof value === 'string' && value.includes('fallback'));
  });
  
  if (missingFields.length > 0 && config.NODE_ENV === 'production') {
    console.error('Missing required configuration fields in production:', missingFields);
    process.exit(1);
  }
  
  if (missingFields.length > 0 && config.NODE_ENV === 'development') {
    console.warn('Using fallback values for configuration fields:', missingFields);
    console.warn('Consider setting these in your .env file for better security');
  }
}

// Validate configuration on import
validateConfig();

// Export individual config sections for convenience
export const dbConfig = {
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  ssl: config.DB_SSL
};

export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshSecret: config.JWT_REFRESH_SECRET,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN
};

export const corsConfig = {
  origin: config.CORS_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 200
};

export const rateLimitConfig = {
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
};