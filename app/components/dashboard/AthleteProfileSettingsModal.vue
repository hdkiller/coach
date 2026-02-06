<template>
  <UModal
    v-model:open="isOpen"
    title="Customize Athlete Profile"
    description="Select and reorder metrics for your athlete profile dashboard card."
  >
    <template #content>
      <UCard :ui="{ body: 'p-0 sm:p-6' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Customize Athlete Profile
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="p-4 sm:p-0 space-y-6 overflow-y-auto max-h-[70vh]">
          <p class="text-sm text-muted">
            Choose metrics to display and drag to reorder. Max 3 metrics per row.
          </p>

          <div v-for="section in sections" :key="section.key" class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-xs uppercase tracking-wider text-gray-500">
                {{ section.label }}
              </h4>
            </div>

            <div
              class="border rounded-lg divide-y border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
            >
              <draggable
                v-model="settings[section.key].metrics"
                item-key="key"
                handle=".drag-handle"
                :animation="200"
                ghost-class="opacity-50"
              >
                <template #item="{ element: metric }">
                  <div
                    class="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <div class="flex items-center gap-3">
                      <UIcon
                        name="i-lucide-grip-vertical"
                        class="drag-handle w-4 h-4 text-gray-300 cursor-move"
                      />
                      <UIcon
                        v-if="metricConfigs[metric.key]"
                        :name="metricConfigs[metric.key].icon"
                        class="w-4 h-4"
                        :class="metricConfigs[metric.key].iconColor"
                      />
                      <div class="flex flex-col">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ metric.label }}
                        </span>
                        <span class="text-[10px] text-muted font-mono">
                          Current: {{ getFormattedValue(metric.key) }}
                        </span>
                      </div>
                    </div>
                    <USwitch v-model="metric.visible" />
                  </div>
                </template>
              </draggable>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="resetDefaults">
              Reset Defaults
            </UButton>
            <UButton color="primary" @click="isOpen = false"> Done </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import draggable from 'vuedraggable'
  import { useDebounceFn } from '@vueuse/core'

  const isOpen = defineModel<boolean>('open', { default: false })
  const userStore = useUserStore()

  const sections = [
    { key: 'profileInfo', label: "Athlete's Profile" },
    { key: 'trainingLoad', label: 'Training Load & Form' },
    { key: 'corePerformance', label: 'Core Performance' },
    { key: 'wellness', label: 'Latest Wellness' }
  ] as const

  const defaultSettings = {
    profileInfo: {
      metrics: [
        { key: 'maxHr', label: 'Max HR', visible: true },
        { key: 'restingHr', label: 'Resting HR', visible: true },
        { key: 'lthr', label: 'LTHR', visible: true },
        { key: 'age', label: 'Age', visible: false },
        { key: 'height', label: 'Height', visible: false }
      ]
    },
    trainingLoad: {
      metrics: [
        { key: 'ctl', label: 'CTL (Fitness)', visible: true },
        { key: 'atl', label: 'ATL (Fatigue)', visible: true },
        { key: 'tsb', label: 'TSB (Form)', visible: true }
      ]
    },
    corePerformance: {
      metrics: [
        { key: 'ftp', label: 'FTP', visible: true },
        { key: 'weight', label: 'Weight', visible: true },
        { key: 'wKg', label: 'W/kg', visible: true },
        { key: 'wPrime', label: "W' (W-Prime)", visible: false },
        { key: 'thresholdPace', label: 'Threshold Pace', visible: false }
      ]
    },
    wellness: {
      metrics: [
        { key: 'sleep', label: 'Sleep', visible: true },
        { key: 'hrv', label: 'HRV', visible: true },
        { key: 'rhr', label: 'RHR', visible: true },
        { key: 'recovery', label: 'Recovery %', visible: false },
        { key: 'readiness', label: 'Readiness', visible: false },
        { key: 'fatigue', label: 'Fatigue', visible: false },
        { key: 'stress', label: 'Stress', visible: false },
        { key: 'mood', label: 'Mood', visible: false },
        { key: 'spO2', label: 'SpO2', visible: false },
        { key: 'bloodPressure', label: 'Blood Pressure', visible: false },
        { key: 'respiration', label: 'Respiration', visible: false },
        { key: 'skinTemp', label: 'Skin Temp', visible: false },
        { key: 'vo2max', label: 'VO2 Max', visible: false }
      ]
    }
  }

  // Fetch PMC data for values
  const { data: pmcData } = useFetch<any>('/api/performance/pmc', {
    query: { days: 1 },
    immediate: true,
    lazy: true,
    server: false
  })

  const metricConfigs: Record<string, any> = {
    // Profile Info
    maxHr: {
      icon: 'i-heroicons-heart-solid',
      iconColor: 'text-rose-500'
    },
    restingHr: {
      icon: 'i-heroicons-heart',
      iconColor: 'text-rose-500'
    },
    lthr: {
      icon: 'i-heroicons-fire',
      iconColor: 'text-rose-500'
    },
    age: {
      icon: 'i-heroicons-calendar',
      iconColor: 'text-rose-500'
    },
    height: {
      icon: 'i-heroicons-arrows-up-down',
      iconColor: 'text-rose-500'
    },
    // Training Load
    ctl: {
      icon: 'i-heroicons-presentation-chart-line',
      iconColor: 'text-purple-500'
    },
    atl: {
      icon: 'i-heroicons-bolt',
      iconColor: 'text-purple-500'
    },
    tsb: {
      icon: 'i-heroicons-chart-bar',
      iconColor: 'text-purple-500'
    },
    // Core Performance
    ftp: {
      icon: 'i-heroicons-bolt-solid',
      iconColor: 'text-amber-500'
    },
    weight: {
      icon: 'i-heroicons-scale',
      iconColor: 'text-amber-500'
    },
    wKg: {
      icon: 'i-heroicons-chart-bar-square',
      iconColor: 'text-amber-500'
    },
    wPrime: {
      icon: 'i-heroicons-battery-100',
      iconColor: 'text-amber-500'
    },
    thresholdPace: {
      icon: 'i-lucide-activity',
      iconColor: 'text-amber-500'
    },
    // Wellness
    sleep: {
      icon: 'i-heroicons-moon',
      iconColor: 'text-indigo-500'
    },
    hrv: {
      icon: 'i-heroicons-heart',
      iconColor: 'text-indigo-500'
    },
    rhr: {
      icon: 'i-heroicons-heart',
      iconColor: 'text-indigo-500'
    },
    recovery: {
      icon: 'i-heroicons-bolt',
      iconColor: 'text-indigo-500'
    },
    readiness: {
      icon: 'i-lucide-activity',
      iconColor: 'text-indigo-500'
    },
    fatigue: {
      icon: 'i-lucide-frown',
      iconColor: 'text-indigo-500'
    },
    stress: {
      icon: 'i-heroicons-cloud',
      iconColor: 'text-indigo-500'
    },
    mood: {
      icon: 'i-lucide-smile',
      iconColor: 'text-indigo-500'
    },
    spO2: {
      icon: 'i-lucide-activity',
      iconColor: 'text-indigo-500'
    },
    bloodPressure: {
      icon: 'i-heroicons-heart-solid',
      iconColor: 'text-indigo-500'
    },
    respiration: {
      icon: 'i-lucide-wind',
      iconColor: 'text-indigo-500'
    },
    skinTemp: {
      icon: 'i-lucide-thermometer',
      iconColor: 'text-indigo-500'
    },
    vo2max: {
      icon: 'i-heroicons-chart-pie',
      iconColor: 'text-indigo-500'
    }
  }

  function getFormattedValue(key: string) {
    if (!userStore.profile) return '...'

    // Profile info
    if (key === 'maxHr')
      return (userStore.currentMaxHr || userStore.profile.estimatedMaxHR || '?') + ' bpm'
    if (key === 'restingHr') return (userStore.profile.restingHr || '?') + ' bpm'
    if (key === 'lthr') return (userStore.currentLthr || '?') + ' bpm'
    if (key === 'age') return (userStore.profile.age || '?') + ' yrs'
    if (key === 'height')
      return (userStore.profile.height || '?') + (userStore.profile.heightUnits || 'cm')

    // Training load
    if (key === 'ctl') return (pmcData.value?.summary?.currentCTL ?? 0).toFixed(0)
    if (key === 'atl') return (pmcData.value?.summary?.currentATL ?? 0).toFixed(0)
    if (key === 'tsb') return (pmcData.value?.summary?.currentTSB ?? 0).toFixed(0)

    // Core performance
    if (key === 'ftp') return (userStore.currentFtp || '?') + 'W'
    if (key === 'weight') return (userStore.profile.weight?.toFixed(1) || '?') + 'kg'
    if (key === 'wKg') {
      if (!userStore.currentFtp || !userStore.profile.weight) return '?'
      return (userStore.currentFtp / userStore.profile.weight).toFixed(2)
    }
    if (key === 'wPrime')
      return userStore.currentWPrime ? (userStore.currentWPrime / 1000).toFixed(1) + 'kJ' : '?'
    if (key === 'thresholdPace') return userStore.currentThresholdPace || '?'

    // Wellness
    if (key === 'sleep')
      return userStore.profile.recentSleep ? userStore.profile.recentSleep.toFixed(1) + 'h' : '?'
    if (key === 'hrv')
      return userStore.profile.recentHRV ? Math.round(userStore.profile.recentHRV) + 'ms' : '?'
    if (key === 'rhr') return (userStore.profile.restingHr || '?') + ' bpm'
    if (key === 'recovery') return (userStore.profile.recentRecoveryScore || '?') + '%'
    if (key === 'readiness') return userStore.profile.recentReadiness || '?'
    if (key === 'fatigue') return userStore.profile.recentFatigue || '?'
    if (key === 'stress') return userStore.profile.recentStress || '?'
    if (key === 'mood') return userStore.profile.recentMood || '?'
    if (key === 'spO2') return (userStore.profile.recentSpO2 || '?') + '%'
    if (key === 'bloodPressure')
      return userStore.profile.recentSystolic
        ? `${userStore.profile.recentSystolic}/${userStore.profile.recentDiastolic}`
        : '?'
    if (key === 'respiration') return (userStore.profile.recentRespiration || '?') + ' brpm'
    if (key === 'skinTemp') return (userStore.profile.recentSkinTemp || '?') + '°C'
    if (key === 'vo2max') return userStore.profile.recentVo2max || '?'

    return '?'
  }

  // Local state for the form, initialized from store
  const settings = ref(
    JSON.parse(JSON.stringify(userStore.user?.dashboardSettings?.athleteProfile || defaultSettings))
  )

  // Update local state when modal opens
  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        // Ensure new metrics are added if we update the list of available metrics in code later
        const currentSettings = userStore.user?.dashboardSettings?.athleteProfile || defaultSettings
        const merged = JSON.parse(JSON.stringify(defaultSettings))

        // Merge existing user preferences into the default structure to maintain order and visibility
        for (const sectionKey of Object.keys(merged)) {
          if (currentSettings[sectionKey]) {
            const userMetrics = currentSettings[sectionKey].metrics || []
            const mergedMetrics = []

            // Add user ordered metrics first if they still exist in defaults
            for (const userMetric of userMetrics) {
              const defaultMetric = merged[sectionKey].metrics.find(
                (m: any) => m.key === userMetric.key
              )
              if (defaultMetric) {
                mergedMetrics.push({ ...defaultMetric, ...userMetric })
              }
            }

            // Add any new default metrics that weren't in user's list
            for (const defaultMetric of merged[sectionKey].metrics) {
              if (!mergedMetrics.find((m: any) => m.key === defaultMetric.key)) {
                mergedMetrics.push(defaultMetric)
              }
            }

            merged[sectionKey].metrics = mergedMetrics
          }
        }

        settings.value = merged
      }
    }
  )

  function getSelectedCount(sectionKey: string) {
    return settings.value[sectionKey]?.metrics.filter((m: any) => m.visible).length || 0
  }

  // Auto-save changes
  const saveSettings = useDebounceFn(async () => {
    const currentDashboardSettings = userStore.user?.dashboardSettings || {}

    await userStore.updateDashboardSettings({
      ...currentDashboardSettings,
      athleteProfile: settings.value
    })
  }, 500)

  watch(
    settings,
    () => {
      saveSettings()
    },
    { deep: true }
  )

  function resetDefaults() {
    settings.value = JSON.parse(JSON.stringify(defaultSettings))
  }
</script>
