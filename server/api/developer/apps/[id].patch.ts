import { oauthRepository } from '../../../utils/repositories/oauthRepository'
import { getEffectiveUserId } from '../../../utils/coaching'
import { logAction } from '../../../utils/audit'
import { getServerSession } from '../../../utils/session'
import { z } from 'zod'

const updateAppSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  sourceName: z.string().min(1).max(30).optional().nullable().or(z.literal('')),
  description: z.string().max(500).optional(),
  homepageUrl: z.string().url().optional().or(z.literal('')),
  redirectUris: z.array(z.string().url()).min(1).max(10).optional(),
  webhookSecret: z.string().max(100).optional().nullable(),
  isPublic: z.boolean().optional()
})

defineRouteMeta({
  openAPI: {
    tags: ['Developer'],
    summary: 'Update OAuth Application',
    description: 'Updates details for a specific OAuth application.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 3, maxLength: 50 },
              sourceName: { type: 'string', minLength: 1, maxLength: 30, nullable: true },
              description: { type: 'string', maxLength: 500 },
              homepageUrl: { type: 'string', format: 'uri' },
              redirectUris: { type: 'array', items: { type: 'string', format: 'uri' } },
              isPublic: { type: 'boolean' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Success' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not Found' }
    }
  }
} as any)

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const session = await getServerSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing app ID' })
  }

  const validatedData = updateAppSchema.parse(body)
  const existingApp = await oauthRepository.getApp(id)

  if (!existingApp) {
    throw createError({ statusCode: 404, message: 'Application not found' })
  }

  if (existingApp.ownerId !== userId) {
    throw createError({ statusCode: 403, message: 'You do not own this application' })
  }

  const isAdmin = Boolean(session?.user?.isAdmin)
  if (
    validatedData.isPublic !== undefined &&
    validatedData.isPublic !== existingApp.isPublic &&
    !isAdmin
  ) {
    throw createError({
      statusCode: 403,
      message: 'Only admins can change OAuth app visibility'
    })
  }

  try {
    const updatedApp = await oauthRepository.updateApp(id, userId, {
      name: validatedData.name,
      sourceName: validatedData.sourceName === '' ? null : validatedData.sourceName,
      description: validatedData.description,
      homepageUrl: validatedData.homepageUrl || undefined,
      redirectUris: validatedData.redirectUris,
      webhookSecret: validatedData.webhookSecret,
      isPublic: isAdmin ? validatedData.isPublic : undefined
    })

    const auditMetadata = { ...validatedData }
    if (auditMetadata.webhookSecret) {
      auditMetadata.webhookSecret = '[REDACTED]'
    }

    await logAction({
      userId,
      action: 'OAUTH_APP_UPDATED',
      resourceType: 'OAuthApp',
      resourceId: id,
      metadata: { changes: auditMetadata },
      event
    })

    return updatedApp
  } catch (error: any) {
    throw createError({
      statusCode: error.message.includes('permission') ? 403 : 404,
      message: error.message
    })
  }
})
