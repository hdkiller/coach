import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  userMemoryFindMany: vi.fn(),
  userMemoryFindFirst: vi.fn(),
  userMemoryCreate: vi.fn(),
  userMemoryUpdate: vi.fn(),
  userMemoryUpdateMany: vi.fn(),
  chatRoomFindFirst: vi.fn()
}))

vi.mock('../db', () => ({
  prisma: {
    userMemory: {
      findMany: prismaMocks.userMemoryFindMany,
      findFirst: prismaMocks.userMemoryFindFirst,
      create: prismaMocks.userMemoryCreate,
      update: prismaMocks.userMemoryUpdate,
      updateMany: prismaMocks.userMemoryUpdateMany
    },
    chatRoom: {
      findFirst: prismaMocks.chatRoomFindFirst
    }
  }
}))

const { buildMemoryCandidate, normalizeMemoryKey, userMemoryService } =
  await import('./userMemoryService')

describe('userMemoryService helpers', () => {
  beforeEach(() => {
    prismaMocks.userMemoryFindMany.mockReset()
    prismaMocks.userMemoryFindFirst.mockReset()
    prismaMocks.userMemoryCreate.mockReset()
    prismaMocks.userMemoryUpdate.mockReset()
    prismaMocks.userMemoryUpdateMany.mockReset()
    prismaMocks.chatRoomFindFirst.mockReset()
  })

  it('normalizes memory keys consistently', () => {
    expect(normalizeMemoryKey('  I Prefer Morning Workouts!!  ')).toBe('i prefer morning workouts')
  })

  it('builds sensitive memory candidates for injury-like content', () => {
    const candidate = buildMemoryCandidate({
      content: 'I have recurring knee pain after long runs.',
      source: 'USER_EXPLICIT'
    })

    expect(candidate.category).toBe('CONSTRAINT')
    expect(candidate.sensitive).toBe(true)
  })
})

describe('userMemoryService prompt composition', () => {
  beforeEach(() => {
    prismaMocks.userMemoryFindMany.mockReset()
    prismaMocks.userMemoryUpdateMany.mockReset()
  })

  it('omits memory blocks when memory is disabled', async () => {
    const result = await userMemoryService.composePromptMemoryBlock({
      userId: 'user_1',
      roomId: 'room_1',
      memoryEnabled: false
    })

    expect(result).toEqual({
      globalBlock: '',
      roomBlock: ''
    })
    expect(prismaMocks.userMemoryFindMany).not.toHaveBeenCalled()
  })

  it('composes ranked global and room memory blocks', async () => {
    prismaMocks.userMemoryFindMany
      .mockResolvedValueOnce([
        {
          id: 'global_1',
          scope: 'GLOBAL',
          content: 'User prefers morning workouts.',
          confidence: 0.9,
          pinned: false,
          updatedAt: new Date('2026-03-17T08:00:00Z'),
          lastConfirmedAt: null
        },
        {
          id: 'global_2',
          scope: 'GLOBAL',
          content: 'Keep replies concise.',
          confidence: 0.8,
          pinned: true,
          updatedAt: new Date('2026-03-16T08:00:00Z'),
          lastConfirmedAt: null
        }
      ])
      .mockResolvedValueOnce([
        {
          id: 'room_1',
          scope: 'ROOM',
          content: 'This chat is focused on marathon tapering.',
          confidence: 0.88,
          pinned: false,
          updatedAt: new Date('2026-03-17T09:00:00Z'),
          lastConfirmedAt: null
        }
      ])
    prismaMocks.userMemoryUpdateMany.mockResolvedValue({ count: 3 })

    const result = await userMemoryService.composePromptMemoryBlock({
      userId: 'user_1',
      roomId: 'room_123',
      memoryEnabled: true
    })

    expect(result.globalBlock).toContain('## Cross-Chat Memory')
    expect(result.globalBlock).toContain('Keep replies concise.')
    expect(result.globalBlock).toContain('User prefers morning workouts.')
    expect(result.roomBlock).toContain('## This Chat Memory')
    expect(result.roomBlock).toContain('This chat is focused on marathon tapering.')
    expect(prismaMocks.userMemoryUpdateMany).toHaveBeenCalled()
  })
})
