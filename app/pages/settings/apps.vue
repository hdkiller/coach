<template>
  <div class="space-y-6">
    <UCard :ui="{ body: 'hidden' }">
      <template #header>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold uppercase tracking-tight">Connected Apps</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Manage your connected apps and integrations.
            </p>
          </div>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-adjustments-horizontal"
            @click="openIngestionSettingsModal"
          >
            Ingestion Settings
          </UButton>
        </div>
      </template>
    </UCard>
    <UAlert
      v-if="intervalsConnected && !intervalsStravaWarningDismissed"
      title="Strava Activity Sync"
      icon="i-heroicons-exclamation-triangle"
      color="warning"
      variant="soft"
      :close="{ color: 'warning', variant: 'link', label: 'Dismiss' }"
      description="Activities synced from Strava to Intervals.icu cannot be automatically imported. Please upload FIT files manually (direct Strava connection is coming soon)."
      @update:open="intervalsStravaWarningDismissed = true"
    />
    <UAlert
      v-if="fitbitConnected && fitbitRateLimited"
      title="Fitbit rate limit reached"
      icon="i-heroicons-exclamation-triangle"
      color="warning"
      variant="soft"
      :description="fitbitRateLimitMessage"
    />
    <SettingsConnectedApps
      :intervals-connected="intervalsConnected"
      :intervals-ingest-workouts="intervalsIngestWorkouts"
      :whoop-connected="whoopConnected"
      :whoop-ingest-workouts="whoopIngestWorkouts"
      :oura-connected="ouraConnected"
      :oura-ingest-workouts="ouraIngestWorkouts"
      :withings-connected="withingsConnected"
      :yazio-connected="yazioConnected"
      :fitbit-connected="fitbitConnected"
      :strava-connected="stravaConnected"
      :rouvy-connected="rouvyConnected"
      :hevy-connected="hevyConnected"
      :polar-connected="polarConnected"
      :polar-ingest-workouts="polarIngestWorkouts"
      :garmin-connected="garminConnected"
      :garmin-ingest-workouts="garminIngestWorkouts"
      :wahoo-connected="wahooConnected"
      :wahoo-ingest-workouts="wahooIngestWorkouts"
      :telegram-connected="telegramConnected"
      :syncing-providers="syncingProviders"
      :intervals-settings="intervalsSettings"
      @disconnect="disconnectIntegration"
      @sync="syncIntegration"
      @sync-profile="syncProfile"
      @connect-telegram="connectTelegram"
      @update-setting="updateIntegrationSetting"
    />

    <USeparator class="my-8" />

    <div>
      <div>
        <h2 class="text-2xl font-bold">Applications that can connect to Coach Watts</h2>
        <p class="text-neutral-500">
          Discover Third-party applications that can access your Coach Watts account.
        </p>
      </div>

      <div v-if="pendingApplications" class="space-y-4 mt-6">
        <USkeleton v-for="i in 2" :key="`public-app-skeleton-${i}`" class="h-24 w-full" />
      </div>

      <div
        v-else-if="mergedApps.length === 0"
        class="py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl mt-6"
      >
        <UIcon
          name="i-heroicons-cube"
          class="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3"
        />
        <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No applications are available yet.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <UCard
          v-for="app in mergedApps"
          :key="app.id"
          :ui="{ body: 'flex flex-col h-full justify-between gap-4' }"
        >
          <div class="flex items-start gap-4 min-w-0">
            <UAvatar
              :src="app.logoUrl || undefined"
              :alt="app.name"
              size="lg"
              icon="i-heroicons-cube"
            />
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold break-words whitespace-normal leading-snug">
                {{ app.name }}
              </h3>
              <p
                v-if="app.isConnected && app.consent"
                class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium"
              >
                Authorized on {{ formatDate(app.consent.createdAt) }}
              </p>
              <p
                v-else
                class="text-sm text-muted mt-1 break-words whitespace-normal leading-relaxed"
              >
                {{ app.description || 'No description provided.' }}
              </p>
            </div>
          </div>

          <div v-if="app.isConnected && app.consent" class="mt-1">
            <p
              class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2"
            >
              Permissions:
            </p>
            <div class="flex flex-wrap gap-1.5">
              <UBadge
                v-for="scope in app.consent.scopes"
                :key="scope"
                color="neutral"
                variant="subtle"
                size="xs"
                class="font-medium"
              >
                {{ formatScope(scope) }}
              </UBadge>
            </div>
          </div>

          <div
            class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto"
          >
            <template v-if="app.isConnected && app.consent">
              <UButton
                v-if="app.homepageUrl"
                label="Website"
                color="success"
                variant="solid"
                size="sm"
                class="font-bold"
                icon="i-heroicons-arrow-top-right-on-square"
                :to="app.homepageUrl"
                target="_blank"
              />
              <UButton
                label="Disconnect"
                color="error"
                variant="outline"
                icon="i-heroicons-trash"
                size="sm"
                class="font-bold flex-shrink-0"
                @click="confirmRevoke(app.consent)"
              />
            </template>
            <UButton
              v-else-if="app.homepageUrl"
              label="Visit Website"
              color="neutral"
              variant="outline"
              icon="i-heroicons-arrow-top-right-on-square"
              :to="app.homepageUrl"
              target="_blank"
            />
          </div>
        </UCard>
      </div>
    </div>

    <!-- Revoke Confirmation Modal -->
    <UModal
      v-model:open="isRevokeModalOpen"
      title="Revoke Access"
      description="Revoke the authorization for this application to access your Coach Watts data."
    >
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Are you sure you want to revoke access for <strong>{{ selectedConsent?.app.name }}</strong
          >? The application will no longer be able to access your data.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="isRevokeModalOpen = false"
          />
          <UButton label="Revoke Access" color="error" :loading="revoking" @click="revokeAccess" />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isIngestionSettingsModalOpen"
      title="Ingestion Settings"
      description="Control what happens automatically after future activity imports."
    >
      <template #body>
        <div class="space-y-4 sm:min-w-[440px]">
          <UFormField
            label="Automatic deduplication after ingestion"
            description="When enabled, newly imported workouts can be automatically deduplicated after sync. Turn this off if you prefer to review and clean up duplicates manually."
          >
            <UCheckbox
              v-model="ingestionSettingsForm.autoDeduplicateWorkouts"
              label="Enable automatic deduplication"
            />
          </UFormField>

          <p class="text-xs text-muted">
            This only affects future imports. Existing workouts and manual deduplication remain
            unchanged.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="savingIngestionSettings"
            @click="isIngestionSettingsModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :loading="savingIngestionSettings"
            @click="saveIngestionSettings"
          >
            Save
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  import { isAutoDeduplicateWorkoutsEnabled } from '~/utils/ingestion-settings'

  const toast = useToast()
  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()
  const { trackIntegrationConnectSuccess } = useAnalytics()

  const intervalsStravaWarningDismissed = useCookie<boolean>('intervals-strava-warning-dismissed', {
    maxAge: 60 * 60 * 24 * 365
  })

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Connected Apps',
    meta: [
      {
        name: 'description',
        content:
          'Manage your connected apps and integrations (Intervals.icu, Garmin Connect, WHOOP, Withings, Strava, Yazio, Fitbit).'
      }
    ]
  })

  // Integration status
  const { data: integrationStatus, refresh: refreshIntegrations } = useFetch<any>(
    '/api/integrations/status',
    {
      lazy: true,
      server: false
    }
  )

  const intervalsConnected = computed(
    () =>
      integrationStatus.value?.integrations?.some((i: any) => i.provider === 'intervals') ?? false
  )

  const intervalsIngestWorkouts = computed(
    () =>
      integrationStatus.value?.integrations?.find((i: any) => i.provider === 'intervals')
        ?.ingestWorkouts ?? false
  )

  const intervalsSettings = computed(
    () =>
      integrationStatus.value?.integrations?.find((i: any) => i.provider === 'intervals')
        ?.settings ?? {}
  )

  const whoopConnected = computed(
    () => integrationStatus.value?.integrations?.some((i: any) => i.provider === 'whoop') ?? false
  )

  const whoopIngestWorkouts = computed(
    () =>
      integrationStatus.value?.integrations?.find((i: any) => i.provider === 'whoop')
        ?.ingestWorkouts ?? false
  )

  const ouraConnected = computed(
    () => integrationStatus.value?.integrations?.some((i: any) => i.provider === 'oura') ?? false
  )

  const ouraIngestWorkouts = computed(
    () =>
      integrationStatus.value?.integrations?.find((i: any) => i.provider === 'oura')
        ?.ingestWorkouts ?? false
  )

  const withingsConnected = computed(
    () =>
      integrationStatus.value?.integrations?.some((i: any) => i.provider === 'withings') ?? false
  )

  const yazioConnected = computed(
    () => integrationStatus.value?.integrations?.some((i: any) => i.provider === 'yazio') ?? false
  )

  const fitbitConnected = computed(
    () => integrationStatus.value?.integrations?.some((i: any) => i.provider === 'fitbit') ?? false
  )

  const fitbitIntegration = computed(() =>
    integrationStatus.value?.integrations?.find((i: any) => i.provider === 'fitbit')
  )

  const fitbitRateLimited = computed(() => fitbitIntegration.value?.syncStatus === 'RATE_LIMITED')

  const fitbitRateLimitMessage = computed(
    () => fitbitIntegration.value?.errorMessage || 'Rate limited by Fitbit. Try again later.'
  )

  const stravaConnected = computed(
    () => integrationStatus.value?.integrations?.some((i: any) => i.provider === 'strava') ?? false
  )

  const rouvyConnected = computed(
    () => integrationStatus.value?.integrations?.some((i: any) => i.provider === 'rouvy') ?? false
  )

  const hevyConnected = computed(
    () => integrationStatus.value?.integrations?.some((i: any) => i.provider === 'hevy') ?? false
  )

  const polarConnected = computed(
    () => integrationStatus.value?.integrations?.some((i: any) => i.provider === 'polar') ?? false
  )

  const polarIngestWorkouts = computed(
    () =>
      integrationStatus.value?.integrations?.find((i: any) => i.provider === 'polar')
        ?.ingestWorkouts ?? false
  )

  const garminConnected = computed(
    () => integrationStatus.value?.integrations?.some((i: any) => i.provider === 'garmin') ?? false
  )

  const garminIngestWorkouts = computed(
    () =>
      integrationStatus.value?.integrations?.find((i: any) => i.provider === 'garmin')
        ?.ingestWorkouts ?? false
  )

  const wahooConnected = computed(
    () => integrationStatus.value?.integrations?.some((i: any) => i.provider === 'wahoo') ?? false
  )

  const wahooIngestWorkouts = computed(
    () =>
      integrationStatus.value?.integrations?.find((i: any) => i.provider === 'wahoo')
        ?.ingestWorkouts ?? false
  )

  const telegramConnected = computed(
    () =>
      integrationStatus.value?.integrations?.some((i: any) => i.provider === 'telegram') ?? false
  )

  const syncingProviders = ref(new Set<string>())

  const { data: publicApps, pending: pendingPublicApps } = await useFetch<any[] | null>(
    '/api/oauth/public-apps',
    {
      lazy: true,
      server: false,
      default: () => null
    }
  )

  // Authorized Apps Logic
  const {
    data: consents,
    pending: pendingConsents,
    refresh: refreshConsents
  } = await useFetch<any[] | null>('/api/oauth/consents', {
    lazy: true,
    server: false,
    default: () => null
  })

  const isRevokeModalOpen = ref(false)
  const revoking = ref(false)
  const selectedConsent = ref<any>(null)
  const isIngestionSettingsModalOpen = ref(false)
  const savingIngestionSettings = ref(false)
  const ingestionSettingsForm = ref({
    autoDeduplicateWorkouts: true
  })

  const autoDeduplicateWorkoutsEnabled = computed(() =>
    isAutoDeduplicateWorkoutsEnabled(userStore.user?.dashboardSettings)
  )

  const consentsByAppId = computed(() => {
    return new Map((consents.value || []).map((consent: any) => [consent.app.id, consent]))
  })

  const mergedApps = computed(() => {
    const consentMap = consentsByAppId.value
    const byId = new Map<string, any>()

    for (const app of publicApps.value || []) {
      const consent = consentMap.get(app.id) || null
      byId.set(app.id, {
        id: app.id,
        name: app.name,
        description: app.description,
        logoUrl: app.logoUrl,
        homepageUrl: app.homepageUrl,
        isConnected: Boolean(consent),
        consent
      })
    }

    for (const consent of consents.value || []) {
      if (byId.has(consent.app.id)) continue
      byId.set(consent.app.id, {
        id: consent.app.id,
        name: consent.app.name,
        description: consent.app.description,
        logoUrl: consent.app.logoUrl,
        homepageUrl: consent.app.homepageUrl,
        isConnected: true,
        consent
      })
    }

    return Array.from(byId.values()).sort((a, b) => {
      if (a.isConnected !== b.isConnected) return a.isConnected ? -1 : 1
      return String(a.name || '').localeCompare(String(b.name || ''))
    })
  })

  const pendingApplications = computed(
    () =>
      publicApps.value === null ||
      consents.value === null ||
      pendingPublicApps.value ||
      pendingConsents.value
  )

  function confirmRevoke(consent: any) {
    selectedConsent.value = consent
    isRevokeModalOpen.value = true
  }

  function openIngestionSettingsModal() {
    ingestionSettingsForm.value = {
      autoDeduplicateWorkouts: autoDeduplicateWorkoutsEnabled.value
    }
    isIngestionSettingsModalOpen.value = true
  }

  async function saveIngestionSettings() {
    savingIngestionSettings.value = true

    try {
      await $fetch('/api/user/settings', {
        method: 'PATCH',
        body: {
          dashboardSettings: {
            ingestion: {
              autoDeduplicateWorkouts: ingestionSettingsForm.value.autoDeduplicateWorkouts
            }
          }
        }
      })

      if (userStore.user) {
        userStore.user.dashboardSettings = {
          ...(userStore.user.dashboardSettings || {}),
          ingestion: {
            autoDeduplicateWorkouts: ingestionSettingsForm.value.autoDeduplicateWorkouts
          }
        }
      }

      toast.add({
        title: 'Settings Updated',
        description: 'Ingestion settings saved successfully.',
        color: 'success'
      })

      isIngestionSettingsModalOpen.value = false
    } catch (error: any) {
      toast.add({
        title: 'Update Failed',
        description: error?.data?.message || 'Failed to save ingestion settings.',
        color: 'error'
      })
    } finally {
      savingIngestionSettings.value = false
    }
  }

  async function revokeAccess() {
    if (!selectedConsent.value) return

    revoking.value = true
    try {
      await $fetch(`/api/oauth/consents/${selectedConsent.value.app.id}`, {
        method: 'DELETE'
      })
      toast.add({ title: 'Success', description: 'Access revoked successfully', color: 'success' })
      isRevokeModalOpen.value = false
      refreshConsents()
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to revoke access',
        color: 'error'
      })
    } finally {
      revoking.value = false
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function formatScope(scope: string) {
    if (scope === 'offline_access') return 'Offline Access'
    const parts = scope.split(':')
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  }

  const connectTelegram = async () => {
    try {
      const res: any = await $fetch('/api/integrations/telegram/link', {
        method: 'POST'
      })
      if (res.url) {
        window.open(res.url, '_blank')
      }
    } catch (error: any) {
      toast.add({
        title: 'Connection Failed',
        description: error.data?.message || 'Failed to generate Telegram link',
        color: 'error'
      })
    }
  }

  const syncProfile = async (provider: string) => {
    try {
      if (provider !== 'intervals') return

      await $fetch('/api/integrations/intervals/sync-profile', {
        method: 'POST'
      })

      toast.add({
        title: 'Profile Sync Started',
        description: 'Auto-detection task has been triggered in the background.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Sync Failed',
        description: error.data?.message || 'Failed to trigger profile sync',
        color: 'error'
      })
    }
  }

  const syncIntegration = async (provider: string, days?: number) => {
    syncingProviders.value.add(provider)

    try {
      await $fetch('/api/integrations/sync', {
        method: 'POST',
        body: { provider, days }
      })

      const providerName =
        provider === 'intervals'
          ? 'Intervals.icu'
          : provider === 'whoop'
            ? 'WHOOP'
            : provider === 'withings'
              ? 'Withings'
              : provider === 'yazio'
                ? 'Yazio'
                : provider === 'fitbit'
                  ? 'Fitbit'
                  : provider === 'hevy'
                    ? 'Hevy'
                    : provider === 'polar'
                      ? 'Polar'
                      : provider === 'garmin'
                        ? 'Garmin'
                        : provider === 'oura'
                          ? 'Oura'
                          : provider === 'telegram'
                            ? 'Telegram'
                            : provider === 'rouvy'
                              ? 'ROUVY'
                              : 'Strava'

      toast.add({
        title: 'Sync Started',
        description: `Started syncing ${providerName} data`,
        color: 'success'
      })

      setTimeout(() => {
        refreshIntegrations()
      }, 2000)
    } catch (error: any) {
      toast.add({
        title: 'Sync Failed',
        description: error.data?.message || `Failed to sync ${provider}`,
        color: 'error'
      })
    } finally {
      syncingProviders.value.delete(provider)
    }
  }

  const disconnectIntegration = async (provider: string) => {
    try {
      const endpoint =
        provider === 'whoop'
          ? '/api/integrations/whoop/disconnect'
          : provider === 'withings'
            ? '/api/integrations/withings/disconnect'
            : `/api/integrations/${provider}/disconnect`

      await $fetch(endpoint, {
        method: 'DELETE'
      })

      const providerName =
        provider === 'intervals'
          ? 'Intervals.icu'
          : provider === 'whoop'
            ? 'WHOOP'
            : provider === 'withings'
              ? 'Withings'
              : provider === 'yazio'
                ? 'Yazio'
                : provider === 'fitbit'
                  ? 'Fitbit'
                  : provider === 'polar'
                    ? 'Polar'
                    : provider === 'garmin'
                      ? 'Garmin'
                      : provider === 'oura'
                        ? 'Oura'
                        : provider === 'hevy'
                          ? 'Hevy'
                          : provider === 'telegram'
                            ? 'Telegram'
                            : provider === 'rouvy'
                              ? 'ROUVY'
                              : 'Strava'

      toast.add({
        title: 'Disconnected',
        description: `Successfully disconnected from ${providerName}`,
        color: 'success'
      })

      refreshIntegrations()
    } catch (error: any) {
      toast.add({
        title: 'Disconnect Failed',
        description: error.data?.message || `Failed to disconnect from ${provider}`,
        color: 'error'
      })
    }
  }

  const updateIntegrationSetting = async (provider: string, setting: string, value: any) => {
    try {
      await $fetch('/api/integrations/update', {
        method: 'POST',
        body: {
          provider,
          [setting]: value
        }
      })

      const providerName =
        provider === 'intervals'
          ? 'Intervals.icu'
          : provider === 'whoop'
            ? 'WHOOP'
            : provider === 'withings'
              ? 'Withings'
              : provider === 'yazio'
                ? 'Yazio'
                : provider === 'fitbit'
                  ? 'Fitbit'
                  : provider === 'polar'
                    ? 'Polar'
                    : provider === 'garmin'
                      ? 'Garmin'
                      : provider === 'oura'
                        ? 'Oura'
                        : provider === 'hevy'
                          ? 'Hevy'
                          : provider === 'telegram'
                            ? 'Telegram'
                            : provider === 'rouvy'
                              ? 'ROUVY'
                              : 'Strava'

      toast.add({
        title: 'Settings Updated',
        description: `Successfully updated ${providerName} settings`,
        color: 'success'
      })

      refreshIntegrations()
    } catch (error: any) {
      toast.add({
        title: 'Update Failed',
        description: error.data?.message || `Failed to update ${provider} settings`,
        color: 'error'
      })
    }
  }

  // Handle OAuth callback messages
  onMounted(() => {
    if (
      route.query.whoop_success ||
      route.query.oura_success ||
      route.query.withings_success ||
      route.query.strava_success ||
      route.query.rouvy_success ||
      route.query.fitbit_success ||
      route.query.polar_success ||
      route.query.garmin_success ||
      route.query.wahoo_success ||
      route.query.connected === 'yazio'
    ) {
      if (route.query.whoop_success) {
        trackIntegrationConnectSuccess('whoop')
        toast.add({
          title: 'Connected!',
          description: 'Successfully connected to WHOOP',
          color: 'success'
        })
        refreshIntegrations()
      } else if (route.query.oura_success) {
        trackIntegrationConnectSuccess('oura')
        toast.add({
          title: 'Connected!',
          description: 'Successfully connected to Oura',
          color: 'success'
        })
        refreshIntegrations()
      } else if (route.query.withings_success) {
        trackIntegrationConnectSuccess('withings')
        toast.add({
          title: 'Connected!',
          description: 'Successfully connected to Withings',
          color: 'success'
        })
        refreshIntegrations()
      } else if (route.query.strava_success) {
        trackIntegrationConnectSuccess('strava')
        toast.add({
          title: 'Connected!',
          description: 'Successfully connected to Strava',
          color: 'success'
        })
        refreshIntegrations()
      } else if (route.query.rouvy_success) {
        trackIntegrationConnectSuccess('rouvy')
        toast.add({
          title: 'Connected!',
          description: 'Successfully connected to ROUVY',
          color: 'success'
        })
        refreshIntegrations()
      } else if (route.query.fitbit_success) {
        trackIntegrationConnectSuccess('fitbit')
        toast.add({
          title: 'Connected!',
          description: 'Successfully connected to Fitbit',
          color: 'success'
        })
        refreshIntegrations()
      } else if (route.query.polar_success) {
        trackIntegrationConnectSuccess('polar')
        toast.add({
          title: 'Connected!',
          description: 'Successfully connected to Polar',
          color: 'success'
        })
        refreshIntegrations()
      } else if (route.query.garmin_success) {
        trackIntegrationConnectSuccess('garmin')
        toast.add({
          title: 'Connected!',
          description: 'Successfully connected to Garmin Connect',
          color: 'success'
        })
        refreshIntegrations()
      } else if (route.query.wahoo_success) {
        trackIntegrationConnectSuccess('wahoo')
        toast.add({
          title: 'Connected!',
          description: 'Successfully connected to Wahoo',
          color: 'success'
        })
        refreshIntegrations()
      } else if (route.query.connected === 'yazio') {
        trackIntegrationConnectSuccess('yazio')
        toast.add({
          title: 'Connected!',
          description: 'Successfully connected to Yazio',
          color: 'success'
        })
        refreshIntegrations()
      }
      router.replace({ query: {} })
    } else if (
      route.query.whoop_error ||
      route.query.oura_error ||
      route.query.withings_error ||
      route.query.strava_error ||
      route.query.rouvy_error ||
      route.query.fitbit_error ||
      route.query.garmin_error ||
      route.query.wahoo_error ||
      route.query.polar_error
    ) {
      const errorMsg = (route.query.whoop_error ||
        route.query.oura_error ||
        route.query.withings_error ||
        route.query.strava_error ||
        route.query.rouvy_error ||
        route.query.fitbit_error ||
        route.query.garmin_error ||
        route.query.wahoo_error ||
        route.query.polar_error) as string
      const provider = route.query.whoop_error
        ? 'WHOOP'
        : route.query.oura_error
          ? 'Oura'
          : route.query.withings_error
            ? 'Withings'
            : route.query.strava_error
              ? 'Strava'
              : route.query.rouvy_error
                ? 'ROUVY'
                : route.query.fitbit_error
                  ? 'Fitbit'
                  : route.query.polar_error
                    ? 'Polar'
                    : route.query.garmin_error
                      ? 'Garmin'
                      : route.query.wahoo_error
                        ? 'Wahoo'
                        : 'Strava'
      const description =
        errorMsg === 'no_code'
          ? 'Authorization was cancelled or no code was received'
          : `Failed to connect to ${provider}: ${errorMsg}`

      toast.add({
        title: 'Connection Failed',
        description,
        color: 'error'
      })
      router.replace({ query: {} })
    }
  })
</script>
