type IntegrationSettings = Record<string, any> | null | undefined

const ACTIVITY_DEFAULT_ON_PROVIDERS = new Set([
  'garmin',
  'whoop',
  'oura',
  'withings',
  'polar',
  'hevy'
])

export function isIntegrationSettingEnabled(
  settings: IntegrationSettings,
  key: 'ingestWellness' | 'ingestNutrition'
): boolean {
  return settings?.[key] !== false
}

export function shouldIngestActivities(
  provider: string,
  ingestWorkouts: boolean | null | undefined,
  settings: IntegrationSettings
): boolean {
  if (
    ACTIVITY_DEFAULT_ON_PROVIDERS.has(provider) &&
    settings?.activityPreferenceConfigured !== true
  ) {
    return true
  }

  return ingestWorkouts === true
}

export function shouldIngestWellness(settings: IntegrationSettings): boolean {
  return isIntegrationSettingEnabled(settings, 'ingestWellness')
}

export function shouldIngestNutrition(settings: IntegrationSettings): boolean {
  return isIntegrationSettingEnabled(settings, 'ingestNutrition')
}
