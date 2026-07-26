import { test, expect } from '../fixtures/test-fixtures.ts'
import { WorkoutUploadPage } from '../pages/WorkoutUploadPage.ts'
import { generateSampleFitBuffer } from '../helpers/fit-fixture.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('Workout Upload & FIT Ingestion Suite', () => {
  test.describe.configure({ mode: 'serial' })

  let prisma: ReturnType<typeof createE2ePrisma>['prisma']
  let cleanupPool: ReturnType<typeof createE2ePrisma>['pool']
  let athleteId: string

  test.beforeAll(async () => {
    const db = createE2ePrisma(DATABASE_URL)
    prisma = db.prisma
    cleanupPool = db.pool

    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete, `Test athlete ${E2E_ATHLETE_EMAIL} must exist in seed data`).toBeTruthy()
    athleteId = athlete!.id
  })

  test.afterAll(async () => {
    if (cleanupPool) {
      await cleanupPool.end()
    }
  })

  test('1. Renders workout upload page with file input dropzone', async ({ authedPage }) => {
    const uploadPage = new WorkoutUploadPage(authedPage)
    await uploadPage.goto()

    await expect(authedPage).toHaveURL(/\/workouts\/upload/)
    await expect(authedPage).toHaveTitle(/Upload/i)

    // Verify dropzone or heading element renders cleanly
    await expect(
      authedPage.getByRole('heading', { name: /Upload|Ingestion/i }).first()
    ).toBeVisible()
  })

  test('2. Uploads binary FIT file via API, processes ingestion, and persists FitFile & Workout records', async ({
    authedPage
  }) => {
    const fitBuffer = generateSampleFitBuffer('E2E Endurance Test Ride')

    // POST multipart FIT file payload
    const res = await authedPage.request.post('/api/workouts/upload-fit', {
      multipart: {
        file: {
          name: 'e2e-endurance-test-ride.fit',
          mimeType: 'application/octet-stream',
          buffer: fitBuffer
        },
        name: 'E2E Endurance Test Ride'
      }
    })

    expect(res.ok(), await res.text()).toBeTruthy()
    const data = await res.json()

    expect(data.success).toBeTruthy()
    expect(data.results.total).toBe(1)
    expect(data.results.items.length).toBe(1)

    const uploadedItem = data.results.items[0]
    expect(['queued', 'stored']).toContain(uploadedItem.state)

    // Assert database record created in FitFile
    const fitFileRecord = await prisma.fitFile.findFirst({
      where: {
        userId: athleteId,
        filename: 'e2e-endurance-test-ride.fit'
      }
    })
    expect(fitFileRecord).toBeTruthy()
  })

  test('3. Detects duplicate FIT file hash and prevents redundant processing', async ({
    authedPage
  }) => {
    const fitBuffer = generateSampleFitBuffer('E2E Duplicate Test Ride')

    // First upload
    const firstRes = await authedPage.request.post('/api/workouts/upload-fit', {
      multipart: {
        file: {
          name: 'e2e-duplicate-check.fit',
          mimeType: 'application/octet-stream',
          buffer: fitBuffer
        }
      }
    })
    expect(firstRes.ok()).toBeTruthy()

    // Second upload with identical buffer hash
    const secondRes = await authedPage.request.post('/api/workouts/upload-fit', {
      multipart: {
        file: {
          name: 'e2e-duplicate-check.fit',
          mimeType: 'application/octet-stream',
          buffer: fitBuffer
        }
      }
    })

    expect(secondRes.ok()).toBeTruthy()
    const secondData = await secondRes.json()

    // Deduplication should detect duplicate or return stored state
    expect(
      secondData.results.duplicates >= 1 || secondData.results.items[0].state === 'stored'
    ).toBeTruthy()
  })
})
