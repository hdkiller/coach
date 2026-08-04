import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { z } from 'zod'

const schema = z.object({
  enabled: z.boolean().optional(),
  cronExpression: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id parameter' })
  }

  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input' })
  }

  const updated = await prisma.scheduledTaskConfig.update({
    where: { id },
    data: result.data
  })

  return updated
})
