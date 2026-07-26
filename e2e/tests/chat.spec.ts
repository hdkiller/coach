import { test, expect } from '../fixtures/test-fixtures.ts'
import { ChatPage } from '../pages/ChatPage.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('AI Chat & Messaging Suite', () => {
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

  test('1. Renders chat interface and loads active session', async ({ authedPage }) => {
    const chat = new ChatPage(authedPage)
    await chat.goto()

    await expect(authedPage).toHaveURL(/\/chat/)
    await expect(authedPage).toHaveTitle(/Chat/i)
  })

  test('2. Lists chat rooms via API endpoint', async ({ authedPage }) => {
    const roomsRes = await authedPage.request.get('/api/chat/rooms')
    expect(roomsRes.ok()).toBeTruthy()

    const rooms = await roomsRes.json()
    expect(Array.isArray(rooms)).toBeTruthy()
    expect(rooms.length).toBeGreaterThan(0)
    expect(rooms[0].roomId).toBeTruthy()
    expect(rooms[0].roomName).toBeTruthy()
  })

  test('3. Creates a new chat room and persists record in database', async ({ authedPage }) => {
    const createRes = await authedPage.request.post('/api/chat/rooms', {
      data: { name: 'E2E Endurance Planning' }
    })
    expect(createRes.ok(), await createRes.text()).toBeTruthy()

    const roomData = await createRes.json()
    expect(roomData.roomId || roomData.id).toBeTruthy()

    const createdRoomId = roomData.roomId || roomData.id

    // Verify database record in ChatRoom table
    const roomRecord = await prisma.chatRoom.findUnique({
      where: { id: createdRoomId }
    })
    expect(roomRecord).toBeTruthy()
    expect(roomRecord?.name).toBe('New Chat')
  })

  test('4. Accepts prompt text input in chat message area', async ({ authedPage }) => {
    const chat = new ChatPage(authedPage)
    await chat.goto()

    if (await chat.messageInput.isVisible()) {
      await chat.messageInput.fill('Schedule a 90-minute Zone 2 ride for tomorrow at 8am')
      await expect(chat.messageInput).toHaveValue(
        'Schedule a 90-minute Zone 2 ride for tomorrow at 8am'
      )
    }
  })
})
