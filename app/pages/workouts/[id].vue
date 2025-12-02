<template>
  <UDashboardPanel id="workout-detail">
    <template #header>
      <UDashboardNavbar :title="workout ? `Workout: ${workout.title}` : 'Workout Details'">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            to="/data"
          >
            Back to Data
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading workout...</p>
          </div>
        </div>

        <div v-else-if="error" class="text-center py-12">
          <div class="text-red-600 dark:text-red-400">
            <p class="text-lg font-semibold">{{ error }}</p>
          </div>
        </div>

        <div v-else-if="workout" class="space-y-6">
          <!-- Header Card -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {{ workout.title }}
                </h1>
                <div class="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div class="flex items-center gap-1">
                    <span class="i-heroicons-calendar w-4 h-4"></span>
                    {{ formatDate(workout.date) }}
                  </div>
                  <div v-if="workout.type" class="flex items-center gap-1">
                    <span class="i-heroicons-tag w-4 h-4"></span>
                    {{ workout.type }}
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="i-heroicons-clock w-4 h-4"></span>
                    {{ formatDuration(workout.durationSec) }}
                  </div>
                  <div v-if="workout.distanceMeters" class="flex items-center gap-1">
                    <span class="i-heroicons-map-pin w-4 h-4"></span>
                    {{ formatDistance(workout.distanceMeters) }}
                  </div>
                </div>
              </div>
              <div>
                <span :class="getSourceBadgeClass(workout.source)">
                  {{ workout.source }}
                </span>
              </div>
            </div>

            <div v-if="workout.description" class="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ workout.description }}</p>
            </div>
          </div>

          <!-- Tabs for different data sections -->
          <UTabs :items="tabs" v-model="selectedTab" />
          
          <!-- Tab Content -->
          <div v-show="selectedTab === 0" class="space-y-6 py-4">
                <!-- Key Metrics Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div v-if="workout.trainingLoad" class="rounded-lg p-4 shadow bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <div class="flex items-center justify-between mb-2">
                      <span class="i-heroicons-bolt w-5 h-5"></span>
                    </div>
                    <div class="text-2xl font-bold">{{ Math.round(workout.trainingLoad) }}</div>
                    <div class="text-sm opacity-80">Training Load</div>
                  </div>
                  <div v-if="workout.tss" class="rounded-lg p-4 shadow bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    <div class="flex items-center justify-between mb-2">
                      <span class="i-heroicons-chart-bar w-5 h-5"></span>
                    </div>
                    <div class="text-2xl font-bold">{{ Math.round(workout.tss) }}</div>
                    <div class="text-sm opacity-80">TSS</div>
                  </div>
                  <div v-if="workout.intensity" class="rounded-lg p-4 shadow bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <div class="flex items-center justify-between mb-2">
                      <span class="i-heroicons-fire w-5 h-5"></span>
                    </div>
                    <div class="text-2xl font-bold">{{ workout.intensity.toFixed(2) }}</div>
                    <div class="text-sm opacity-80">Intensity</div>
                  </div>
                  <div v-if="workout.kilojoules" class="rounded-lg p-4 shadow bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    <div class="flex items-center justify-between mb-2">
                      <span class="i-heroicons-lightning-bolt w-5 h-5"></span>
                    </div>
                    <div class="text-2xl font-bold">{{ Math.round(workout.kilojoules / 1000) }}k</div>
                    <div class="text-sm opacity-80">Kilojoules</div>
                  </div>
                </div>

                <!-- Performance Metrics -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Metrics</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div v-if="workout.averageWatts" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Average Power</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.averageWatts }}W</span>
                    </div>
                    <div v-if="workout.maxWatts" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Max Power</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.maxWatts }}W</span>
                    </div>
                    <div v-if="workout.normalizedPower" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Normalized Power</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.normalizedPower }}W</span>
                    </div>
                    <div v-if="workout.weightedAvgWatts" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Weighted Avg Power</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.weightedAvgWatts }}W</span>
                    </div>
                    <div v-if="workout.averageHr" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Average HR</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.averageHr }} bpm</span>
                    </div>
                    <div v-if="workout.maxHr" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Max HR</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.maxHr }} bpm</span>
                    </div>
                    <div v-if="workout.averageCadence" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Average Cadence</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.averageCadence }} rpm</span>
                    </div>
                    <div v-if="workout.maxCadence" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Max Cadence</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.maxCadence }} rpm</span>
                    </div>
                    <div v-if="workout.averageSpeed" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Average Speed</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.averageSpeed.toFixed(1) }} km/h</span>
                    </div>
                    <div v-if="workout.elevationGain" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Elevation Gain</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.elevationGain }}m</span>
                    </div>
                  </div>
                </div>

                <!-- Advanced Metrics -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Advanced Metrics</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div v-if="workout.variabilityIndex" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Variability Index</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.variabilityIndex.toFixed(3) }}</span>
                    </div>
                    <div v-if="workout.powerHrRatio" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Power/HR Ratio</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.powerHrRatio.toFixed(2) }}</span>
                    </div>
                    <div v-if="workout.efficiencyFactor" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Efficiency Factor</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.efficiencyFactor.toFixed(2) }}</span>
                    </div>
                    <div v-if="workout.decoupling" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Decoupling</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ (workout.decoupling * 100).toFixed(1) }}%</span>
                    </div>
                    <div v-if="workout.polarizationIndex" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Polarization Index</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.polarizationIndex.toFixed(2) }}</span>
                    </div>
                    <div v-if="workout.lrBalance" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">L/R Balance</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.lrBalance.toFixed(1) }}%</span>
                    </div>
                  </div>
                </div>

                <!-- Training Status -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Training Status</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div v-if="workout.ctl" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">CTL (Fitness)</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.ctl.toFixed(1) }}</span>
                    </div>
                    <div v-if="workout.atl" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">ATL (Fatigue)</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.atl.toFixed(1) }}</span>
                    </div>
                    <div v-if="workout.ftp" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">FTP at Time</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.ftp }}W</span>
                    </div>
                  </div>
                </div>

                <!-- Subjective Metrics -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subjective Metrics</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div v-if="workout.rpe" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">RPE</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.rpe }}/10</span>
                    </div>
                    <div v-if="workout.sessionRpe" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Session RPE</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.sessionRpe }}/10</span>
                    </div>
                    <div v-if="workout.feel" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Feel</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.feel }}/10</span>
                    </div>
                    <div v-if="workout.trimp" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">TRIMP</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.trimp }}</span>
                    </div>
                  </div>
                </div>

                <!-- Environment & Equipment -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Environment & Equipment</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div v-if="workout.avgTemp !== null && workout.avgTemp !== undefined" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Avg Temperature</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.avgTemp.toFixed(1) }}°C</span>
                    </div>
                    <div v-if="workout.trainer !== null && workout.trainer !== undefined" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span class="text-sm text-gray-600 dark:text-gray-400">Indoor Trainer</span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ workout.trainer ? 'Yes' : 'No' }}</span>
                    </div>
                  </div>
               </div>
         </div>

         <!-- JSON Data Tab Content -->
          <div v-show="selectedTab === 1" class="py-4">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Complete Workout Data (JSON)</h3>
                    <UButton
                      icon="i-heroicons-clipboard-document"
                      color="neutral"
                      variant="ghost"
                      @click="copyJsonToClipboard"
                    >
                      Copy JSON
                    </UButton>
                  </div>
                  <div class="p-6">
                    <pre class="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">{{ formattedJson }}</pre>
                  </div>
                </div>

                <div v-if="workout.rawJson" class="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Original Source Data (Raw JSON)</h3>
                    <UButton
                      icon="i-heroicons-clipboard-document"
                      color="neutral"
                      variant="ghost"
                      @click="copyRawJsonToClipboard"
                    >
                      Copy Raw JSON
                    </UButton>
                  </div>
                  <div class="p-6">
                    <pre class="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">{{ formattedRawJson }}</pre>
                  </div>
                </div>
         </div>
       </div>
     </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const toast = useToast()

