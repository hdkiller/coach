import { getServerSession } from '../../../utils/session'
import { issuesRepository } from '../../../utils/repositories/issuesRepository'
import { z } from 'zod'
import { BugStatus } from '@prisma/client'
import { createUserNotification } from '../../../utils/notifications'

const updateSchema = z.object({
  status: z.nativeEnum(BugStatus).optional(),
  priority: z.string().optional(),
  metadata: z.any().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const body = await readBody(event)
  const result = updateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.flatten()
    })
  }

  try {
    const report = await issuesRepository.update(id, result.data)

    // Notify user about status change if status was updated
    if (result.data.status && report) {
      await createUserNotification(report.userId, {
        title: 'Issue Updated',
        message: `Your issue "${report.title}" status is now ${report.status}.`,
        icon: 'i-heroicons-bug-ant',
        link: `/issues/${report.id}`
      })
    }

    return report
  } catch (error: any) {
    throw createError({ statusCode: 404, statusMessage: 'Bug report not found' })
  }
})
