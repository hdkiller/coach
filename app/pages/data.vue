<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Data Management</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        View and sync your training data from connected integrations
      </p>
    </div>

    <!-- Integration Status Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <!-- Intervals.icu Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Intervals.icu</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">Training activities & wellness</p>
          </div>
          <div v-if="intervalsStatus" :class="getStatusClass(intervalsStatus.syncStatus)">
            {{ intervalsStatus.syncStatus || 'Not Connected' }}
          </div>
        </div>
        
        <div v-if="intervalsStatus" class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Last Sync:</span>
            <span class="text-gray-900 dark:text-white">
              {{ intervalsStatus.lastSyncAt ? formatDate(intervalsStatus.lastSyncAt) : 'Never' }}
            </span>
          </div>
          <div v-if="intervalsStatus.errorMessage" class="text-red-600 text-xs mt-2">
            {{ intervalsStatus.errorMessage }}
          </div>
        </div>

        <button
          @click="syncIntegration('intervals')"
          :disabled="syncing === 'intervals'"
          class="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <span v-if="syncing === 'intervals'">Syncing...</span>
          <span v-else>Sync Now</span>
        </button>
      </div>

      <!-- Whoop Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Whoop</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">Recovery & strain data</p>
          </div>
          <div v-if="whoopStatus" :class="getStatusClass(whoopStatus.syncStatus)">
            {{ whoopStatus.syncStatus || 'Not Connected' }}
          </div>
        </div>
        
        <div v-if="whoopStatus" class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Last Sync:</span>
            <span class="text-gray-900 dark:text-white">
              {{ whoopStatus.lastSyncAt ? formatDate(whoopStatus.lastSyncAt) : 'Never' }}
            </span>
          </div>
          <div v-if="whoopStatus.errorMessage" class="text-red-600 text-xs mt-2">
            {{ whoopStatus.errorMessage }}
          </div>
        </div>

        <button
          @click="syncIntegration('whoop')"
          :disabled="syncing === 'whoop'"
          class="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <span v-if="syncing === 'whoop'">Syncing...</span>
          <span v-else>Sync Now</span>
        </button>
      </div>
    </div>

    <!-- Data Summary -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Data Summary</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {{ dataSummary.workouts }}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Workouts</div>
        </div>
        
        <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="text-3xl font-bold text-green-600 dark:text-green-400">
            {{ dataSummary.wellness }}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Wellness Entries</div>
        </div>
        
        <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {{ dataSummary.dailyMetrics }}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Daily Metrics</div>
        </div>
      </div>
    </div>

    <!-- Recent Workouts Table -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Recent Workouts</h2>
      </div>
      
      <div v-if="loading" class="p-8 text-center text-gray-600 dark:text-gray-400">
        Loading...
      </div>
      
      <div v-else-if="recentWorkouts.length === 0" class="p-8 text-center text-gray-600 dark:text-gray-400">
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
                Source
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="workout in recentWorkouts" :key="workout.id">
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
                <span :class="getSourceBadgeClass(workout.source)">
                  {{ workout.source }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const syncing = ref<string | null>(null)
const loading = ref(true)
const intervalsStatus = ref<any>(null)
const whoopStatus = ref<any>(null)
const dataSummary = ref({
  workouts: 0,
  wellness: 0,
  dailyMetrics: 0
})
const recentWorkouts = ref<any[]>([])

// Fetch integration status
async function fetchStatus() {
  try {
    const response: any = await $fetch('/api/integrations/status')
    const integrations = response.integrations || []
    
    intervalsStatus.value = integrations.find((i: any) => i.provider === 'intervals')
    whoopStatus.value = integrations.find((i: any) => i.provider === 'whoop')
  } catch (error) {
    console.error('Error fetching integration status:', error)
  }
}

// Fetch data summary
async function fetchDataSummary() {
  try {
    const [workouts, wellness] = await Promise.all([
      $fetch('/api/workouts'),
      $fetch('/api/wellness')
    ])
    
    dataSummary.value.workouts = Array.isArray(workouts) ? workouts.length : 0
    dataSummary.value.wellness = Array.isArray(wellness) ? wellness.length : 0
  } catch (error) {
    console.error('Error fetching data summary:', error)
  }
}

// Fetch recent workouts
async function fetchRecentWorkouts() {
  loading.value = true
  try {
    const workouts = await $fetch('/api/workouts')
    recentWorkouts.value = workouts.slice(0, 10)
  } catch (error) {
    console.error('Error fetching workouts:', error)
  } finally {
    loading.value = false
  }
}

// Sync integration
async function syncIntegration(provider: string) {
  syncing.value = provider
  try {
    const response = await $fetch('/api/integrations/sync', {
      method: 'POST',
      body: { provider }
    })
    
    // Show success message
    alert(`${provider} sync started successfully!`)
    
    // Refresh status after a delay
    setTimeout(async () => {
      await fetchStatus()
      await fetchDataSummary()
      await fetchRecentWorkouts()
    }, 2000)
  } catch (error: any) {
    alert(`Error syncing ${provider}: ${error.data?.message || error.message}`)
  } finally {
    syncing.value = null
  }
}

// Utility functions
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

function getStatusClass(status: string | undefined) {
  const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold'
  if (status === 'SUCCESS') return `${baseClass} bg-green-100 text-green-800`
  if (status === 'SYNCING') return `${baseClass} bg-blue-100 text-blue-800`
  if (status === 'FAILED') return `${baseClass} bg-red-100 text-red-800`
  return `${baseClass} bg-gray-100 text-gray-800`
}

function getSourceBadgeClass(source: string) {
  const baseClass = 'px-2 py-1 rounded text-xs font-medium'
  if (source === 'intervals') return `${baseClass} bg-blue-100 text-blue-800`
  if (source === 'whoop') return `${baseClass} bg-purple-100 text-purple-800`
  return `${baseClass} bg-gray-100 text-gray-800`
}

// Load data on mount
onMounted(async () => {
  await fetchStatus()
  await fetchDataSummary()
  await fetchRecentWorkouts()
})
</script>