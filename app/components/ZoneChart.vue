<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
  >
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"
      />
      <p class="text-xs font-black uppercase tracking-widest text-gray-500">
        Mapping Intensity Zones...
      </p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <p class="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-tight">
        {{ error }}
      </p>
    </div>

    <!-- No Data State -->
    <div
      v-else-if="!hasZoneData"
      class="text-center py-12 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800"
    >
      <UIcon
        name="i-heroicons-chart-bar"
        class="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4"
      />
      <p class="text-sm font-black text-gray-500 uppercase tracking-widest">Zone Data Pending</p>
      <p
        class="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-2 max-w-xs mx-auto leading-relaxed"
      >
        {{
          !hasStreamData
            ? 'Intensity data streams were not detected for this session.'
            : 'Insufficient data points found to generate distribution.'
        }}
      </p>
    </div>

    <!-- Zone Chart -->
    <div v-else class="space-y-10">
      <!-- Zone Type Selector -->
      <div v-if="hasHrData && hasPowerData" class="flex gap-2">
        <UButton
          v-for="type in ['hr', 'power'] as const"
          :key="type"
          :color="selectedZoneType === type ? 'primary' : 'neutral'"
          :variant="selectedZoneType === type ? 'solid' : 'ghost'"
          size="xs"
          class="font-black uppercase tracking-widest text-[9px] px-3"
          @click="selectedZoneType = type as 'hr' | 'power'"
        >
          {{ type === 'hr' ? 'Heart Rate' : 'Power Output' }}
        </UButton>
      </div>

      <!-- Chart Container -->
      <div class="space-y-8">
        <!-- Stacked Bar Chart -->
        <div v-if="chartData.datasets.length > 0">
          <div class="mb-6">
            <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              {{ selectedZoneType === 'hr' ? 'Heart Rate' : 'Power' }} Intensity Timeline
            </h3>
          </div>
          <div style="height: 120px; position: relative">
            <Bar :data="chartData" :options="chartOptions" :height="120" />
          </div>
        </div>

        <!-- Zone Legend -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div
            v-for="(zone, index) in currentZones"
            :key="index"
            class="p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 group transition-all hover:border-primary-500/30"
          >
            <div
              class="w-1.5 h-6 rounded-full shrink-0"
              :style="{ backgroundColor: getZoneColor(Number(index)) }"
            />
            <div class="min-w-0">
              <div
                class="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate"
              >
                {{ zone.name }}
              </div>
              <div class="text-[10px] font-bold text-gray-900 dark:text-white tabular-nums">
                {{ zone.min }}-{{ zone.max
                }}<span class="text-[8px] ml-0.5 text-gray-400 uppercase">{{
                  selectedZoneType === 'hr' ? 'bpm' : 'W'
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Training Distribution Profile -->
        <div v-if="trainingProfile" class="pt-8 border-t border-gray-100 dark:border-gray-800">
          <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
            Zone Profile
          </h3>
          <div
            :class="getProfileBadgeClass(trainingProfile.type)"
            class="p-6 rounded-xl relative overflow-hidden"
          >
            <div class="absolute -right-4 -bottom-4 opacity-10 rotate-12">
              <UIcon :name="getProfileIcon(trainingProfile.type)" class="size-24" />
            </div>
            <div class="flex items-start gap-4 relative z-10">
              <div class="p-3 bg-white/20 dark:bg-black/20 rounded-xl backdrop-blur-sm">
                <UIcon :name="getProfileIcon(trainingProfile.type)" class="w-8 h-8" />
              </div>
              <div class="flex-1">
                <h5 class="text-xl font-black uppercase tracking-tight mb-1">
                  {{ trainingProfile.type }} Profile
                </h5>
                <p class="text-sm font-medium opacity-90 leading-relaxed max-w-2xl">
                  {{ trainingProfile.description }}
                </p>
                <div
                  class="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-80"
                >
                  <span class="i-heroicons-chart-pie size-3.5" />
                  Distribution Breakdown: {{ trainingProfile.distribution }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Time in Zone Summary -->
        <div
          v-if="timeInZones.length > 0"
          class="pt-8 border-t border-gray-100 dark:border-gray-800"
        >
          <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">
            Time in Zones
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            <div v-for="(zone, index) in currentZones" :key="index" class="relative">
              <div
                class="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2.5"
              >
                <span class="text-gray-500">{{ zone.name }}</span>
                <span class="text-gray-900 dark:text-white tabular-nums">
                  {{ formatDuration(timeInZones[Number(index)] || 0) }}
                  <span class="text-gray-400 ml-1"
                    >({{
                      totalTime > 0
                        ? (((timeInZones[Number(index)] || 0) / totalTime) * 100).toFixed(1)
                        : 0
                    }}%)</span
                  >
                </span>
              </div>
              <div
                class="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner"
              >
                <div
                  class="h-full transition-all duration-1000 ease-out"
                  :style="{
                    width:
                      (totalTime > 0 ? ((timeInZones[Number(index)] || 0) / totalTime) * 100 : 0) +
                      '%',
                    backgroundColor: getZoneColor(Number(index))
                  }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Bar } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    type ChartOptions
  } from 'chart.js'
  import { getZoneColor } from '~/utils/zone-colors'
  import { getPreferredMetric } from '~/utils/sportSettings'

  ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

  interface Props {
    workoutId: string
    publicToken?: string
    activityType?: string
    streamData?: any
  }

  const props = defineProps<Props>()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const localStreamData = ref<any>(null)
  const userZones = ref<any>(null)
  const selectedZoneType = ref<'hr' | 'power' | 'pace'>('hr')

  // Computed properties
  const hasStreamData = computed(() => {
    return !!(
      localStreamData.value &&
      (localStreamData.value.heartrate ||
        localStreamData.value.watts ||
        localStreamData.value.hrZoneTimes ||
        localStreamData.value.powerZoneTimes)
    )
  })

  const hasHrData = computed(() => {
    return !!(
      localStreamData.value?.heartrate?.length > 0 || localStreamData.value?.hrZoneTimes?.length > 0
    )
  })

  const hasPowerData = computed(() => {
    return !!(
      localStreamData.value?.watts?.length > 0 || localStreamData.value?.powerZoneTimes?.length > 0
    )
  })

  const hasZoneData = computed(() => {
    return hasStreamData.value && currentZones.value && currentZones.value.length > 0
  })

  const currentZones = computed(() => {
    if (!userZones.value) return []
    return selectedZoneType.value === 'hr' ? userZones.value.hrZones : userZones.value.powerZones
  })

  const timeInZones = ref<number[]>([])
  const totalTime = ref(0)

  // Watch for data changes to update timeInZones if cached data is present
  watch(
    [localStreamData, selectedZoneType],
    () => {
      if (!localStreamData.value) return

      if (selectedZoneType.value === 'hr' && localStreamData.value.hrZoneTimes?.length > 0) {
        timeInZones.value = localStreamData.value.hrZoneTimes
        totalTime.value = timeInZones.value.reduce((a, b) => a + b, 0)
      } else if (
        selectedZoneType.value === 'power' &&
        localStreamData.value.powerZoneTimes?.length > 0
      ) {
        timeInZones.value = localStreamData.value.powerZoneTimes
        totalTime.value = timeInZones.value.reduce((a, b) => a + b, 0)
      }
    },
    { immediate: true }
  )

  // Training distribution profile
  interface TrainingProfile {
    type: 'Polarized' | 'Pyramidal' | 'Threshold' | 'HIIT' | 'Base' | 'Mixed'
    description: string
    distribution: string
    confidence: number
  }

  const trainingProfile = computed<TrainingProfile | null>(() => {
    if (timeInZones.value.length < 5 || totalTime.value === 0) return null

    // Calculate percentages for each zone
    const percentages = timeInZones.value.map((time) => (time / totalTime.value) * 100)

    // Categorize zones into groups (with null checks)
    const z1z2 = (percentages[0] || 0) + (percentages[1] || 0) // Easy/Endurance (Z1+Z2)
    const z3 = percentages[2] || 0 // Tempo (Z3)
    const z4z5 = (percentages[3] || 0) + (percentages[4] || 0) // Threshold/VO2 Max (Z4+Z5)

    // Detection logic with confidence scoring
    let profile: TrainingProfile

    // HIIT: >30% in Z4-Z5, minimal Z1-Z2
    if (z4z5 > 30 && z1z2 < 50) {
      profile = {
        type: 'HIIT',
        description: 'High-intensity interval training with significant time at maximum effort',
        distribution: `${z4z5.toFixed(0)}% high intensity, ${z3.toFixed(0)}% tempo, ${z1z2.toFixed(0)}% easy`,
        confidence: Math.min(100, z4z5 * 2)
      }
    }
    // Threshold: >40% in Z3-Z4
    else if (z3 + (percentages[3] || 0) > 40) {
      profile = {
        type: 'Threshold',
        description: 'Sustained effort at or near lactate threshold, building race-pace endurance',
        distribution: `${(z3 + (percentages[3] || 0)).toFixed(0)}% tempo/threshold, ${z1z2.toFixed(0)}% easy, ${(percentages[4] || 0).toFixed(0)}% hard`,
        confidence: Math.min(100, (z3 + (percentages[3] || 0)) * 1.5)
      }
    }
    // Polarized: >70% in Z1-Z2 and >15% in Z4-Z5, <15% in Z3
    else if (z1z2 > 70 && z4z5 > 15 && z3 < 15) {
      profile = {
        type: 'Polarized',
        description:
          'Optimal training distribution: easy base work with intense intervals, avoiding moderate zones',
        distribution: `${z1z2.toFixed(0)}% easy, ${z3.toFixed(0)}% tempo, ${z4z5.toFixed(0)}% hard`,
        confidence: Math.min(100, (z1z2 + z4z5) / 2)
      }
    }
    // Base: >80% in Z1-Z2
    else if (z1z2 > 80) {
      profile = {
        type: 'Base',
        description:
          'Aerobic base building with easy, sustainable effort for endurance development',
        distribution: `${z1z2.toFixed(0)}% easy aerobic, ${z3.toFixed(0)}% tempo, ${z4z5.toFixed(0)}% hard`,
        confidence: Math.min(100, z1z2)
      }
    }
    // Pyramidal: Progressive decrease from Z2 to Z5
    else if (
      (percentages[1] || 0) > (percentages[2] || 0) &&
      (percentages[2] || 0) > (percentages[3] || 0)
    ) {
      profile = {
        type: 'Pyramidal',
        description:
          'Traditional volume-based training with most time at moderate intensity, tapering to high intensity',
        distribution: `${z1z2.toFixed(0)}% easy, ${z3.toFixed(0)}% tempo, ${z4z5.toFixed(0)}% hard`,
        confidence: 70
      }
    }
    // Mixed: Doesn't fit clear pattern
    else {
      profile = {
        type: 'Mixed',
        description:
          'Varied intensity distribution across multiple zones, typical of group rides or races',
        distribution: `${z1z2.toFixed(0)}% easy, ${z3.toFixed(0)}% tempo, ${z4z5.toFixed(0)}% hard`,
        confidence: 60
      }
    }

    return profile
  })

  // Calculate zone distribution for chart
  const chartData = computed(() => {
    if (!hasZoneData.value || !localStreamData.value) {
      return { labels: [], datasets: [] }
    }

    const time = localStreamData.value.time || []
    const values =
      selectedZoneType.value === 'hr'
        ? localStreamData.value.heartrate
        : localStreamData.value.watts

    if (!values || values.length === 0) {
      return { labels: [], datasets: [] }
    }

    // Sample data for performance (every 30 seconds or every 30th point)
    const sampleRate = Math.max(1, Math.floor(values.length / 200))
    const sampledTime = time.filter((_: any, i: number) => i % sampleRate === 0)
    const sampledValues = values.filter((_: any, i: number) => i % sampleRate === 0)

    // Calculate which zone each point belongs to
    const zoneData = currentZones.value.map(() => new Array(sampledTime.length).fill(0))

    sampledValues.forEach((value: number, i: number) => {
      const zoneIndex = getZoneIndex(value)
      if (zoneIndex >= 0) {
        zoneData[zoneIndex][i] = 1 // Mark this zone as active at this time
      }
    })

    return {
      labels: sampledTime.map((t: number) => formatTime(t)),
      datasets: currentZones.value.map((zone: any, index: number) => ({
        label: zone.name,
        data: zoneData[index],
        backgroundColor: getZoneColor(index),
        borderWidth: 0,
        barThickness: 'flex',
        maxBarThickness: 10
      }))
    }
  })

  // Calculate summary stats whenever chart data inputs change
  watch(
    () => [localStreamData.value, currentZones.value],
    () => {
      if (!localStreamData.value || !currentZones.value) return

      const time = localStreamData.value.time || []
      const values =
        selectedZoneType.value === 'hr'
          ? localStreamData.value.heartrate
          : localStreamData.value.watts

      if (!values || values.length === 0) {
        timeInZones.value = []
        totalTime.value = 0
        return
      }

      // Sample data for performance
      const sampleRate = Math.max(1, Math.floor(values.length / 200))
      const sampledTime = time.filter((_: any, i: number) => i % sampleRate === 0)
      const sampledValues = values.filter((_: any, i: number) => i % sampleRate === 0)

      const timeInZonesCalc = new Array(currentZones.value.length).fill(0)

      sampledValues.forEach((value: number, i: number) => {
        const zoneIndex = getZoneIndex(value)
        if (zoneIndex >= 0) {
          // Calculate time in zone (approximate from sample rate)
          if (i > 0) {
            const timeDiff = sampledTime[i] - sampledTime[i - 1]
            timeInZonesCalc[zoneIndex] += timeDiff
          }
        }
      })

      timeInZones.value = timeInZonesCalc
      totalTime.value = sampledTime[sampledTime.length - 1] - sampledTime[0]
    }
  )

  const chartOptions = computed<ChartOptions<'bar'>>(() => {
    const isDark =
      typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

    return {
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
          callbacks: {
            title: (context: any) => {
              return `Time: ${context[0].label}`
            },
            label: (context: any) => {
              if (context.parsed.y === 1) {
                return context.dataset.label
              }
              return null
            },
            footer: (contexts: any) => {
              const activeZones = contexts.filter((c: any) => c.parsed.y === 1)
              if (activeZones.length > 0) {
                return `Active Zone: ${activeZones[0].dataset.label}`
              }
              return ''
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: isDark ? '#9CA3AF' : '#6B7280',
            maxRotation: 0,
            autoSkipPadding: 50,
            font: {
              size: 10
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          stacked: true,
          display: false,
          max: 1
        }
      },
      layout: {
        padding: {
          left: 5,
          right: 5,
          top: 5,
          bottom: 5
        }
      }
    }
  })

  // Helper functions
  function getZoneIndex(value: number): number {
    if (!currentZones.value || currentZones.value.length === 0) return -1

    for (let i = 0; i < currentZones.value.length; i++) {
      const zone = currentZones.value[i]
      if (value >= zone.min && value <= zone.max) {
        return i
      }
    }

    // If value is above all zones, put it in the highest zone
    if (value > currentZones.value[currentZones.value.length - 1].max) {
      return currentZones.value.length - 1
    }

    return -1
  }

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}`
    }
    return `${minutes}min`
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  // Fetch data
  async function fetchData() {
    if (!props.workoutId) return

    // Sync ref with prop if provided
    if (props.streamData) {
      localStreamData.value = props.streamData
    }

    loading.value = true
    error.value = null

    try {
      // Fetch stream data if not provided via props and not already fetched
      if (!localStreamData.value) {
        const url = props.publicToken
          ? `/api/share/workouts/${props.publicToken}/streams`
          : `/api/workouts/${props.workoutId}/streams`

        localStreamData.value = await $fetch<any>(url)
      }

      if (props.workoutId && !userZones.value) {
        // Try to get from workout if provided (it usually includes user)
        const workout = (props as any).workout
        if (workout?.user) {
          const settings = workout.user.sportSettings || []
          const defaultProfile = settings.find((s: any) => s.isDefault)

          userZones.value = {
            hrZones: defaultProfile?.hrZones || workout.user.hrZones || getDefaultHrZones(),
            powerZones:
              defaultProfile?.powerZones || workout.user.powerZones || getDefaultPowerZones(),
            loadPreference: defaultProfile?.loadPreference
          }
        } else {
          // Fetch full profile
          const profile = await $fetch<any>('/api/profile').catch(() => null)
          if (profile?.profile) {
            const sportSettings = profile.profile.sportSettings || []
            let activeProfile = sportSettings.find((s: any) => s.isDefault)

            if (props.activityType) {
              const match = sportSettings.find(
                (s: any) => !s.isDefault && s.types && s.types.includes(props.activityType)
              )
              if (match) activeProfile = match
            }

            userZones.value = {
              hrZones: activeProfile?.hrZones || getDefaultHrZones(),
              powerZones: activeProfile?.powerZones || getDefaultPowerZones(),
              loadPreference: activeProfile?.loadPreference
            }
          }
        }
      }

      // Auto-select zone type based on available data and preference
      if (hasHrData.value || hasPowerData.value) {
        selectedZoneType.value = getPreferredMetric(userZones.value, {
          hasHr: hasHrData.value,
          hasPower: hasPowerData.value
        })
      }
    } catch (e: any) {
      console.error('Error fetching zone data:', e)
      error.value = e.data?.message || 'Failed to load zone data'
    } finally {
      loading.value = false
    }
  }

  function getDefaultHrZones() {
    return [
      { name: 'Z1 Recovery', min: 0, max: 120 },
      { name: 'Z2 Aerobic', min: 121, max: 145 },
      { name: 'Z3 Tempo', min: 146, max: 160 },
      { name: 'Z4 SubThreshold', min: 161, max: 175 },
      { name: 'Z5 SuperThreshold', min: 176, max: 185 },
      { name: 'Z6 Aerobic Capacity', min: 186, max: 200 },
      { name: 'Z7 Anaerobic', min: 201, max: 220 }
    ]
  }

  function getDefaultPowerZones() {
    return [
      { name: 'Z1 Active Recovery', min: 0, max: 137 },
      { name: 'Z2 Endurance', min: 138, max: 187 },
      { name: 'Z3 Tempo', min: 188, max: 225 },
      { name: 'SS Sweet Spot', min: 226, max: 240 },
      { name: 'Z4 Threshold', min: 241, max: 262 },
      { name: 'Z5 VO2 Max', min: 263, max: 300 },
      { name: 'Z6 Anaerobic', min: 301, max: 400 },
      { name: 'Z7 Neuromuscular', min: 401, max: 999 }
    ]
  }

  function getProfileBadgeClass(type: string) {
    const base = 'shadow-sm'
    switch (type) {
      case 'HIIT':
        return `${base} bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300`
      case 'Threshold':
        return `${base} bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300`
      case 'Polarized':
        return `${base} bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300`
      case 'Base':
        return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300`
      case 'Pyramidal':
        return `${base} bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300`
      default:
        return `${base} bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300`
    }
  }

  function getProfileIcon(type: string) {
    switch (type) {
      case 'HIIT':
        return 'i-lucide-zap'
      case 'Threshold':
        return 'i-lucide-flame'
      case 'Polarized':
        return 'i-lucide-arrow-up-right'
      case 'Base':
        return 'i-lucide-mountain'
      case 'Pyramidal':
        return 'i-lucide-bar-chart'
      default:
        return 'i-lucide-activity'
    }
  }

  onMounted(() => {
    fetchData()
  })
</script>
