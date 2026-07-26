import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import {
  createAppWebHandoff,
  sanitizeReturnTo,
  siteOriginForEvent
} from '../../utils/app-web-handoff'

defineRouteMeta({
  openAPI: {
    tags: ['Auth'],
    summary: 'Mint app→web session handoff',
    description:
      'Bearer-authenticated mint of a one-time code that opens a Coach Watts web cookie session.',
    responses: {
      200: {
        description: 'Handoff URL ready to open in the system browser',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                expiresIn: { type: 'number' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({}))
  const returnTo = sanitizeReturnTo(body?.returnTo)

  const { code, expiresIn } = await createAppWebHandoff(user.id)
  const origin = siteOriginForEvent(event)
  const url = `${origin}/api/auth/app-web-handoff/consume?code=${encodeURIComponent(code)}&returnTo=${encodeURIComponent(returnTo)}`

  return { url, expiresIn }
})
