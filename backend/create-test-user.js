const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    db.run(
      `INSERT OR REPLACE INTO users (id, email, username, password_hash, role, status, region, currency, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      ['1', 'admin@trae.com', 'Admin User', hashedPassword, 'ADMIN', 'ACTIVE', 'US', 'USD'],
      function(err) {
        if (err) {
          console.error('Error creating test user:', err);
        } else {
          console.log('Test user created successfully');
          console.log('Email: admin@trae.com');
          console.log('Password: admin123');
        }
        db.close();
      }
    );
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

createTestUser();