import { tasks } from '@trigger.dev/sdk/v3'
import * as Sentry from '@sentry/node'
import { failStructureGenerationTaskFromPayload } from '../server/utils/structure-generation-run-lifecycle'
import { shouldReportIntegrationErrorToSentry } from '../server/utils/integration-errors'

// Initialize Sentry
Sentry.init({
  defaultIntegrations: false,
  // The Data Source Name (DSN) is a unique identifier for your Sentry project.
  dsn: process.env.SENTRY_DSN,
  // Update this to match the environment you want to track errors for
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
})

// Register a global onFailure hook to capture errors
tasks.onFailure(async ({ payload, error, ctx }) => {
  await failStructureGenerationTaskFromPayload(payload, error)

  if (!shouldReportIntegrationErrorToSentry(error, ctx.attempt?.number, ctx.run.maxAttempts)) {
    return
  }

  Sentry.captureException(error, {
    extra: {
      payload,
      ctx
    }
  })
})
