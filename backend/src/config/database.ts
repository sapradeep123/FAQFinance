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
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  
  // FAQ table
  database.exec(`
    CREATE TABLE IF NOT EXISTS faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
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
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('admin@example.com', hashedPassword, 'Admin', 'User', 'admin', 1, 1);
    
    console.log('👤 Default admin user created');
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