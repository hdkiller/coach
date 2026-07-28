import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../../server/utils/db'
import { issuesRepository } from '../../../../../server/utils/repositories/issuesRepository'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    bugReport: {
      findUnique: vi.fn()
    },
    bugReportComment: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    llmUsage: {
      aggregate: vi.fn()
    }
  }
}))

describe('issuesRepository.getById comment visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.bugReport.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.bugReportComment.findFirst).mockResolvedValue(null)
  })

  it('filters internal notes when no user ID or admin context is supplied', async () => {
    await issuesRepository.getById('issue-1')

    expect(prisma.bugReport.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          comments: expect.objectContaining({ where: { type: 'MESSAGE' } })
        })
      })
    )
  })

  it('includes internal notes only with an explicit admin context', async () => {
    await issuesRepository.getById('issue-1', undefined, true)

    expect(prisma.bugReport.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          comments: expect.objectContaining({ where: undefined })
        })
      })
    )
  })
})

describe('issuesRepository comment mutation scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.bugReportComment.findFirst).mockResolvedValue(null)
  })

  it('binds reaction lookup to both the issue and comment IDs', async () => {
    await expect(
      issuesRepository.toggleReaction('issue-1', 'comment-1', 'user-1', '👍')
    ).resolves.toBeNull()

    expect(prisma.bugReportComment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'comment-1', bugReportId: 'issue-1' } })
    )
    expect(prisma.bugReportComment.update).not.toHaveBeenCalled()
  })

  it('binds acknowledgement lookup to both the issue and comment IDs', async () => {
    await expect(
      issuesRepository.acknowledgeComment('issue-1', 'comment-1', 'user-1')
    ).resolves.toBeNull()

    expect(prisma.bugReportComment.findFirst).toHaveBeenCalledWith({
      where: { id: 'comment-1', bugReportId: 'issue-1' },
      select: { id: true }
    })
    expect(prisma.bugReportComment.update).not.toHaveBeenCalled()
  })
})
