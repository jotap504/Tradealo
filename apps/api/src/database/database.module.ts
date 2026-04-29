import { Module, Global } from '@nestjs/common'
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
        const pool = new Pool({ connectionString: process.env.DATABASE_URL })
        return drizzle(pool, { schema })
      },
    },
  ],
  exports: [DRIZZLE_TOKEN],
})
export class DatabaseModule {}
