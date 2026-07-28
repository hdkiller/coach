import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { issuesRepository } from '../../../../../server/utils/repositories/issuesRepository'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getRouterParam', (event: any, key: string) => event.context?.params?.[key])
vi.stubGlobal('readBody', (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/repositories/issuesRepository', () => ({
  issuesRepository: {
    getById: vi.fn(),
    acknowledgeComment: vi.fn(),
    toggleReaction: vi.fn()
  }
}))

const getReactionHandler = async () => {
  const mod =
    await import('../../../../../server/api/issues/[id]/comments/[commentId]/reaction.post')
  return mod.default
}

const getAcknowledgeHandler = async () => {
  const mod =
    await import('../../../../../server/api/issues/[id]/comments/[commentId]/acknowledge.post')
  return mod.default
}

describe('Issue comment ownership guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-2', isAdmin: false }
    } as any)
  })

  it("does not let a second user react to another user's comment", async () => {
    vi.mocked(issuesRepository.getById).mockResolvedValue(null)
    const handler = await getReactionHandler()

    await expect(
      handler({
        context: { params: { id: 'issue-1', commentId: 'comment-1' } },
        body: { emoji: '👍' }
      } as any)
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(issuesRepository.getById).toHaveBeenCalledWith('issue-1', 'user-2', false)
    expect(issuesRepository.toggleReaction).not.toHaveBeenCalled()
  })

  it("does not let a second user acknowledge another user's comment", async () => {
    vi.mocked(issuesRepository.getById).mockResolvedValue(null)
    const handler = await getAcknowledgeHandler()

    await expect(
      handler({
        context: { params: { id: 'issue-1', commentId: 'comment-1' } }
      } as any)
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(issuesRepository.getById).toHaveBeenCalledWith('issue-1', 'user-2', false)
    expect(issuesRepository.acknowledgeComment).not.toHaveBeenCalled()
  })

  it('does not let a user target a hidden internal note', async () => {
    vi.mocked(issuesRepository.getById).mockResolvedValue({
      id: 'issue-1',
      comments: []
    } as any)
    const handler = await getReactionHandler()

    await expect(
      handler({
        context: { params: { id: 'issue-1', commentId: 'internal-note' } },
        body: { emoji: '👀' }
      } as any)
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(issuesRepository.toggleReaction).not.toHaveBeenCalled()
  })

  it('allows the issue owner to react to a comment on the issue', async () => {
    vi.mocked(issuesRepository.getById).mockResolvedValue({
      id: 'issue-1',
      comments: [{ id: 'comment-1', type: 'MESSAGE' }]
    } as any)
    vi.mocked(issuesRepository.toggleReaction).mockResolvedValue({
      id: 'comment-1',
      reactions: { '👍': ['user-2'] }
    } as any)
    const handler = await getReactionHandler()

    const result = await handler({
      context: { params: { id: 'issue-1', commentId: 'comment-1' } },
      body: { emoji: '👍' }
    } as any)

    expect(issuesRepository.toggleReaction).toHaveBeenCalledWith(
      'issue-1',
      'comment-1',
      'user-2',
      '👍'
    )
    expect(result).toMatchObject({ id: 'comment-1' })
  })

  it('allows an admin through the user namespace with internal-note access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin-1', isAdmin: true }
    } as any)
    vi.mocked(issuesRepository.getById).mockResolvedValue({
      id: 'issue-1',
      comments: [{ id: 'internal-note', type: 'NOTE' }]
    } as any)
    vi.mocked(issuesRepository.acknowledgeComment).mockResolvedValue({
      id: 'internal-note',
      acknowledgedBy: 'admin-1'
    } as any)
    const handler = await getAcknowledgeHandler()

    await handler({
      context: { params: { id: 'issue-1', commentId: 'internal-note' } }
    } as any)

    expect(issuesRepository.getById).toHaveBeenCalledWith('issue-1', undefined, true)
    expect(issuesRepository.acknowledgeComment).toHaveBeenCalledWith(
      'issue-1',
      'internal-note',
      'admin-1'
    )
  })
})
