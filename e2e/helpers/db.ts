import pg from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

export async function waitForPostgres(connectionString: string, attempts = 60) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const pool = new pg.Pool({ connectionString })

    try {
      await pool.query('SELECT 1')
      await pool.end()
      return
    } catch {
      await pool.end().catch(() => undefined)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  throw new Error(`Postgres not ready after ${attempts}s: ${connectionString}`)
}

export function createE2ePrisma(connectionString: string) {
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  return { prisma, pool }
}

export async function resetDatabase(connectionString: string) {
  const pool = new pg.Pool({ connectionString })

  try {
    await pool.query(`
      DO $$
      DECLARE
        table_name text;
      BEGIN
        FOR table_name IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename <> '_prisma_migrations'
        LOOP
          EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', table_name);
        END LOOP;
      END $$;
    `)
  } finally {
    await pool.end()
  }
}
