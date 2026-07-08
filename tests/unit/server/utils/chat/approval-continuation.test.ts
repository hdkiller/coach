import { describe, expect, it } from 'vitest'
import { extractApprovalIdFromToolMessage } from '../../../../server/utils/chat/approval-continuation'

describe('approval continuation helpers', () => {
  it('extracts approval id from tool approval response parts', () => {
    expect(
      extractApprovalIdFromToolMessage({
        role: 'tool',
        parts: [
          {
            type: 'tool-approval-response',
            approvalId: 'approval-123',
            approved: true
          }
        ]
      })
    ).toBe('approval-123')
  })

  it('returns null when no approval response is present', () => {
    expect(
      extractApprovalIdFromToolMessage({
        role: 'tool',
        parts: [{ type: 'tool-result', toolCallId: 'call-1' }]
      })
    ).toBeNull()
  })
})
