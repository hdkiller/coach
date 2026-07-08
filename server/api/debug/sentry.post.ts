import * as Sentry from '@sentry/nuxt'
import { requireAdmin } from '../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  console.log('[Server] Testing console.log integration')
  console.warn('[Server] Testing console.warn integration')
  console.error('[Server] Testing console.error integration')

  Sentry.captureMessage('[Server] Explicit Sentry.captureMessage', {
    level: 'info',
    tags: { source: 'api_debug' }
  })

  try {
    throw new Error('[Server] Test Exception')
  } catch (e) {
    Sentry.captureException(e)
  }

  return { success: true, message: 'Server logs triggered' }
})
