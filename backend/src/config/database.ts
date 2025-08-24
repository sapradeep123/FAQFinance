import Database from 'better-sqlite3';
import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from './config';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';

let sqliteDb: Database.Database;
let pgPool: Pool | undefined;

const isPostgres: boolean = !config.USE_SQLITE && !!config.DATABASE_URL;

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

// Get the SQLite database instance
export const db = config.USE_SQLITE ? initializeSQLite() : undefined as any;

function getPgPool(): Pool {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: undefined
    });
  }
  return pgPool;
}

function replaceQuestionMarksWithDollars(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function translateDateFunctionsForPg(sql: string): string {
  // datetime('now', '-24 hours') -> now() - interval '24 hours'
  return sql.replace(/datetime\(\'now\',\s*\'-(\d+)\s+(hours|hour|days|day)\'\)/gi, (_m, num, unit) => {
    const u = String(unit).toLowerCase().startsWith('hour') ? 'hours' : 'days';
    return `now() - interval '${num} ${u}'`;
  });
}

// Universal query function for SQLite
export async function query(text: string, params: any[] = []): Promise<any> {
  const cleanParams = (params || []).filter(p => p !== undefined);
  if (!isPostgres) {
    try {
      const database = db;
      if (text.toLowerCase().trim().startsWith('select') || text.toLowerCase().includes('returning')) {
        const stmt = database.prepare(text);
        const rows = cleanParams.length > 0 ? stmt.all(...cleanParams) : stmt.all();
        return { rows, rowCount: rows.length };
      } else {
        const stmt = database.prepare(text);
        const result = cleanParams.length > 0 ? stmt.run(...cleanParams) : stmt.run();
        return { rows: [], rowCount: result.changes, insertId: result.lastInsertRowid };
      }
    } catch (error) {
      console.error('SQLite query error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  } else {
    try {
      // For PG, translate common SQLite constructs when present
      let sql = text;
      sql = translateDateFunctionsForPg(sql);
      if (sql.includes('?') && !/\$\d+/.test(sql)) {
        sql = replaceQuestionMarksWithDollars(sql);
      }
      const pool = getPgPool();
      const result: QueryResult = await pool.query(sql, cleanParams);
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (error) {
      console.error('PostgreSQL query error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }
}

// Transaction support for SQLite
export async function transaction<T>(callback: (queryFn: typeof query) => Promise<T>): Promise<T> {
  if (!isPostgres) {
    const database = db;
    const trx = database.transaction(() => {
      return callback(query);
    });
    return trx();
  } else {
    const pool = getPgPool();
    const client: PoolClient = await pool.connect();
    try {
      await client.query('BEGIN');
      const q = async (text: string, params: any[] = []) => {
        let sql = text;
        sql = translateDateFunctionsForPg(sql);
        if (sql.includes('?') && !/\$\d+/.test(sql)) {
          sql = replaceQuestionMarksWithDollars(sql);
        }
        const res = await client.query(sql, (params || []).filter(p => p !== undefined));
        return { rows: res.rows, rowCount: res.rowCount };
      };
      const result = await callback(q as any);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

// Check database connection
export async function checkConnection(): Promise<boolean> {
  try {
    if (!isPostgres) {
      const database = db;
      database.prepare('SELECT 1').get();
      return true;
    } else {
      const pool = getPgPool();
      const res = await pool.query('SELECT 1');
      return res.rowCount === 1;
    }
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// Get database statistics
export async function getDatabaseStats(): Promise<any> {
  try {
    if (!isPostgres) {
      const database = db;
      return {
        type: 'SQLite',
        path: database.name,
        inTransaction: database.inTransaction,
        open: database.open,
        readonly: database.readonly
      };
    } else {
      const pool = getPgPool();
      const res = await pool.query('select current_database() as database_name, version() as version');
      return { type: 'PostgreSQL', ...res.rows[0] };
    }
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { error: (error as any).message };
  }
}

// Initialize database with schema
export async function initializeDatabase(): Promise<void> {
  try {
    if (!isPostgres) {
      console.log('🔧 Initializing SQLite database...');
      await createSQLiteTables();
      console.log('✅ SQLite database initialized successfully');
    } else {
      console.log('🔧 Skipping schema init (PostgreSQL uses migrations)');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Create SQLite tables (simplified schema)
async function createSQLiteTables(): Promise<void> {
  const database = db;
  
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

  // User sessions table used by authService
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at DATETIME NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Chat messages table
  database.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      user_id INTEGER,
      message TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM')),
      tokens_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  
  // Portfolio holdings table
  database.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      shares DECIMAL(15,6) NOT NULL,
      avg_price DECIMAL(15,4) NOT NULL,
      current_price DECIMAL(15,4),
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
    )
  `);
  
  // Market data cache table
  database.exec(`
    CREATE TABLE IF NOT EXISTS market_data_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      data_type TEXT NOT NULL,
      data TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(symbol, data_type)
    )
  `);
  
  // System settings table
  database.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Admin logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Admin notifications table
  database.exec(`
    CREATE TABLE IF NOT EXISTS admin_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('INFO','WARNING','ERROR','CRITICAL')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      read_at DATETIME,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // API usage tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      response_time INTEGER,
      status_code INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  
  // Insert default admin user if not exists
  const adminExists = database.prepare('SELECT id FROM users WHERE email = ?').get('admin@example.com');
  if (!adminExists) {
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
    if (!isPostgres && sqliteDb) {
      sqliteDb.close();
      console.log('✅ SQLite database closed');
    }
    if (isPostgres && pgPool) {
      await pgPool.end();
      console.log('✅ PostgreSQL pool closed');
    }
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
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

// Export the database type
export const databaseType = isPostgres ? 'PostgreSQL' : 'SQLite';

// Export database for direct access when needed
export default isPostgres ? undefined : db;