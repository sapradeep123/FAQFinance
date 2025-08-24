/* Promote a user to a specific role (default ADMIN)
   Usage:
   DATABASE_URL="postgres://user:pass@host:5432/db" node scripts/promote-admin.js admin@example.com ADMIN
*/
const { Client } = require('pg');

async function main() {
  const email = process.argv[2];
  const role = process.argv[3] || 'ADMIN';
  if (!email) {
    console.error('Usage: node scripts/promote-admin.js <email> [role]');
    process.exit(1);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: databaseUrl, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  try {
    await client.query("UPDATE users SET role=$2, updated_at=NOW() WHERE email=$1", [email, role]);
    const res = await client.query('SELECT id, email, role FROM users WHERE email=$1', [email]);
    console.log(res.rows[0] || null);
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


