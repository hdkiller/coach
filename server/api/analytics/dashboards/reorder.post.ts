import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'

const reorderSchema = z.object({
  ids: z.array(z.string().uuid())
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  
  const result = reorderSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid reorder data'
    })
  }

  const { ids } = result.data

  try {
    // Perform updates in a transaction for atomicity
    await prisma.$transaction(
      ids.map((id, index) => 
        prisma.dashboard.update({
          where: { 
            id,
            ownerId: user.id // Security check
          },
          data: { order: index }
        })
      )
    )

    return { success: true }
  } catch (error: any) {
    console.error('[DashboardReorder] Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to reorder dashboards'
    })
  }
})
