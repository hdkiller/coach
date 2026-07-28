import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAdmin } from '../../../../../server/utils/auth-guard'
import { issuesRepository } from '../../../../../server/utils/repositories/issuesRepository'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getRouterParam', (event: any, key: string) => event.context?.params?.[key])
vi.stubGlobal('readBody', (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAdmin: vi.fn()
}))

vi.mock('../../../../../server/utils/repositories/issuesRepository', () => ({
  issuesRepository: {
    toggleIssueReaction: vi.fn(),
    toggleReaction: vi.fn()
  }
}))

const getIssueReactionHandler = async () => {
  const mod = await import('../../../../../server/api/admin/issues/[id]/reaction.post')
  return mod.default
}

const getCommentReactionHandler = async () => {
  const mod =
    await import('../../../../../server/api/admin/issues/[id]/comments/[commentId]/reaction.post')
  return mod.default
}

describe('Admin Issue Reactions Auth Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/admin/issues/[id]/reaction', () => {
    it('rejects non-admin users with 403 Forbidden', async () => {
      vi.mocked(requireAdmin).mockRejectedValue(
        Object.assign(new Error('Forbidden'), { statusCode: 403 })
      )
      const handler = await getIssueReactionHandler()

      await expect(
        handler({
          context: { params: { id: 'issue-1' } },
          body: { emoji: '👍' }
        } as any)
      ).rejects.toThrow('Forbidden')
    })

    it('allows admin users to react to an issue', async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        user: { id: 'admin-1', isAdmin: true }
      } as any)
      vi.mocked(issuesRepository.toggleIssueReaction).mockResolvedValue({
        id: 'issue-1',
        reactions: {}
      } as any)

      const handler = await getIssueReactionHandler()
      const result = await handler({
        context: { params: { id: 'issue-1' } },
        body: { emoji: '👍' }
      } as any)

      expect(requireAdmin).toHaveBeenCalled()
      expect(issuesRepository.toggleIssueReaction).toHaveBeenCalledWith('issue-1', 'admin-1', '👍')
      expect(result).toEqual({ id: 'issue-1', reactions: {} })
    })
  })

  describe('POST /api/admin/issues/[id]/comments/[commentId]/reaction', () => {
    it('rejects non-admin users with 403 Forbidden', async () => {
      vi.mocked(requireAdmin).mockRejectedValue(
        Object.assign(new Error('Forbidden'), { statusCode: 403 })
      )
      const handler = await getCommentReactionHandler()

      await expect(
        handler({
          context: { params: { id: 'issue-1', commentId: 'comment-1' } },
          body: { emoji: '🎉' }
        } as any)
      ).rejects.toThrow('Forbidden')
    })

    it('allows admin users to react to a comment', async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        user: { id: 'admin-1', isAdmin: true }
      } as any)
      vi.mocked(issuesRepository.toggleReaction).mockResolvedValue({
        id: 'comment-1',
        reactions: {}
      } as any)

      const handler = await getCommentReactionHandler()
      const result = await handler({
        context: { params: { id: 'issue-1', commentId: 'comment-1' } },
        body: { emoji: '🎉' }
      } as any)

      expect(requireAdmin).toHaveBeenCalled()
      expect(issuesRepository.toggleReaction).toHaveBeenCalledWith('comment-1', 'admin-1', '🎉')
      expect(result).toEqual({ id: 'comment-1', reactions: {} })
    })
  })
})
