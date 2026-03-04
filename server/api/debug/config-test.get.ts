import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const configWithEvent = useRuntimeConfig(event)
  const configWithoutEvent = useRuntimeConfig()

  return {
    hasSecretWithEvent: !!configWithEvent.resendWebhookSecret,
    hasSecretWithoutEvent: !!configWithoutEvent.resendWebhookSecret,
    // Safely check if they are identical
    areIdentical: configWithEvent.resendWebhookSecret === configWithoutEvent.resendWebhookSecret
  }
})
