import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString, { max: 1 });

export const db = drizzle(client, { schema });

export async function setTenantContext(tenantId: string): Promise<void> {
  await client`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;
}

export type Database = typeof db;
