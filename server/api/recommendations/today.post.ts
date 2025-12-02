import { getServerSession } from '#auth'
import { tasks } from '@trigger.dev/sdk/v3'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const userId = (session.user as any).id
  
  // Trigger background job
  const handle = await tasks.trigger('recommend-today-activity', {
    userId,
    date: new Date()
  })
  
  return {
    success: true,
    jobId: handle.id,
    message: 'Generating today\'s recommendation'
  }
})