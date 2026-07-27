import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

import { setQuotaHeaders } from '../../../../server/utils/quotas/http'
import type { QuotaStatus } from '~~/app/types/quotas'

const headers = new Map<string, unknown>()

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    setHeader: (_event: H3Event, name: string, value: unknown) => headers.set(name, value)
  }
})

function status(overrides: Partial<QuotaStatus> = {}): QuotaStatus {
  return {
    operation: 'workout_analysis',
    allowed: true,
    used: 4,
    limit: 6,
    remaining: 2,
    window: '7 days',
    resetsAt: new Date('2026-03-15T00:00:00.000Z'),
    enforcement: 'STRICT',
    ...overrides
  }
}

describe('setQuotaHeaders', () => {
  beforeEach(() => {
    headers.clear()
  })

  it('publishes the athlete’s standing alongside a successful response', () => {
    setQuotaHeaders({} as H3Event, status())

    expect(Object.fromEntries(headers)).toEqual({
      'X-Quota-Feature': 'ACTIVITY_ANALYSIS',
      'X-Quota-Operation': 'workout_analysis',
      'X-Quota-Limit': '6',
      'X-Quota-Used': '4',
      'X-Quota-Remaining': '2',
      'X-Quota-Reset': '2026-03-15T00:00:00.000Z'
    })
  })

  it('omits the feature header for operations with no client feature', () => {
    setQuotaHeaders({} as H3Event, status({ operation: 'goal_review' }))

    expect(headers.has('X-Quota-Feature')).toBe(false)
    expect(headers.get('X-Quota-Operation')).toBe('goal_review')
  })

  it('omits the reset header when the window has no known end', () => {
    setQuotaHeaders({} as H3Event, status({ resetsAt: null }))

    expect(headers.has('X-Quota-Reset')).toBe(false)
    expect(headers.get('X-Quota-Remaining')).toBe('2')
  })

  it('accepts a pre-serialised reset timestamp', () => {
    setQuotaHeaders({} as H3Event, status({ resetsAt: '2026-04-01T10:00:00.000Z' }))

    expect(headers.get('X-Quota-Reset')).toBe('2026-04-01T10:00:00.000Z')
  })
})
