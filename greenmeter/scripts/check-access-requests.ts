import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function main() {
  console.log('=== Access Requests ===');
  const requests = await sql`SELECT request_id, email, status, created_at FROM access_requests ORDER BY created_at DESC`;
  if (requests.length === 0) {
    console.log('  No access requests found.');
  }
  for (const r of requests) {
    console.log(`  [${r.status}] ${r.email} (${r.request_id}) — ${r.created_at}`);
  }

  console.log('\n=== Users created from approvals ===');
  for (const r of requests) {
    if (r.status === 'approved') {
      const user = await sql`SELECT user_id, tenant_id, email, role, status, password_hash IS NOT NULL as has_password FROM users WHERE email = ${r.email}`;
      if (user.length > 0) {
        console.log(`  [FOUND] ${user[0].email} — tenant: ${user[0].tenant_id}, role: ${user[0].role}, status: ${user[0].status}, has_password: ${user[0].has_password}`);
      } else {
        console.log(`  [MISSING] ${r.email} — approved but NO user row exists!`);
      }
    }
  }
}

main()
  .catch((err) => { console.error('Failed:', err); process.exit(1); })
  .finally(async () => { await sql.end(); });
