import { getServerSession } from '../../../../utils/session'
import { issuesRepository } from '../../../../utils/repositories/issuesRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing User ID' })
  }

  const { items } = await issuesRepository.list({ userId }, 1, 50)

  return items
})
