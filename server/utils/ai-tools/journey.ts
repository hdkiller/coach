import { tool } from 'ai'
import { z } from 'zod'
import { journeyService } from '../services/journeyService'
import { getUserTimezone } from '../date'
import { JourneyEventType, JourneyEventCategory } from '@prisma/client'

export const journeyTools = (userId: string, timezone: string) => ({
  record_wellness_event: tool({
    description:
      'Record a subjective wellness event, symptom, or recovery note (e.g., GI distress, muscle pain, fatigue). This tool performs a metabolic Root Cause Analysis (RCA) to explain why the user might be feeling this way.',
    inputSchema: z.object({
      timestamp: z
        .string()
        .optional()
        .describe('ISO timestamp or time string (HH:mm) of the event. Defaults to now.'),
      event_type: z
        .nativeEnum(JourneyEventType)
        .describe('The type of event (SYMPTOM, WELLNESS_CHECK, RECOVERY_NOTE)'),
      category: z
        .nativeEnum(JourneyEventCategory)
        .describe(
          'The category of the feeling (GI_DISTRESS, MUSCLE_PAIN, FATIGUE, SLEEP, MOOD, etc.)'
        ),
      severity: z
        .number()
        .min(1)
        .max(10)
        .describe('The severity of the symptom from 1 (mild) to 10 (extreme)'),
      description: z.string().optional().describe('Raw user description of the feeling')
    }),
    execute: async ({ timestamp, event_type, category, severity, description }) => {
      let eventTime = new Date()
      if (timestamp) {
        if (timestamp.includes('T')) {
          eventTime = new Date(timestamp)
        } else if (/^\d{1,2}:\d{2}/.test(timestamp)) {
          // Handle HH:mm
          const parts = timestamp.split(':').map(Number)
          const h = parts[0]
          const m = parts[1]
          if (h !== undefined && m !== undefined) {
            eventTime.setHours(h, m, 0, 0)
          }
        }
      }

      const result = await journeyService.recordEvent({
        userId,
        timestamp: eventTime,
        eventType: event_type,
        category,
        severity,
        description
      })

      return {
        message: `Successfully logged ${category.toLowerCase()} event.`,
        event: {
          id: result.event.id,
          timestamp: result.event.timestamp,
          category: result.event.category,
          severity: result.event.severity
        },
        analysis: result.rca,
        remediation: result.remediation
      }
    }
  }),

  get_wellness_events: tool({
    description:
      'Retrieve a list of logged wellness events (symptoms, notes, checks) for a specific date range. Use this when the user asks "What did I log recently?" or "When did I last have GI distress?".',
    inputSchema: z.object({
      start_date: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
      end_date: z
        .string()
        .optional()
        .describe('End date in ISO format (YYYY-MM-DD). Defaults to start_date'),
      category: z
        .nativeEnum(JourneyEventCategory)
        .optional()
        .describe('Filter by specific category')
    }),
    execute: async ({ start_date, end_date, category }) => {
      const start = new Date(`${start_date}T00:00:00Z`)
      const end = end_date ? new Date(`${end_date}T23:59:59Z`) : new Date(`${start_date}T23:59:59Z`)

      const events = await prisma.athleteJourneyEvent.findMany({
        where: {
          userId,
          timestamp: {
            gte: start,
            lte: end
          },
          ...(category ? { category } : {})
        },
        orderBy: { timestamp: 'desc' }
      })

      if (events.length === 0) {
        return { message: 'No wellness events found for the specified criteria.' }
      }

      return {
        count: events.length,
        events: events.map((e) => ({
          id: e.id,
          timestamp: e.timestamp,
          event_type: e.eventType,
          category: e.category,
          severity: e.severity,
          description: e.description,
          metabolic_snapshot: e.metabolicSnapshot
        }))
      }
    }
  }),

  update_wellness_event: tool({
    description:
      'Update an existing wellness event. Use this if the user wants to correct a mistake (e.g., "I meant severity 8, not 5") or add more details.',
    inputSchema: z.object({
      id: z.string().describe('The UUID of the event to update'),
      category: z.nativeEnum(JourneyEventCategory).optional(),
      severity: z.number().min(1).max(10).optional(),
      description: z.string().optional(),
      timestamp: z.string().optional().describe('ISO timestamp or time string (HH:mm)')
    }),
    execute: async ({ id, category, severity, description, timestamp }) => {
      const existing = await prisma.athleteJourneyEvent.findUnique({
        where: { id, userId }
      })

      if (!existing) {
        return { error: 'Event not found or unauthorized.' }
      }

      let eventTime = existing.timestamp
      if (timestamp) {
        if (timestamp.includes('T')) {
          eventTime = new Date(timestamp)
        } else if (/^\d{1,2}:\d{2}/.test(timestamp)) {
          const parts = timestamp.split(':').map(Number)
          const h = parts[0]
          const m = parts[1]
          if (h !== undefined && m !== undefined) {
            eventTime = new Date(existing.timestamp)
            eventTime.setHours(h, m, 0, 0)
          }
        }
      }

      const updated = await prisma.athleteJourneyEvent.update({
        where: { id },
        data: {
          category: category ?? undefined,
          severity: severity ?? undefined,
          description: description ?? undefined,
          timestamp: eventTime
        }
      })

      return {
        message: 'Successfully updated wellness event.',
        event: {
          id: updated.id,
          category: updated.category,
          severity: updated.severity,
          timestamp: updated.timestamp
        }
      }
    }
  }),

  delete_wellness_event: tool({
    description:
      'Delete a wellness event. Use this if the user says "Remove that note" or "I didn\'t mean to log that".',
    inputSchema: z.object({
      id: z.string().describe('The UUID of the event to delete')
    }),
    execute: async ({ id }) => {
      const existing = await prisma.athleteJourneyEvent.findUnique({
        where: { id, userId }
      })

      if (!existing) {
        return { error: 'Event not found or unauthorized.' }
      }

      await prisma.athleteJourneyEvent.delete({
        where: { id }
      })

      return { message: 'Successfully deleted wellness event.' }
    }
  })
})
