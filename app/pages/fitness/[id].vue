<template>
  <UDashboardPanel id="fitness-detail">
    <template #header>
      <UDashboardNavbar :title="wellness ? `Wellness: ${formatDate(wellness.date)}` : 'Wellness Details'">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            to="/fitness"
          >
            Back to Fitness
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading wellness data...</p>
          </div>
        </div>

        <div v-else-if="error" class="text-center py-12">
          <div class="text-red-600 dark:text-red-400">
            <p class="text-lg font-semibold">{{ error }}</p>
          </div>
        </div>

        <div v-else-if="wellness" class="space-y-6">
          <!-- Header Card -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Daily Wellness
                </h1>
                <div class="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div class="flex items-center gap-1">
                    <span class="i-heroicons-calendar w-4 h-4"></span>
                    {{ formatDate(wellness.date) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Key Metrics Grid -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-if="wellness.recoveryScore" class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 rounded-lg p-6 shadow">
              <div class="flex items-center justify-between mb-2">
                <span class="i-heroicons-heart w-6 h-6 text-green-600 dark:text-green-400"></span>
              </div>
              <div class="text-3xl font-bold text-green-900 dark:text-green-100">
                {{ wellness.recoveryScore }}%
              </div>
              <div class="text-sm text-green-700 dark:text-green-300 mt-1">Recovery Score</div>
            </div>

            <div v-if="wellness.readiness" class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-lg p-6 shadow">
              <div class="flex items-center justify-between mb-2">
                <span class="i-heroicons-bolt w-6 h-6 text-blue-600 dark:text-blue-400"></span>
              </div>
              <div class="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {{ wellness.readiness }}{{ wellness.readiness > 10 ? '%' : '/10' }}
              </div>
              <div class="text-sm text-blue-700 dark:text-blue-300 mt-1">Readiness</div>
            </div>

            <div v-if="wellness.sleepHours" class="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/30 rounded-lg p-6 shadow">
              <div class="flex items-center justify-between mb-2">
                <span class="i-heroicons-moon w-6 h-6 text-indigo-600 dark:text-indigo-400"></span>
              </div>
              <div class="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                {{ wellness.sleepHours.toFixed(1) }}h
              </div>
              <div class="text-sm text-indigo-700 dark:text-indigo-300 mt-1">Sleep Duration</div>
            </div>

            <div v-if="wellness.hrv" class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 rounded-lg p-6 shadow">
              <div class="flex items-center justify-between mb-2">
                <span class="i-heroicons-heart-pulse w-6 h-6 text-purple-600 dark:text-purple-400"></span>
              </div>
              <div class="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {{ Math.round(wellness.hrv) }}
              </div>
              <div class="text-sm text-purple-700 dark:text-purple-300 mt-1">HRV (ms)</div>
            </div>
          </div>

          <!-- Heart Rate Metrics -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Heart Rate Metrics</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="wellness.restingHr" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Resting Heart Rate</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.restingHr }} bpm</span>
              </div>
              <div v-if="wellness.avgSleepingHr" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Avg Sleeping HR</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.avgSleepingHr }} bpm</span>
              </div>
              <div v-if="wellness.hrv" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">HRV (rMSSD)</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ Math.round(wellness.hrv) }} ms</span>
              </div>
              <div v-if="wellness.hrvSdnn" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">HRV SDNN</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ Math.round(wellness.hrvSdnn) }} ms</span>
              </div>
            </div>
          </div>

          <!-- Sleep Metrics -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Sleep Quality</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="wellness.sleepHours" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Sleep Duration</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.sleepHours.toFixed(1) }} hours</span>
              </div>
              <div v-if="wellness.sleepScore" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Sleep Score</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.sleepScore }}%</span>
              </div>
              <div v-if="wellness.sleepQuality" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Sleep Quality</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.sleepQuality }}/10</span>
              </div>
            </div>
          </div>

          <!-- Subjective Wellness -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Subjective Wellness</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="wellness.soreness" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Muscle Soreness</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.soreness }}/10</span>
              </div>
              <div v-if="wellness.fatigue" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Fatigue</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.fatigue }}/10</span>
              </div>
              <div v-if="wellness.stress" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Stress</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.stress }}/10</span>
              </div>
              <div v-if="wellness.mood" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Mood</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.mood }}/10</span>
              </div>
              <div v-if="wellness.motivation" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Motivation</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.motivation }}/10</span>
              </div>
            </div>
          </div>

          <!-- Training Load -->
          <div v-if="wellness.ctl || wellness.atl" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Training Load</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="wellness.ctl" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">CTL (Fitness)</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.ctl.toFixed(1) }}</span>
              </div>
              <div v-if="wellness.atl" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">ATL (Fatigue)</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.atl.toFixed(1) }}</span>
              </div>
            </div>
          </div>

          <!-- Physical Metrics -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Physical Metrics</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="wellness.weight" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Weight</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.weight.toFixed(1) }} kg</span>
              </div>
              <div v-if="wellness.bodyFat" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Body Fat</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.bodyFat.toFixed(1) }}%</span>
              </div>
              <div v-if="wellness.abdomen" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Abdominal Circumference</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.abdomen }} cm</span>
              </div>
              <div v-if="wellness.vo2max" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">VO2 Max</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.vo2max.toFixed(1) }} ml/kg/min</span>
              </div>
            </div>
          </div>

          <!-- Vitals & Health -->
          <div v-if="wellness.spO2 || wellness.restingHr || wellness.bloodGlucose || wellness.hydration || wellness.respiration || wellness.systolic || wellness.lactate" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Vitals & Health</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="wellness.spO2" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Blood Oxygen (SpO2)</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.spO2.toFixed(1) }}%</span>
              </div>
              <div v-if="wellness.respiration" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Respiration Rate</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.respiration.toFixed(1) }} br/min</span>
              </div>
              <div v-if="wellness.bloodGlucose" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Blood Glucose</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.bloodGlucose }} mmol/L</span>
              </div>
              <div v-if="wellness.lactate" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Blood Lactate</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.lactate }} mmol/L</span>
              </div>
              <div v-if="wellness.systolic && wellness.diastolic" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Blood Pressure</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.systolic }}/{{ wellness.diastolic }} mmHg</span>
              </div>
              <div v-if="wellness.hydration" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Hydration Status</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.hydration }}</span>
              </div>
              <div v-if="wellness.hydrationVolume" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Water Intake</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.hydrationVolume }} L</span>
              </div>
              <div v-if="wellness.skinTemp" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Skin Temperature</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ wellness.skinTemp.toFixed(1) }}°C</span>
              </div>
              <div v-if="wellness.injury" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Injury Status</span>
                <span class="text-sm font-medium text-red-600 dark:text-red-400">{{ wellness.injury }}</span>
              </div>
              <div v-if="wellness.menstrualPhase" class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">Cycle Phase</span>
                <span class="text-sm font-medium text-purple-600 dark:text-purple-400">{{ wellness.menstrualPhase }}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="wellness.comments" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Notes</h2>
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ wellness.comments }}</p>
            </div>
          </div>

          <!-- JSON Data -->
          <div v-if="wellness.rawJson" class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <button 
              class="w-full px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              @click="showRawJson = !showRawJson"
            >
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span :class="showRawJson ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" class="w-5 h-5"></span>
                Raw Data (JSON)
              </h3>
              <div class="flex items-center gap-2" @click.stop>
                <UButton
                  icon="i-heroicons-clipboard-document"
                  color="neutral"
                  variant="ghost"
                  @click="copyJsonToClipboard"
                >
                  Copy JSON
                </UButton>
              </div>
            </button>
            <div v-if="showRawJson" class="p-6">
              <pre class="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">{{ formattedRawJson }}</pre>
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
const wellness = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const showRawJson = ref(false)

