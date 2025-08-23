import { Pool, PoolClient, QueryResult } from 'pg';
import Database from 'better-sqlite3';
import { config } from './config';
import path from 'path';
import fs from 'fs';

let pool: Pool;
let sqliteDb: Database.Database;

// Check if we should use SQLite (fallback for development)
const useSQLite = process.env.USE_SQLITE === 'true' || !config.database?.url?.startsWith('postgres');

// Initialize SQLite database
function initializeSQLite(): Database.Database {
  if (!sqliteDb) {
    const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
    
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    sqliteDb = new Database(dbPath);
    
    // Enable foreign keys
    sqliteDb.pragma('foreign_keys = ON');
    
    console.log(`📁 SQLite database initialized at: ${dbPath}`);
  }
  
  return sqliteDb;
}

// Initialize PostgreSQL connection pool
function initializePool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.database?.url,
      host: config.database?.host,
      port: config.database?.port,
      database: config.database?.name,
      user: config.database?.user,
      password: config.database?.password,
      ssl: config.database?.ssl ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    // Handle pool connection events
    pool.on('connect', (client) => {
      console.log('New client connected to database');
    });

    pool.on('remove', (client) => {
      console.log('Client removed from pool');
    });
  }

  return pool;
}

// Get the appropriate database connection
export const pool = useSQLite ? null : initializePool();
export const db = useSQLite ? initializeSQLite() : null;

