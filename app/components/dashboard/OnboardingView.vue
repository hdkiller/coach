<template>
  <div v-if="status" class="space-y-8">
    <div class="text-center space-y-4 py-4 sm:py-8">
      <div
        class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4"
      >
        <UIcon
          name="i-heroicons-rocket-launch"
          class="w-8 h-8 text-primary-600 dark:text-primary-400"
        />
      </div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
        {{ heroTitle }}
      </h1>
      <p class="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-300">
        {{ heroDescription }}
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div class="lg:col-span-2 space-y-6">
        <UCard v-if="showImportPanel" class="border-2 border-primary-500/20 shadow-lg">
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <UIcon
                v-if="status.importState === 'importing'"
                name="i-heroicons-arrow-path"
                class="w-6 h-6 text-primary-500 animate-spin shrink-0 mt-1"
              />
              <UIcon
                v-else-if="status.importState === 'failed'"
                name="i-heroicons-exclamation-triangle"
                class="w-6 h-6 text-red-500 shrink-0 mt-1"
              />
              <UIcon
                v-else
                name="i-heroicons-check-circle"
                class="w-6 h-6 text-green-500 shrink-0 mt-1"
              />
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ importPanelTitle }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {{ importPanelDescription }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <UButton
                v-if="status.importState === 'failed'"
                color="primary"
                icon="i-heroicons-arrow-path"
                @click="emit('sync')"
              >
                {{ t('setup_progress_retry_sync') }}
              </UButton>
              <UButton color="neutral" variant="outline" to="/settings/apps">
                {{ t('setup_connect_another') }}
              </UButton>
            </div>
          </div>
        </UCard>

        <template v-else>
          <UCard
            v-if="showPrimaryProviderCard"
            class="border-2 border-primary-500/20 shadow-lg relative overflow-hidden"
          >
            <div class="relative z-10 space-y-6">
              <div class="flex items-start gap-4">
                <div
                  class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                >
                  <img
                    :src="primaryProviderLogo"
                    :alt="primaryProviderLabel"
                    class="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                    {{ primaryProviderTitle }}
                  </h3>
                  <p class="text-gray-600 dark:text-gray-400 mt-1">
                    {{ primaryProviderDescription }}
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-4">
                <UButton
                  size="lg"
                  color="primary"
                  class="font-bold px-8"
                  icon="i-heroicons-link"
                  @click="connectPrimaryProvider"
                >
                  {{ t('connect_now') }}
                </UButton>
                <a
                  v-if="status.primaryProvider === 'intervals'"
                  href="https://intervals.icu"
                  target="_blank"
                  class="text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline decoration-dotted"
                >
                  {{ t('what_is_intervals') }}
                </a>
              </div>
            </div>
          </UCard>

          <div>
            <p class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {{ t('more_ways_to_connect') }}
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UCard v-for="provider in secondaryProviders" :key="provider.id" class="h-full">
                <div class="flex items-center gap-3 mb-3">
                  <div
                    class="w-8 h-8 bg-white rounded-md flex items-center justify-center overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700"
                  >
                    <img
                      v-if="provider.logo"
                      :src="provider.logo"
                      :alt="provider.label"
                      class="w-5 h-5 object-contain"
                    />
                    <span v-else class="text-[10px] font-semibold text-emerald-700">
                      {{ provider.label }}
                    </span>
                  </div>
                  <h4 class="font-bold text-gray-900 dark:text-white">{{ provider.label }}</h4>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2 min-h-10">
                  {{ t(provider.descriptionKey) }}
                </p>
                <p
                  v-if="provider.disabledReason"
                  class="text-xs text-amber-600 dark:text-amber-400 mb-3"
                >
                  {{ provider.disabledReason }}
                </p>
                <UButton
                  variant="soft"
                  :color="provider.color"
                  size="xs"
                  block
                  icon="i-heroicons-plus"
                  :disabled="provider.disabled"
                  @click="connectSecondaryProvider(provider)"
                >
                  {{ provider.disabled ? provider.disabledLabel : t('connect_button') }}
                </UButton>
              </UCard>
            </div>
          </div>
        </template>

        <UCard class="bg-gray-50 dark:bg-gray-900/40">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white">{{ t('fallback_title') }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ t('fallback_desc') }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton
                to="/workouts/upload"
                color="neutral"
                variant="outline"
                icon="i-heroicons-cloud-arrow-up"
              >
                {{ t('fallback_upload_fit') }}
              </UButton>
              <UButton color="neutral" variant="ghost" @click="emit('connect-later')">
                {{ t('fallback_connect_later') }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>

      <div class="lg:col-span-1">
        <UCard class="bg-gray-50 dark:bg-gray-800/50 sticky top-4">
          <template #header>
            <h3 class="font-bold text-sm uppercase tracking-wider text-gray-500">
              {{ t('getting_started_header') }}
            </h3>
          </template>
          <DashboardOnboardingChecklist :steps="status.steps" />
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import type { OnboardingStatus } from '../../../shared/onboarding-status'

  const props = defineProps<{
    status: OnboardingStatus
  }>()

  const emit = defineEmits<{
    sync: []
    'connect-later': []
  }>()

  const { t } = useTranslate('onboarding')
  const { signIn } = useAuth()
  const { trackSetupHubViewed, trackIntegrationConnectStart } = useAnalytics()

  onMounted(() => {
    trackSetupHubViewed({
      currentStep: props.status.currentStep,
      resume: props.status.hasIntegration || props.status.hasAnyData,
      signupMethod: props.status.signupMethod
    })
  })

  const showImportPanel = computed(
    () =>
      props.status.hasIntegration &&
      (props.status.importState === 'importing' ||
        props.status.importState === 'failed' ||
        props.status.importState === 'empty' ||
        (props.status.signupMethod !== 'google' && !props.status.hasUsableData))
  )

  const showPrimaryProviderCard = computed(() => !showImportPanel.value)

  const heroTitle = computed(() => {
    if (showImportPanel.value) return t.value('import_hero_title')
    if (props.status.signupMethod === 'google') return t.value('google_signup_title')
    return t.value('welcome_title')
  })

  const heroDescription = computed(() => {
    if (showImportPanel.value) return t.value('import_hero_desc')
    if (props.status.signupMethod === 'google') return t.value('google_signup_desc')
    return t.value('welcome_description')
  })

  const importPanelTitle = computed(() => {
    if (props.status.importState === 'failed') return t.value('setup_progress_failed_title')
    if (props.status.importState === 'empty') return t.value('setup_progress_empty_title')
    return t.value('setup_progress_importing_title')
  })

  const importPanelDescription = computed(() => {
    if (props.status.importErrorMessage) return props.status.importErrorMessage
    if (props.status.importState === 'empty') return t.value('setup_progress_empty_desc')
    if (props.status.importState === 'failed') return t.value('setup_progress_failed_desc')
    return t.value('setup_progress_importing_desc')
  })

  const primaryProviderTitle = computed(() => {
    if (props.status.primaryProvider === 'strava') return 'Strava'
    return t.value('intervals_title')
  })

  const primaryProviderDescription = computed(() => {
    if (props.status.primaryProvider === 'strava') return t.value('strava_description')
    return t.value('intervals_description')
  })

  const primaryProviderLabel = computed(() =>
    props.status.primaryProvider === 'strava' ? 'Strava' : 'Intervals.icu'
  )

  const primaryProviderLogo = computed(() =>
    props.status.primaryProvider === 'strava'
      ? '/images/logos/strava.svg'
      : '/images/logos/intervals.png'
  )

  type SecondaryProvider = {
    id: string
    label: string
    descriptionKey: string
    logo?: string
    color: 'warning' | 'error' | 'success' | 'neutral' | 'primary'
    path?: string
    oauth?: 'intervals' | 'strava'
    disabled?: boolean
    disabledReason?: string
    disabledLabel?: string
  }

  const isStravaDisabled = computed(() => {
    const config = useRuntimeConfig()
    return config.public.stravaEnabled === false
  })

  const isWhoopDisabled = computed(() => {
    const hostname = import.meta.client ? window.location.hostname : useRequestURL().hostname
    return hostname === 'coachwatts.com' || hostname === 'www.coachwatts.com'
  })

  const secondaryProviders = computed<SecondaryProvider[]>(() => {
    const primary = props.status.primaryProvider
    const providers: SecondaryProvider[] = [
      {
        id: 'strava',
        label: 'Strava',
        descriptionKey: 'strava_description',
        logo: '/images/logos/strava.svg',
        color: 'warning',
        path: '/connect-strava',
        disabled: isStravaDisabled.value,
        disabledReason: isStravaDisabled.value ? t.value('strava_disabled') : undefined,
        disabledLabel: t.value('strava_disabled')
      },
      {
        id: 'whoop',
        label: 'WHOOP',
        descriptionKey: 'whoop_description',
        logo: '/images/logos/whoop_square.svg',
        color: 'error',
        path: '/connect-whoop',
        disabled: isWhoopDisabled.value,
        disabledReason: isWhoopDisabled.value ? t.value('whoop_disabled') : undefined,
        disabledLabel: t.value('whoop_temp_unavailable')
      },
      {
        id: 'yazio',
        label: 'Yazio',
        descriptionKey: 'yazio_description',
        logo: '/images/logos/yazio_square.webp',
        color: 'success',
        path: '/connect-yazio'
      },
      {
        id: 'fitbit',
        label: 'Fitbit',
        descriptionKey: 'fitbit_description',
        color: 'success',
        path: '/connect-fitbit'
      },
      {
        id: 'wahoo',
        label: 'Wahoo',
        descriptionKey: 'wahoo_description',
        logo: '/images/logos/wahoo_logo_square.jpeg',
        color: 'neutral',
        path: '/connect-wahoo'
      }
    ]

    if (primary !== 'intervals') {
      providers.unshift({
        id: 'intervals',
        label: 'Intervals.icu',
        descriptionKey: 'intervals_description',
        logo: '/images/logos/intervals.png',
        color: 'primary',
        oauth: 'intervals'
      })
    }

    return providers.filter((provider) => provider.id !== primary)
  })

  function connectFromSetupHub(provider: string, connect: () => unknown) {
    trackIntegrationConnectStart(provider, { surface: 'setup_hub' })
    void connect()
  }

  function connectPrimaryProvider() {
    const provider = props.status.primaryProvider ?? 'intervals'
    if (provider === 'strava') {
      connectFromSetupHub('strava', () => navigateTo('/connect-strava'))
      return
    }
    connectFromSetupHub('intervals', () => signIn('intervals'))
  }

  function connectSecondaryProvider(provider: SecondaryProvider) {
    if (provider.disabled) return
    if (provider.oauth === 'intervals') {
      connectFromSetupHub('intervals', () => signIn('intervals'))
      return
    }
    if (provider.path) {
      connectFromSetupHub(provider.id, () => navigateTo(provider.path!))
    }
  }
</script>
