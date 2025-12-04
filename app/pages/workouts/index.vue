<template>
  <UDashboardPanel id="workouts">
    <template #header>
      <UDashboardNavbar title="Workouts">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <button
            @click="analyzeAllWorkouts"
            :disabled="analyzingWorkouts"
            class="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            <span v-if="analyzingWorkouts">Analyzing...</span>
            <span v-else>Analyze All</span>
          </button>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Page Header -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Workouts</h1>
          <p class="text-sm text-muted mt-1">
            View and analyze your training sessions with AI-powered insights
          </p>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {{ totalWorkouts }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Workouts</div>
            </div>
          </div>
          
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                {{ analyzedWorkouts }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Analyzed</div>
            </div>
          </div>
          
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {{ avgScore !== null ? avgScore.toFixed(1) : '-' }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Score</div>
            </div>
          </div>
          
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {{ totalHours }}h
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Hours</div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div v-if="!loading && allWorkouts.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Activity Type Distribution -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Activity Distribution
            </h3>
            <div class="flex justify-center" style="height: 300px;">
              <ClientOnly>
                <Doughnut :data="activityDistributionData" :options="doughnutChartOptions" />
              </ClientOnly>
            </div>
          </div>

          <!-- Workout Scores Trend -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Average Workout Scores (Last 30 Days)
            </h3>
            <div style="height: 300px;">
              <ClientOnly>
                <Line :data="scoresTimelineData" :options="lineChartOptions" />
              </ClientOnly>
            </div>
          </div>

          <!-- Training Load Trend -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Training Load (Last 30 Days)
            </h3>
            <div style="height: 300px;">
              <ClientOnly>
                <Bar :data="trainingLoadData" :options="barChartOptions" />
              </ClientOnly>
            </div>
          </div>

          <!-- Weekly Training Volume -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Weekly Training Hours (Last 8 Weeks)
            </h3>
            <div style="height: 300px;">
              <ClientOnly>
                <Bar :data="weeklyVolumeData" :options="barChartOptions" />
              </ClientOnly>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Type
              </label>
              <USelect
                v-model="filterType"
                :items="activityTypeOptions"
                placeholder="All Types"
                class="w-full"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Analysis Status
              </label>
              <USelect
                v-model="filterAnalysis"
                :items="analysisStatusOptions"
                placeholder="All Status"
                class="w-full"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source
              </label>
              <USelect
                v-model="filterSource"
                :items="sourceOptions"
                placeholder="All Sources"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <!-- Workouts Table -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div v-if="loading" class="p-8 text-center text-gray-600 dark:text-gray-400">
            Loading workouts...
          </div>
          
          <div v-else-if="filteredWorkouts.length === 0" class="p-8 text-center text-gray-600 dark:text-gray-400">
            No workouts found. Sync your data to get started.
          </div>
          
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activity
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Load
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Score
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    AI Analysis
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="workout in paginatedWorkouts"
                  :key="workout.id"
                  @click="navigateToWorkout(workout.id)"
                  class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ formatDate(workout.date) }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {{ workout.title }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {{ workout.type }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {{ formatDuration(workout.durationSec) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {{ workout.trainingLoad ? Math.round(workout.trainingLoad) : '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span v-if="workout.overallScore" :class="getScoreBadgeClass(workout.overallScore)">
                      {{ workout.overallScore }}/10
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span :class="getAnalysisStatusBadgeClass(workout.aiAnalysisStatus)">
                      {{ getAnalysisStatusLabel(workout.aiAnalysisStatus) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span :class="getSourceBadgeClass(workout.source)">
                      {{ workout.source }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-600 dark:text-gray-400">
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredWorkouts.length) }} of {{ filteredWorkouts.length }} entries
              </div>
              <div class="flex gap-2">
                <button
                  @click="changePage(currentPage - 1)"
                  :disabled="currentPage === 1"
                  class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <div class="flex gap-1">
                  <button
                    v-for="page in visiblePages"
                    :key="page"
                    @click="changePage(page)"
                    :class="[
                      'px-3 py-1 rounded text-sm',
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    ]"
                  >
                    {{ page }}
                  </button>
                </div>
                <button
                  @click="changePage(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                  class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { Doughnut, Line, Bar } from 'vue-chartjs'
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
  Filler
)

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const toast = useToast()
const colorMode = useColorMode()
const loading = ref(true)
const analyzingWorkouts = ref(false)
const allWorkouts = ref<any[]>([])
const currentPage = ref(1)
const itemsPerPage = 20

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
  { label: 'Whoop', value: 'whoop' }
]

// Fetch all workouts
async function fetchWorkouts() {
  loading.value = true
  try {
    const workouts = await $fetch('/api/workouts')
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
const filteredWorkouts = computed(() => {
  let workouts = [...allWorkouts.value]
  
  if (filterType.value) {
    workouts = workouts.filter(w => w.type === filterType.value)
  }
  
  if (filterAnalysis.value) {
    if (filterAnalysis.value === 'NOT_STARTED') {
      workouts = workouts.filter(w => !w.aiAnalysisStatus)
    } else {
      workouts = workouts.filter(w => w.aiAnalysisStatus === filterAnalysis.value)
    }
  }
  
  if (filterSource.value) {
    workouts = workouts.filter(w => w.source === filterSource.value)
  }
  
  return workouts
})

const totalWorkouts = computed(() => allWorkouts.value.length)
const analyzedWorkouts = computed(() => 
  allWorkouts.value.filter(w => w.aiAnalysisStatus === 'COMPLETED').length
)
const avgScore = computed(() => {
  const withScores = allWorkouts.value.filter(w => w.overallScore)
  if (withScores.length === 0) return null
  return withScores.reduce((sum, w) => sum + w.overallScore, 0) / withScores.length
})
const totalHours = computed(() => {
  const totalSec = allWorkouts.value.reduce((sum, w) => sum + (w.durationSec || 0), 0)
  return Math.round(totalSec / 3600)
})

const totalPages = computed(() => Math.ceil(filteredWorkouts.value.length / itemsPerPage))
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 7
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  
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
function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function getScoreBadgeClass(score: number) {
  const baseClass = 'px-2 py-1 rounded text-xs font-semibold'
  if (score >= 8) return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
  if (score >= 6) return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
  if (score >= 4) return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
  return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
}

function getAnalysisStatusBadgeClass(status: string | null | undefined) {
  const baseClass = 'px-2 py-1 rounded text-xs font-medium'
  if (status === 'COMPLETED') return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
  if (status === 'PROCESSING') return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
  if (status === 'PENDING') return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
  if (status === 'FAILED') return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
  return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`
}

function getAnalysisStatusLabel(status: string | null | undefined) {
  if (status === 'COMPLETED') return '✓ Complete'
  if (status === 'PROCESSING') return '⟳ Processing'
  if (status === 'PENDING') return '⋯ Pending'
  if (status === 'FAILED') return '✗ Failed'
  return '− Not Started'
}

function getSourceBadgeClass(source: string) {
  const baseClass = 'px-2 py-1 rounded text-xs font-medium'
  if (source === 'intervals') return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
  if (source === 'whoop') return `${baseClass} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`
  if (source === 'strava') return `${baseClass} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`
  return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`
}

function navigateToWorkout(id: string) {
  navigateTo(`/workouts/${id}`)
}

function changePage(page: number) {
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function analyzeAllWorkouts() {
  analyzingWorkouts.value = true
  try {
    const response: any = await $fetch('/api/workouts/analyze-all', {
      method: 'POST'
    })
    
    toast.add({
      title: 'Analysis Started',
      description: response.message,
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    
    // Refresh the workouts list after a short delay
    setTimeout(async () => {
      await fetchWorkouts()
    }, 2000)
  } catch (error: any) {
    toast.add({
      title: 'Analysis Failed',
      description: error.data?.message || error.message || 'Failed to start analysis',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    analyzingWorkouts.value = false
  }
}
// Chart data computations
const activityDistributionData = computed(() => {
  const typeCounts: Record<string, number> = {}
  allWorkouts.value.forEach(w => {
    const type = w.type || 'Other'
    typeCounts[type] = (typeCounts[type] || 0) + 1
  })
  
  const labels = Object.keys(typeCounts)
  const data = Object.values(typeCounts)
  
  return {
    labels,
    datasets: [{
      data,
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',  // blue for Run
        'rgba(34, 197, 94, 0.8)',   // green for Ride
        'rgba(234, 179, 8, 0.8)',   // yellow for Swim
        'rgba(168, 85, 247, 0.8)',  // purple for Other
        'rgba(239, 68, 68, 0.8)',   // red
        'rgba(6, 182, 212, 0.8)'    // cyan
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
    }]
  }
})

const scoresTimelineData = computed(() => {
  // Get workouts from last 30 days with scores
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const recentWorkouts = allWorkouts.value
    .filter(w => w.overallScore && new Date(w.date) >= thirtyDaysAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  // Group by date and calculate average
  const scoresByDate: Record<string, number[]> = {}
  recentWorkouts.forEach(w => {
    const dateStr = new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!scoresByDate[dateStr]) scoresByDate[dateStr] = []
    scoresByDate[dateStr].push(w.overallScore)
  })
  
  const labels = Object.keys(scoresByDate)
  const avgScores = labels.map(date => {
    const scores = scoresByDate[date]
    if (!scores || scores.length === 0) return 0
    return scores.reduce((sum, s) => sum + s, 0) / scores.length
  })
  
  return {
    labels,
    datasets: [{
      label: 'Average Score',
      data: avgScores,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true
    }]
  }
})

const trainingLoadData = computed(() => {
  // Get workouts from last 30 days with training load
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const recentWorkouts = allWorkouts.value
    .filter(w => w.trainingLoad && new Date(w.date) >= thirtyDaysAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  // Group by date and sum training load
  const loadByDate: Record<string, number> = {}
  recentWorkouts.forEach(w => {
    const dateStr = new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    loadByDate[dateStr] = (loadByDate[dateStr] || 0) + w.trainingLoad
  })
  
  const labels = Object.keys(loadByDate)
  const loads = Object.values(loadByDate)
  
  return {
    labels,
    datasets: [{
      label: 'Training Load',
      data: loads,
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 2
    }]
  }
})

const weeklyVolumeData = computed(() => {
  // Get workouts from last 8 weeks
  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)
  
  const recentWorkouts = allWorkouts.value
    .filter(w => new Date(w.date) >= eightWeeksAgo)
  
  // Group by week
  const volumeByWeek: Record<string, number> = {}
  recentWorkouts.forEach(w => {
    const date = new Date(w.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
    const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    
    const hours = (w.durationSec || 0) / 3600
    volumeByWeek[weekLabel] = (volumeByWeek[weekLabel] || 0) + hours
  })
  
  const labels = Object.keys(volumeByWeek)
  const hours = Object.values(volumeByWeek)
  
  return {
    labels,
    datasets: [{
      label: 'Hours',
      data: hours,
      backgroundColor: 'rgba(168, 85, 247, 0.8)',
      borderColor: 'rgb(168, 85, 247)',
      borderWidth: 2
    }]
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
        color: colorMode.value === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)',
        padding: 15,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: colorMode.value === 'dark' ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
      titleColor: colorMode.value === 'dark' ? 'rgb(229, 231, 235)' : 'rgb(17, 24, 39)',
      bodyColor: colorMode.value === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)',
      borderColor: colorMode.value === 'dark' ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)',
      borderWidth: 1,
      padding: 12
    }
  }
}))

const lineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: colorMode.value === 'dark' ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
      titleColor: colorMode.value === 'dark' ? 'rgb(229, 231, 235)' : 'rgb(17, 24, 39)',
      bodyColor: colorMode.value === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)',
      borderColor: colorMode.value === 'dark' ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)',
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: (context: any) => {
          return `Score: ${context.parsed.y.toFixed(1)}/10`
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
        color: colorMode.value === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
        font: {
          size: 11
        },
        maxRotation: 45,
        minRotation: 45
      },
      border: {
        color: colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'
      }
    },
    y: {
      min: 0,
      max: 10,
      ticks: {
        stepSize: 2,
        color: colorMode.value === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
        font: {
          size: 11
        }
      },
      grid: {
        color: colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.5)'
      },
      border: {
        color: colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'
      }
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
      backgroundColor: colorMode.value === 'dark' ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
      titleColor: colorMode.value === 'dark' ? 'rgb(229, 231, 235)' : 'rgb(17, 24, 39)',
      bodyColor: colorMode.value === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)',
      borderColor: colorMode.value === 'dark' ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)',
      borderWidth: 1,
      padding: 12,
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
        color: colorMode.value === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
        font: {
          size: 11
        },
        maxRotation: 45,
        minRotation: 45
      },
      border: {
        color: colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: colorMode.value === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
        font: {
          size: 11
        }
      },
      grid: {
        color: colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.5)'
      },
      border: {
        color: colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'
      }
    }
  }
}))


// Watch filters and reset to page 1
watch([filterType, filterAnalysis, filterSource], () => {
  currentPage.value = 1
})

// Load data on mount
onMounted(() => {
  fetchWorkouts()
})
</script>