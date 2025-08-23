"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePool = exports.testConnection = exports.transaction = exports.getClient = exports.query = void 0;
const pg_1 = require("pg");
const env_1 = require("../config/env");
const pool = new pg_1.Pool({
    host: env_1.config.database.host,
    port: env_1.config.database.port,
    database: env_1.config.database.name,
    user: env_1.config.database.user,
    password: env_1.config.database.password,
    ssl: env_1.config.database.ssl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    maxUses: 7500,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
pool.on('connect', (client) => {
    console.log('🔗 New database connection established');
});
pool.on('remove', (client) => {
    console.log('🔌 Database connection removed from pool');
});
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Executed query', { text, duration, rows: result.rowCount });
        return result;
    }
    catch (error) {
        console.error('❌ Database query error:', error);
        throw error;
    }
};
exports.query = query;
const getClient = async () => {
    try {
        const client = await pool.connect();
        return client;
    }
    catch (error) {
        console.error('❌ Error getting database client:', error);
        throw error;
    }
};
exports.getClient = getClient;
const transaction = async (callback) => {
    const client = await (0, exports.getClient)();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.transaction = transaction;
const testConnection = async () => {
    try {
        const result = await (0, exports.query)('SELECT NOW() as current_time');
        console.log('✅ Database connection successful:', result.rows[0].current_time);
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
};
exports.testConnection = testConnection;
const closePool = async () => {
    try {
        await pool.end();
        console.log('🔒 Database pool closed');
    }
    catch (error) {
        console.error('❌ Error closing database pool:', error);
    }
};
exports.closePool = closePool;
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, closing database pool...');
    await (0, exports.closePool)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, closing database pool...');
    await (0, exports.closePool)();
    process.exit(0);
});
exports.default = pool;
//# sourceMappingURL=pool.js.map