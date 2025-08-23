import { Pool, PoolClient } from 'pg';
import { config } from '../config/env';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

// Test database connection on startup
pool.on('connect', (client: PoolClient) => {
  console.log('🔗 New database client connected');
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected error on idle client:', err);
  process.exit(-1);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully at:', res.rows[0].now);
  }
});

// Helper function to execute queries
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed:', { text: text.substring(0, 50) + '...', duration: `${duration}ms`, rows: res.rowCount });
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('❌ Query error:', { text: text.substring(0, 50) + '...', duration: `${duration}ms`, error: (error as Error).message });
    throw error;
  }
};

// Helper function to get a client from the pool
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

// Helper function for transactions
export const withTransaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing database pool...');
  await pool.end();
  console.log('✅ Database pool closed');
  process.exit(0);
});

export default pool;