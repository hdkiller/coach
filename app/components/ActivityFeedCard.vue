<template>
  <div
    :id="'workout-' + workout.id"
    class="group cursor-pointer bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all duration-300 overflow-hidden"
    @click="$emit('click')"
  >
    <div class="p-5 sm:p-6">
      <!-- Header: Title and Meta -->
      <div class="flex justify-between items-start gap-4 mb-6">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3
              class="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight truncate group-hover:text-primary-500 transition-colors"
            >
              {{ workout.title }}
            </h3>
            <UBadge
              v-if="workout.isDuplicate"
              color="warning"
              variant="subtle"
              size="xs"
              class="text-[8px] font-black uppercase tracking-widest"
            >
              Duplicate
            </UBadge>
          </div>
          <div
            class="flex items-center gap-3 mt-1 text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest"
          >
            <div class="flex items-center gap-1.5">
              <UIcon
                :name="getWorkoutIcon(workout.type)"
                class="w-3.5 h-3.5"
                :class="getWorkoutColorClass(workout.type)"
              />
              <span>{{ workout.type || 'Activity' }}</span>
            </div>
            <span class="opacity-30">•</span>
            <span>{{ formatDateTime(workout.date) }}</span>
          </div>
        </div>

        <!-- AI Feedback & Score -->
        <div class="flex flex-col items-end gap-2 shrink-0">
          <div v-if="workout.overallScore" class="flex items-center gap-1.5">
            <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Score</span>
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border"
              :class="getScoreColorClass(workout.overallScore)"
            >
              {{ Math.round(workout.overallScore) }}
            </div>
          </div>
          <div v-if="workout.feedback" class="shrink-0">
            <UTooltip :text="workout.feedbackText || 'AI Analysis Available'">
              <div
                class="flex items-center gap-1.5 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800"
              >
                <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5 text-primary-500" />
                <span class="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase"
                  >Analyzed</span
                >
              </div>
            </UTooltip>
          </div>
        </div>
      </div>

      <!-- Main Metrics Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        <!-- Duration -->
        <div class="flex flex-col">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5"
            >Duration</span
          >
          <div class="flex items-baseline gap-1">
            <span class="text-lg font-black text-gray-900 dark:text-white tabular-nums">{{
              formatDuration(workout.durationSec)
            }}</span>
          </div>
        </div>

        <!-- Training Load -->
        <div v-if="workout.tss" class="flex flex-col">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5"
            >TSS</span
          >
          <div class="flex items-baseline gap-1">
            <span class="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{{
              Math.round(workout.tss)
            }}</span>
          </div>
        </div>

        <!-- Intensity / Avg Metric -->
        <div v-if="workout.averageWatts || workout.averageHr" class="flex flex-col">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
            {{ workout.averageWatts ? 'Avg Power' : 'Avg HR' }}
          </span>
          <div class="flex items-baseline gap-1">
            <span
              class="text-lg font-black tabular-nums"
              :class="workout.averageWatts ? 'text-purple-600' : 'text-pink-600'"
            >
              {{ workout.averageWatts || workout.averageHr }}
            </span>
            <span class="text-[10px] font-black text-gray-400 uppercase">{{
              workout.averageWatts ? 'W' : 'bpm'
            }}</span>
          </div>
        </div>

        <!-- Distance -->
        <div v-if="workout.distanceMeters" class="flex flex-col">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5"
            >Distance</span
          >
          <div class="flex items-baseline gap-1">
            <span class="text-lg font-black text-gray-900 dark:text-white tabular-nums">
              {{ (workout.distanceMeters / 1000).toFixed(1) }}
            </span>
            <span class="text-[10px] font-black text-gray-400 uppercase">km</span>
          </div>
        </div>
      </div>

      <!-- Footer Tags & Source -->
      <div
        class="mt-8 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center"
      >
        <div class="flex flex-wrap gap-1.5 items-center">
          <UBadge
            v-for="tag in workout.tags?.slice(0, 3)"
            :key="tag"
            color="neutral"
            variant="soft"
            size="xs"
            class="text-[9px] font-bold px-2 py-0.5 rounded-md"
          >
            {{ tag }}
          </UBadge>
          <UTooltip v-if="workout.streams?.length > 0" text="Detailed Sensor Data Available">
            <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 text-primary-500 ml-1" />
          </UTooltip>
          <UTooltip
            v-if="workout.distanceMeters > 0 && workout.streams?.length > 0"
            text="GPS Map Available"
          >
            <UIcon name="i-heroicons-map" class="w-4 h-4 text-blue-500 ml-1" />
          </UTooltip>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">{{
            workout.source
          }}</span>
          <UiDataAttribution
            v-if="
              [
                'strava',
                'garmin',
                'zwift',
                'apple_health',
                'whoop',
                'intervals',
                'withings',
                'hevy',
                'wahoo'
              ].includes(workout.source)
            "
            :provider="workout.source"
            class="opacity-50"
          />
        </div>
      </div>

      <!-- Lazy Map Section -->
      <div
        v-if="hasGpsData"
        class="mt-6 -mx-5 sm:-mx-6 border-y border-gray-50 dark:border-gray-800"
      >
        <div
          v-if="loadingMap"
          class="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-950"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-300" />
        </div>
        <UiWorkoutMap
          v-else-if="mapData?.latlng"
          :coordinates="mapData.latlng"
          :streams="mapData"
          :interactive="false"
          map-height="h-48 sm:h-64"
          class="border-none shadow-none rounded-none"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const { formatDateTime } = useFormat()

  const props = defineProps<{
    workout: any
  }>()

  defineEmits<{
    click: []
  }>()

  const loadingMap = ref(false)
  const mapData = ref<any>(null)

  const hasGpsData = computed(() => {
    return props.workout.distanceMeters > 0 && props.workout.streams?.length > 0
  })

  async function fetchMapData() {
    if (!hasGpsData.value || mapData.value) return

    loadingMap.value = true
    try {
      const data = await $fetch<any>(`/api/workouts/${props.workout.id}/streams`)
      if (data?.latlng) {
        mapData.value = data
      }
    } catch (e) {
      console.error('Failed to fetch map data for feed card:', e)
    } finally {
      loadingMap.value = false
    }
  }

  // Fetch map data when component becomes visible (Intersection Observer)
  const cardRef = ref(null)
  if (import.meta.client) {
    onMounted(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchMapData()
            observer.disconnect()
          }
        },
        { threshold: 0.1 }
      )

      const el = document.getElementById(`workout-${props.workout.id}`)
      if (el) observer.observe(el)
    })
  }

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  function getScoreColorClass(score: number) {
    if (score >= 85)
      return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
    if (score >= 70)
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
    if (score >= 50)
      return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
    return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
  }
</script>
