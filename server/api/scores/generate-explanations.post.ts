import { getServerSession } from '#auth'
import { tasks } from '@trigger.dev/sdk/v3'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const config = useRuntimeConfig()
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  try {
    // Trigger the batch explanation generation job
    const handle = await tasks.trigger(
      "generate-score-explanations",
      { userId: user.id }
    )

    return {
      success: true,
      message: 'Score explanation generation started',
      jobId: handle.id
    }
  } catch (error: any) {
    console.error('Error triggering score explanations:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to trigger score explanation generation'
    })
  }
})