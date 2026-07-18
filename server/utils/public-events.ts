import type { PublicEvent } from '@prisma/client'
import { prisma } from './db'
import { isValidSlug, normalizeSlug } from '../../shared/slug'

export const PUBLIC_EVENT_SOURCE = 'coachwatts_catalog'

export type PublicEventPublicView = {
  slug: string
  title: string
  description: string | null
  organizerName: string
  date: string
  timezone: string
  startTime: string | null
  type: string | null
  subType: string | null
  distance: number | null
  elevation: number | null
  expectedDuration: number | null
  terrain: string | null
  city: string | null
  country: string | null
  location: string | null
  isVirtual: boolean
  websiteUrl: string | null
  registrationUrl: string | null
  imageUrl: string | null
  publicUrl: string
}

export type PublicEventJoinResult = {
  status: 'JOINED' | 'ALREADY_JOINED'
  event: { id: string; title: string; date: string }
  goal: { id: string; title: string; priority: string; phase: string | null }
  message: string
}

export function normalizePublicEventSlug(slug: string): string {
  return normalizeSlug(slug)
}

export function assertValidPublicEventSlug(slug: string): string {
  const normalized = normalizePublicEventSlug(slug)
  if (!normalized || !isValidSlug(normalized)) {
    throw createError({ statusCode: 400, message: 'Invalid event slug' })
  }
  return normalized
}

export function toPublicEventPublicView(event: PublicEvent): PublicEventPublicView {
  return {
    slug: event.slug,
    title: event.title,
    description: event.description,
    organizerName: event.organizerName,
    date: event.date.toISOString(),
    timezone: event.timezone,
    startTime: event.startTime,
    type: event.type,
    subType: event.subType,
    distance: event.distance,
    elevation: event.elevation,
    expectedDuration: event.expectedDuration,
    terrain: event.terrain,
    city: event.city,
    country: event.country,
    location: event.location,
    isVirtual: event.isVirtual,
    websiteUrl: event.websiteUrl,
    registrationUrl: event.registrationUrl,
    imageUrl: event.imageUrl,
    publicUrl: `/events/${event.slug}`
  }
}

export async function getPublicEventBySlug(slug: string) {
  return prisma.publicEvent.findUnique({
    where: { slug: assertValidPublicEventSlug(slug) }
  })
}

