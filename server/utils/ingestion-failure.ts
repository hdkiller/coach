import type { IngestionResult } from '../../trigger/types'
import { isIntegrationAuthError } from './integration-errors'

type IngestionFailureContext = {
  userId: string
  startDate: string
  endDate: string
}

export function buildAuthFailureResult(
  error: unknown,
  context: IngestionFailureContext
): IngestionResult | null {
  if (!isIntegrationAuthError(error)) {
    return null
  }

  return {
    success: false,
    counts: {},
    skipped: 0,
    message: error.message,
    error: {
      code: error.code,
      provider: error.provider,
      integrationId: error.integrationId,
      statusCode: error.statusCode
    },
    userId: context.userId,
    startDate: context.startDate,
    endDate: context.endDate
  }
}
