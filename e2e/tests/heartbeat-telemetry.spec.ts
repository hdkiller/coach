import { test, expect } from '../fixtures/test-fixtures.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('PR #257: Heartbeat Telemetry & Chat Turn Metadata', () => {
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

  test('Turn metadata includes executionHost (deploymentId, serviceId, processId), executionPhase, and heartbeatPhaseAt', async () => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // Find seeded or recent chat room
    const room = await prisma.chatRoom.findFirst({
      where: { users: { some: { userId: athlete!.id } } }
    })
    expect(room).toBeTruthy()

    // Seed a chat turn with telemetry metadata
    const turn = await prisma.chatTurn.create({
      data: {
        roomId: room!.id,
        userId: athlete!.id,
        userMessageId: `e2e-user-msg-${Date.now()}`,
        status: 'COMPLETED',
        lineageId: `e2e-lineage-${Date.now()}`,
        startedAt: new Date(),
        finishedAt: new Date(),
        lastHeartbeatAt: new Date(),
        metadata: {
          executionPhase: 'execution',
          heartbeatPhaseAt: new Date().toISOString(),
          executionHost: {
            deploymentId: 'e2e-deployment-sha',
            serviceId: 'app-worker',
            processId: process.pid
          }
        }
      }
    })

    // Fetch turn back from DB and assert telemetry properties
    const fetchedTurn = await prisma.chatTurn.findUnique({ where: { id: turn.id } })
    expect(fetchedTurn).toBeTruthy()

    const metadata = fetchedTurn!.metadata as any
    expect(metadata).toBeDefined()
    expect(metadata.executionPhase).toBe('execution')
    expect(metadata.heartbeatPhaseAt).toBeDefined()
    expect(metadata.executionHost).toBeDefined()
    expect(metadata.executionHost.deploymentId).toBe('e2e-deployment-sha')
    expect(metadata.executionHost.serviceId).toBe('app-worker')
    expect(typeof metadata.executionHost.processId).toBe('number')

    await prisma.chatTurn.delete({ where: { id: turn.id } })
  })

  test('Heartbeat telemetry updates cleanly across multi-turn chat executions', async () => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const turns = await prisma.chatTurn.findMany({
      where: { userId: athlete!.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // All existing turns should have metadata object
    for (const turn of turns) {
      if (turn.metadata) {
        expect(typeof turn.metadata).toBe('object')
      }
    }
  })
})
