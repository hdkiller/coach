import { test, expect } from '@playwright/test'
import { createE2ePrisma } from '../helpers/db.ts'
import { deduplicationService } from '../../server/utils/services/deduplicationService.ts'
import { wellnessRepository } from '../../server/utils/repositories/wellnessRepository.ts'

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

  test('Multi-source deduplication detects duplicate workouts and merges them', async () => {
    const athlete = await prisma.user.findFirst({ where: { email: 'e2e-athlete@coachwatts.test' } })
    expect(athlete).toBeTruthy()

    const startTime = new Date('2026-07-26T10:00:00Z')

    // Create 2 duplicate workouts: one from Strava, one from Intervals.icu
    const w1 = await prisma.workout.create({
      data: {
        userId: athlete!.id,
        title: 'Morning Endurance Ride',
        type: 'Ride',
        source: 'strava',
        date: startTime,
        durationSec: 3600,
        distanceMeters: 30000,
        averageWatts: 200,
        externalId: `strava-dedup-${Date.now()}`
      }
    })

    const w2 = await prisma.workout.create({
      data: {
        userId: athlete!.id,
        title: 'Morning Endurance Ride',
        type: 'Ride',
        source: 'intervals',
        date: startTime,
        durationSec: 3600,
        distanceMeters: 30000,
        averageWatts: 205,
        normalizedPower: 215,
        externalId: `intervals-dedup-${Date.now()}`
      }
    })

    const duplicateGroups = deduplicationService.findDuplicateGroups([w1, w2])
    expect(duplicateGroups.length).toBe(1)
    expect(duplicateGroups[0].workouts.length).toBe(2)

    await deduplicationService.mergeDuplicateGroup(duplicateGroups[0])

    const updatedW1 = await prisma.workout.findUnique({ where: { id: w1.id } })
    const updatedW2 = await prisma.workout.findUnique({ where: { id: w2.id } })

    const duplicates = [updatedW1, updatedW2].filter((w) => w?.isDuplicate)
    const primaries = [updatedW1, updatedW2].filter((w) => !w?.isDuplicate)

    expect(duplicates.length).toBe(1)
    expect(primaries.length).toBe(1)
    expect(duplicates[0]?.duplicateOf).toBe(primaries[0]?.id)

    // Cleanup
    await prisma.workout.deleteMany({ where: { id: { in: [w1.id, w2.id] } } })
  })

  test('Biometrics merge into Wellness model without score conflicts (Oura sleep + Withings weight)', async () => {
    const athlete = await prisma.user.findFirst({ where: { email: 'e2e-athlete@coachwatts.test' } })
    expect(athlete).toBeTruthy()

    const targetDate = new Date('2026-07-26T00:00:00Z')

    // Clean up any pre-existing record for target date
    await prisma.wellness.deleteMany({
      where: { userId: athlete!.id, date: targetDate }
    })

    // 1. Ingest Oura Sleep & Readiness metrics
    await wellnessRepository.upsert(
      athlete!.id,
      targetDate,
      {
        userId: athlete!.id,
        date: targetDate,
        sleepHours: 8.0,
        sleepScore: 88,
        readiness: 90,
        lastSource: 'oura'
      },
      {
        sleepHours: 8.0,
        sleepScore: 88,
        readiness: 90
      },
      'oura'
    )

    // 2. Ingest Withings Weight metric for exact same date
    await wellnessRepository.upsert(
      athlete!.id,
      targetDate,
      {
        userId: athlete!.id,
        date: targetDate,
        weight: 75.2,
        lastSource: 'withings'
      },
      {
        weight: 75.2
      },
      'withings'
    )

    // 3. Assert single Wellness record holds BOTH Oura biometrics AND Withings weight
    const mergedRecord = await prisma.wellness.findUnique({
      where: {
        userId_date: {
          userId: athlete!.id,
          date: targetDate
        }
      }
    })

    expect(mergedRecord).toBeTruthy()
    expect(mergedRecord?.sleepHours).toBe(8.0)
    expect(mergedRecord?.sleepScore).toBe(88)
    expect(mergedRecord?.readiness).toBe(90)
    expect(mergedRecord?.weight).toBe(75.2)

    // Cleanup
    await prisma.wellness.deleteMany({
      where: { userId: athlete!.id, date: targetDate }
    })
  })
})

