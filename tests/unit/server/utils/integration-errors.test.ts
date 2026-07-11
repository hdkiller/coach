import { describe, expect, it } from 'vitest'
import {
  IntegrationAuthError,
  IntegrationProviderError,
  shouldReportIntegrationErrorToSentry
} from '../../../server/utils/integration-errors'

describe('integration-errors', () => {
  it('does not report revoked integration auth errors to Sentry', () => {
    const error = new IntegrationAuthError({
      provider: 'whoop',
      integrationId: 'integration-1',
      message: 'Whoop authorization expired or was revoked. Please reconnect Whoop.'
    })

    expect(shouldReportIntegrationErrorToSentry(error, 3, 3)).toBe(false)
  })

  it('reports provider outages only on the final attempt', () => {
    const error = new IntegrationProviderError({
      provider: 'withings',
      integrationId: 'integration-1',
      statusCode: 503,
      message: 'Withings token refresh unavailable (Status 503)'
    })

    expect(shouldReportIntegrationErrorToSentry(error, 1, 3)).toBe(false)
    expect(shouldReportIntegrationErrorToSentry(error, 3, 3)).toBe(true)
  })
})
