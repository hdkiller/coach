import { getServerSession } from '#auth'
import { tasks } from "@trigger.dev/sdk/v3";

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const body = await readBody(event)
  const { provider } = body
  
  if (!provider || !['intervals', 'whoop'].includes(provider)) {
    throw createError({ 
      statusCode: 400,
      message: 'Invalid provider. Must be "intervals" or "whoop"' 
    })
  }
  
  // Check if integration exists
  const integration = await prisma.integration.findUnique({
    where: {
      userId_provider: {
        userId: (session.user as any).id,
        provider
      }
    }
  })
  
  if (!integration) {
    throw createError({ 
      statusCode: 404,
      message: `${provider} integration not found. Please connect your account first.` 
    })
  }
  
  // Calculate date range
  // For Intervals: last 90 days + next 30 days (to capture future planned workouts)
  // For Whoop: last 90 days only
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const endDate = provider === 'intervals'
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // +30 days for planned workouts
    : new Date()  // Today for Whoop
  
  // Trigger the appropriate job
  const taskId = provider === 'intervals' ? 'ingest-intervals' : 'ingest-whoop'
  
  try {
    console.log(`[Sync] Triggering task: ${taskId} for user: ${(session.user as any).id}`)
    console.log(`[Sync] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)
    
    const handle = await tasks.trigger(taskId, {
      userId: (session.user as any).id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })
    
    console.log(`[Sync] Task triggered successfully. Job ID: ${handle.id}`)
    
    return {
      success: true,
      jobId: handle.id,
      provider,
      message: `Started syncing ${provider} data`,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    }
  } catch (error) {
    console.error(`[Sync] Failed to trigger task:`, error)
    throw createError({
      statusCode: 500,
      message: `Failed to trigger sync: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure Trigger.dev dev server is running (pnpm dev:trigger)`
    })
  }
})