// Fetch wellness data
async function fetchWellness() {
  loading.value = true
  error.value = null
  
  try {
    const id = route.params.id as string
    wellness.value = await $fetch(`/api/wellness/${id}`)
  } catch (e: any) {
    console.error('Error fetching wellness:', e)
    error.value = e.data?.message || e.message || 'Failed to load wellness data'
  } finally {
    loading.value = false
  }
}

// Utility functions
function formatDate(date: string | Date) {
  // Parse date in UTC to avoid timezone conversion issues
  // Database stores dates as YYYY-MM-DD (date-only, no time component)
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'  // Force UTC to prevent timezone shifts
  })
}

const formattedRawJson = computed(() => {
  if (!wellness.value?.rawJson) return ''
  return JSON.stringify(wellness.value.rawJson, null, 2)
})

async function copyJsonToClipboard() {
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

useHead(() => {
  const dateStr = wellness.value ? formatDate(wellness.value.date) : ''
  return {
    title: wellness.value ? `Wellness: ${dateStr}` : 'Wellness Details',
    meta: [
      { name: 'description', content: wellness.value ? `Daily wellness metrics including recovery, sleep, and HRV for ${dateStr}.` : 'View daily wellness metrics including recovery, sleep, and HRV.' }
    ]
  }
})

// Load data on mount
onMounted(() => {
  fetchWellness()
})
</script>