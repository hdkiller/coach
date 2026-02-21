import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { z } from 'zod'

const dayEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
])

const updateSchema = z.object({
  onboarding: z.boolean().optional(),
  workoutAnalysis: z.boolean().optional(),
  planUpdates: z.boolean().optional(),
  billing: z.boolean().optional(),
  productUpdates: z.boolean().optional(),
  retentionNudges: z.boolean().optional(),
  dailyCoach: z.boolean().optional(),
  dailyCoachTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  dailyCoachDays: z.array(dayEnum).optional(),
  marketing: z.boolean().optional(),
  globalUnsubscribe: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readValidatedBody(event, (b) => updateSchema.parse(b))

  const preferences = await prisma.emailPreference.upsert({
    where: {
      userId_channel: {
        userId: session.user.id,
        channel: 'EMAIL'
      }
    },
    update: {
      ...body,
      consentUpdatedAt: new Date()
    },
    create: {
      userId: session.user.id,
      ...body,
      consentUpdatedAt: new Date()
    }
  })

  return preferences
})
