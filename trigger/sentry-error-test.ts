import { task } from '@trigger.dev/sdk/v3'
import './init'
import { registerTaskHandler } from '../server/utils/task-registry'

export async function runSentryErrorTest() {
  const error = new Error('This is a custom error that Sentry will capture')
  error.cause = { additionalContext: 'This is additional context' }
  throw error
}

registerTaskHandler('sentry-error-test', runSentryErrorTest)

export const sentryErrorTest = task({
  id: 'sentry-error-test',
  retry: {
    maxAttempts: 1
  },
  run: async () => {
    return runSentryErrorTest()
  }
})
