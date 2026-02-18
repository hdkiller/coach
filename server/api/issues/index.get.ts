import { getServerSession } from '../../utils/session'
import { issuesRepository } from '../../utils/repositories/issuesRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = session.user.id

  const { items } = await issuesRepository.list({ userId })

  return items
})
