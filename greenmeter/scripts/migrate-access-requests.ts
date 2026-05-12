import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function main() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS access_requests (
      request_id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      full_name text NOT NULL,
      email text NOT NULL,
      company text NOT NULL,
      industry text,
      job_title text,
      password_hash text NOT NULL,
      status text DEFAULT 'pending' NOT NULL,
      reviewed_by uuid,
      reviewed_at timestamp with time zone,
      review_note text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS access_requests_email_unique ON access_requests USING btree (email);
  `);
  console.log('Migration applied successfully');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
