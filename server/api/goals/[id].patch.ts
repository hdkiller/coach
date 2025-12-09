import { getServerSession } from '#auth'
import { z } from 'zod'

const goalUpdateSchema = z.object({
  type: z.enum(['BODY_COMPOSITION', 'EVENT', 'PERFORMANCE', 'CONSISTENCY']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  eventDate: z.string().optional(),
  eventType: z.string().optional(),
  metric: z.string().optional(),
  targetValue: z.number().optional(),
  startValue: z.number().optional(),
  currentValue: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
  
  const id = event.context.params?.id
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Goal ID required'
    })
  }
  
  const body = await readBody(event)
  const result = goalUpdateSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.issues
    })
  }
  
  const data = result.data
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }
    
    // Check if goal belongs to user
    const existingGoal = await prisma.goal.findUnique({
      where: { id }
    })
    
    if (!existingGoal || existingGoal.userId !== user.id) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Goal not found'
      })
    }
    
    // Prepare update data
    const updateData: any = {
      ...data,
      updatedAt: new Date()
    }
    
    // Convert date strings to Date objects
    if (data.targetDate) {
      updateData.targetDate = new Date(data.targetDate)
    }
    if (data.eventDate) {
      updateData.eventDate = new Date(data.eventDate)
    }
    
    // Update the goal
    const goal = await prisma.goal.update({
      where: { id },
      data: updateData
    })
    
    return {
      success: true,
      goal
    }
  } catch (error: any) {
    console.error('Error updating goal:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update goal',
      message: error.message
    })
  }
})