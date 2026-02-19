<template>
  <UDashboardPanel id="workouts">
    <template #header>
      <UDashboardNavbar title="Performance Integrity">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-3">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>

            <USelect
              v-model="selectedPeriod"
              :items="periodOptions"
              size="sm"
              class="w-32"
              color="neutral"
              variant="outline"
            />

            <UButton
              :loading="analyzingWorkouts"
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-heroicons-cpu-chip"
              class="font-bold"
              @click="analyzeAllWorkouts"
            >
              <span class="hidden sm:inline">Analyze All</span>
              <span class="sm:hidden">Sync</span>
            </UButton>

            <UButton
              :loading="generatingExplanations"
              color="primary"
              variant="solid"
              icon="i-heroicons-sparkles"
              size="sm"
              class="font-bold"
              @click="generateExplanations"
            >
              <span class="hidden sm:inline">Generate Insights</span>
              <span class="sm:hidden">AI</span>
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-4 sm:space-y-6">
        <!-- Dashboard Branding -->
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Workouts
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Performance Integrity & Root Cause Analysis
          </p>
        </div>

        <!-- Main 2:1 Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <!-- MAIN COLUMN (Left 2/3) -->
          <div class="lg:col-span-2 space-y-4 sm:space-y-6">
            <!-- Summary Stats (Mini) -->
            <WorkoutSummary
              :total-workouts="totalWorkouts"
              :analyzed-workouts="analyzedWorkouts"
              :avg-score="avgScore"
              :total-hours="totalHours"
              :trends="summaryTrends"
              @open-metric="openSummaryMetricModal"
            />

            <!-- Score Trend Chart (Primary Visualization) -->
            <WorkoutTrajectoryCard
              :loading="workoutTrendsLoading"
              :data="workoutTrendsData?.workouts || []"
              :settings="chartSettings.performance"
              @settings="
                openChartSettings('performance', 'Performance Trajectory', {
                  max: 10,
                  step: 1,
                  showOverlays: false
                })
              "
            />

            <!-- Training Load & Volume Mix -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <WorkoutTrainingLoadCard
                :loading="loading"
                :chart-data="trainingLoadData"
                :chart-options="trainingLoadChartOptions"
                :settings="chartSettings.trainingLoad"
                :stats="trainingLoadStats"
                @settings="
                  openChartSettings('trainingLoad', 'Training Load', {
                    unit: ' pts',
                    max: 500,
                    step: 10,
                    showOverlays: false,
                    defaultType: 'bar'
                  })
                "
              />

              <WorkoutWeeklyVolumeCard
                :loading="loading"
                :chart-data="weeklyVolumeData"
                :chart-options="weeklyVolumeChartOptions"
                :settings="chartSettings.weeklyVolume"
                :stats="weeklyVolumeStats"
                @settings="
                  openChartSettings('weeklyVolume', 'Weekly Volume', {
                    unit: 'h',
                    max: 50,
                    step: 1,
                    showOverlays: false,
                    defaultType: 'bar'
                  })
                "
              />
            </div>

            <WorkoutRelativeEffortCard
              v-model:band-preset="relativeEffortBandPreset"
              :chart-data="relativeEffortData"
              :chart-options="relativeEffortChartOptions"
              :settings="chartSettings.relativeEffort"
              :plugins="[ChartDataLabels]"
              :status-class="relativeEffortStatusClass"
              :status-title="relativeEffortStatusTitle"
              :status-message="relativeEffortStatusMessage"
              :current-score="relativeEffortCurrentScore"
              :range-label="relativeEffortRangeLabel"
              :band-label="relativeEffortBandLabel"
              :band-options="relativeEffortBandOptions"
              @settings="
                openChartSettings('relativeEffort', 'Relative Effort', {
                  unit: ' pts',
                  max: 500,
                  step: 10,
                  showOverlays: false
                })
              "
              @explain="openRelativeEffortExplain"
            />
          </div>

          <!-- SIDEBAR (Right 1/3) -->
          <div class="space-y-4 sm:space-y-6">
            <!-- Biometric Integrity Radar -->
            <UCard
              :ui="{
                root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
                body: 'p-4 sm:p-6'
              }"
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-swatch" class="size-4 text-blue-500" />
                  <h3
                    class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider"
                  >
                    Execution Balance
                  </h3>
                </div>
              </template>
              <div v-if="workoutTrendsLoading" class="h-[320px] flex items-center justify-center">
                <UIcon name="i-heroicons-arrow-path" class="size-6 animate-spin text-gray-400" />
              </div>
              <div v-else class="flex justify-center h-[320px]">
                <ClientOnly>
                  <RadarChart
                    :scores="{
                      overall: workoutTrendsData?.summary?.avgOverall ?? null,
                      technical: workoutTrendsData?.summary?.avgTechnical ?? null,
                      effort: workoutTrendsData?.summary?.avgEffort ?? null,
                      pacing: workoutTrendsData?.summary?.avgPacing ?? null,
                      execution: workoutTrendsData?.summary?.avgExecution ?? null
                    }"
                    type="workout"
                    :height="320"
                  />
                </ClientOnly>
              </div>
            </UCard>

            <!-- Scoreboard (Stacked) -->
            <div class="grid grid-cols-1 gap-3">
              <div class="flex items-center gap-2 px-1">
                <UIcon name="i-heroicons-presentation-chart-line" class="size-4 text-amber-500" />
                <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Performance Scoreboard
                </h3>
              </div>
              <ScoreCard
                title="Overall Quality"
                :score="workoutTrendsData?.summary?.avgOverall ?? null"
                icon="i-heroicons-star"
                color="yellow"
                compact
                explanation="Cross-metric average"
                @click="
                  openWorkoutModal(
                    'Overall Workout Performance',
                    workoutTrendsData?.summary?.avgOverall ?? null,
                    'yellow'
                  )
                "
              />
              <ScoreCard
                title="Technical Precision"
                :score="workoutTrendsData?.summary?.avgTechnical ?? null"
                icon="i-heroicons-cog"
                color="blue"
                compact
                explanation="Efficiency & Form"
                @click="
                  openWorkoutModal(
                    'Technical Execution',
                    workoutTrendsData?.summary?.avgTechnical ?? null,
                    'blue'
                  )
                "
              />
              <ScoreCard
                title="Effort Discipline"
                :score="workoutTrendsData?.summary?.avgEffort ?? null"
                icon="i-heroicons-fire"
                color="red"
                compact
                explanation="Intensity vs Plan"
                @click="
                  openWorkoutModal(
                    'Effort Management',
                    workoutTrendsData?.summary?.avgEffort ?? null,
                    'red'
                  )
                "
              />
              <ScoreCard
                title="Execution Accuracy"
                :score="workoutTrendsData?.summary?.avgExecution ?? null"
                icon="i-heroicons-check-circle"
                color="purple"
                compact
                explanation="Target adherence"
                @click="
                  openWorkoutModal(
                    'Workout Execution',
                    workoutTrendsData?.summary?.avgExecution ?? null,
                    'purple'
                  )
                "
              />
            </div>

            <!-- Activity Distribution -->
            <WorkoutDistributionCard
              :loading="loading"
              :chart-data="activityDistributionData"
              :chart-options="doughnutChartOptions"
              :settings="chartSettings.distribution"
              :plugins="[ChartDataLabels]"
              @settings="
                openChartSettings('distribution', 'Volume Distribution', { showOverlays: false })
              "
            />
          </div>

          <!-- Workout History Table Area (Moved to last for mobile, full width on desktop) -->
          <div class="lg:col-span-3 space-y-4">
            <UCard
              :ui="{
                root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
                body: 'p-3'
              }"
              class="bg-gray-50/50 dark:bg-gray-900/40 border-dashed border-gray-200 dark:border-gray-800"
            >
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <USelect
                  v-model="filterType"
                  :items="activityTypeOptions"
                  placeholder="Filter Sport"
                  size="sm"
                  color="neutral"
                  variant="outline"
                />
                <USelect
                  v-model="filterAnalysis"
                  :items="analysisStatusOptions"
                  placeholder="Filter Status"
                  size="sm"
                  color="neutral"
                  variant="outline"
                />
                <USelect
                  v-model="filterSource"
                  :items="sourceOptions"
                  placeholder="Filter Source"
                  size="sm"
                  color="neutral"
                  variant="outline"
                />
              </div>
            </UCard>

            <WorkoutTable
              v-model:current-page="currentPage"
              :workouts="paginatedWorkouts"
              :loading="loading"
              :total-pages="totalPages"
              :total-workouts="filteredWorkouts.length"
              :visible-pages="visiblePages"
              @navigate="navigateToWorkout"
            />
          </div>
        </div>

        <!-- Chart Settings Modal -->
        <ChartSettingsModal
          v-if="activeMetricSettings"
          :metric-key="activeMetricSettings.key"
          :title="activeMetricSettings.title"
          :group-key="'workoutCharts'"
          :unit="activeMetricSettings.unit"
          :max="activeMetricSettings.max"
          :step="activeMetricSettings.step"
          :show-overlays="activeMetricSettings.showOverlays"
          :default-type="activeMetricSettings.defaultType"
          :open="!!activeMetricSettings"
          @update:open="activeMetricSettings = null"
        />

        <!-- Score Detail Modal -->
        <ScoreDetailModal
          v-model="showModal"
          :title="modalData.title"
          :score="modalData.score"
          :explanation="modalData.explanation"
          :analysis-data="modalData.analysisData"
          :color="modalData.color"
        />

        <UModal
          v-model:open="showRelativeEffortExplain"
          :ui="{ content: 'sm:max-w-lg' }"
          title="Dialog"
          description="Dialog content and actions."
        >
          <template #content>
            <div class="p-5 space-y-4">
              <div>
                <h3
                  class="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white"
                >
                  {{ relativeEffortExplainTitle }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {{ relativeEffortExplainSummary }}
                </p>
              </div>

              <div class="space-y-2">
                <div class="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p class="text-[10px] uppercase tracking-wider text-gray-500">Computation</p>
                  <p class="text-sm text-gray-800 dark:text-gray-100 mt-1">
                    {{ relativeEffortExplainComputation }}
                  </p>
                </div>
                <div class="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p class="text-[10px] uppercase tracking-wider text-gray-500">Data Window</p>
                  <p class="text-sm text-gray-800 dark:text-gray-100 mt-1">
                    {{ relativeEffortExplainWindow }}
                  </p>
                </div>
              </div>

              <div class="flex justify-end">
                <UButton color="neutral" variant="soft" @click="showRelativeEffortExplain = false">
                  Close
                </UButton>
              </div>
            </div>
          </template>
        </UModal>

        <UModal
          v-model:open="showSummaryMetricModal"
          :ui="{ content: 'sm:max-w-lg' }"
          title="Dialog"
          description="Dialog content and actions."
        >
          <template #content>
            <div class="p-5 space-y-4">
              <div>
                <h3
                  class="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white"
                >
                  {{ selectedSummaryMetricConfig.title }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {{ selectedSummaryMetricConfig.description }}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div class="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p class="text-[10px] uppercase tracking-wider text-gray-500">Current Period</p>
                  <p class="text-lg font-black text-gray-900 dark:text-white mt-1">
                    {{ selectedSummaryMetricComparison.currentLabel }}
                  </p>
                </div>
                <div class="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p class="text-[10px] uppercase tracking-wider text-gray-500">Previous Period</p>
                  <p class="text-lg font-black text-gray-900 dark:text-white mt-1">
                    {{ selectedSummaryMetricComparison.previousLabel }}
                  </p>
                </div>
              </div>

              <div class="space-y-2">
                <div class="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p class="text-[10px] uppercase tracking-wider text-gray-500">Trend</p>
                  <p class="text-sm text-gray-800 dark:text-gray-100 mt-1">
                    {{ selectedSummaryMetricComparison.percentDeltaLabel }}
                  </p>
                </div>
                <div class="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p class="text-[10px] uppercase tracking-wider text-gray-500">Absolute Delta</p>
                  <p class="text-sm text-gray-800 dark:text-gray-100 mt-1">
                    {{ selectedSummaryMetricComparison.absoluteDeltaLabel }}
                  </p>
                </div>
                <div class="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p class="text-[10px] uppercase tracking-wider text-gray-500">
                    Comparison Window
                  </p>
                  <p class="text-sm text-gray-800 dark:text-gray-100 mt-1">
                    {{ summaryWindowLabel }}
                  </p>
                </div>
              </div>

              <div class="flex justify-end">
                <UButton color="neutral" variant="soft" @click="showSummaryMetricModal = false">
                  Close
                </UButton>
              </div>
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { Bar, Doughnut, Line } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
  } from 'chart.js'
  import WorkoutSummary from '~/components/workouts/WorkoutSummary.vue'
  import WorkoutTable from '~/components/workouts/WorkoutTable.vue'
  import TrendChart from '~/components/TrendChart.vue'
  import RadarChart from '~/components/RadarChart.vue'
  import ScoreCard from '~/components/ScoreCard.vue'
  import ChartSettingsModal from '~/components/charts/ChartSettingsModal.vue'
  import WorkoutTrajectoryCard from '~/components/workouts/WorkoutTrajectoryCard.vue'
  import WorkoutTrainingLoadCard from '~/components/workouts/WorkoutTrainingLoadCard.vue'
  import WorkoutWeeklyVolumeCard from '~/components/workouts/WorkoutWeeklyVolumeCard.vue'
  import WorkoutRelativeEffortCard from '~/components/workouts/WorkoutRelativeEffortCard.vue'
  import WorkoutDistributionCard from '~/components/workouts/WorkoutDistributionCard.vue'
  import ChartDataLabels from 'chartjs-plugin-datalabels'

  // Register Chart.js components
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    {
      id: 'currentWeekMarker',
      afterDatasetsDraw(chart, _args, pluginOptions: any) {
        const markerIndex = pluginOptions?.index
        if (typeof markerIndex !== 'number') return

        const xScale = chart.scales.x
        const yScale = chart.scales.y
        if (!xScale || !yScale) return

        const x = xScale.getPixelForValue(markerIndex)
        if (!Number.isFinite(x)) return

        const ctx = chart.ctx
        ctx.save()
        ctx.strokeStyle = pluginOptions?.color || '#a855f7'
        ctx.lineWidth = pluginOptions?.width || 2
        ctx.beginPath()
        ctx.moveTo(x, yScale.top)
        ctx.lineTo(x, yScale.bottom)
        ctx.stroke()
        ctx.restore()
      }
    }
  )

  const { formatDate, getUserLocalDate, timezone } = useFormat()

  definePageMeta({
    middleware: 'auth',
    layout: 'default'
  })

  useHead({
    title: 'Workouts',
    meta: [
      {
        name: 'description',
        content:
          'View and analyze your training sessions with AI-powered insights for every workout.'
      }
    ]
  })

  const toast = useToast()
  const colorMode = useColorMode()
  const theme = useTheme()
  const userStore = useUserStore()
  const loading = ref(true)
  const analyzingWorkouts = ref(false)
  const allWorkouts = ref<any[]>([])
  const currentPage = ref(1)
  const itemsPerPage = 20

  const activeMetricSettings = ref<{
    key: string
    title: string
    unit?: string
    max?: number
    step?: number
    showOverlays?: boolean
    defaultType?: 'line' | 'bar'
  } | null>(null)

  const defaultChartSettings: any = {
    performance: { smooth: true, showPoints: false, showLabels: false, yScale: 'dynamic', yMin: 0 },
    trainingLoad: { type: 'bar', showLabels: false, yScale: 'dynamic', yMin: 0 },
    weeklyVolume: { type: 'bar', showLabels: false, yScale: 'dynamic', yMin: 0 },
    relativeEffort: {
      smooth: true,
      showPoints: true,
      showLabels: false,
      yScale: 'dynamic',
      yMin: 0
    },
    distribution: { showLabels: false }
  }

  const chartSettings = computed(() => {
    const userSettings = userStore.user?.dashboardSettings?.workoutCharts || {}
    const merged: any = {}
    for (const key in defaultChartSettings) {
      merged[key] = {
        ...defaultChartSettings[key],
        ...(userSettings[key] || {})
      }
    }
    return merged
  })

  function openChartSettings(key: string, title: string, options: any = {}) {
    activeMetricSettings.value = { key, title, ...options }
  }

  // Background Task Monitoring
  const { refresh: refreshRuns } = useUserRuns()
  const { onTaskCompleted } = useUserRunsState()

  // Listeners
  onTaskCompleted('analyze-workout', async () => {
    await fetchWorkouts()
    analyzingWorkouts.value = false
    toast.add({
      title: 'Analysis Complete',
      description: 'Workout analysis has been updated.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  })

  onTaskCompleted('generate-score-explanations', async () => {
    await refreshNuxtData('workout-trends')
    generatingExplanations.value = false
    toast.add({
      title: 'Insights Ready',
      description: 'Workout insights have been generated.',
      color: 'success',
      icon: 'i-heroicons-sparkles'
    })
  })

  // Filters
  const filterType = ref<string | undefined>(undefined)
  const filterAnalysis = ref<string | undefined>(undefined)
  const filterSource = ref<string | undefined>(undefined)

  // Filter options
  const activityTypeOptions = [
    { label: 'Run', value: 'Run' },
    { label: 'Ride', value: 'Ride' },
    { label: 'Swim', value: 'Swim' },
    { label: 'Other', value: 'Other' }
  ]

  const analysisStatusOptions = [
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Processing', value: 'PROCESSING' },
    { label: 'Not Started', value: 'NOT_STARTED' }
  ]

  const sourceOptions = [
    { label: 'Intervals.icu', value: 'intervals' },
    { label: 'Strava', value: 'strava' },
    { label: 'Whoop', value: 'whoop' },
    { label: 'Garmin', value: 'garmin' }
  ]

  // Fetch all workouts
  async function fetchWorkouts() {
    loading.value = true
    try {
      // Fetch up to 1000 workouts for better history in charts
      // The payload is now optimized (COACH-WATTS-7) so this is safe
      const workouts = await $fetch('/api/workouts', {
        query: { limit: 1000 }
      })
      allWorkouts.value = workouts
    } catch (error) {
      console.error('Error fetching workouts:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to load workouts',
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

  // Computed properties
  function atStartOfDay(date: Date): Date {
    const next = new Date(date)
    next.setHours(0, 0, 0, 0)
    return next
  }

  function atEndOfDay(date: Date): Date {
    const next = new Date(date)
    next.setHours(23, 59, 59, 999)
    return next
  }

  function differenceInDaysInclusive(start: Date, end: Date): number {
    const oneDay = 24 * 60 * 60 * 1000
    return Math.floor((atStartOfDay(end).getTime() - atStartOfDay(start).getTime()) / oneDay) + 1
  }

  function getSummaryPeriodWindow() {
    const now = getUserLocalDate()
    const currentEnd = atEndOfDay(now)
    let currentStart: Date
    let periodDays: number

    if (selectedPeriod.value === 'YTD') {
      currentStart = atStartOfDay(new Date(now.getFullYear(), 0, 1))
      periodDays = differenceInDaysInclusive(currentStart, currentEnd)
    } else {
      const days =
        typeof selectedPeriod.value === 'string'
          ? parseInt(selectedPeriod.value)
          : selectedPeriod.value
      periodDays = days || 30
      currentStart = atStartOfDay(new Date(now))
      currentStart.setDate(currentStart.getDate() - (periodDays - 1))
    }

    const previousStart = new Date(currentStart)
    previousStart.setDate(previousStart.getDate() - periodDays)
    const previousEnd = new Date(currentStart)
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1)

    return { currentStart, currentEnd, previousStart, previousEnd }
  }

  const summaryPeriodWindow = computed(() => getSummaryPeriodWindow())

  function inDateRange(date: Date, start: Date, end: Date): boolean {
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
  }

  const workoutsInCurrentPeriod = computed(() => {
    const { currentStart, currentEnd } = summaryPeriodWindow.value
    return allWorkouts.value.filter((w) => inDateRange(new Date(w.date), currentStart, currentEnd))
  })

  const workoutsInPreviousPeriod = computed(() => {
    const { previousStart, previousEnd } = summaryPeriodWindow.value
    return allWorkouts.value.filter((w) =>
      inDateRange(new Date(w.date), previousStart, previousEnd)
    )
  })

  function calcAvgScore(workouts: any[]): number | null {
    const withScores = workouts.filter(
      (w) => typeof w.overallScore === 'number' && w.overallScore > 0
    )
    if (withScores.length === 0) return null
    return withScores.reduce((sum, w) => sum + w.overallScore, 0) / withScores.length
  }

  function calcTotalHours(workouts: any[]): number {
    const totalSec = workouts.reduce((sum, w) => sum + (w.durationSec || 0), 0)
    return Math.round(totalSec / 3600)
  }

  const totalWorkouts = computed(() => workoutsInCurrentPeriod.value.length)
  const analyzedWorkouts = computed(
    () => workoutsInCurrentPeriod.value.filter((w) => w.aiAnalysisStatus === 'COMPLETED').length
  )
  const avgScore = computed(() => calcAvgScore(workoutsInCurrentPeriod.value))
  const totalHours = computed(() => calcTotalHours(workoutsInCurrentPeriod.value))

  const summaryMetricConfigs = {
    totalWorkouts: {
      title: 'Total Workouts',
      description: 'Count of workouts completed during the selected period.',
      trendType: 'higher-is-better' as const,
      unit: ''
    },
    analyzedWorkouts: {
      title: 'AI Analyzed',
      description: 'How many workouts in this period have completed AI analysis.',
      trendType: 'higher-is-better' as const,
      unit: ''
    },
    avgScore: {
      title: 'Average Score',
      description: 'Average workout quality score for sessions with a score in this period.',
      trendType: 'higher-is-better' as const,
      unit: 'pts'
    },
    totalHours: {
      title: 'Total Volume',
      description: 'Total completed training time in hours during this period.',
      trendType: 'higher-is-better' as const,
      unit: 'h'
    }
  }

  const previousTotalWorkouts = computed(() => workoutsInPreviousPeriod.value.length)
  const previousAnalyzedWorkouts = computed(
    () => workoutsInPreviousPeriod.value.filter((w) => w.aiAnalysisStatus === 'COMPLETED').length
  )
  const previousAvgScore = computed(() => calcAvgScore(workoutsInPreviousPeriod.value))
  const previousTotalHours = computed(() => calcTotalHours(workoutsInPreviousPeriod.value))

  function percentDelta(current: number, previous: number): number | null {
    if (!Number.isFinite(previous) || previous <= 0) return null
    return ((current - previous) / previous) * 100
  }

  function formatNumericDelta(current: number, previous: number, unit = ''): string {
    const delta = current - previous
    const sign = delta > 0 ? '+' : ''
    if (unit) return `${sign}${delta.toFixed(1)} ${unit}`
    return `${sign}${Math.round(delta)}`
  }

  function formatPercentDeltaLabel(current: number, previous: number): string {
    const delta = percentDelta(current, previous)
    if (delta === null) return 'No prior baseline'
    const sign = delta > 0 ? '+' : ''
    if (Math.abs(delta) < 0.1) return '0% vs previous period'
    return `${sign}${delta.toFixed(0)}% vs previous period`
  }

  function formatSummaryValue(
    metric: 'totalWorkouts' | 'analyzedWorkouts' | 'avgScore' | 'totalHours',
    value: number | null
  ): string {
    if (value === null || Number.isNaN(value)) return 'N/A'
    if (metric === 'avgScore') return `${value.toFixed(1)}`
    if (metric === 'totalHours') return `${Math.round(value)}h`
    return `${Math.round(value)}`
  }

  function openSummaryMetricModal(
    metric: 'totalWorkouts' | 'analyzedWorkouts' | 'avgScore' | 'totalHours'
  ) {
    selectedSummaryMetric.value = metric
    showSummaryMetricModal.value = true
  }

  const summaryWindowLabel = computed(() => {
    const { currentStart, currentEnd, previousStart, previousEnd } = summaryPeriodWindow.value
    const currentLabel = `${formatDate(currentStart, 'MMM d')} - ${formatDate(currentEnd, 'MMM d')}`
    const previousLabel = `${formatDate(previousStart, 'MMM d')} - ${formatDate(previousEnd, 'MMM d')}`
    return `Current: ${currentLabel} vs Previous: ${previousLabel}`
  })

  const summaryComparisons = computed(() => {
    const avgCurrent = avgScore.value
    const avgPrevious = previousAvgScore.value

    return {
      totalWorkouts: {
        current: totalWorkouts.value,
        previous: previousTotalWorkouts.value,
        currentLabel: formatSummaryValue('totalWorkouts', totalWorkouts.value),
        previousLabel: formatSummaryValue('totalWorkouts', previousTotalWorkouts.value),
        percentDeltaLabel: formatPercentDeltaLabel(
          totalWorkouts.value,
          previousTotalWorkouts.value
        ),
        absoluteDeltaLabel: `${formatNumericDelta(totalWorkouts.value, previousTotalWorkouts.value)} workouts`
      },
      analyzedWorkouts: {
        current: analyzedWorkouts.value,
        previous: previousAnalyzedWorkouts.value,
        currentLabel: formatSummaryValue('analyzedWorkouts', analyzedWorkouts.value),
        previousLabel: formatSummaryValue('analyzedWorkouts', previousAnalyzedWorkouts.value),
        percentDeltaLabel: formatPercentDeltaLabel(
          analyzedWorkouts.value,
          previousAnalyzedWorkouts.value
        ),
        absoluteDeltaLabel: `${formatNumericDelta(analyzedWorkouts.value, previousAnalyzedWorkouts.value)} analyzed workouts`
      },
      avgScore: {
        current: avgCurrent,
        previous: avgPrevious,
        currentLabel: formatSummaryValue('avgScore', avgCurrent),
        previousLabel: formatSummaryValue('avgScore', avgPrevious),
        percentDeltaLabel:
          avgCurrent !== null && avgPrevious !== null
            ? formatPercentDeltaLabel(avgCurrent, avgPrevious)
            : 'No prior baseline',
        absoluteDeltaLabel:
          avgCurrent !== null && avgPrevious !== null
            ? `${formatNumericDelta(avgCurrent, avgPrevious, 'pts')}`
            : 'No prior baseline'
      },
      totalHours: {
        current: totalHours.value,
        previous: previousTotalHours.value,
        currentLabel: formatSummaryValue('totalHours', totalHours.value),
        previousLabel: formatSummaryValue('totalHours', previousTotalHours.value),
        percentDeltaLabel: formatPercentDeltaLabel(totalHours.value, previousTotalHours.value),
        absoluteDeltaLabel: `${formatNumericDelta(totalHours.value, previousTotalHours.value, 'h')}`
      }
    }
  })

  const summaryTrends = computed(() => ({
    totalWorkouts: {
      previous: previousTotalWorkouts.value,
      type: summaryMetricConfigs.totalWorkouts.trendType
    },
    analyzedWorkouts: {
      previous: previousAnalyzedWorkouts.value,
      type: summaryMetricConfigs.analyzedWorkouts.trendType
    },
    avgScore: {
      previous: previousAvgScore.value ?? 0,
      type: summaryMetricConfigs.avgScore.trendType
    },
    totalHours: {
      previous: previousTotalHours.value,
      type: summaryMetricConfigs.totalHours.trendType
    }
  }))

  const selectedSummaryMetricConfig = computed(
    () => summaryMetricConfigs[selectedSummaryMetric.value]
  )
  const selectedSummaryMetricComparison = computed(
    () => summaryComparisons.value[selectedSummaryMetric.value]
  )

  const filteredWorkouts = computed(() => {
    let workouts = [...allWorkouts.value]

    if (filterType.value) {
      workouts = workouts.filter((w) => w.type === filterType.value)
    }

    if (filterAnalysis.value) {
      if (filterAnalysis.value === 'NOT_STARTED') {
        workouts = workouts.filter((w) => !w.aiAnalysisStatus)
      } else {
        workouts = workouts.filter((w) => w.aiAnalysisStatus === filterAnalysis.value)
      }
    }

    if (filterSource.value) {
      workouts = workouts.filter((w) => w.source === filterSource.value)
    }

    return workouts
  })

  const totalPages = computed(() => Math.ceil(filteredWorkouts.value.length / itemsPerPage))

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

  const paginatedWorkouts = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredWorkouts.value.slice(start, end)
  })

  // Functions
  function navigateToWorkout(id: string) {
    navigateTo(`/workouts/${id}`)
  }

  async function analyzeAllWorkouts() {
    analyzingWorkouts.value = true
    try {
      const response: any = await $fetch('/api/workouts/analyze-all', {
        method: 'POST'
      })
      refreshRuns()

      toast.add({
        title: 'Analysis Started',
        description: response.message,
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
    } catch (error: any) {
      analyzingWorkouts.value = false
      toast.add({
        title: 'Analysis Failed',
        description: error.data?.message || error.message || 'Failed to start analysis',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    }
  }

  // Score trends and insights functionality
  const generatingExplanations = ref(false)
  const selectedPeriod = ref<string | number>(30)

  // Fetch workout trends data
  const { data: workoutTrendsData, pending: workoutTrendsLoading } = await useFetch(
    '/api/scores/workout-trends',
    {
      query: { days: selectedPeriod }
    }
  )

  // Modal state
  const showModal = ref(false)
  const showSummaryMetricModal = ref(false)
  const selectedSummaryMetric = ref<
    'totalWorkouts' | 'analyzedWorkouts' | 'avgScore' | 'totalHours'
  >('totalWorkouts')
  const modalData = ref<{
    title: string
    score: number | null
    explanation: string | null
    analysisData?: any
    color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan'
  }>({
    title: '',
    score: null,
    explanation: null,
    analysisData: undefined,
    color: undefined
  })
  const showRelativeEffortExplain = ref(false)
  const relativeEffortExplainTarget = ref<'week' | 'range'>('week')
  const relativeEffortBandPreset = ref<'P20_P80' | 'P25_P75' | 'P30_P70' | 'AVG_20'>('P25_P75')

  // Generate all score explanations (batch job)
  async function generateExplanations() {
    generatingExplanations.value = true
    try {
      const response: any = await $fetch('/api/scores/generate-explanations', {
        method: 'POST'
      })
      refreshRuns()

      toast.add({
        title: 'Generating Insights',
        description:
          response.message || 'AI is analyzing your workout data. This may take a few minutes.',
        color: 'success',
        icon: 'i-heroicons-sparkles'
      })
    } catch (error: any) {
      generatingExplanations.value = false
      toast.add({
        title: 'Generation Failed',
        description: error.data?.message || error.message || 'Failed to generate insights',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    }
  }

  // Open workout modal with AI insights
  async function openWorkoutModal(title: string, score: number | null, color?: string) {
    if (!score) return

    const metricName = getWorkoutMetricName(title)

    modalData.value = {
      title,
      score,
      explanation: 'Loading insights...',
      analysisData: undefined,
      color: color as any
    }
    showModal.value = true

    try {
      const response: any = await $fetch('/api/scores/explanation', {
        query: {
          type: 'workout',
          period: selectedPeriod.value.toString(),
          metric: metricName
        }
      })

      if (response.cached === false && response.generating) {
        // Wait 3 seconds and retry
        await new Promise((resolve) => setTimeout(resolve, 3000))
        const retryResponse: any = await $fetch('/api/scores/explanation', {
          query: {
            type: 'workout',
            period: selectedPeriod.value.toString(),
            metric: metricName
          }
        })
        modalData.value.analysisData = retryResponse.analysis
        modalData.value.explanation = null
      } else if (response.cached === false && !response.generating) {
        // Not cached and not generating (manual trigger required)
        modalData.value.explanation =
          response.message || 'No insights available. Click "Insights" to create them.'
      } else {
        modalData.value.analysisData = response.analysis
        modalData.value.explanation = null
      }
    } catch (error) {
      console.error('Error fetching workout explanation:', error)
      modalData.value.explanation = 'Failed to load explanation. Please try again.'
    }
  }

  // Map display names to metric names
  function getWorkoutMetricName(title: string): string {
    const mapping: Record<string, string> = {
      Overall: 'overall',
      'Technical Execution': 'technical',
      'Effort Management': 'effort',
      'Pacing Strategy': 'pacing',
      'Workout Execution': 'execution'
    }
    return mapping[title] || title.toLowerCase()
  }

  // Chart data computations
  const activityDistributionData = computed(() => {
    const typeCounts: Record<string, number> = {}
    allWorkouts.value.forEach((w) => {
      const type = w.type || 'Other'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    const labels = Object.keys(typeCounts)
    const data = Object.values(typeCounts)

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)', // blue for Run
            'rgba(34, 197, 94, 0.8)', // green for Ride
            'rgba(234, 179, 8, 0.8)', // yellow for Swim
            'rgba(168, 85, 247, 0.8)', // purple for Other
            'rgba(239, 68, 68, 0.8)', // red
            'rgba(6, 182, 212, 0.8)' // cyan
          ],
          borderColor: [
            'rgb(59, 130, 246)',
            'rgb(34, 197, 94)',
            'rgb(234, 179, 8)',
            'rgb(168, 85, 247)',
            'rgb(239, 68, 68)',
            'rgb(6, 182, 212)'
          ],
          borderWidth: 2
        }
      ]
    }
  })

  function toDateKey(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function toWeekStartMonday(date: Date): Date {
    const next = new Date(date)
    next.setHours(0, 0, 0, 0)
    const day = next.getDay()
    const offset = (day + 6) % 7
    next.setDate(next.getDate() - offset)
    return next
  }

  function sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0)
  }

  function movingAverage(values: number[], windowSize: number): number[] {
    return values.map((_, index) => {
      const start = Math.max(0, index - windowSize + 1)
      const slice = values.slice(start, index + 1)
      return sum(slice) / slice.length
    })
  }

  function workloadScore(workout: any): number {
    return Number(workout.trainingLoad ?? workout.tss ?? 0) || 0
  }

  function percentile(values: number[], p: number): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const pos = (sorted.length - 1) * p
    const base = Math.floor(pos)
    const rest = pos - base
    const current = sorted[base] || 0
    const next = sorted[base + 1] ?? current
    return current + rest * (next - current)
  }

  function formatHoursMinutes(hours: number): string {
    const totalMinutes = Math.round(hours * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  function formatDeltaLabel(current: number, previous: number, unit = ''): string {
    if (!Number.isFinite(previous) || previous <= 0) return 'No baseline'
    const delta = ((current - previous) / previous) * 100
    const sign = delta >= 0 ? '+' : ''
    return `${sign}${delta.toFixed(0)}%${unit}`
  }

  const relativeEffortBandOptions = [
    { label: 'P20-P80', value: 'P20_P80' },
    { label: 'P25-P75', value: 'P25_P75' },
    { label: 'P30-P70', value: 'P30_P70' },
    { label: 'Avg ±20%', value: 'AVG_20' }
  ]

  function openRelativeEffortExplain(target: 'week' | 'range') {
    relativeEffortExplainTarget.value = target
    showRelativeEffortExplain.value = true
  }

  const dailyLoadSeries = computed(() => {
    const today = getUserLocalDate()
    today.setHours(0, 0, 0, 0)

    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 29)

    const labels: string[] = []
    const keys: string[] = []
    const values: number[] = []
    const indexByKey = new Map<string, number>()

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      labels.push(formatDate(date, 'MMM d'))
      const key = toDateKey(date)
      keys.push(key)
      values.push(0)
      indexByKey.set(key, i)
    }

    allWorkouts.value.forEach((workout) => {
      const date = new Date(workout.date)
      const key = toDateKey(date)
      const index = indexByKey.get(key)
      if (index === undefined || values[index] === undefined) return
      values[index] += workloadScore(workout)
    })

    return {
      labels,
      keys,
      values,
      average: movingAverage(values, 7)
    }
  })

  const weeklySeries = computed(() => {
    const currentWeekStart = toWeekStartMonday(getUserLocalDate())
    const startWeek = new Date(currentWeekStart)
    startWeek.setDate(startWeek.getDate() - 7 * 7)

    const buckets = Array.from({ length: 8 }, (_, index) => {
      const start = new Date(startWeek)
      start.setDate(startWeek.getDate() + index * 7)
      return {
        start,
        key: toDateKey(start),
        label: formatDate(start, 'MMM d'),
        score: 0,
        volumeHours: 0
      }
    })

    const indexByWeek = new Map(buckets.map((bucket, index) => [bucket.key, index]))

    allWorkouts.value.forEach((workout) => {
      const date = new Date(workout.date)
      const weekStart = toWeekStartMonday(date)
      const index = indexByWeek.get(toDateKey(weekStart))
      if (index === undefined || !buckets[index]) return

      buckets[index]!.score += workloadScore(workout)
      buckets[index]!.volumeHours += (workout.durationSec || 0) / 3600
    })

    return buckets
  })

  const trainingLoadData = computed(() => ({
    labels: dailyLoadSeries.value.labels,
    datasets: [
      {
        type: 'bar',
        label: 'Daily Load',
        data: dailyLoadSeries.value.values,
        backgroundColor: 'rgba(34, 197, 94, 0.65)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1.5,
        borderRadius: 4
      },
      {
        type: 'line',
        label: '7d Average',
        data: dailyLoadSeries.value.average,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3
      }
    ]
  }))

  const weeklyVolumeData = computed(() => {
    const labels = weeklySeries.value.map((week) => week.label)
    const hours = weeklySeries.value.map((week) => week.volumeHours)
    const avg = movingAverage(hours, 4)

    return {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Weekly Hours',
          data: hours,
          backgroundColor: 'rgba(99, 102, 241, 0.65)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          type: 'line',
          label: '4w Average',
          data: avg,
          borderColor: 'rgba(79, 70, 229, 1)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: 'rgba(79, 70, 229, 1)',
          tension: 0.3
        }
      ]
    }
  })

  const relativeEffortBandLabel = computed(() => {
    return (
      relativeEffortBandOptions.find((option) => option.value === relativeEffortBandPreset.value)
        ?.label || 'P25-P75'
    )
  })

  const relativeEffortBaselineScores = computed(() =>
    weeklySeries.value.slice(0, -1).map((week) => week.score)
  )

  const relativeEffortRange = computed(() => {
    const baseline = relativeEffortBaselineScores.value
    if (baseline.length === 0) return { low: 0, high: 0 }

    const avg = sum(baseline) / baseline.length
    if (relativeEffortBandPreset.value === 'AVG_20' || baseline.length < 4) {
      return { low: avg * 0.8, high: avg * 1.2 }
    }

    const preset: Record<'P20_P80' | 'P25_P75' | 'P30_P70', { low: number; high: number }> = {
      P20_P80: { low: 0.2, high: 0.8 },
      P25_P75: { low: 0.25, high: 0.75 },
      P30_P70: { low: 0.3, high: 0.7 }
    }

    const selected = preset[relativeEffortBandPreset.value as 'P20_P80' | 'P25_P75' | 'P30_P70']
    return {
      low: percentile(baseline, selected.low),
      high: percentile(baseline, selected.high)
    }
  })

  const relativeEffortCurrentScore = computed(() =>
    Math.round(weeklySeries.value[weeklySeries.value.length - 1]?.score || 0)
  )

  const relativeEffortRangeLabel = computed(() => {
    const low = Math.round(relativeEffortRange.value.low)
    const high = Math.round(relativeEffortRange.value.high)
    return `${low}-${high}`
  })

  const relativeEffortStatus = computed<'below' | 'within' | 'above'>(() => {
    const score = relativeEffortCurrentScore.value
    if (score < relativeEffortRange.value.low) return 'below'
    if (score > relativeEffortRange.value.high) return 'above'
    return 'within'
  })

  const relativeEffortStatusTitle = computed(() => {
    if (relativeEffortStatus.value === 'below') return 'Below weekly range'
    if (relativeEffortStatus.value === 'above') return 'Above weekly range'
    return 'Within weekly range'
  })

  const relativeEffortStatusMessage = computed(() => {
    if (relativeEffortStatus.value === 'below') {
      return 'A lighter block can support recovery before the next build cycle.'
    }
    if (relativeEffortStatus.value === 'above') {
      return 'This week is above baseline. Prioritize sleep and recovery quality.'
    }
    return 'Workload is in your normal zone. This is a strong consistency signal.'
  })

  const relativeEffortStatusClass = computed(() => {
    if (relativeEffortStatus.value === 'below') return 'text-amber-500'
    if (relativeEffortStatus.value === 'above') return 'text-red-500'
    return 'text-emerald-500'
  })

  const relativeEffortExplainTitle = computed(() =>
    relativeEffortExplainTarget.value === 'week' ? 'This Week Score' : 'Expected Range'
  )

  const relativeEffortExplainSummary = computed(() => {
    if (relativeEffortExplainTarget.value === 'week') {
      return `This week score is ${relativeEffortCurrentScore.value}. It represents your total workload for the current Monday-Sunday week.`
    }
    return `Expected range is ${relativeEffortRangeLabel.value} using ${relativeEffortBandLabel.value}. It reflects your recent workload distribution, not a fixed target.`
  })

  const relativeEffortExplainComputation = computed(() => {
    if (relativeEffortExplainTarget.value === 'week') {
      return 'Score = sum(trainingLoad) for workouts in the current week, with TSS used when trainingLoad is missing.'
    }
    if (
      relativeEffortBandPreset.value === 'AVG_20' ||
      relativeEffortBaselineScores.value.length < 4
    ) {
      return 'Range = average of baseline weekly scores ± 20%. This fallback is used when data is limited or Avg ±20% is selected.'
    }
    return `Range = ${relativeEffortBandLabel.value} percentiles of baseline weekly scores. Lower and upper bounds are computed from your historical weekly distribution.`
  })

  const relativeEffortExplainWindow = computed(() => {
    const baselineCount = relativeEffortBaselineScores.value.length
    return `Baseline uses ${baselineCount} prior week${baselineCount === 1 ? '' : 's'} out of the last 8 weeks. Current week is excluded from baseline to avoid self-influence.`
  })

  const relativeEffortData = computed(() => {
    const labels = weeklySeries.value.map((week) => week.label)
    const scores = weeklySeries.value.map((week) => week.score)
    const low = labels.map(() => relativeEffortRange.value.low)
    const high = labels.map(() => relativeEffortRange.value.high)
    const currentIndex = labels.length - 1

    return {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Range Low',
          data: low,
          borderWidth: 0,
          pointRadius: 0,
          fill: false
        },
        {
          type: 'line',
          label: 'Expected Range',
          data: high,
          borderWidth: 0,
          pointRadius: 0,
          fill: '-1',
          backgroundColor: theme.isDark.value
            ? 'rgba(148, 163, 184, 0.18)'
            : 'rgba(148, 163, 184, 0.2)'
        },
        {
          type: 'line',
          label: 'Weekly Score',
          data: scores,
          borderColor: 'rgba(75, 85, 99, 0.45)',
          borderWidth: 1.5,
          pointRadius: (context: any) => (context.dataIndex === currentIndex ? 7 : 5),
          pointBorderWidth: 2,
          pointBorderColor: (context: any) =>
            context.dataIndex === currentIndex ? 'rgba(168, 85, 247, 1)' : 'rgba(17, 24, 39, 0.85)',
          pointBackgroundColor: (context: any) =>
            context.dataIndex === currentIndex ? 'rgba(168, 85, 247, 0.65)' : '#ffffff',
          tension: 0.2
        }
      ]
    }
  })

  const trainingLoadStats = computed(() => {
    const values = dailyLoadSeries.value.values
    const current = Math.round(sum(values.slice(-7)))
    const previous = Math.round(sum(values.slice(-14, -7)))
    return {
      current,
      deltaLabel: formatDeltaLabel(current, previous)
    }
  })

  const weeklyVolumeStats = computed(() => {
    const hours = weeklySeries.value.map((week) => week.volumeHours)
    const current = hours[hours.length - 1] || 0
    const previous = hours[hours.length - 2] || 0
    return {
      currentLabel: formatHoursMinutes(current),
      deltaLabel: formatDeltaLabel(current, previous)
    }
  })

  // Chart options
  const doughnutChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#94a3b8',
          padding: 15,
          font: {
            size: 10,
            weight: 'bold' as const
          },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: theme.isDark.value ? '#111827' : '#ffffff',
        titleColor: theme.isDark.value ? '#f3f4f6' : '#111827',
        bodyColor: theme.isDark.value ? '#d1d5db' : '#374151',
        borderColor: theme.isDark.value ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 }
      }
    }
  }))

  const baseComboChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: {
            size: 10,
            weight: 'bold' as const
          },
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 6
        }
      },
      tooltip: {
        backgroundColor: theme.isDark.value ? '#111827' : '#ffffff',
        titleColor: theme.isDark.value ? '#f3f4f6' : '#111827',
        bodyColor: theme.isDark.value ? '#d1d5db' : '#374151',
        borderColor: theme.isDark.value ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
            weight: 'bold' as const
          },
          maxRotation: 0,
          minRotation: 0
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        position: 'right' as const,
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
            weight: 'bold' as const
          },
          maxTicksLimit: 5
        },
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          drawTicks: false
        },
        border: {
          display: false
        }
      }
    }
  }))

  const trainingLoadChartOptions = computed(() => {
    const opts = JSON.parse(JSON.stringify(baseComboChartOptions.value))
    const settings = chartSettings.value.trainingLoad

    opts.scales.y.min = settings.yScale === 'fixed' ? settings.yMin || 0 : undefined
    opts.scales.y.beginAtZero = settings.yScale !== 'fixed'

    opts.plugins.datalabels = {
      display: (context: any) => {
        return settings.showLabels && context.datasetIndex === 0
      },
      color: theme.isDark.value ? '#94a3b8' : '#64748b',
      align: 'top' as const,
      anchor: 'end' as const,
      offset: 4,
      font: { size: 9, weight: 'bold' as const },
      formatter: (value: any) => Math.round(value)
    }

    opts.plugins.tooltip = {
      ...opts.plugins.tooltip,
      callbacks: {
        label: (context: any) => {
          if (context.dataset.label === '7d Average') {
            return `7d avg: ${context.parsed.y.toFixed(0)} load`
          }
          return `Load: ${context.parsed.y.toFixed(0)}`
        }
      }
    }

    return opts
  })

  const weeklyVolumeChartOptions = computed(() => {
    const opts = JSON.parse(JSON.stringify(baseComboChartOptions.value))
    const settings = chartSettings.value.weeklyVolume

    opts.scales.y.min = settings.yScale === 'fixed' ? settings.yMin || 0 : undefined
    opts.scales.y.beginAtZero = settings.yScale !== 'fixed'

    opts.plugins.datalabels = {
      display: (context: any) => {
        return settings.showLabels && context.datasetIndex === 0
      },
      color: theme.isDark.value ? '#94a3b8' : '#64748b',
      align: 'top' as const,
      anchor: 'end' as const,
      offset: 4,
      font: { size: 9, weight: 'bold' as const },
      formatter: (value: any) => value.toFixed(1)
    }

    opts.plugins.tooltip = {
      ...opts.plugins.tooltip,
      callbacks: {
        label: (context: any) => {
          const label = context.dataset.label === '4w Average' ? '4w avg' : 'Volume'
          return `${label}: ${formatHoursMinutes(context.parsed.y)}`
        }
      }
    }

    return opts
  })

  const relativeEffortChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: theme.isDark.value ? '#111827' : '#ffffff',
        titleColor: theme.isDark.value ? '#f3f4f6' : '#111827',
        bodyColor: theme.isDark.value ? '#d1d5db' : '#374151',
        borderColor: theme.isDark.value ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            if (context.dataset.label !== 'Weekly Score') return null
            return `Score: ${Math.round(context.parsed.y)}`
          },
          afterLabel: (context: any) => {
            if (context.dataset.label !== 'Weekly Score') return null
            return `Range: ${relativeEffortRangeLabel.value}`
          }
        }
      },
      currentWeekMarker: {
        index: weeklySeries.value.length - 1,
        color: 'rgba(168, 85, 247, 0.9)',
        width: 2
      }
    },
    scales: {
      x: {
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            weight: 'bold' as const
          }
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        position: 'right' as const,
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
            weight: 'bold' as const
          },
          maxTicksLimit: 5
        },
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
          drawTicks: false
        },
        border: {
          display: false
        }
      }
    }
  }))

  const periodOptions = [
    { label: '7 Days', value: 7 },
    { label: '14 Days', value: 14 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: 'Year to Date', value: 'YTD' }
  ]

  // Watch filters and reset to page 1
  watch([filterType, filterAnalysis, filterSource], () => {
    currentPage.value = 1
  })

  // Load data on mount
  onMounted(() => {
    fetchWorkouts()
  })
</script>
