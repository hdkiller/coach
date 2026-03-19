import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { z } from 'zod'

const createPlanTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  strategy: z.string().default('LINEAR')
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = session.user.id
  const body = await readBody(event)

  const validation = createPlanTemplateSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const { name, description, strategy } = validation.data

  // Create plan with one default block and one week
  const plan = await (prisma as any).trainingPlan.create({
    data: {
      userId,
      name,
      description,
      strategy,
      isTemplate: true,
      visibility: 'PRIVATE',
      accessState: 'PRIVATE',
      status: 'ACTIVE', // Blueprints are always "Active" in the library
      blocks: {
        create: {
          name: 'Base Phase',
          order: 1,
          type: 'BASE',
          primaryFocus: 'AEROBIC_ENDURANCE',
          durationWeeks: 4,
          startDate: new Date(0),
          weeks: {
            create: [
              {
                weekNumber: 1,
                volumeTargetMinutes: 300,
                tssTarget: 200,
                startDate: new Date(0),
                endDate: new Date(0)
              },
              {
                weekNumber: 2,
                volumeTargetMinutes: 330,
                tssTarget: 220,
                startDate: new Date(0),
                endDate: new Date(0)
              },
              {
                weekNumber: 3,
                volumeTargetMinutes: 360,
                tssTarget: 250,
                startDate: new Date(0),
                endDate: new Date(0)
              },
              {
                weekNumber: 4,
                volumeTargetMinutes: 240,
                tssTarget: 150,
                isRecovery: true,
                startDate: new Date(0),
                endDate: new Date(0)
              }
            ]
          }
        }
      }
    }
  })

  return plan
})
