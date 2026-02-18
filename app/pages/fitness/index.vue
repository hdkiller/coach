<template>
  <UDashboardPanel id="fitness">
    <template #header>
      <UDashboardNavbar title="Fitness Integrity">
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
              Customize
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
        <div class="p-0 sm:p-6 space-y-4 sm:space-y-6 pb-24">
          <FitnessSettingsModal v-model:open="isSettingsModalOpen" />
          <FitnessHrvRhrSettingsModal v-model:open="isHrvRhrSettingsModalOpen" />
          <FitnessChartSettingsModal
            v-if="activeMetricSettings"
            :metric-key="activeMetricSettings.key"
            :title="activeMetricSettings.title"
            :open="!!activeMetricSettings"
            @update:open="activeMetricSettings = null"
          />

          <!-- Dashboard Branding -->
          <div class="px-4 sm:px-0">
            <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Fitness
            </h1>
            <p
              class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
            >
              Wellness Biometrics & Recovery Integrity
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
            v-if="loading || allWellness.length > 0"
            class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
          >
            <FitnessTrendChart
              metric-key="recovery"
              title="Recovery Trajectory"
              :loading="loading"
              :data="recoveryTrendData"
              :options="getChartOptions('recovery')"
              :settings="chartSettings.recovery"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('recovery', 'Recovery')"
            />

            <FitnessTrendChart
              metric-key="sleep"
              title="Sleep Duration"
              :loading="loading"
              :data="sleepTrendData"
              :options="getChartOptions('sleep')"
              :settings="chartSettings.sleep"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('sleep', 'Sleep')"
            />

            <FitnessTrendChart
              metric-key="hrv"
              title="Heart Rate Variability"
              :loading="loading"
              :data="hrvTrendData"
              :options="getChartOptions('hrv')"
              :settings="chartSettings.hrv"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('hrv', 'HRV')"
            />

            <FitnessTrendChart
              metric-key="restingHr"
              title="Resting Heart Rate"
              :loading="loading"
              :data="restingHrTrendData"
              :options="getChartOptions('restingHr')"
              :settings="chartSettings.restingHr"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('restingHr', 'Resting HR')"
            />

            <FitnessTrendChart
              metric-key="weight"
              title="Mass Progression"
              :loading="loading"
              :data="weightTrendData"
              :options="getChartOptions('weight')"
              :settings="chartSettings.weight"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('weight', 'Weight')"
            />

            <FitnessTrendChart
              metric-key="bp"
              title="Blood Pressure"
              :loading="loading"
              :data="bpTrendData"
              :options="getChartOptions('bp')"
              :settings="chartSettings.bp"
              :plugins="[ChartDataLabels]"
              @settings="openChartSettings('bp', 'Blood Pressure')"
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
                  Recovery
                </span>
                <USelect
                  v-model="filterRecovery"
                  :items="recoveryStatusOptions"
                  placeholder="All Status"
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
                  Sleep
                </span>
                <USelect
                  v-model="filterSleep"
                  :items="sleepQualityOptions"
                  placeholder="All Quality"
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
            :total-pages="totalPages"
            :total-items="filteredWellness.length"
            :items-per-page="itemsPerPage"
            :visible-pages="visiblePages"
            @update:page="changePage"
          />
        </div>
      </ClientOnly>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { Line, Bar } from 'vue-chartjs'
  import ChartDataLabels from 'chartjs-plugin-datalabels'
  import FitnessSettingsModal from '~/components/fitness/FitnessSettingsModal.vue'
  import FitnessHrvRhrSettingsModal from '~/components/fitness/FitnessHrvRhrSettingsModal.vue'
  import FitnessChartSettingsModal from '~/components/fitness/FitnessChartSettingsModal.vue'
  import FitnessSummaryCards from '~/components/fitness/FitnessSummaryCards.vue'
  import FitnessTrendChart from '~/components/fitness/FitnessTrendChart.vue'
  import FitnessWellnessTable from '~/components/fitness/FitnessWellnessTable.vue'
  import FitnessHrvRhrDualChart from '~/components/fitness/HrvRhrDualChart.vue'
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
  const loading = ref(true)
  const allWellness = ref<any[]>([])
  const currentPage = ref(1)
  const itemsPerPage = 20

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
    }
    return merged
  })

  function openChartSettings(key: string, title: string) {
    activeMetricSettings.value = { key, title }
  }

  const selectedPeriod = ref<string | number>(30)
  const periodOptions = [
    { label: '7 Days', value: 7 },
    { label: '14 Days', value: 14 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: 'Year to Date', value: 'YTD' }
  ]

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
  const recoveryStatusOptions = [
    { label: 'Excellent (>80)', value: 'excellent' },
    { label: 'Good (60-80)', value: 'good' },
    { label: 'Fair (40-60)', value: 'fair' },
    { label: 'Poor (<40)', value: 'poor' }
  ]

  const sleepQualityOptions = [
    { label: 'Excellent (>8h)', value: 'excellent' },
    { label: 'Good (7-8h)', value: 'good' },
    { label: 'Fair (6-7h)', value: 'fair' },
    { label: 'Poor (<6h)', value: 'poor' }
  ]

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
        title: 'Error',
        description: 'Failed to load wellness data',
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

  const totalPages = computed(() => Math.ceil(filteredWellness.value.length / itemsPerPage))
  const visiblePages = computed(() => {
    const pages = []
    const maxVisible = 7
    let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages.value, start + maxVisible - 1)

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  })

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
        label: 'Recovery Score',
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

    // 7d Rolling Average
    if (settings.show7dAvg) {
      const avgData = recentWellness.map((_, index) => {
        const start = Math.max(0, index - 6)
        const window = recentWellness.slice(start, index + 1)
        const sum = window.reduce((acc, curr) => acc + curr.recoveryScore, 0)
        return sum / window.length
      })

      datasets.push({
        type: 'line',
        label: '7d Avg',
        data: avgData,
        borderColor: 'rgba(34, 197, 94, 0.4)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: settings.smooth ? 0.4 : 0,
        fill: false,
        spanGaps: true
      })
    }

    // 30d Rolling Average (Baseline)
    if (settings.show30dAvg || settings.showStdDev) {
      const avgData = recentWellness.map((_, index) => {
        const start = Math.max(0, index - 29)
        const window = recentWellness.slice(start, index + 1)
        const sum = window.reduce((acc, curr) => acc + curr.recoveryScore, 0)
        return sum / window.length
      })

      if (settings.show30dAvg) {
        datasets.push({
          type: 'line',
          label: '30d Avg',
          data: avgData,
          borderColor: 'rgba(34, 197, 94, 0.3)',
          backgroundColor: 'transparent',
          borderDash: [2, 2],
          borderWidth: 1.5,
          pointRadius: 0,
          tension: settings.smooth ? 0.4 : 0,
          fill: false,
          spanGaps: true
        })
      }

      // 1 Standard Deviation Band
      if (settings.showStdDev) {
        const stdDevData = recentWellness.map((_, index) => {
          const start = Math.max(0, index - 29)
          const window = recentWellness.slice(start, index + 1)
          const mean = window.reduce((a, b) => a + b.recoveryScore, 0) / window.length
          const variance =
            window.reduce((a, b) => a + Math.pow(b.recoveryScore - mean, 2), 0) / window.length
          return Math.sqrt(variance)
        })

        const upperBand = avgData.map((avg, i) => avg + stdDevData[i])
        const lowerBand = avgData.map((avg, i) => Math.max(0, avg - stdDevData[i]))

        datasets.push({
          type: 'line',
          label: 'Range Upper',
          data: upperBand,
          borderColor: 'transparent',
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          pointRadius: 0,
          tension: settings.smooth ? 0.4 : 0,
          fill: false,
          spanGaps: true
        })

        datasets.push({
          type: 'line',
          label: 'Normal Range',
          data: lowerBand,
          borderColor: 'transparent',
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          pointRadius: 0,
          tension: settings.smooth ? 0.4 : 0,
          fill: '-1',
          spanGaps: true
        })
      }
    }

    // Target Line
    if (settings.showTarget && settings.targetValue !== undefined) {
      datasets.push({
        type: 'line',
        label: 'Target',
        data: new Array(labels.length).fill(settings.targetValue),
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderDash: [2, 2],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        spanGaps: true
      })
    }

    return {
      labels,
      datasets
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

    // 7d Rolling Average
    if (settings.show7dAvg) {
      const avgData = data.map((_, index) => {
        const start = Math.max(0, index - 6)
        const window = data.slice(start, index + 1)
        const sum = window.reduce((acc, curr) => acc + curr, 0)
        return sum / window.length
      })

      datasets.push({
        type: 'line',
        label: '7d Avg',
        data: avgData,
        borderColor: color.replace('rgb', 'rgba').replace(')', ', 0.4)'),
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: settings.smooth ? 0.4 : 0,
        fill: false,
        spanGaps: true
      })
    }

    // 30d Rolling Average (Baseline)
    if (settings.show30dAvg || settings.showStdDev) {
      const avgData = data.map((_, index) => {
        const start = Math.max(0, index - 29)
        const window = data.slice(start, index + 1)
        const sum = window.reduce((acc, curr) => acc + curr, 0)
        return sum / window.length
      })

      if (settings.show30dAvg) {
        datasets.push({
          type: 'line',
          label: '30d Avg',
          data: avgData,
          borderColor: color.replace('rgb', 'rgba').replace(')', ', 0.3)'),
          backgroundColor: 'transparent',
          borderDash: [2, 2],
          borderWidth: 1.5,
          pointRadius: 0,
          tension: settings.smooth ? 0.4 : 0,
          fill: false,
          spanGaps: true
        })
      }

      // 1 Standard Deviation Band
      if (settings.showStdDev) {
        const stdDevData = data.map((_, index) => {
          const start = Math.max(0, index - 29)
          const window = data.slice(start, index + 1)
          const mean = window.reduce((a, b) => a + b, 0) / window.length
          const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window.length
          return Math.sqrt(variance)
        })

        const upperBand = avgData.map((avg, i) => avg + stdDevData[i])
        const lowerBand = avgData.map((avg, i) => Math.max(0, avg - stdDevData[i]))

        datasets.push({
          type: 'line',
          label: 'Range Upper',
          data: upperBand,
          borderColor: 'transparent',
          backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
          pointRadius: 0,
          tension: settings.smooth ? 0.4 : 0,
          fill: false,
          spanGaps: true
        })

        datasets.push({
          type: 'line',
          label: 'Normal Range',
          data: lowerBand,
          borderColor: 'transparent',
          backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
          pointRadius: 0,
          tension: settings.smooth ? 0.4 : 0,
          fill: '-1',
          spanGaps: true
        })
      }
    }

    if (settings.showTarget && settings.targetValue !== undefined) {
      datasets.push({
        type: 'line',
        label: 'Target',
        data: new Array(data.length).fill(settings.targetValue),
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderDash: [2, 2],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        spanGaps: true
      })
    }

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
        'Hours'
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
        'HRV (rMSSD)'
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
        'Resting HR (bpm)'
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

    return {
      labels,
      datasets: getChartDataset(
        'weight',
        recentWellness.map((w) => w.weight),
        'rgb(249, 115, 22)',
        'Weight (kg)'
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

    if (settings.showTarget && settings.targetValue !== undefined) {
      datasets.push({
        type: 'line',
        label: 'Target',
        data: new Array(labels.length).fill(settings.targetValue),
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderDash: [2, 2],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        spanGaps: true
      })
    }

    return {
      labels,
      datasets
    }
  })

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
          maxRotation: 0
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
          maxTicksLimit: 5
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
      key === 'bp' ||
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
        // Only show for the primary dataset (index 0) and if enabled in settings
        return settings.showLabels && context.datasetIndex === 0
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

    // Metric specific overrides
    const labelFormatter = (context: any) => {
      const label = context.dataset.label || ''
      const value = context.parsed.y
      if (value === null || value === undefined) return ''

      let unit = ''
      let fixed = 0
      if (key === 'recovery') unit = '%'
      else if (key === 'sleep') {
        unit = 'h'
        fixed = 1
      } else if (key === 'hrv') unit = 'ms'
      else if (key === 'restingHr') unit = ' bpm'
      else if (key === 'weight') {
        unit = 'kg'
        fixed = 1
      }

      return `${label}: ${value.toFixed(fixed)}${unit}`
    }

    opts.plugins.tooltip.callbacks = {
      label: labelFormatter
    }

    if (key === 'recovery') {
      opts.scales.y.title = {
        display: true,
        text: 'Recovery %',
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
      opts.scales.y.min = settings.yScale === 'fixed' ? settings.yMin || 0 : undefined
      opts.scales.y.suggestedMax = settings.yScale === 'fixed' ? 100 : undefined
    } else if (key === 'sleep') {
      opts.scales.y.title = {
        display: true,
        text: 'Hours (h)',
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
      opts.scales.y.min = settings.yScale === 'fixed' ? settings.yMin || 0 : undefined
      opts.scales.y.suggestedMax = settings.yScale === 'fixed' ? 12 : undefined
      opts.scales.y.beginAtZero = false
    } else if (key === 'hrv') {
      opts.scales.y.title = {
        display: true,
        text: 'Variability (ms)',
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
      opts.scales.y.min = settings.yScale === 'fixed' ? settings.yMin || 0 : undefined
      opts.scales.y.beginAtZero = false
    } else if (key === 'restingHr') {
      opts.scales.y.title = {
        display: true,
        text: 'Resting HR (bpm)',
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
      opts.scales.y.min = settings.yScale === 'fixed' ? settings.yMin || 0 : undefined
      opts.scales.y.beginAtZero = false
    } else if (key === 'weight') {
      opts.scales.y.title = {
        display: true,
        text: 'Mass (kg)',
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
      opts.scales.y.min = settings.yScale === 'fixed' ? settings.yMin || 0 : undefined
      opts.scales.y.beginAtZero = false
    } else if (key === 'bp') {
      opts.scales.y.title = {
        display: true,
        text: 'Pressure (mmHg)',
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' }
      }
      opts.scales.y.beginAtZero = false
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
