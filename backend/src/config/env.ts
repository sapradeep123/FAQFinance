import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres%40123@localhost:5432/finance_app',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  // API Provider Configuration (Mock for now)
  apiProviders: {
    yahoo: {
      apiKey: process.env.YAHOO_API_KEY || 'mock-yahoo-api-key',
      baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart/',
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY || 'mock-google-api-key',
      baseUrl: 'https://www.googleapis.com/customsearch/v1',
    },
    fallback: {
      apiKey: process.env.FALLBACK_API_KEY || 'mock-fallback-api-key',
      baseUrl: 'https://api.fallback-provider.com/v1',
    },
  },
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];

if (config.nodeEnv === 'production') {
  requiredEnvVars.push('DATABASE_URL');
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

export default config;