<template>
  <UCard
    :ui="{
      root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
      body: 'p-4 sm:p-6',
      footer: 'p-3 sm:p-4 bg-gray-50/50 dark:bg-gray-800/20'
    }"
    class="flex flex-col overflow-hidden"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5 text-primary-500" />
          <h3 class="font-bold text-sm tracking-tight uppercase">
            {{ t('monthly_comparison_header', 'Monthly Progress') }}
          </h3>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-heroicons-cog-6-tooth"
            color="neutral"
            variant="ghost"
            size="xs"
            class="rounded-full"
            @click="isSettingsModalOpen = true"
          />
        </div>
      </div>
    </template>

    <div v-if="pending" class="h-[300px] flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <div
      v-else-if="error"
      class="h-[300px] flex flex-col items-center justify-center text-center p-4"
    >
      <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-error-500 mb-2" />
      <p class="text-sm text-gray-500">
        {{ t('monthly_comparison_error', 'Failed to load comparison data') }}
      </p>
      <UButton color="neutral" variant="ghost" size="sm" class="mt-2" @click="() => refresh()">
        {{ tc('retry', 'Retry') }}
      </UButton>
    </div>

    <div v-else class="space-y-4">
      <!-- Selectors above chart -->
      <div class="flex flex-wrap items-center gap-2">
        <USelectMenu
          v-model="selectedMetric"
          :items="metricOptions"
          value-key="value"
          label-key="label"
          class="w-28"
          size="xs"
          color="neutral"
          variant="outline"
        />

        <USelectMenu
          v-model="selectedSport"
          :items="sportOptions"
          value-key="value"
          label-key="label"
          class="w-32"
          size="xs"
          color="neutral"
          variant="outline"
        />

        <UTabs v-model="viewMode" :items="viewModeOptions" size="xs" class="w-36" />
      </div>

      <!-- Chart Container -->
      <div class="h-[260px] w-full relative">
        <ClientOnly>
          <Line
            :key="`monthly-comp-${selectedMetric}-${selectedSport}-${viewMode}`"
            :data="chartData"
            :options="chartOptions"
            :height="260"
          />
        </ClientOnly>
      </div>
    </div>

    <template v-if="!pending && !error && data && dashboardSettings.showFooter !== false" #footer>
      <div
        class="flex flex-wrap items-center justify-center sm:justify-between gap-y-2 gap-x-4 text-[10px] sm:text-[11px] font-bold"
      >
        <div class="flex items-center gap-1.5">
          <span class="text-gray-500 uppercase tracking-wider">{{ currentMonthName }}:</span>
          <span class="text-gray-900 dark:text-white"
            >{{ formatValue(currentTotal) }}{{ unitLabel }}</span
          >
        </div>

        <div class="hidden sm:block w-px h-3 bg-gray-200 dark:bg-gray-700" />

        <div class="flex items-center gap-1.5">
          <span class="text-gray-500 uppercase tracking-wider">{{ lastMonthName }}:</span>
          <span class="text-gray-900 dark:text-white"
            >{{ formatValue(lastMonthProgress) }}{{ unitLabel }}</span
          >
        </div>

        <div class="hidden sm:block w-px h-3 bg-gray-200 dark:bg-gray-700" />

        <div
          class="flex items-center gap-1"
          :class="percentDiff >= 0 ? 'text-emerald-500' : 'text-amber-500'"
        >
          <span class="text-gray-500 uppercase tracking-wider hidden sm:inline">Delta:</span>
          <UIcon :name="diffIcon" class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>{{ Math.abs(percentDiff).toFixed(1) }}%</span>
        </div>
      </div>
    </template>

    <DashboardMonthlyComparisonSettingsModal v-model:open="isSettingsModalOpen" />
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import { Line } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  } from 'chart.js'

  import { useDebounceFn } from '@vueuse/core'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )

  const { t } = useTranslate('dashboard')
  const { t: tc } = useTranslate('common')
  const theme = useTheme()
  const userStore = useUserStore()

  const isSettingsModalOpen = ref(false)

  // State with persistence
  const dashboardSettings = computed(
    () => userStore.user?.dashboardSettings?.monthlyComparison || {}
  )

  const selectedMetric = ref('tss')
  const selectedSport = ref('all')
  const viewMode = ref('cumulative')

  // Sync refs with store data when it loads or changes
  watch(
    dashboardSettings,
    (newSettings) => {
      if (newSettings.metric && newSettings.metric !== selectedMetric.value)
        selectedMetric.value = newSettings.metric
      if (newSettings.sport && newSettings.sport !== selectedSport.value)
        selectedSport.value = newSettings.sport
      if (newSettings.viewMode && newSettings.viewMode !== viewMode.value)
        viewMode.value = newSettings.viewMode
    },
    { immediate: true }
  )

  // Auto-save preferences (debounced)
  const savePreferences = useDebounceFn(async () => {
    const currentDashboardSettings = userStore.user?.dashboardSettings || {}
    const currentCompSettings = currentDashboardSettings.monthlyComparison || {}

    // ONLY save if something actually changed to avoid infinite loops
    if (
      currentCompSettings.metric === selectedMetric.value &&
      currentCompSettings.sport === selectedSport.value &&
      currentCompSettings.viewMode === viewMode.value
    )
      return

    await userStore.updateDashboardSettings({
      ...currentDashboardSettings,
      monthlyComparison: {
        ...currentCompSettings,
        metric: selectedMetric.value,
        sport: selectedSport.value,
        viewMode: viewMode.value
      }
    })
  }, 1000)

  // Watch for changes and save
  watch([selectedMetric, selectedSport, viewMode], () => {
    savePreferences()
  })

  const NON_DISTANCE_SPORTS = [
    'Gym',
    'WeightTraining',
    'Yoga',
    'Pilates',
    'HIIT',
    'CrossFit',
    'StrengthTraining',
    'FunctionalFitness',
    'CoreTraining',
    'Flexibility',
    'Meditation',
    'Other'
  ]

  const isNonDistanceSport = computed(() => NON_DISTANCE_SPORTS.includes(selectedSport.value))

  const metricOptions = computed(() => {
    const all = [
      { label: 'TSS', value: 'tss' },
      { label: 'Duration', value: 'duration' },
      { label: 'Distance', value: 'distance' },
      { label: 'Elevation', value: 'elevation' },
      { label: 'Count', value: 'count' }
    ]

    if (isNonDistanceSport.value) {
      return all.filter((m) => !['distance', 'elevation'].includes(m.value))
    }
    return all
  })

  const viewModeOptions = [
    { label: 'Cumulative', value: 'cumulative' },
    { label: 'Daily', value: 'daily' }
  ]

  // Fetch available sports for the selector (non-blocking)
  const { data: sportsData } = useFetch<string[]>('/api/workouts/sports', {
    lazy: true,
    server: false
  })

  const formatSportLabel = (sport: string) => {
    return sport
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .trim()
      .replace(/^([a-z])/, (match) => match.toUpperCase()) // Capitalize first letter
  }

  const sportOptions = computed(() => {
    const options = [{ label: 'All Sports', value: 'all' }]
    if (sportsData.value && Array.isArray(sportsData.value)) {
      sportsData.value.forEach((sport) => {
        options.push({ label: formatSportLabel(sport), value: sport })
      })
    }
    return options
  })

  // Ensure selectedSport is valid if it was saved but no longer exists in history
  watch(
    sportsData,
    (newSports) => {
      if (newSports && selectedSport.value !== 'all' && !newSports.includes(selectedSport.value)) {
        selectedSport.value = 'all'
      }
    },
    { immediate: true }
  )

  // Auto-switch metric if it becomes invalid for the selected sport
  watch(selectedSport, (newSport) => {
    if (NON_DISTANCE_SPORTS.includes(newSport)) {
      if (['distance', 'elevation'].includes(selectedMetric.value)) {
        selectedMetric.value = 'duration'
      }
    }
  })

  // Data Fetching
  const { data, pending, error, refresh } = useFetch<any>('/api/stats/monthly-comparison', {
    query: {
      sport: computed(() => selectedSport.value)
    },
    watch: [selectedSport]
  })

  // Computed values for display
  const currentMonthName = computed(() => data.value?.currentMonth?.name || 'Current')
  const lastMonthName = computed(() => data.value?.lastMonth?.name || 'Last Month')
  const todayDay = computed(() => data.value?.todayDay || 1)

  const currentTotal = computed(() => {
    if (!data.value) return 0
    const currentAtToday = data.value.currentMonth.cumulative[todayDay.value]
    return currentAtToday ? currentAtToday[selectedMetric.value] : 0
  })

  const lastMonthProgress = computed(() => {
    if (!data.value) return 0
    const lastAtToday = data.value.lastMonth.cumulative[todayDay.value]
    return lastAtToday ? lastAtToday[selectedMetric.value] : 0
  })

  const percentDiff = computed(() => {
    if (lastMonthProgress.value === 0) return currentTotal.value > 0 ? 100 : 0
    return ((currentTotal.value - lastMonthProgress.value) / lastMonthProgress.value) * 100
  })

  const diffIcon = computed(() => {
    if (percentDiff.value > 5) return 'i-heroicons-arrow-trending-up'
    if (percentDiff.value < -5) return 'i-heroicons-arrow-trending-down'
    return 'i-heroicons-minus'
  })

  const unitLabel = computed(() => {
    if (selectedMetric.value === 'duration') return 'h'
    if (selectedMetric.value === 'distance') return 'km'
    if (selectedMetric.value === 'elevation') return 'm'
    if (selectedMetric.value === 'count') return ''
    return 'pts'
  })

  const formatValue = (val: number) => {
    if (val === null || val === undefined) return '0'
    // Round for pts, elevation, count, duration, AND distance.
    return Math.round(val).toLocaleString()
  }

  // Chart Logic
  const chartData = computed(() => {
    if (!data.value) return { labels: [], datasets: [] }

    const labels = Array.from({ length: 31 }, (_, i) => (i + 1).toString())
    const metric = selectedMetric.value
    const isCumulative = viewMode.value === 'cumulative'
    const settings = dashboardSettings.value

    const currentData = labels.map((day) => {
      const d = parseInt(day)
      if (d > todayDay.value) return null
      const point = isCumulative
        ? data.value.currentMonth.cumulative[d]
        : data.value.currentMonth.daily[d]
      return point ? point[metric] : 0
    })

    const lastData = labels.map((day) => {
      const d = parseInt(day)
      const point = isCumulative
        ? data.value.lastMonth.cumulative[d]
        : data.value.lastMonth.daily[d]
      return point ? point[metric] : 0
    })

    const primaryColor = theme.colors.value.primary
    const neutralColor = theme.colors.value.chartText
    const tension = settings.smooth !== false ? 0.4 : 0

    const datasets: any[] = [
      {
        label: currentMonthName.value,
        data: currentData,
        borderColor: primaryColor,
        backgroundColor: `${primaryColor}15`,
        fill: isCumulative,
        tension,
        borderWidth: 3,
        pointRadius: (ctx: any) => (ctx.dataIndex + 1 === todayDay.value ? 6 : 0),
        pointHoverRadius: 6,
        pointBackgroundColor: primaryColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        spanGaps: false,
        zIndex: 10
      }
    ]

    // 1. Projection Logic
    if (settings.showProjection && isCumulative && todayDay.value > 0) {
      const avgRate = currentTotal.value / todayDay.value
      const projectionData = labels.map((day) => {
        const d = parseInt(day)
        if (d < todayDay.value) return null
        return currentTotal.value + avgRate * (d - todayDay.value)
      })

      datasets.push({
        label: 'Projected',
        data: projectionData,
        borderColor: primaryColor,
        borderWidth: 2,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: false,
        tension,
        spanGaps: true
      })
    }

    // 2. Comparison Logic
    if (settings.showComparison !== false) {
      datasets.push({
        label: lastMonthName.value,
        data: lastData,
        borderColor: neutralColor,
        backgroundColor: 'transparent',
        fill: false,
        tension,
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: neutralColor,
        spanGaps: true,
        opacity: 0.5
      })
    }

    // 3. Planned Training Logic
    if (settings.showPlanned) {
      const plannedData = labels.map((day) => {
        const d = parseInt(day)
        const point = isCumulative
          ? data.value.currentMonth.plannedCumulative[d]
          : data.value.currentMonth.plannedDaily[d]
        return point ? point[metric] : 0
      })

      datasets.push({
        label: 'Planned',
        data: plannedData,
        borderColor: theme.colors.value.info,
        borderWidth: 2,
        borderDash: [2, 2],
        pointRadius: 0,
        fill: false,
        tension,
        spanGaps: true
      })
    }

    // 4. Goal Line Logic
    const targetValue = settings.targets?.[metric]
    if (targetValue && isCumulative) {
      datasets.push({
        label: `Goal (${targetValue}${unitLabel.value})`,
        data: labels.map(() => targetValue),
        borderColor: theme.isDark.value ? '#fbbf24' : '#d97706', // amber
        borderWidth: 1,
        borderDash: [10, 5],
        pointRadius: 0,
        fill: false,
        tension: 0
      })
    }

    return { labels, datasets }
  })

  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          padding: 20,
          font: { size: 10, weight: 'bold' as const },
          color: theme.colors.value.chartText
        }
      },
      tooltip: {
        backgroundColor: theme.isDark.value ? '#1e293b' : '#ffffff',
        titleColor: theme.isDark.value ? '#f1f5f9' : '#1e293b',
        bodyColor: theme.isDark.value ? '#cbd5e1' : '#475569',
        borderColor: theme.isDark.value ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        callbacks: {
          title: (context: any) => `Day ${context[0].label}`,
          label: (context: any) => {
            const val = context.parsed.y
            if (val === null) return ''
            return ` ${context.dataset.label}: ${formatValue(val)}${unitLabel.value}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 15
        },
        border: { display: false }
      },
      y: {
        position: 'right' as const,
        beginAtZero: true,
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          drawTicks: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
          callback: (val: any) => (val === 0 ? '0' : `${formatValue(val)}${unitLabel.value}`)
        },
        border: { display: false }
      }
    }
  }))
</script>