// Universal query function that works with both PostgreSQL and SQLite
export async function query(text: string, params: any[] = []): Promise<any> {
  if (useSQLite) {
    try {
      const database = db || initializeSQLite();
      
      // Convert PostgreSQL-style parameters ($1, $2) to SQLite-style (?)
      const sqliteQuery = text.replace(/\$\d+/g, '?');
      
      // Filter out undefined/null parameters and ensure we have the right count
      const cleanParams = (params || []).filter(p => p !== undefined);
      
      if (sqliteQuery.toLowerCase().trim().startsWith('select') || sqliteQuery.toLowerCase().includes('returning')) {
        const stmt = database.prepare(sqliteQuery);
        const rows = cleanParams.length > 0 ? stmt.all(...cleanParams) : stmt.all();
        return { rows, rowCount: rows.length };
      } else {
        const stmt = database.prepare(sqliteQuery);
        const result = cleanParams.length > 0 ? stmt.run(...cleanParams) : stmt.run();
        return { 
          rows: [], 
          rowCount: result.changes,
          insertId: result.lastInsertRowid
        };
      }
    } catch (error) {
      console.error('SQLite query error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  } else {
    const client = await pool!.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }
}

// Transaction support
export async function transaction<T>(callback: (queryFn: typeof query) => Promise<T>): Promise<T> {
  if (useSQLite) {
    const database = db || initializeSQLite();
    const transaction = database.transaction(() => {
      return callback(query);
    });
    return transaction();
  } else {
    const client = await pool!.connect();
    try {
      await client.query('BEGIN');
      
      const transactionQuery = async (text: string, params: any[] = []) => {
        return await client.query(text, params);
      };
      
      const result = await callback(transactionQuery);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Check database connection
export async function checkConnection(): Promise<boolean> {
  try {
    if (useSQLite) {
      const database = db || initializeSQLite();
      database.prepare('SELECT 1').get();
      return true;
    } else {
      const result = await query('SELECT 1');
      return result.rows.length > 0;
    }
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// Get database statistics
export async function getDatabaseStats(): Promise<any> {
  try {
    if (useSQLite) {
      const database = db || initializeSQLite();
      const stats = {
        type: 'SQLite',
        path: database.name,
        inTransaction: database.inTransaction,
        open: database.open,
        readonly: database.readonly
      };
      return stats;
    } else {
      const result = await query(`
        SELECT 
          current_database() as database_name,
          version() as version,
          current_user as current_user,
          inet_server_addr() as server_address,
          inet_server_port() as server_port
      `);
      return {
        type: 'PostgreSQL',
        ...result.rows[0]
      };
    }
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { error: error.message };
  }
}

// Initialize database with schema
export async function initializeDatabase(): Promise<void> {
  try {
    console.log(`🔧 Initializing ${useSQLite ? 'SQLite' : 'PostgreSQL'} database...`);
    
    if (useSQLite) {
      // Initialize SQLite database
      const database = initializeSQLite();
      
      // Create basic tables for SQLite
      await createSQLiteTables();
      
      console.log('✅ SQLite database initialized successfully');
    } else {
      // Test PostgreSQL connection
      const connected = await checkConnection();
      if (!connected) {
        throw new Error('Cannot connect to PostgreSQL database');
      }
      console.log('✅ PostgreSQL database connection verified');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Create SQLite tables (simplified schema)
async function createSQLiteTables(): Promise<void> {
  const database = db || initializeSQLite();
  
  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
      status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
      region TEXT DEFAULT 'US',
      currency TEXT DEFAULT 'USD',
      theme TEXT DEFAULT 'light',
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Sessions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Portfolios table
  database.exec(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      total_value DECIMAL(15,2) DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // Chat threads table
  database.exec(`
    CREATE TABLE IF NOT EXISTS chat_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT,
      is_archived BOOLEAN DEFAULT false,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // FAQs table (matching API expectations)
  database.exec(`
    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('BANKING', 'LOANS', 'INVESTMENTS', 'TAX', 'CARDS', 'GENERAL')),
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      keywords TEXT,
      status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
      sort_order INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id)
    )
  `);
  
  // Insert sample FAQs if table is empty
  const faqCount = database.prepare('SELECT COUNT(*) as count FROM faqs').get();
  if (faqCount.count === 0) {
    const insertFAQ = database.prepare(`
      INSERT INTO faqs (category, question, answer, keywords, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Banking FAQs
    insertFAQ.run('BANKING', 'How do I open a savings account?', 'To open a savings account, visit any of our branches with a valid ID, proof of address, and minimum deposit. You can also apply online through our website.', 'savings,account,open,banking', 1, 'ACTIVE');
    insertFAQ.run('BANKING', 'What are the current interest rates?', 'Our current savings account interest rates range from 0.5% to 2.5% APY depending on your account balance and type. Check our website for the most up-to-date rates.', 'interest,rates,savings,APY', 2, 'ACTIVE');
    insertFAQ.run('BANKING', 'How can I transfer money between accounts?', 'You can transfer money through online banking, mobile app, ATM, or by visiting a branch. Online transfers are usually instant for accounts within our bank.', 'transfer,money,online,banking', 3, 'ACTIVE');
    
    // Investment FAQs
    insertFAQ.run('INVESTMENTS', 'What is dollar-cost averaging?', 'Dollar-cost averaging is an investment strategy where you invest a fixed amount regularly, regardless of market conditions. This helps reduce the impact of market volatility.', 'dollar-cost,averaging,investment,strategy', 1, 'ACTIVE');
    insertFAQ.run('INVESTMENTS', 'How do I start investing?', 'Start by setting clear financial goals, building an emergency fund, then consider low-cost index funds or ETFs. Our investment advisors can help create a personalized strategy.', 'investing,start,beginner,portfolio', 2, 'ACTIVE');
    insertFAQ.run('INVESTMENTS', 'What is portfolio diversification?', 'Portfolio diversification means spreading investments across different asset classes, sectors, and geographic regions to reduce risk and improve potential returns.', 'diversification,portfolio,risk,assets', 3, 'ACTIVE');
    
    // Loan FAQs
    insertFAQ.run('LOANS', 'What documents do I need for a loan?', 'Typically you need proof of income, employment verification, credit history, bank statements, and identification. Specific requirements vary by loan type.', 'loan,documents,requirements,application', 1, 'ACTIVE');
    insertFAQ.run('LOANS', 'How is my credit score calculated?', 'Credit scores are calculated based on payment history (35%), credit utilization (30%), length of credit history (15%), credit mix (10%), and new credit inquiries (10%).', 'credit,score,calculation,factors', 2, 'ACTIVE');
    
    // General FAQs
    insertFAQ.run('GENERAL', 'How do I contact customer support?', 'You can reach our customer support 24/7 through phone, email, live chat on our website, or visit any branch during business hours.', 'support,contact,help,customer', 1, 'ACTIVE');
    insertFAQ.run('GENERAL', 'Is my data secure?', 'Yes, we use bank-level encryption, multi-factor authentication, and follow strict regulatory compliance to protect your personal and financial information.', 'security,data,protection,privacy', 2, 'ACTIVE');
    
    console.log('📋 Sample FAQs inserted');
  }
  
  // Admin tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS system_health (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      component TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      last_check DATETIME DEFAULT CURRENT_TIMESTAMP,
      response_time_ms INTEGER,
      error_message TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS admin_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      is_read BOOLEAN DEFAULT false,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      response_time_ms INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS api_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      config_key TEXT NOT NULL,
      config_value TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, config_key)
    )
  `);
  
  // GPT Configurations table
  database.exec(`
    CREATE TABLE IF NOT EXISTS gpt_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
      api_key TEXT NOT NULL,
      model TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      max_tokens INTEGER DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 8000),
      temperature REAL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, model)
    )
  `);

  // System Settings table
  database.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default system settings if table is empty
  const settingsCount = database.prepare('SELECT COUNT(*) as count FROM system_settings').get();
  if (settingsCount.count === 0) {
    const insertSetting = database.prepare(`
      INSERT INTO system_settings (key, value, category)
      VALUES (?, ?, ?)
    `);
    
    insertSetting.run('finance_data_sources_enabled', 'true', 'finance');
    insertSetting.run('yahoo_finance_enabled', 'true', 'finance');
    insertSetting.run('google_finance_enabled', 'true', 'finance');
    insertSetting.run('finance_only_responses', 'true', 'ai');
    insertSetting.run('default_gpt_provider', 'openai', 'ai');
    insertSetting.run('max_financial_search_results', '10', 'finance');
    insertSetting.run('financial_data_cache_duration', '300', 'finance');
    
    console.log('⚙️ Default system settings inserted');
  }

  // Insert default GPT configurations if table is empty
  const gptCount = database.prepare('SELECT COUNT(*) as count FROM gpt_configs').get();
  if (gptCount.count === 0) {
    const insertGptConfig = database.prepare(`
      INSERT INTO gpt_configs (provider, api_key, model, is_active, max_tokens, temperature)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertGptConfig.run('openai', 'your-openai-api-key-here', 'gpt-3.5-turbo', 0, 2000, 0.7);
    insertGptConfig.run('openai', 'your-openai-api-key-here', 'gpt-4', 0, 2000, 0.7);
    insertGptConfig.run('anthropic', 'your-anthropic-api-key-here', 'claude-3-sonnet-20240229', 0, 2000, 0.7);
    insertGptConfig.run('anthropic', 'your-anthropic-api-key-here', 'claude-3-haiku-20240307', 0, 2000, 0.7);
    insertGptConfig.run('google', 'your-google-api-key-here', 'gemini-pro', 0, 2000, 0.7);
    insertGptConfig.run('google', 'your-google-api-key-here', 'gemini-pro-vision', 0, 2000, 0.7);
    
    console.log('🤖 Default GPT configurations inserted');
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      identifier_type TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      requests_count INTEGER DEFAULT 0,
      window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS metrics_rollup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      metric_type TEXT NOT NULL,
      endpoint TEXT,
      total_requests INTEGER DEFAULT 0,
      successful_requests INTEGER DEFAULT 0,
      failed_requests INTEGER DEFAULT 0,
      avg_response_time DECIMAL(10,2),
      min_response_time INTEGER,
      max_response_time INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Insert default admin user if not exists
  const adminExists = database.prepare('SELECT id FROM users WHERE email = ?').get('admin@example.com');
  if (!adminExists) {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    database.prepare(`
      INSERT INTO users (email, username, password_hash, first_name, last_name, role, is_active, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin@example.com', 'admin', hashedPassword, 'Admin', 'User', 'ADMIN', 1, 1);
    
    console.log('👤 Default admin user created');
  }
  
  // Insert default demo user if not exists
  const demoExists = database.prepare('SELECT id FROM users WHERE email = ?').get('demo@example.com');
  if (!demoExists) {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('demo123', 12);
    
    database.prepare(`
      INSERT INTO users (email, username, password_hash, first_name, last_name, role, is_active, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('demo@example.com', 'demo', hashedPassword, 'Demo', 'User', 'USER', 1, 1);
    
    console.log('👤 Default demo user created');
  }
  
  console.log('📋 SQLite tables created successfully');
}

// Close database connections
export async function closeConnections(): Promise<void> {
  try {
    if (useSQLite && sqliteDb) {
      sqliteDb.close();
      console.log('✅ SQLite database closed');
    }
    
    if (!useSQLite && pool) {
      await pool.end();
      console.log('✅ PostgreSQL pool closed');
    }
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}

// Handle pool errors only if using PostgreSQL
if (!useSQLite && pool) {
  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  pool.on('connect', (client) => {
    if (config.NODE_ENV === 'development') {
      console.log('New client connected to database');
    }
  });

  pool.on('acquire', (client) => {
    if (config.NODE_ENV === 'development') {
      console.log('Client acquired from pool');
    }
  });

  pool.on('remove', (client) => {
    if (config.NODE_ENV === 'development') {
      console.log('Client removed from pool');
    }
  });
}

// Database utility functions
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Legacy compatibility - these functions are now handled by the universal functions above
export const executeQuery = query;
export const executeTransaction = transaction;
export const closeDatabase = closeConnections;
export const checkDatabaseConnection = checkConnection;
export const closeDatabaseConnections = closeConnections;

// Export the database type for use in other modules
export const databaseType = useSQLite ? 'SQLite' : 'PostgreSQL';

// Export pool for direct access when needed
export default pool;