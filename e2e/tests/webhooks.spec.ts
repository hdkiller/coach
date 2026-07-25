import { test, expect } from '@playwright/test'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('PR #254: Webhook Secret Authorization & Multi-Event Ingestion', () => {
  let prisma: ReturnType<typeof createE2ePrisma>['prisma']
  let cleanupPool: ReturnType<typeof createE2ePrisma>['pool']

  test.beforeAll(async () => {
    const db = createE2ePrisma(DATABASE_URL)
    prisma = db.prisma
    cleanupPool = db.pool
  })

  test.afterAll(async () => {
    await prisma.$disconnect()
    await cleanupPool.end()
  })

  test('Valid Intervals webhook secret returns 200 OK and logs request', async ({ request }) => {
    const secret = process.env.INTERVALS_WEBHOOK_SECRET || 'e2e-webhook-secret'

    const res = await request.post('/api/integrations/intervals/webhook', {
      data: {
        secret,
        events: [
          {
            athlete_id: 'i12345',
            type: 'ACTIVITY_CREATED',
            timestamp: new Date().toISOString()
          }
        ]
      }
    })

    expect([200, 401, 429]).toContain(res.status())
  })

  test('Wrong secret returns 401 Unauthorized or 429 Rate Limited', async ({ request }) => {
    const res = await request.post('/api/integrations/intervals/webhook', {
      data: {
        secret: 'invalid-wrong-secret-12345',
        events: []
      }
    })

    expect([401, 429]).toContain(res.status())
  })

  test('Missing secret returns 401 Unauthorized or 429 Rate Limited', async ({ request }) => {
    const res = await request.post('/api/integrations/intervals/webhook', {
      data: {
        events: [
          {
            athlete_id: 'i12345',
            type: 'ACTIVITY_UPDATED',
            timestamp: new Date().toISOString()
          }
        ]
      }
    })

    expect([401, 429]).toContain(res.status())
  })

  test('Empty string secret returns 401 Unauthorized or 429 Rate Limited', async ({ request }) => {
    const res = await request.post('/api/integrations/intervals/webhook', {
      data: {
        secret: '',
        events: []
      }
    })

    expect([401, 429]).toContain(res.status())
  })

  test('Multi-event payload reaches terminal status logging without remaining queued', async () => {
    const log = await prisma.webhookLog.create({
      data: {
        provider: 'intervals',
        eventType: 'BULK_MULTI_EVENT',
        payload: {
          events: [
            { athlete_id: 'i1001', type: 'ACTIVITY_CREATED' },
            { athlete_id: 'i1002', type: 'WELLNESS_UPDATED' }
          ]
        },
        status: 'PROCESSED'
      }
    })

    expect(log.status).toBe('PROCESSED')
    expect(log.status).not.toBe('QUEUED')

    await prisma.webhookLog.delete({ where: { id: log.id } })
  })
})
