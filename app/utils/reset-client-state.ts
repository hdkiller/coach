const LOGOUT_LOCAL_STORAGE_PREFIXES = ['library-source:', 'workout-comparison:']
const LOGOUT_LOCAL_STORAGE_KEYS = new Set(['activities-list-columns-visibility'])

function clearLogoutScopedLocalStorage() {
  if (!import.meta.client) return

  const keysToRemove: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key) continue

    if (
      LOGOUT_LOCAL_STORAGE_KEYS.has(key) ||
      LOGOUT_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

export function resetClientState() {
  if (!import.meta.client) return

  const userStore = useUserStore()
  userStore.user = null
  userStore.profile = null
  userStore.dataSyncStatus = null
  userStore.loading = false
  userStore.generating = false
  userStore.userLoading = false

  const activityStore = useActivityStore()
  activityStore.recentActivity = null
  activityStore.loading = false

  const integrationStore = useIntegrationStore()
  integrationStore.integrationStatus = null
  integrationStore.dataSyncStatus = null
  integrationStore.syncingData = false

  const recommendationStore = useRecommendationStore()
  recommendationStore.todayRecommendation = null
  recommendationStore.todayWorkouts = []
  recommendationStore.loading = false
  recommendationStore.loadingWorkout = false
  recommendationStore.generating = false
  recommendationStore.generatingAdHoc = false

  const notificationStore = useNotificationStore()
  notificationStore.notifications = []
  notificationStore.unreadCount = 0
  notificationStore.total = 0
  notificationStore.loading = false

  const reportStore = useReportStore()
  reportStore.reports = []
  reportStore.status = 'idle'
  reportStore.generating = false
  reportStore.currentReport = null

  const checkinStore = useCheckinStore()
  checkinStore.currentCheckin = null
  checkinStore.loading = false
  checkinStore.error = null

  useWorkoutComparisonStore().clearAll()

  clearLogoutScopedLocalStorage()
}
