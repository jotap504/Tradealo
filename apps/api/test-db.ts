import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './src/database/schema';

async function main() {
  console.log('Connecting to', process.env.DATABASE_URL);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  const db = drizzle(pool, { schema });
  try {
    const res = await db.select().from(schema.users).limit(1);
    console.log('Success:', res);
  } catch (err) {
    console.error('Error detail:', err);
  }
  await pool.end();
}

main();
