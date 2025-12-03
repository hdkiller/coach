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
  
  const userId = (session.user as any).id
  
  try {
    // Find all workouts that need analysis
    const workoutsToAnalyze = await prisma.workout.findMany({
      where: {
        userId,
        OR: [
          { aiAnalysisStatus: null },
          { aiAnalysisStatus: 'NOT_STARTED' },
          { aiAnalysisStatus: 'PENDING' },
          { aiAnalysisStatus: 'FAILED' }
        ]
      },
      select: {
        id: true,
        title: true,
        date: true,
        aiAnalysisStatus: true
      },
      orderBy: {
        date: 'desc'
      }
    })
    
    if (workoutsToAnalyze.length === 0) {
      return {
        success: true,
        message: 'No workouts need analysis',
        total: 0,
        triggered: 0
      }
    }
    
    // Update all to PENDING status
    await prisma.workout.updateMany({
      where: {
        id: { in: workoutsToAnalyze.map(w => w.id) }
      },
      data: {
        aiAnalysisStatus: 'PENDING'
      }
    })
    
    // Trigger analysis jobs for each workout (Trigger.dev will handle concurrency limits)
    const triggerPromises = workoutsToAnalyze.map(async (workout) => {
      try {
        const handle = await tasks.trigger('analyze-workout', {
          workoutId: workout.id
        })
        return { success: true, workoutId: workout.id, jobId: handle.id }
      } catch (error) {
        console.error(`Failed to trigger analysis for workout ${workout.id}:`, error)
        // Mark as failed if trigger fails
        await prisma.workout.update({
          where: { id: workout.id },
          data: { aiAnalysisStatus: 'FAILED' }
        })
        return { success: false, workoutId: workout.id, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })
    
    const results = await Promise.all(triggerPromises)
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    return {
      success: true,
      message: `Analysis started for ${successful} workouts${failed > 0 ? ` (${failed} failed)` : ''}`,
      total: workoutsToAnalyze.length,
      triggered: successful,
      failed,
      results
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to trigger workout analyses: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})