const workout = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const tabs = [
  { label: 'Overview', slot: 'overview' },
  { label: 'JSON Data', slot: 'json' }
]

const selectedTab = ref(0)

// Fetch workout data
async function fetchWorkout() {
  loading.value = true
  error.value = null
  try {
    const id = route.params.id
    workout.value = await $fetch(`/api/workouts/${id}`)
    // Ensure overview tab is selected after data loads
    await nextTick()
    selectedTab.value = 0
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to load workout'
    console.error('Error fetching workout:', e)
  } finally {
    loading.value = false
  }
}

// Computed properties for JSON formatting
const formattedJson = computed(() => {
  if (!workout.value) return ''
  return JSON.stringify(workout.value, null, 2)
})

const formattedRawJson = computed(() => {
  if (!workout.value?.rawJson) return ''
  return JSON.stringify(workout.value.rawJson, null, 2)
})

// Copy functions
async function copyJsonToClipboard() {
  try {
    await navigator.clipboard.writeText(formattedJson.value)
    toast.add({
      title: 'Copied to clipboard',
      description: 'Workout JSON data copied successfully',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  } catch (e) {
    toast.add({
      title: 'Copy failed',
      description: 'Failed to copy to clipboard',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

async function copyRawJsonToClipboard() {
  try {
    await navigator.clipboard.writeText(formattedRawJson.value)
    toast.add({
      title: 'Copied to clipboard',
      description: 'Raw JSON data copied successfully',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  } catch (e) {
    toast.add({
      title: 'Copy failed',
      description: 'Failed to copy to clipboard',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

// Utility functions
function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

function formatDistance(meters: number) {
  const km = meters / 1000
  return `${km.toFixed(2)} km`
}

function getSourceBadgeClass(source: string) {
  const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold'
  if (source === 'intervals') return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
  if (source === 'whoop') return `${baseClass} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`
  if (source === 'strava') return `${baseClass} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`
  return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`
}

// Load data on mount
onMounted(() => {
  fetchWorkout()
})
</script>