import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { journeyTools } from '../../../../../server/utils/ai-tools/journey'
import { journeyService } from '../../../../../server/utils/services/journeyService'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/services/journeyService', () => ({
  journeyService: {
    recordEvent: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    athleteJourneyEvent: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}))

describe('journeyTools', () => {
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('record_wellness_event', () => {
    it('defaults to now when no timestamp is provided', async () => {
      const now = new Date('2026-07-28T12:00:00Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      const tools = journeyTools(userId, 'UTC')
      vi.mocked(journeyService.recordEvent).mockResolvedValue({
        event: { id: 'e1', timestamp: now, category: 'FATIGUE', severity: 5 },
        rca: null,
        remediation: null
      } as any)

      await tools.record_wellness_event.execute(
        {
          event_type: 'WELLNESS_CHECK',
          category: 'FATIGUE',
          severity: 5
        } as any,
        { toolCallId: '1', messages: [] }
      )

      expect(journeyService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ userId, timestamp: now })
      )
    })

    it('passes through an absolute ISO timestamp unchanged', async () => {
      const tools = journeyTools(userId, 'America/Los_Angeles')
      vi.mocked(journeyService.recordEvent).mockResolvedValue({
        event: { id: 'e1', timestamp: new Date(), category: 'FATIGUE', severity: 5 },
        rca: null,
        remediation: null
      } as any)

      await tools.record_wellness_event.execute(
        {
          timestamp: '2026-07-15T09:00:00Z',
          event_type: 'WELLNESS_CHECK',
          category: 'FATIGUE',
          severity: 5
        } as any,
        { toolCallId: '1', messages: [] }
      )

      expect(journeyService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ timestamp: new Date('2026-07-15T09:00:00Z') })
      )
    })

    it('anchors an HH:mm timestamp to the athlete local "today", not server/UTC time', async () => {
      // "Now" is 2026-07-28T03:00:00Z, which is already 2026-07-28 in UTC but
      // still the evening of 2026-07-27 in America/Los_Angeles (PDT, UTC-7).
      // A bare "22:00" should be interpreted as 22:00 on the athlete's local
      // calendar day (2026-07-27), not on the server/UTC calendar day.
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-28T03:00:00Z'))

      const tools = journeyTools(userId, 'America/Los_Angeles')
      vi.mocked(journeyService.recordEvent).mockResolvedValue({
        event: { id: 'e1', timestamp: new Date(), category: 'SLEEP', severity: 3 },
        rca: null,
        remediation: null
      } as any)

      await tools.record_wellness_event.execute(
        {
          timestamp: '22:00',
          event_type: 'RECOVERY_NOTE',
          category: 'SLEEP',
          severity: 3
        } as any,
        { toolCallId: '1', messages: [] }
      )

      // 2026-07-27T22:00 local (PDT, UTC-7) => 2026-07-28T05:00:00Z
      expect(journeyService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ timestamp: new Date('2026-07-28T05:00:00.000Z') })
      )
    })
  })

  describe('get_wellness_events', () => {
    it('should search across the full local day (UTC timezone) for a single date', async () => {
      const tools = journeyTools(userId, 'UTC')
      vi.mocked(prisma.athleteJourneyEvent.findMany).mockResolvedValue([])

      await tools.get_wellness_events.execute(
        { start_date: '2025-07-29' },
        { toolCallId: '1', messages: [] }
      )

      expect(prisma.athleteJourneyEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            timestamp: {
              gte: new Date('2025-07-29T00:00:00.000Z'),
              lte: new Date('2025-07-29T23:59:59.999Z')
            }
          })
        })
      )
    })

    it('should use athlete local-day boundaries (not raw UTC) when timezone is behind UTC', async () => {
      // America/Los_Angeles is UTC-7 in late July (PDT). An event recorded
      // late on the LA calendar day 2025-07-29 lands on 2025-07-30 in UTC, so
      // the query window must extend past raw UTC midnight of 2025-07-29 to
      // capture it.
      const tools = journeyTools(userId, 'America/Los_Angeles')
      vi.mocked(prisma.athleteJourneyEvent.findMany).mockResolvedValue([])

      await tools.get_wellness_events.execute(
        { start_date: '2025-07-29' },
        { toolCallId: '1', messages: [] }
      )

      expect(prisma.athleteJourneyEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: new Date('2025-07-29T07:00:00.000Z'),
              lte: new Date('2025-07-30T06:59:59.999Z')
            }
          })
        })
      )
    })
  })

  describe('update_wellness_event', () => {
    it('returns an error when the event is not found', async () => {
      const tools = journeyTools(userId, 'UTC')
      vi.mocked(prisma.athleteJourneyEvent.findUnique).mockResolvedValue(null)

      const result = await tools.update_wellness_event.execute(
        { id: 'missing' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({ error: 'Event not found or unauthorized.' })
    })

    it('anchors an HH:mm timestamp update to the event local calendar day, not raw UTC', async () => {
      // existing.timestamp (2026-07-16T05:00:00Z) is 2026-07-15T22:00 local
      // in America/Los_Angeles (PDT, UTC-7) -- i.e. already "the 16th" in
      // UTC but still "the 15th" locally. Updating the time-of-day must
      // preserve the athlete's local day (the 15th), not the server/UTC day.
      const tools = journeyTools(userId, 'America/Los_Angeles')
      const existing = {
        id: 'evt-1',
        userId,
        timestamp: new Date('2026-07-16T05:00:00Z'),
        category: 'SLEEP',
        severity: 4
      }
      vi.mocked(prisma.athleteJourneyEvent.findUnique).mockResolvedValue(existing as any)
      vi.mocked(prisma.athleteJourneyEvent.update).mockResolvedValue({
        ...existing,
        timestamp: new Date('2026-07-15T13:30:00.000Z')
      } as any)

      await tools.update_wellness_event.execute(
        { id: 'evt-1', timestamp: '06:30' },
        { toolCallId: '1', messages: [] }
      )

      // 2026-07-15T06:30 local (PDT, UTC-7) => 2026-07-15T13:30:00Z
      expect(prisma.athleteJourneyEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt-1' },
          data: expect.objectContaining({
            timestamp: new Date('2026-07-15T13:30:00.000Z')
          })
        })
      )
    })
  })

  describe('delete_wellness_event', () => {
    it('deletes an existing event', async () => {
      const tools = journeyTools(userId, 'UTC')
      vi.mocked(prisma.athleteJourneyEvent.findUnique).mockResolvedValue({
        id: 'evt-1',
        userId
      } as any)
      vi.mocked(prisma.athleteJourneyEvent.delete).mockResolvedValue({} as any)

      const result = await tools.delete_wellness_event.execute(
        { id: 'evt-1' },
        { toolCallId: '1', messages: [] }
      )

      expect(prisma.athleteJourneyEvent.delete).toHaveBeenCalledWith({ where: { id: 'evt-1' } })
      expect(result).toEqual({ message: 'Successfully deleted wellness event.' })
    })
  })
})
