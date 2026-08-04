import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

const defaultTasks = [
  {
    taskName: 'telegram:morning-summary',
    displayName: 'Daily Morning Athlete Summary',
    cronExpression: '0 7 * * *'
  },
  {
    taskName: 'telegram:evening-reminder',
    displayName: 'Evening Check-In Reminder',
    cronExpression: '0 19 * * *'
  },
  {
    taskName: 'telegram:weekend-race-broadcast',
    displayName: 'Friday Race Broadcast',
    cronExpression: '0 17 * * 5'
  }
]

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  let configs = await prisma.scheduledTaskConfig.findMany({
    orderBy: { createdAt: 'asc' }
  })

  // Auto-seed if empty or missing tasks
  const missingTasks = defaultTasks.filter((dt) => !configs.some((c) => c.taskName === dt.taskName))

  if (missingTasks.length > 0) {
    await prisma.scheduledTaskConfig.createMany({
      data: missingTasks
    })

    // Refetch
    configs = await prisma.scheduledTaskConfig.findMany({
      orderBy: { createdAt: 'asc' }
    })
  }

  return configs
})
