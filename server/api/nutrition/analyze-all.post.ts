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
    // Find all nutrition records that need analysis
    const nutritionToAnalyze = await prisma.nutrition.findMany({
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
        date: true,
        aiAnalysisStatus: true
      },
      orderBy: {
        date: 'desc'
      }
    })
    
    if (nutritionToAnalyze.length === 0) {
      return {
        success: true,
        message: 'No nutrition records need analysis',
        total: 0,
        triggered: 0
      }
    }
    
    // Update all to PENDING status
    await prisma.nutrition.updateMany({
      where: {
        id: { in: nutritionToAnalyze.map(n => n.id) }
      },
      data: {
        aiAnalysisStatus: 'PENDING'
      }
    })
    
    // Trigger analysis jobs for each nutrition record (Trigger.dev will handle concurrency limits)
    const triggerPromises = nutritionToAnalyze.map(async (nutrition) => {
      try {
        const handle = await tasks.trigger('analyze-nutrition', {
          nutritionId: nutrition.id
        })
        return { success: true, nutritionId: nutrition.id, jobId: handle.id }
      } catch (error) {
        console.error(`Failed to trigger analysis for nutrition ${nutrition.id}:`, error)
        // Mark as failed if trigger fails
        await prisma.nutrition.update({
          where: { id: nutrition.id },
          data: { aiAnalysisStatus: 'FAILED' }
        })
        return { success: false, nutritionId: nutrition.id, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })
    
    const results = await Promise.all(triggerPromises)
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    return {
      success: true,
      message: `Analysis started for ${successful} nutrition records${failed > 0 ? ` (${failed} failed)` : ''}`,
      total: nutritionToAnalyze.length,
      triggered: successful,
      failed,
      results
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to trigger nutrition analyses: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})