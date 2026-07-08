import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const configWithEvent = useRuntimeConfig(event)
  const configWithoutEvent = useRuntimeConfig()

  return {
    hasSecretWithEvent: !!configWithEvent.resendWebhookSecret,
    hasSecretWithoutEvent: !!configWithoutEvent.resendWebhookSecret,
    // Safely check if they are identical
    areIdentical: configWithEvent.resendWebhookSecret === configWithoutEvent.resendWebhookSecret
  }
})
