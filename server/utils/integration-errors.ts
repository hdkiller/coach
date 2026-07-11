export type IntegrationErrorCode = 'AUTH_REVOKED' | 'AUTH_MISSING' | 'PROVIDER_UNAVAILABLE'

export class IntegrationAuthError extends Error {
  readonly code: IntegrationErrorCode
  readonly provider: string
  readonly integrationId: string
  readonly statusCode?: number
  readonly retryable = false

  constructor(params: {
    provider: string
    integrationId: string
    message: string
    code?: Extract<IntegrationErrorCode, 'AUTH_REVOKED' | 'AUTH_MISSING'>
    statusCode?: number
  }) {
    super(params.message)
    this.name = 'IntegrationAuthError'
    this.code = params.code || 'AUTH_REVOKED'
    this.provider = params.provider
    this.integrationId = params.integrationId
    this.statusCode = params.statusCode
  }
}

export class IntegrationProviderError extends Error {
  readonly code: IntegrationErrorCode = 'PROVIDER_UNAVAILABLE'
  readonly provider: string
  readonly integrationId: string
  readonly statusCode?: number
  readonly retryable = true

  constructor(params: {
    provider: string
    integrationId: string
    message: string
    statusCode?: number
  }) {
    super(params.message)
    this.name = 'IntegrationProviderError'
    this.provider = params.provider
    this.integrationId = params.integrationId
    this.statusCode = params.statusCode
  }
}

export function isIntegrationAuthError(error: unknown): error is IntegrationAuthError {
  return error instanceof IntegrationAuthError
}

export function isIntegrationProviderError(error: unknown): error is IntegrationProviderError {
  return error instanceof IntegrationProviderError
}

export function shouldReportIntegrationErrorToSentry(
  error: unknown,
  attemptNumber?: number,
  maxAttempts?: number
): boolean {
  if (isIntegrationAuthError(error)) {
    return false
  }

  if (isIntegrationProviderError(error)) {
    if (!attemptNumber || !maxAttempts) {
      return true
    }
    return attemptNumber >= maxAttempts
  }

  return true
}
