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

/**
 * Drop other sessions on the E2E database, then truncate app tables.
 *
 * Playwright globalSetup re-prepares the DB while app-e2e still holds pooled
 * connections. Truncating under that contention can leave seed writes racing
 * the app (Goal_userId_fkey failures after User upsert). Terminating peers
 * first makes reset/seed deterministic.
 */
export async function resetDatabase(connectionString: string) {
  const pool = new pg.Pool({ connectionString })

  try {
    await pool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND backend_type = 'client backend'
    `)

    // Brief pause so terminated backends release locks before TRUNCATE.
    await new Promise((resolve) => setTimeout(resolve, 100))

    await pool.query(`
      DO $$
      DECLARE
        stmt text;
      BEGIN
        SELECT format(
          'TRUNCATE TABLE %s RESTART IDENTITY CASCADE',
          string_agg(format('%I', tablename), ', ')
        )
        INTO stmt
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations';

        IF stmt IS NOT NULL THEN
          EXECUTE stmt;
        END IF;
      END $$;
    `)
  } finally {
    await pool.end()
  }
}
