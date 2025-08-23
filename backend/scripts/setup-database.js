const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'postgres' // Connect to default database first
};

const targetDatabase = process.env.DB_NAME || 'financial_advisory_platform';

// SQL files to execute in order
const sqlFiles = [
  '01_core.sql',
  '02_faq.sql', 
  '03_chat.sql',
  '05_admin.sql'
];

async function setupDatabase() {
  let pool;
  
  try {
    console.log('🚀 Starting database setup...');
    console.log(`📍 Target database: ${targetDatabase}`);
    console.log(`🔗 Connecting to: ${config.host}:${config.port}`);
    
    // Connect to PostgreSQL server
    pool = new Pool(config);
    
    // Check if target database exists
    console.log('🔍 Checking if database exists...');
    const dbCheckResult = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDatabase]
    );
    
    if (dbCheckResult.rows.length === 0) {
      console.log(`📦 Creating database: ${targetDatabase}`);
      await pool.query(`CREATE DATABASE "${targetDatabase}"`);
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }
    
    // Close connection to default database
    await pool.end();
    
    // Connect to target database
    console.log(`🔗 Connecting to target database: ${targetDatabase}`);
    const targetPool = new Pool({
      ...config,
      database: targetDatabase
    });
    
    // Execute SQL files
    console.log('📄 Executing SQL schema files...');
    
    for (const sqlFile of sqlFiles) {
      const filePath = path.join(__dirname, 'sql', sqlFile);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ SQL file not found: ${sqlFile}`);
        continue;
      }
      
      console.log(`📝 Executing: ${sqlFile}`);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      try {
        await targetPool.query(sqlContent);
        console.log(`✅ ${sqlFile} executed successfully`);
      } catch (error) {
        console.error(`❌ Error executing ${sqlFile}:`, error.message);
        // Continue with other files even if one fails
      }
    }
    
    // Verify database setup
    console.log('🔍 Verifying database setup...');
    const tablesResult = await targetPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Create admin user if it doesn't exist
    console.log('👤 Setting up admin user...');
    const bcrypt = require('bcrypt');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Check if admin user exists
    const adminCheck = await targetPool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );
    
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await targetPool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified, created_at, updated_at)
        VALUES ($1, $2, 'Admin', 'User', 'ADMIN', true, NOW(), NOW())
      `, [adminEmail, hashedPassword]);
      console.log(`✅ Admin user created: ${adminEmail}`);
    } else {
      console.log('✅ Admin user already exists');
    }
    
    await targetPool.end();
    
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('  1. Start the backend server: npm run dev');
    console.log('  2. Start the frontend server: cd ../frontend && npm run dev');
    console.log(`  3. Login with admin credentials: ${adminEmail} / ${adminPassword}`);
    
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
}

// Handle script execution
if (require.main === module) {
  setupDatabase().catch(error => {
    console.error('💥 Setup script failed:', error);
    process.exit(1);
  });
}

module.exports = { setupDatabase };