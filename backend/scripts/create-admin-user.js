// Create initial admin user
// Usage: DATABASE_URL="postgres://user:pass@host:5432/db" node scripts/create-admin-user.js

const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({ 
    connectionString: databaseUrl, 
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined 
  });
  
  try {
    await client.connect();
    
    // Check if admin user already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', ['admin@example.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }
    
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);
    
    // Create admin user
    const result = await client.query(
      `INSERT INTO users (email, username, password_hash, role, status, region, currency, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      ['admin@example.com', 'Admin User', hashedPassword, 'ADMIN', 'ACTIVE', 'US', 'USD']
    );
    
    console.log('Admin user created successfully');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    
  } catch (err) {
    console.error('Failed to create admin user:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
