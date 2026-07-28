import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { timeTools } from '../../../../../server/utils/ai-tools/time'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    plannedWorkout: { findMany: vi.fn() }
  }
}))

describe('CW-193: get_current_time must reflect the athlete configured timezone', () => {
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([])
    // Wednesday, Feb 11, 2026, 14:30 UTC => 09:30 AM in America/New_York (EST, UTC-5)
    vi.setSystemTime(new Date('2026-02-11T14:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the New York local clock, not the UTC clock', async () => {
    const tools = timeTools(userId, 'America/New_York')
    const result = await tools.get_current_time.execute({}, {
      toolCallId: '1',
      messages: []
    } as any)

    expect(result.timezone).toBe('America/New_York')
    expect(result.local_date).toBe('2026-02-11')
    expect(result.local_time).toBe('09:30')
    expect(result.hour_24).toBe(9)
    expect(result.time_of_day).toBe('morning')
    expect(result.local_formatted).toContain('Wednesday, February 11, 2026 9:30 AM')

    // This is the assertion that must fail if UTC were substituted for the
    // configured timezone: at 14:30 UTC the (wrong) UTC-based reading would be
    // hour 14 / "afternoon", not hour 9 / "morning".
    expect(result.hour_24).not.toBe(14)
    expect(result.time_of_day).not.toBe('afternoon')
  })

  it('returns a different local clock for a different configured timezone', async () => {
    const tools = timeTools(userId, 'Asia/Tokyo')
    const result = await tools.get_current_time.execute({}, {
      toolCallId: '1',
      messages: []
    } as any)

    // 14:30 UTC => 23:30 in Asia/Tokyo (UTC+9) on the same calendar day.
    expect(result.timezone).toBe('Asia/Tokyo')
    expect(result.local_date).toBe('2026-02-11')
    expect(result.local_time).toBe('23:30')
    expect(result.hour_24).toBe(23)
    expect(result.time_of_day).toBe('late night')
  })
})
