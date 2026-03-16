import { oauthRepository } from '../../../utils/repositories/oauthRepository'
import { getEffectiveUserId } from '../../../utils/coaching'
import { logAction } from '../../../utils/audit'
import { z } from 'zod'

const createAppSchema = z.object({
  name: z.string().min(3).max(50),
  sourceName: z.string().min(1).max(30).optional().or(z.literal('')),
  description: z.string().max(500).optional(),
  homepageUrl: z.string().url().optional().or(z.literal('')),
  redirectUris: z.array(z.string().url()).min(1).max(10)
})

defineRouteMeta({
  openAPI: {
    tags: ['Developer'],
    summary: 'Create OAuth Application',
    description:
      'Creates a new OAuth application and returns its credentials. The client secret is only shown once.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'redirectUris'],
            properties: {
              name: { type: 'string', minLength: 3, maxLength: 50 },
              sourceName: { type: 'string', minLength: 1, maxLength: 30 },
              description: { type: 'string', maxLength: 500 },
              homepageUrl: { type: 'string', format: 'uri' },
              redirectUris: { type: 'array', items: { type: 'string', format: 'uri' }, minItems: 1 }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Created',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                clientId: { type: 'string' },
                clientSecret: { type: 'string' },
                name: { type: 'string' }
              }
            }
          }
        }
      },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' }
    }
  }
} as any)

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const body = await readBody(event)

  const validatedData = createAppSchema.parse(body)

  const app = await oauthRepository.createApp(userId, {
    name: validatedData.name,
    sourceName: validatedData.sourceName || undefined,
    description: validatedData.description,
    homepageUrl: validatedData.homepageUrl || undefined,
    redirectUris: validatedData.redirectUris
  })

  await logAction({
    userId,
    action: 'OAUTH_APP_CREATED',
    resourceType: 'OAuthApp',
    resourceId: app.id,
    metadata: { name: app.name },
    event
  })

  setResponseStatus(event, 201)
  return app
})
