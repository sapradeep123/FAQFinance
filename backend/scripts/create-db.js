// Create a PostgreSQL database using the pg client
// Usage: DATABASE_URL="postgres://user:pass@host:5432/postgres" node scripts/create-db.js dbname

const { Client } = require('pg');

async function main() {
  const targetDb = process.argv[2];
  if (!targetDb) {
    console.error('Usage: node scripts/create-db.js <database_name>');
    process.exit(1);
  }

  const urlStr = process.env.DATABASE_URL;
  if (!urlStr) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  // Ensure we connect to the default "postgres" database for creation
  const u = new URL(urlStr);
  u.pathname = '/postgres';

  const client = new Client({ connectionString: u.toString(), ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE ${JSON.stringify(targetDb).slice(1, -1)}`);
    console.log(`Database ${targetDb} created.` );
  } catch (err) {
    if (err && err.code === '42P04') {
      console.log(`Database ${targetDb} already exists.`);
    } else {
      console.error('Failed to create database:', err);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main();


