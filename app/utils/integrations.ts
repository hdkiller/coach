export type IntegrationStatus = {
  provider: string
  syncStatus?: string | null
}

export function isIntegrationConnected(
  integrations: IntegrationStatus[] | null | undefined,
  provider: string
): boolean {
  const integration = integrations?.find((entry) => entry.provider === provider)
  if (!integration) return false
  return integration.syncStatus !== 'FAILED'
}
