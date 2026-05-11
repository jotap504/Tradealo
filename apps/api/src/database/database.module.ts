import { Module, Global, Logger } from '@nestjs/common'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export const DRIZZLE_TOKEN = Symbol('DRIZZLE_TOKEN')

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_TOKEN,
      useFactory: () => {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          max: 5,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        })
        const dbLogger = new Logger('DatabaseModule')
        pool.on('error', (err: Error) => dbLogger.warn('pg pool error: ' + err.message))
        return drizzle(pool, { schema })
      },
    },
  ],
  exports: [DRIZZLE_TOKEN],
})
export class DatabaseModule {}


