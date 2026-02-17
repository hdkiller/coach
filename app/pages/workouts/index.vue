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
            />

            <!-- Score Trend Chart (Primary Visualization) -->
            <UCard
              :ui="{
                root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
                body: 'p-4 sm:p-6'
              }"
            >
              <template #header>
                <div
                  class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0"
                >
                  <div>
                    <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
                      Performance Trajectory
                    </h3>
                    <p class="text-[10px] text-gray-500 uppercase font-medium mt-0.5">
                      30-day cross-metric integrity trend
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-1.5">
                      <div class="size-2 rounded-full bg-blue-500" />
                      <span class="text-[10px] text-gray-500 font-bold uppercase">Trend</span>
                    </div>
                  </div>
                </div>
              </template>
              <div v-if="workoutTrendsLoading" class="h-[300px] flex items-center justify-center">
                <UIcon name="i-heroicons-arrow-path" class="size-8 animate-spin text-primary-500" />
              </div>
              <div v-else class="h-[300px]">
                <ClientOnly>
                  <TrendChart :data="workoutTrendsData?.workouts || []" type="workout" />
                </ClientOnly>
              </div>
            </UCard>

            <!-- Training Load & Volume Mix -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UCard
                :ui="{
                  root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
                  body: 'p-4 sm:p-6'
                }"
              >
                <template #header>
                  <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Training Load (30d)
                  </h3>
                </template>
                <div v-if="loading" class="h-[200px] flex items-center justify-center">
                  <USkeleton class="h-full w-full" />
                </div>
                <div v-else class="h-[200px]">
                  <ClientOnly>
                    <Bar :data="trainingLoadData" :options="barChartOptions" :height="200" />
                  </ClientOnly>
                </div>
              </UCard>

              <UCard
                :ui="{
                  root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
                  body: 'p-4 sm:p-6'
                }"
              >
                <template #header>
                  <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Weekly Volume Trend
                  </h3>
                </template>
                <div v-if="loading" class="h-[200px] flex items-center justify-center">
                  <USkeleton class="h-full w-full" />
                </div>
                <div v-else class="h-[200px]">
                  <ClientOnly>
                    <Bar :data="weeklyVolumeData" :options="barChartOptions" :height="200" />
                  </ClientOnly>
                </div>
              </UCard>
            </div>
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
            <UCard
              :ui="{
                root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
                body: 'p-4'
              }"
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-chart-pie" class="size-4 text-emerald-500" />
                  <h3
                    class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider"
                  >
                    Volume Distribution
                  </h3>
                </div>
              </template>
              <div v-if="loading" class="h-[200px] flex items-center justify-center">
                <UIcon name="i-heroicons-arrow-path" class="size-6 animate-spin text-gray-400" />
              </div>
              <div v-else class="h-[200px] flex justify-center">
                <ClientOnly>
                  <Doughnut
                    :data="activityDistributionData"
                    :options="doughnutChartOptions"
                    :height="200"
                  />
                </ClientOnly>
              </div>
            </UCard>
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

        <!-- Score Detail Modal -->
        <ScoreDetailModal
          v-model="showModal"
          :title="modalData.title"
          :score="modalData.score"
          :explanation="modalData.explanation"
          :analysis-data="modalData.analysisData"
          :color="modalData.color"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { Bar, Doughnut } from 'vue-chartjs'
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
    Legend
  } from 'chart.js'
  import WorkoutSummary from '~/components/workouts/WorkoutSummary.vue'
  import WorkoutTable from '~/components/workouts/WorkoutTable.vue'
  import TrendChart from '~/components/TrendChart.vue'
  import RadarChart from '~/components/RadarChart.vue'
  import ScoreCard from '~/components/ScoreCard.vue'

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
    Legend
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
  const loading = ref(true)
  const analyzingWorkouts = ref(false)
  const allWorkouts = ref<any[]>([])
  const currentPage = ref(1)
  const itemsPerPage = 20

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
  const workoutsInPeriod = computed(() => {
    if (!allWorkouts.value.length) return []

    const today = getUserLocalDate()
    let startDate: Date

    if (selectedPeriod.value === 'YTD') {
      startDate = new Date(Date.UTC(today.getUTCFullYear(), 0, 1))
    } else {
      const days =
        typeof selectedPeriod.value === 'string'
          ? parseInt(selectedPeriod.value)
          : selectedPeriod.value
      startDate = new Date(today)
      startDate.setUTCDate(today.getUTCDate() - (days || 30))
    }

    return allWorkouts.value.filter((w) => new Date(w.date) >= startDate)
  })

  const totalWorkouts = computed(() => workoutsInPeriod.value.length)
  const analyzedWorkouts = computed(
    () => workoutsInPeriod.value.filter((w) => w.aiAnalysisStatus === 'COMPLETED').length
  )
  const avgScore = computed(() => {
    const withScores = workoutsInPeriod.value.filter(
      (w) => typeof w.overallScore === 'number' && w.overallScore > 0
    )
    if (withScores.length === 0) return null
    return withScores.reduce((sum, w) => sum + w.overallScore, 0) / withScores.length
  })
  const totalHours = computed(() => {
    const totalSec = workoutsInPeriod.value.reduce((sum, w) => sum + (w.durationSec || 0), 0)
    return Math.round(totalSec / 3600)
  })

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

  const trainingLoadData = computed(() => {
    // Get workouts from last 30 days with training load
    const today = getUserLocalDate()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const recentWorkouts = allWorkouts.value
      .filter((w) => w.trainingLoad && new Date(w.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Group by date and sum training load
    const loadByDate: Record<string, number> = {}
    recentWorkouts.forEach((w) => {
      const dateStr = formatDate(w.date, 'MMM d')
      loadByDate[dateStr] = (loadByDate[dateStr] || 0) + w.trainingLoad
    })

    const labels = Object.keys(loadByDate)
    const loads = Object.values(loadByDate)

    return {
      labels,
      datasets: [
        {
          label: 'Training Load',
          data: loads,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2
        }
      ]
    }
  })

  const weeklyVolumeData = computed(() => {
    // Get workouts from last 8 weeks
    const today = getUserLocalDate()
    const eightWeeksAgo = new Date(today)
    eightWeeksAgo.setDate(today.getDate() - 56)

    const recentWorkouts = allWorkouts.value.filter((w) => new Date(w.date) >= eightWeeksAgo)

    // Group by week
    const volumeByWeek: Record<string, number> = {}
    recentWorkouts.forEach((w) => {
      const date = new Date(w.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday) - local aware enough for labels
      const weekLabel = formatDate(weekStart, 'MMM d')

      const hours = (w.durationSec || 0) / 3600
      volumeByWeek[weekLabel] = (volumeByWeek[weekLabel] || 0) + hours
    })

    const labels = Object.keys(volumeByWeek)
    const hours = Object.values(volumeByWeek)

    return {
      labels,
      datasets: [
        {
          label: 'Hours',
          data: hours,
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 2
        }
      ]
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

  const barChartOptions = computed(() => ({
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
        padding: 12,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`
          }
        }
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
          maxRotation: 45,
          minRotation: 45
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