export async function getPublishedPublicEventBySlug(slug: string) {
  const event = await getPublicEventBySlug(slug)
  if (!event || !event.isPublished) return null
  return event
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/** Published catalog events for the public directory (upcoming by default). */
export async function listPublishedPublicEvents(options: { includePast?: boolean } = {}) {
  const where: { isPublished: true; date?: { gte: Date } } = { isPublished: true }
  if (!options.includePast) {
    where.date = { gte: startOfUtcDay() }
  }

  const events = await prisma.publicEvent.findMany({
    where,
    orderBy: [{ date: 'asc' }, { title: 'asc' }]
  })

  return events.map(toPublicEventPublicView)
}

export async function getPublishedCampaignEvents(campaignId: string) {
  const links = await prisma.partnerCampaignEvent.findMany({
    where: {
      campaignId,
      publicEvent: { isPublished: true }
    },
    orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
    include: { publicEvent: true }
  })

  return links.map((link) => ({
    id: link.publicEvent.id,
    ...toPublicEventPublicView(link.publicEvent),
    isPrimary: link.isPrimary,
    displayOrder: link.displayOrder
  }))
}

export async function getUserEnrollmentForPublicEvent(userId: string, publicEventId: string) {
  const userEvent = await prisma.event.findUnique({
    where: {
      userId_source_externalId: {
        userId,
        source: PUBLIC_EVENT_SOURCE,
        externalId: publicEventId
      }
    },
    include: {
      goals: {
        where: { userId, type: 'EVENT', status: { not: 'ARCHIVED' } },
        select: { id: true, title: true, priority: true, phase: true, status: true },
        take: 1
      }
    }
  })

  if (!userEvent) {
    return { enrolled: false as const, eventId: null, goalId: null }
  }

  const goal = userEvent.goals[0] ?? null
  return {
    enrolled: Boolean(goal),
    eventId: userEvent.id,
    goalId: goal?.id ?? null,
    goal: goal
      ? {
          id: goal.id,
          title: goal.title,
          priority: goal.priority,
          phase: goal.phase
        }
      : null
  }
}

export async function joinPublicEventAsGoal(
  userId: string,
  slug: string,
  options: { priority?: 'LOW' | 'MEDIUM' | 'HIGH'; phase?: string | null } = {}
): Promise<PublicEventJoinResult> {
  const publicEvent = await getPublishedPublicEventBySlug(slug)
  if (!publicEvent) {
    throw createError({ statusCode: 404, message: 'Public event not found' })
  }

  const priority = options.priority ?? 'HIGH'
  const phase = options.phase ?? 'BUILD'

  return prisma.$transaction(async (tx) => {
    const userEvent = await tx.event.upsert({
      where: {
        userId_source_externalId: {
          userId,
          source: PUBLIC_EVENT_SOURCE,
          externalId: publicEvent.id
        }
      },
      update: {
        title: publicEvent.title,
        description: publicEvent.description,
        date: publicEvent.date,
        type: publicEvent.type,
        subType: publicEvent.subType,
        distance: publicEvent.distance,
        elevation: publicEvent.elevation,
        expectedDuration: publicEvent.expectedDuration,
        terrain: publicEvent.terrain,
        city: publicEvent.city,
        country: publicEvent.country,
        location: publicEvent.location,
        isVirtual: publicEvent.isVirtual,
        websiteUrl: publicEvent.websiteUrl,
        startTime: publicEvent.startTime,
        syncStatus: 'SYNCED'
      },
      create: {
        userId,
        source: PUBLIC_EVENT_SOURCE,
        externalId: publicEvent.id,
        title: publicEvent.title,
        description: publicEvent.description,
        date: publicEvent.date,
        type: publicEvent.type,
        subType: publicEvent.subType,
        distance: publicEvent.distance,
        elevation: publicEvent.elevation,
        expectedDuration: publicEvent.expectedDuration,
        terrain: publicEvent.terrain,
        city: publicEvent.city,
        country: publicEvent.country,
        location: publicEvent.location,
        isVirtual: publicEvent.isVirtual,
        websiteUrl: publicEvent.websiteUrl,
        startTime: publicEvent.startTime,
        isPublic: false,
        syncStatus: 'SYNCED'
      },
      include: {
        goals: {
          where: { userId, type: 'EVENT', status: { not: 'ARCHIVED' } },
          take: 1
        }
      }
    })

    const existingGoal = userEvent.goals[0]
    if (existingGoal) {
      return {
        status: 'ALREADY_JOINED' as const,
        event: {
          id: userEvent.id,
          title: userEvent.title,
          date: userEvent.date.toISOString()
        },
        goal: {
          id: existingGoal.id,
          title: existingGoal.title,
          priority: existingGoal.priority,
          phase: existingGoal.phase
        },
        message: 'Already in your Coach Watts goals'
      }
    }

    const goal = await tx.goal.create({
      data: {
        userId,
        type: 'EVENT',
        title: publicEvent.title,
        description:
          publicEvent.description ||
          `Training preparation for ${publicEvent.title}. This is a Coach Watts training goal, not official race registration.`,
        targetDate: publicEvent.date,
        priority,
        phase,
        aiContext: `Goal: ${publicEvent.title}. Type: EVENT. Organizer: ${publicEvent.organizerName}. Source: coachwatts_catalog.`,
        events: { connect: { id: userEvent.id } }
      }
    })

    return {
      status: 'JOINED' as const,
      event: {
        id: userEvent.id,
        title: userEvent.title,
        date: userEvent.date.toISOString()
      },
      goal: {
        id: goal.id,
        title: goal.title,
        priority: goal.priority,
        phase: goal.phase
      },
      message: 'Event added to your Coach Watts training goals'
    }
  })
}
