import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'

const createWidgetSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  config: z.any()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  
  const result = createWidgetSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid widget configuration'
    })
  }

  let widget
  const isUpdate = Boolean(result.data.id)

  if (isUpdate) {
    const existingWidget = await prisma.widget.findFirst({
      where: {
        id: result.data.id,
        ownerId: user.id
      },
      select: { id: true }
    })

    if (!existingWidget) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Widget not found'
      })
    }

    widget = await prisma.widget.update({
      where: { id: result.data.id },
      data: {
        name: result.data.name,
        config: result.data.config
      }
    })
  } else {
    widget = await prisma.widget.create({
      data: {
        name: result.data.name,
        config: result.data.config,
        ownerId: user.id
      }
    })
  }

  setResponseStatus(event, isUpdate ? 200 : 201)
  return widget
})
