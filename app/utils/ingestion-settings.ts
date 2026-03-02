type DashboardSettings = {
  ingestion?: {
    autoDeduplicateWorkouts?: boolean
  }
}

export function isAutoDeduplicateWorkoutsEnabled(settings: unknown): boolean {
  const dashboardSettings = (settings as DashboardSettings | null) || {}
  return dashboardSettings.ingestion?.autoDeduplicateWorkouts !== false
}
