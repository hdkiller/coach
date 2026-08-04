import { getServerSession } from '../../../utils/session'
import { z } from 'zod'

const schema = z.object({
  taskName: z.string()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input' })
  }

  try {
    const taskResult = await runTask(result.data.taskName)
    return { success: true, result: taskResult }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Task execution failed',
      data: error.message
    })
  }
})
