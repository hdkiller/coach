import { task } from '@trigger.dev/sdk/v3'
import './init'

export const sentryErrorTest = task({
  id: 'sentry-error-test',
  retry: {
    // Only retry once
    maxAttempts: 1
  },
  run: async () => {
    const error = new Error('This is a custom error that Sentry will capture')
    error.cause = { additionalContext: 'This is additional context' }
    throw error
  }
})
