import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'

const saveDashboardSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  layout: z.array(z.any()),
  order: z.number().int().min(0).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  
  const result = saveDashboardSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid dashboard data'
    })
  }

  const { id, name, layout, order } = result.data

  try {
    if (id) {
      const existingDashboard = await prisma.dashboard.findFirst({
        where: {
          id,
          ownerId: user.id
        },
        select: { id: true }
      })

      if (!existingDashboard) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Dashboard not found'
        })
      }

      return await prisma.dashboard.update({
        where: { id },
        data: {
          name,
          layout,
          order: order !== undefined ? order : undefined
        }
      })
    }

    const existingDefaultDashboard = await prisma.dashboard.findFirst({
      where: {
        ownerId: user.id,
        name
      },
      orderBy: { createdAt: 'asc' }
    })

    const dashboard = existingDefaultDashboard
      ? await prisma.dashboard.update({
          where: { id: existingDefaultDashboard.id },
          data: {
            layout,
            order: order !== undefined ? order : undefined
          }
        })
      : await prisma.dashboard.create({
          data: {
            name,
            layout,
            ownerId: user.id,
            order: order || 0
          }
        })

    return dashboard
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[DashboardSave] Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save dashboard',
      message: error.message
    })
  }
})
