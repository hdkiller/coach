defineRouteMeta({
  openAPI: {
    tags: ['Public'],
    summary: 'Get shared resource',
    description: 'Returns details of a shared resource via token.',
    parameters: [
      {
        name: 'token',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                resourceType: { type: 'string' },
                data: { type: 'object' },
                user: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', nullable: true },
                    image: { type: 'string', nullable: true }
                  }
                }
              }
            }
          }
        }
      },
      404: { description: 'Share link not found or expired' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Share token is required'
    })
  }

  // @ts-ignore
  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          name: true,
          image: true
        }
      }
    }
  })

  if (!shareToken) {
    throw createError({
      statusCode: 404,
      message: 'Share link not found'
    })
  }

  // Check expiration
  if (shareToken.expiresAt && new Date() > shareToken.expiresAt) {
    throw createError({
      statusCode: 410,
      message: 'Share link has expired'
    })
  }

  let data: any = null

  if (shareToken.resourceType === 'REPORT') {
    data = await prisma.report.findUnique({
      where: { id: shareToken.resourceId }
    })
  } else if (shareToken.resourceType === 'WORKOUT') {
    data = await prisma.workout.findUnique({
      where: { id: shareToken.resourceId },
      include: {
        streams: true
      }
    })
  } else if (shareToken.resourceType === 'NUTRITION') {
    data = await prisma.nutrition.findUnique({
      where: { id: shareToken.resourceId }
    })
  } else if (shareToken.resourceType === 'ATHLETE_PROFILE') {
    data = await prisma.report.findUnique({
      where: { id: shareToken.resourceId }
    })
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      message: 'Shared resource no longer exists'
    })
  }

  return {
    resourceType: shareToken.resourceType,
    data,
    user: shareToken.user
  }
})
