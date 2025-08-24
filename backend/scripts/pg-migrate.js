/* Simple PostgreSQL migration runner */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  try {
    const sqlDir = path.join(__dirname, 'sql');
    const files = fs
      .readdirSync(sqlDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const sqlPath = path.join(sqlDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`Applied migration: ${file}`);
    }
    console.log('All PostgreSQL migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();


