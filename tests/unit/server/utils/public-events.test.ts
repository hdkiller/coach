import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicEvent } from '@prisma/client'

import { prisma } from '../../../../server/utils/db'
import {
  getPublishedCampaignEvents,
  joinPublicEventAsGoal,
  normalizePublicEventSlug,
  toPublicEventPublicView
} from '../../../../server/utils/public-events'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    publicEvent: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    event: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    goal: {
      create: vi.fn()
    },
    partnerCampaignEvent: {
      findMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}))

vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  ;(error as any).data = err.data
  return error
})

const baseEvent: PublicEvent = {
  id: 'public-1',
  slug: 'pilis-kupa-2026',
  title: 'XIX. Pilis Kupa – 2. forduló',
  description: 'Hill climb TT',
  organizerName: 'Esztergomi Küllőszaggatók Kerékpár Egyesület',
  date: new Date('2026-09-27T12:00:00.000Z'),
  timezone: 'Europe/Budapest',
  startTime: '10:00',
  type: 'CYCLING',
  subType: 'Hill Climb Time Trial',
  distance: 12.5,
  elevation: 450,
  expectedDuration: null,
  terrain: 'hilly',
  city: 'Esztergom',
  country: 'HU',
  location: 'Esztergom',
  isVirtual: false,
  websiteUrl: 'https://example.com',
  registrationUrl: 'https://example.com/register',
  imageUrl: null,
  isPublished: true,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z')
}

describe('public events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes public event slugs', () => {
    expect(normalizePublicEventSlug('Pilis Kupa 2026')).toBe('pilis-kupa-2026')
  })

  it('maps only approved public fields', () => {
    const view = toPublicEventPublicView(baseEvent)
    expect(view.slug).toBe('pilis-kupa-2026')
    expect(view.publicUrl).toBe('/events/pilis-kupa-2026')
    expect(view.registrationUrl).toBe('https://example.com/register')
    expect((view as any).id).toBeUndefined()
  })

  it('lists published upcoming events', async () => {
    vi.mocked(prisma.publicEvent.findMany).mockResolvedValue([baseEvent])
    const { listPublishedPublicEvents } = await import('../../../../server/utils/public-events')
    const events = await listPublishedPublicEvents()
    expect(prisma.publicEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true, date: expect.any(Object) }),
        orderBy: [{ date: 'asc' }, { title: 'asc' }]
      })
    )
    expect(events).toHaveLength(1)
    expect(events[0]?.slug).toBe('pilis-kupa-2026')
  })

  it('returns only published campaign events', async () => {
    vi.mocked(prisma.partnerCampaignEvent.findMany).mockResolvedValue([
      {
        isPrimary: true,
        displayOrder: 0,
        publicEvent: baseEvent
      }
    ] as any)

    const events = await getPublishedCampaignEvents('campaign-1')
    expect(events).toHaveLength(1)
    expect(events[0]?.slug).toBe('pilis-kupa-2026')
    expect(events[0]?.isPrimary).toBe(true)
  })

  it('rejects unpublished events on join', async () => {
    vi.mocked(prisma.publicEvent.findUnique).mockResolvedValue({
      ...baseEvent,
      isPublished: false
    })

    await expect(joinPublicEventAsGoal('user-1', 'pilis-kupa-2026')).rejects.toMatchObject({
      statusCode: 404
    })
  })

  it('joins idempotently without duplicate goals', async () => {
    vi.mocked(prisma.publicEvent.findUnique).mockResolvedValue(baseEvent)
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
      callback({
        event: {
          upsert: vi.fn().mockResolvedValue({
            id: 'user-event-1',
            title: baseEvent.title,
            date: baseEvent.date,
            goals: [
              {
                id: 'goal-1',
                title: baseEvent.title,
                priority: 'HIGH',
                phase: 'BUILD'
              }
            ]
          })
        },
        goal: {
          create: vi.fn()
        }
      })
    )

    const result = await joinPublicEventAsGoal('user-1', 'pilis-kupa-2026')
    expect(result.status).toBe('ALREADY_JOINED')
    expect(result.goal.id).toBe('goal-1')
  })

  it('creates user-owned event and EVENT goal transactionally', async () => {
    vi.mocked(prisma.publicEvent.findUnique).mockResolvedValue(baseEvent)
    const createGoal = vi.fn().mockResolvedValue({
      id: 'goal-new',
      title: baseEvent.title,
      priority: 'HIGH',
      phase: 'BUILD'
    })
    const upsertEvent = vi.fn().mockResolvedValue({
      id: 'user-event-2',
      title: baseEvent.title,
      date: baseEvent.date,
      goals: []
    })

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
      callback({
        event: { upsert: upsertEvent },
        goal: { create: createGoal }
      })
    )

    const result = await joinPublicEventAsGoal('user-2', 'pilis-kupa-2026', {
      priority: 'HIGH',
      phase: 'BUILD'
    })

    expect(result.status).toBe('JOINED')
    expect(upsertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_source_externalId: {
            userId: 'user-2',
            source: 'coachwatts_catalog',
            externalId: 'public-1'
          }
        }
      })
    )
    expect(createGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'EVENT',
          userId: 'user-2'
        })
      })
    )
  })
})
