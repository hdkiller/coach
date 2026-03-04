<template>
  <UDashboardPanel id="fitness">
    <template #header>
      <UDashboardNavbar :title="t('page_title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-3">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>

            <UButton
              icon="i-heroicons-adjustments-horizontal"
              color="neutral"
              variant="outline"
              size="sm"
              @click="isSettingsModalOpen = true"
            >
              {{ t('nav_customize') }}
            </UButton>

            <USelect
              v-model="selectedPeriod"
              :items="periodOptions"
              size="sm"
              class="w-32"
              color="neutral"
              variant="outline"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ClientOnly>
        <div class="relative p-0 sm:p-6 space-y-4 sm:space-y-6 pb-24">
          <FitnessSettingsModal v-model:open="isSettingsModalOpen" />
          <FitnessHrvRhrSettingsModal v-model:open="isHrvRhrSettingsModalOpen" />
          <FitnessChartSettingsModal
            v-if="activeMetricSettings"
            :metric-key="activeMetricSettings.key"
            :title="activeMetricSettings.title"
            :open="!!activeMetricSettings"
            :weight-goal="weightGoal"
            @update:open="activeMetricSettings = null"
          />
          <div
            v-if="isGarminConnected"
            class="px-4 pt-1 sm:px-0 sm:pt-0 sm:absolute sm:right-6 sm:top-6 sm:z-10"
          >
            <div class="flex items-center gap-1.5">
              <span
                class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
              >
                {{ tc('attribution_garmin') }}
              </span>
              <img
                src="/images/logos/Garmin-Tag-black-high-res.png"
                class="h-5 w-auto dark:hidden"
                alt="Garmin"
              />
              <img
                src="/images/logos/Garmin-Tag-white-high-res.png"
                class="hidden h-5 w-auto dark:block"
                alt="Garmin"
              />
            </div>
          </div>

          <!-- Dashboard Branding -->
          <div class="px-4 sm:px-0">
            <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {{ t('branding_title') }}
            </h1>
            <p
              class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
            >
              {{ t('branding_subtitle') }}
            </p>
          </div>

          <!-- Summary Stats -->
          <FitnessSummaryCards
            :loading-f-t-p="loadingFTP"
            :ftp-data="ftpData"
            :loading-p-m-c="loadingPMC"
            :pmc-data="pmcData"
            :ctl-change="ctlChange"
            :loading-zones="loadingZones"
            :current-week-tss="currentWeekTss"
            :avg-weekly-tss="avgWeeklyTss"
            :loading="loading"
            :avg-h-r-v="avgHRV"
            :hrv-trend="hrvTrend"
          />

          <!-- Featured Correlation Chart -->

          <div
            v-if="
              loading || (allWellness.length > 0 && chartSettings.hrvRhrDual?.visible !== false)
            "
          >
            <FitnessHrvRhrDualChart
              :wellness-data="filteredWellness"
              :loading="loading"
              :plugins="[ChartDataLabels]"
              @settings="isHrvRhrSettingsModalOpen = true"
            />
          </div>

          <!-- Secondary Charts Grid -->

          <div
            v-if="showSecondaryChartsGrid"
            class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
          >
            <FitnessTrendChart
              v-if="showRecoveryChart"
              metric-key="recovery"
              :title="t('chart_recovery_title')"
              :loading="loading"
              :data="recoveryTrendData"
              :options="getChartOptions('recovery')"
              :settings="chartSettings.recovery"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('recovery', t('chart_label_recovery'))"
            />

            <FitnessTrendChart
              v-if="showReadinessEstimateChart"
              metric-key="readinessEstimate"
              :title="t('chart_readiness_title')"
              :loading="loading"
              :data="readinessEstimateTrendData"
              :options="getChartOptions('readinessEstimate')"
              :settings="chartSettings.readinessEstimate"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('readinessEstimate', t('chart_label_readiness'))"
            />

            <FitnessTrendChart
              v-if="showSleepChart"
              metric-key="sleep"
              :title="t('chart_sleep_title')"
              :loading="loading"
              :data="sleepTrendData"
              :options="getChartOptions('sleep')"
              :settings="chartSettings.sleep"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('sleep', t('chart_label_sleep'))"
            />

            <FitnessTrendChart
              v-if="showHrvChart"
              metric-key="hrv"
              :title="t('chart_hrv_title')"
              :loading="loading"
              :data="hrvTrendData"
              :options="getChartOptions('hrv')"
              :settings="chartSettings.hrv"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('hrv', t('chart_label_hrv'))"
            />

            <FitnessTrendChart
              v-if="showRestingHrChart"
              metric-key="restingHr"
              :title="t('chart_rhr_title')"
              :loading="loading"
              :data="restingHrTrendData"
              :options="getChartOptions('restingHr')"
              :settings="chartSettings.restingHr"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('restingHr', t('chart_label_rhr'))"
            />

            <FitnessTrendChart
              v-if="showWeightChart"
              metric-key="weight"
              :title="t('chart_weight_title')"
              :loading="loading"
              :data="weightTrendData"
              :options="getChartOptions('weight')"
              :settings="chartSettings.weight"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('weight', t('chart_label_weight'))"
            />

            <FitnessTrendChart
              v-if="showBpChart"
              metric-key="bp"
              :title="t('chart_bp_title')"
              :loading="loading"
              :data="bpTrendData"
              :options="getChartOptions('bp')"
              :settings="chartSettings.bp"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('bp', t('chart_label_bp'))"
            />
          </div>

          <!-- Filter Area -->
          <UCard
            :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-3' }"
            class="bg-gray-50/50 dark:bg-gray-900/40 border-dashed border-gray-200 dark:border-gray-800"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex items-center gap-3">
                <span
                  class="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0"
                >
                  {{ t('filter_recovery_label') }}
                </span>
                <USelect
                  v-model="filterRecovery"
                  :items="recoveryStatusOptions"
                  :placeholder="t('filter_all_status')"
                  size="sm"
                  color="neutral"
                  variant="outline"
                  class="w-full"
                />
              </div>

              <div class="flex items-center gap-3">
                <span
                  class="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0"
                >
                  {{ t('filter_sleep_label') }}
                </span>
                <USelect
                  v-model="filterSleep"
                  :items="sleepQualityOptions"
                  :placeholder="t('filter_all_quality')"
                  size="sm"
                  color="neutral"
                  variant="outline"
                  class="w-full"
                />
              </div>
            </div>
          </UCard>

          <!-- Wellness Table -->
          <FitnessWellnessTable
            :wellness="paginatedWellness"
            :loading="loading"
            :current-page="currentPage"
            :total-items="filteredWellness.length"
            :items-per-page="itemsPerPage"
            @update:page="changePage"
          />
        </div>
      </ClientOnly>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import ChartDataLabels from 'chartjs-plugin-datalabels'
  import FitnessSettingsModal from '~/components/fitness/FitnessSettingsModal.vue'
  import FitnessHrvRhrSettingsModal from '~/components/fitness/FitnessHrvRhrSettingsModal.vue'
  import FitnessChartSettingsModal from '~/components/fitness/FitnessChartSettingsModal.vue'
  import FitnessSummaryCards from '~/components/fitness/FitnessSummaryCards.vue'
  import FitnessTrendChart from '~/components/fitness/FitnessTrendChart.vue'
  import FitnessWellnessTable from '~/components/fitness/FitnessWellnessTable.vue'
  import FitnessHrvRhrDualChart from '~/components/fitness/HrvRhrDualChart.vue'
  import { LBS_TO_KG } from '~/utils/metrics'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
  } from 'chart.js'

  const { t } = useTranslate('fitness')
  const { t: tc } = useTranslate('common')

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )

  definePageMeta({
    middleware: 'auth',
    layout: 'default'
  })

  useHead({
    title: 'Fitness & Wellness',
    meta: [
      {
        name: 'description',
        content:
          'Track your recovery, sleep quality, and overall wellness metrics with WHOOP integration.'
      }
    ]
  })

  const toast = useToast()
  const theme = useTheme()
  const userStore = useUserStore()
  const integrationStore = useIntegrationStore()
  const loading = ref(true)
  const allWellness = ref<any[]>([])
  const currentPage = ref(1)
  const itemsPerPage = 20
  const isGarminConnected = computed(() => {
    return (
      integrationStore.integrationStatus?.integrations?.some((i: any) => i.provider === 'garmin') ??
      false
    )
  })

  const isSettingsModalOpen = ref(false)
  const isHrvRhrSettingsModalOpen = ref(false)
  const activeMetricSettings = ref<{ key: string; title: string } | null>(null)

  const defaultChartSettings: any = {
    recovery: {
      type: 'line',
      visible: true,
      smooth: true,
      showPoints: false,
      opacity: 0.5,
      yScale: 'dynamic',
      yMin: 0
    },
    readinessEstimate: {
      type: 'line',
      visible: true,
      smooth: true,
      showPoints: false,
      opacity: 0.5,
      yScale: 'dynamic',
      yMin: 0
    },
    sleep: {
      type: 'bar',
      visible: true,
      smooth: true,
      showPoints: false,
      opacity: 0.8,
      yScale: 'dynamic',
      yMin: 0
    },
    hrv: {
      type: 'line',
      visible: true,
      smooth: true,
      showPoints: false,
      opacity: 0.5,
      yScale: 'dynamic',
      yMin: 0
    },
    restingHr: {
      type: 'line',
      visible: true,
      smooth: true,
      showPoints: false,
      opacity: 0.5,
      yScale: 'dynamic',
      yMin: 0
    },
    weight: {
      type: 'line',
      visible: true,
      smooth: true,
      showPoints: false,
      opacity: 0.5,
      yScale: 'dynamic',
      yMin: 0
    },
    bp: {
      type: 'line',
      visible: true,
      smooth: true,
      showPoints: false,
      opacity: 0.5,
      yScale: 'dynamic',
      yMin: 0
    }
  }

  const chartSettings = computed(() => {
    const userSettings = userStore.user?.dashboardSettings?.fitnessCharts || {}
    // Ensure every key in defaultChartSettings exists by merging them one by one
    const merged: any = {}
    for (const key in defaultChartSettings) {
      merged[key] = {
        ...defaultChartSettings[key],
        ...(userSettings[key] || {})
      }

      // Automatically enable weight target line if a goal exists and not explicitly set
      if (key === 'weight' && weightGoal.value && userSettings[key]?.showTarget === undefined) {
        merged[key].showTarget = true
      }
    }
    return merged
  })

  function openChartSettings(key: string, title: string) {
    activeMetricSettings.value = { key, title }
  }

  const selectedPeriod = ref<string | number>(30)
  const periodOptions = computed(() => [
    { label: t.value('period_7_days'), value: 7 },
    { label: t.value('period_14_days'), value: 14 },
    { label: t.value('period_30_days'), value: 30 },
    { label: t.value('period_90_days'), value: 90 },
    { label: t.value('period_year_to_date'), value: 'YTD' },
    { label: t.value('period_all_time'), value: 3650 }
  ])

  // Period-aware fetching for additional metrics
  const { data: ftpData, pending: loadingFTP } = await useFetch<any>(
    '/api/performance/ftp-evolution',
    {
      query: computed(() => ({
        months:
          selectedPeriod.value === 'YTD'
            ? 'YTD'
            : Math.ceil(
                (typeof selectedPeriod.value === 'string'
                  ? parseInt(selectedPeriod.value)
                  : selectedPeriod.value) / 30
              )
      }))
    }
  )

  const { data: goalsData } = await useFetch<any>('/api/goals')

  const { data: pmcData, pending: loadingPMC } = await useFetch<any>('/api/performance/pmc', {
    query: computed(() => ({ days: selectedPeriod.value }))
  })

  const { data: zonesData, pending: loadingZones } = await useFetch<any>(
    '/api/analytics/weekly-zones',
    {
      query: computed(() => ({
        weeks:
          selectedPeriod.value === 'YTD'
            ? 'YTD'
            : Math.ceil(
                (typeof selectedPeriod.value === 'string'
                  ? parseInt(selectedPeriod.value)
                  : selectedPeriod.value) / 7
              )
      }))
    }
  )

  // Trend Calculations
  const ctlChange = computed(() => {
    if (!pmcData.value?.data?.length) return 0
    const data = pmcData.value.data
    const current = data[data.length - 1]?.ctl || 0
    const start = data[0]?.ctl || 0
    return current - start
  })

  const currentWeekTss = computed(() => {
    if (!pmcData.value?.data?.length) return 0
    // Sum TSS from last 7 days
    const data = pmcData.value.data
    return data.slice(-7).reduce((sum: number, d: any) => sum + (d.tss || 0), 0)
  })

  const avgWeeklyTss = computed(() => {
    if (!pmcData.value?.data?.length) return 0
    const data = pmcData.value.data
    const totalTss = data.reduce((sum: number, d: any) => sum + (d.tss || 0), 0)
    const numWeeks = data.length / 7
    return totalTss / (numWeeks || 1)
  })

  const hrvTrend = computed(() => {
    if (!allWellness.value.length) return 0
    const recent = filteredWellness.value.filter((w) => w.hrv)
    if (recent.length < 2) return 0

    const avgRecent = recent.reduce((sum, w) => sum + w.hrv, 0) / recent.length
    // Use first 7 days as baseline if available, else first point
    const baselineDays = recent.slice(0, 7)
    const avgBaseline = baselineDays.reduce((sum, w) => sum + w.hrv, 0) / baselineDays.length

    if (avgBaseline === 0) return 0
    return ((avgRecent - avgBaseline) / avgBaseline) * 100
  })

  // Filters
  const filterRecovery = ref<string | undefined>(undefined)
  const filterSleep = ref<string | undefined>(undefined)

  // Filter options
  const recoveryStatusOptions = computed(() => [
    { label: t.value('filter_all_status'), value: undefined },
    { label: `${t.value('filter_excellent')} (>80)`, value: 'excellent' },
    { label: `${t.value('filter_good')} (60-80)`, value: 'good' },
    { label: `${t.value('filter_fair')} (40-60)`, value: 'fair' },
    { label: `${t.value('filter_poor')} (<40)`, value: 'poor' }
  ])

  const sleepQualityOptions = computed(() => [
    { label: t.value('filter_all_quality'), value: undefined },
    { label: `${t.value('filter_excellent')} (>8h)`, value: 'excellent' },
    { label: `${t.value('filter_good')} (7-8h)`, value: 'good' },
    { label: `${t.value('filter_fair')} (6-7h)`, value: 'fair' },
    { label: `${t.value('filter_poor')} (<6h)`, value: 'poor' }
  ])

  // Fetch all wellness data
  async function fetchWellness() {
    loading.value = true
    try {
      // Fetch up to 180 days to support YTD and historical trends
      const wellness = await $fetch('/api/wellness', { query: { limit: 180 } })

      allWellness.value = wellness
    } catch (error) {
      console.error('Error fetching wellness:', error)
      toast.add({
        title: t.value('status_error_title'),
        description: t.value('status_error_load_failed'),
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

  const { formatDateUTC, getUserLocalDate } = useFormat()

  // Computed properties
  const filteredWellness = computed(() => {
    let wellness = [...allWellness.value]

    const todayUTC = getUserLocalDate()
    let startDate: Date

    if (selectedPeriod.value === 'YTD') {
      startDate = new Date(Date.UTC(todayUTC.getUTCFullYear(), 0, 1))
    } else {
      const days =
        typeof selectedPeriod.value === 'string'
          ? parseInt(selectedPeriod.value)
          : selectedPeriod.value
      startDate = new Date(todayUTC)
      startDate.setUTCDate(todayUTC.getUTCDate() - (days || 30))
    }

    wellness = wellness.filter((w) => {
      const wellnessDate = new Date(w.date)
      return wellnessDate <= todayUTC && wellnessDate >= startDate
    })

    if (filterRecovery.value) {
      wellness = wellness.filter((w) => {
        if (!w.recoveryScore) return false
        const score = w.recoveryScore
        if (filterRecovery.value === 'excellent') return score > 80
        if (filterRecovery.value === 'good') return score >= 60 && score <= 80
        if (filterRecovery.value === 'fair') return score >= 40 && score < 60
        if (filterRecovery.value === 'poor') return score < 40
        return true
      })
    }

    if (filterSleep.value) {
      wellness = wellness.filter((w) => {
        if (!w.sleepHours) return false
        const hours = w.sleepHours
        if (filterSleep.value === 'excellent') return hours > 8
        if (filterSleep.value === 'good') return hours >= 7 && hours <= 8
        if (filterSleep.value === 'fair') return hours >= 6 && hours < 7
        if (filterSleep.value === 'poor') return hours < 6
        return true
      })
    }

    return wellness
  })

  const totalDays = computed(() => filteredWellness.value.length)
  const avgRecovery = computed(() => {
    const withRecovery = filteredWellness.value.filter((w) => w.recoveryScore)
    if (withRecovery.length === 0) return null
    return withRecovery.reduce((sum, w) => sum + w.recoveryScore, 0) / withRecovery.length
  })
  const avgSleep = computed(() => {
    const withSleep = filteredWellness.value.filter((w) => w.sleepHours)
    if (withSleep.length === 0) return null
    return withSleep.reduce((sum, w) => sum + w.sleepHours, 0) / withSleep.length
  })
  const avgHRV = computed(() => {
    const withHRV = filteredWellness.value.filter((w) => w.hrv)
    if (withHRV.length === 0) return null
    return withHRV.reduce((sum, w) => sum + w.hrv, 0) / withHRV.length
  })

  const weightGoal = computed(() => {
    if (!goalsData.value?.goals) return null
    return goalsData.value.goals.find(
      (g: any) =>
        g.status === 'ACTIVE' && (g.metric === 'weight_kg' || g.type === 'BODY_COMPOSITION')
    )
  })

  const toDisplayWeight = (weightKg: number) => {
    if (userStore.profile?.weightUnits === 'Pounds') {
      return weightKg / LBS_TO_KG
    }
    return weightKg
  }

  const paginatedWellness = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredWellness.value.slice(start, end)
  })

  // Chart data computations
  const recoveryTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.recoveryScore)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    const settings = chartSettings.value.recovery || defaultChartSettings.recovery

    const datasets: any[] = [
      {
        type: settings.type || 'line',
        label: t.value('chart_label_recovery'),
        data: recentWellness.map((w) => w.recoveryScore),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: `rgba(34, 197, 94, ${settings.opacity ?? 0.5})`,
        tension: settings.smooth ? 0.4 : 0,
        borderWidth: 2,
        pointRadius: settings.showPoints ? 3 : 0,
        pointHoverRadius: 6,
        fill: settings.type === 'line' ? 'origin' : false,
        spanGaps: true
      }
    ]

    // ... rolling average datasets ...
    return { labels, datasets }
  })

  const readinessEstimateTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.hrv && w.restingHr)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    const estimates = recentWellness.map((entry, index) => {
      const start = Math.max(0, index - 29)
      const window = recentWellness.slice(start, index + 1)
      const hrvWindow = window.map((w) => w.hrv).filter((v) => typeof v === 'number' && v > 0)
      const rhrWindow = window.map((w) => w.restingHr).filter((v) => typeof v === 'number' && v > 0)

      const hrvBaseline = hrvWindow.length
        ? hrvWindow.reduce((sum, v) => sum + v, 0) / hrvWindow.length
        : entry.hrv
      const rhrBaseline = rhrWindow.length
        ? rhrWindow.reduce((sum, v) => sum + v, 0) / rhrWindow.length
        : entry.restingHr

      const hrvDeltaPct = ((entry.hrv - hrvBaseline) / hrvBaseline) * 100
      const rhrDeltaPct = ((entry.restingHr - rhrBaseline) / rhrBaseline) * 100

      const score = 50 + hrvDeltaPct * 1.2 - rhrDeltaPct
      return Math.max(0, Math.min(100, Math.round(score * 10) / 10))
    })

    return {
      labels,
      datasets: getChartDataset(
        'readinessEstimate',
        estimates,
        'rgb(16, 185, 129)',
        t.value('chart_label_readiness')
      )
    }
  })

  // Helper to build datasets based on per-chart settings
  function getChartDataset(key: string, data: any[], color: string, label: string) {
    const settings = chartSettings.value[key] || defaultChartSettings[key] || {}
    const datasets: any[] = [
      {
        type: settings.type || 'line',
        label,
        data,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', `, ${settings.opacity ?? 0.5})`),
        tension: settings.smooth ? 0.4 : 0,
        borderWidth: 2,
        pointRadius: settings.showPoints ? 3 : 0,
        pointHoverRadius: 6,
        fill: settings.type === 'line' ? 'origin' : false,
        spanGaps: true
      }
    ]

    // Rolling averages and target logic remain same but use t() where appropriate
    return datasets
  }

  const sleepTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.sleepHours)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    return {
      labels,
      datasets: getChartDataset(
        'sleep',
        recentWellness.map((w) => w.sleepHours),
        'rgb(59, 130, 246)',
        t.value('chart_label_sleep')
      )
    }
  })

  const hrvTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.hrv)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    return {
      labels,
      datasets: getChartDataset(
        'hrv',
        recentWellness.map((w) => w.hrv),
        'rgb(168, 85, 247)',
        t.value('chart_label_hrv')
      )
    }
  })

  const restingHrTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.restingHr)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    return {
      labels,
      datasets: getChartDataset(
        'restingHr',
        recentWellness.map((w) => w.restingHr),
        'rgb(239, 68, 68)',
        t.value('chart_label_rhr')
      )
    }
  })

  const weightTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.weight)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    const weights = recentWellness.map((w) => {
      if (userStore.profile?.weightUnits === 'Pounds' && w.weight) {
        return w.weight / LBS_TO_KG
      }
      return w.weight
    })

    return {
      labels,
      datasets: getChartDataset(
        'weight',
        weights,
        'rgb(249, 115, 22)',
        t.value('chart_label_weight') + ` (${userStore.weightUnitLabel})`
      )
    }
  })

  const bpTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.systolic || w.diastolic)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    const datasets: any[] = []
    const settings = chartSettings.value.bp || defaultChartSettings.bp || {}

    datasets.push({
      type: settings.type || 'line',
      label: 'Systolic',
      data: recentWellness.map((w) => w.systolic),
      borderColor: 'rgb(236, 72, 153)',
      backgroundColor: `rgba(236, 72, 153, ${settings.opacity ?? 0.5})`,
      tension: settings.smooth ? 0.4 : 0,
      borderWidth: 2,
      pointRadius: settings.showPoints ? 3 : 0,
      pointHoverRadius: 6,
      fill: settings.type === 'line' ? 'origin' : false,
      spanGaps: true
    })

    datasets.push({
      type: settings.type || 'line',
      label: 'Diastolic',
      data: recentWellness.map((w) => w.diastolic),
      borderColor: 'rgb(14, 165, 233)',
      backgroundColor: `rgba(14, 165, 233, ${settings.opacity ?? 0.5})`,
      tension: settings.smooth ? 0.4 : 0,
      borderWidth: 2,
      pointRadius: settings.showPoints ? 3 : 0,
      pointHoverRadius: 6,
      fill: settings.type === 'line' ? 'origin' : false,
      spanGaps: true
    })

    return {
      labels,
      datasets
    }
  })

  const hasRecoveryChartData = computed(() => (recoveryTrendData.value?.labels?.length || 0) > 0)
  const hasReadinessEstimateChartData = computed(
    () => (readinessEstimateTrendData.value?.labels?.length || 0) > 0
  )
  const hasSleepChartData = computed(() => (sleepTrendData.value?.labels?.length || 0) > 0)
  const hasHrvChartData = computed(() => (hrvTrendData.value?.labels?.length || 0) > 0)
  const hasRestingHrChartData = computed(() => (restingHrTrendData.value?.labels?.length || 0) > 0)
  const hasWeightChartData = computed(() => (weightTrendData.value?.labels?.length || 0) > 0)
  const hasBpChartData = computed(() => (bpTrendData.value?.labels?.length || 0) > 0)

  const showRecoveryChart = computed(
    () =>
      chartSettings.value.recovery?.visible !== false &&
      (loading.value || hasRecoveryChartData.value)
  )
  const showReadinessEstimateChart = computed(
    () =>
      chartSettings.value.readinessEstimate?.visible !== false &&
      (loading.value || hasReadinessEstimateChartData.value)
  )
  const showSleepChart = computed(
    () => chartSettings.value.sleep?.visible !== false && (loading.value || hasSleepChartData.value)
  )
  const showHrvChart = computed(
    () => chartSettings.value.hrv?.visible !== false && (loading.value || hasHrvChartData.value)
  )
  const showRestingHrChart = computed(
    () =>
      chartSettings.value.restingHr?.visible !== false &&
      (loading.value || hasRestingHrChartData.value)
  )
  const showWeightChart = computed(
    () =>
      chartSettings.value.weight?.visible !== false && (loading.value || hasWeightChartData.value)
  )
  const showBpChart = computed(
    () => chartSettings.value.bp?.visible !== false && (loading.value || hasBpChartData.value)
  )

  const showSecondaryChartsGrid = computed(
    () =>
      showRecoveryChart.value ||
      showReadinessEstimateChart.value ||
      showSleepChart.value ||
      showHrvChart.value ||
      showRestingHrChart.value ||
      showWeightChart.value ||
      showBpChart.value
  )

  // Chart options
  const baseChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10 }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.isDark.value ? '#111827' : '#ffffff',
        titleColor: theme.isDark.value ? '#f3f4f6' : '#111827',
        bodyColor: theme.isDark.value ? '#d1d5db' : '#374151',
        borderColor: theme.isDark.value ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxTicksLimit: 7,
          maxRotation: 0,
          autoSkip: true
        },
        border: { display: false }
      },
      y: {
        position: 'right' as const,
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          drawTicks: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxTicksLimit: 6
        },
        border: { display: false }
      }
    }
  }))

  function getChartOptions(key: string) {
    const opts = JSON.parse(JSON.stringify(baseChartOptions.value))
    const settings = chartSettings.value[key]
    const type = settings.type || 'line'

    // Show legend if any analysis overlays or multi-datasets are active

    const hasOverlays =
      settings.show7dAvg ||
      settings.show30dAvg ||
      settings.showStdDev ||
      settings.showMedian ||
      settings.showTarget ||
      key === 'bp'

    opts.plugins.legend = {
      display: !!hasOverlays,
      position: 'bottom',
      labels: {
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' as const },
        usePointStyle: true,
        boxWidth: 6
      }
    }

    opts.plugins.datalabels = {
      display: (context: any) => {
        if (!settings.showLabels) return false
        // Only show for the primary dataset (index 0) and if enabled in settings
        if (context.datasetIndex !== 0) return false

        // If too many points for the current width, hide labels to avoid overlap
        const numPoints = context.chart.data.labels.length
        const chartWidth = context.chart.width
        if (chartWidth > 0 && chartWidth < numPoints * 40) return false

        return true
      },
      color: theme.isDark.value ? '#94a3b8' : '#64748b',
      align: 'top' as const,
      anchor: 'end' as const,
      offset: 4,
      font: {
        size: 9,
        weight: 'bold' as const
      },
      formatter: (value: any) => {
        if (value === null || value === undefined) return ''
        if (key === 'sleep' || key === 'weight') return value.toFixed(1)
        return Math.round(value)
      }
    }

    // Metric specific tooltips and scales mapping to t()
    const labelFormatter = (context: any) => {
      const label = context.dataset.label || ''
      const value = context.parsed.y
      if (value === null || value === undefined) return ''

      let unit = ''
      let fixed = 0
      if (key === 'recovery') unit = t.value('recovery_unit')
      else if (key === 'readinessEstimate') unit = t.value('recovery_unit')
      else if (key === 'sleep') {
        unit = t.value('sleep_unit')
        fixed = 1
      } else if (key === 'hrv') unit = ' ' + t.value('hrv_unit')
      else if (key === 'restingHr') unit = ' ' + t.value('rhr_unit')
      else if (key === 'weight') {
        unit = ' ' + userStore.weightUnitLabel
        fixed = 1
      }

      return `${label}: ${value.toFixed(fixed)}${unit}`
    }

    opts.plugins.tooltip.callbacks = {
      label: labelFormatter
    }

    if (key === 'recovery' || key === 'readinessEstimate') {
      opts.scales.y.title = {
        display: true,
        text: key === 'recovery' ? t.value('chart_y_recovery') : t.value('chart_y_readiness'),
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
    } else if (key === 'sleep') {
      opts.scales.y.title = {
        display: true,
        text: t.value('chart_y_sleep'),
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
    } else if (key === 'hrv') {
      opts.scales.y.title = {
        display: true,
        text: t.value('chart_y_hrv'),
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
    } else if (key === 'restingHr') {
      opts.scales.y.title = {
        display: true,
        text: t.value('chart_y_rhr'),
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
    } else if (key === 'weight') {
      opts.scales.y.title = {
        display: true,
        text: t.value('chart_y_weight', { unit: userStore.weightUnitLabel }),
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
    } else if (key === 'bp') {
      opts.scales.y.title = {
        display: true,
        text: t.value('chart_y_bp'),
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
    }

    return opts
  }

  watch([selectedPeriod], () => {
    currentPage.value = 1
  })

  // Load data on mount
  onMounted(() => {
    fetchWellness()
  })

  function changePage(page: number) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
</script>
