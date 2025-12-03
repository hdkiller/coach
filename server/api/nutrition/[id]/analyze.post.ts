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
  
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Nutrition ID is required'
    })
  }
  
  // Fetch the nutrition record
  const nutrition = await prisma.nutrition.findUnique({
    where: { id }
  })
  
  if (!nutrition) {
    throw createError({
      statusCode: 404,
      message: 'Nutrition record not found'
    })
  }
  
  // Ensure the nutrition record belongs to the authenticated user
  if (nutrition.userId !== (session.user as any).id) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: You do not have access to this nutrition record'
    })
  }
  
  // Allow re-analysis regardless of existing data
  if (nutrition.aiAnalysisStatus === 'COMPLETED' && nutrition.aiAnalysisJson) {
    console.log('Re-analyzing nutrition even though analysis exists')
  }
  
  // Check if already processing
  if (nutrition.aiAnalysisStatus === 'PROCESSING') {
    return {
      success: true,
      nutritionId: id,
      status: 'PROCESSING',
      message: 'Analysis is currently being generated'
    }
  }
  
  try {
    // Update status to PENDING
    await prisma.nutrition.update({
      where: { id },
      data: { aiAnalysisStatus: 'PENDING' }
    })
    
    // Trigger background job
    const handle = await tasks.trigger('analyze-nutrition', {
      nutritionId: id
    })
    
    return {
      success: true,
      nutritionId: id,
      jobId: handle.id,
      status: 'PENDING',
      message: 'Nutrition analysis started'
    }
  } catch (error) {
    // Update status to failed
    await prisma.nutrition.update({
      where: { id },
      data: { aiAnalysisStatus: 'FAILED' }
    })
    
    throw createError({
      statusCode: 500,
      message: `Failed to trigger nutrition analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})