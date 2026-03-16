<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :ui="{ content: 'max-w-4xl' }"
    :description="modalDescription"
  >
    <template #body>
      <div v-if="loading" class="flex justify-center items-center h-64">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
      </div>
      <div v-else-if="error" class="text-center text-red-500 py-8">
        {{ error }}
      </div>
      <div v-else-if="isGpsStream && gpsCoordinates.length > 1" class="space-y-4">
        <UiWorkoutMap
          :coordinates="gpsCoordinates"
          :streams="workoutStreams || undefined"
          :workout-id="workoutId"
          map-height="h-[22rem] sm:h-[28rem]"
        />
        <div class="grid gap-4 sm:grid-cols-3 text-center text-sm">
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <div class="text-gray-500">Track Points</div>
            <div class="font-bold">{{ gpsCoordinates.length }}</div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <div class="text-gray-500">Start</div>
            <div class="font-bold">{{ startCoordinateLabel }}</div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <div class="text-gray-500">End</div>
            <div class="font-bold">{{ endCoordinateLabel }}</div>
          </div>
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <UButton
            v-if="workoutId"
            color="neutral"
            variant="outline"
            icon="i-heroicons-document-arrow-down"
            :loading="isExporting"
            @click="downloadGPX"
          >
            Download GPX
          </UButton>
          <UButton
            v-if="workoutId"
            color="neutral"
            variant="soft"
            icon="i-heroicons-map"
            :to="`/workouts/${workoutId}/map`"
          >
            Open full map
          </UButton>
        </div>
      </div>
      <div v-else-if="displayStreamData && displayStreamData.length > 0">
        <BaseStreamChart
          :label="title"
          :data-points="displayStreamData"
          :labels="timeData"
          :color="chartColor"
          :y-axis-label="yAxisLabel"
        />
        <div class="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div class="bg-gray-50 dark:bg-gray-800 p-2 rounded">
            <div class="text-gray-500">Average</div>
            <div class="font-bold">{{ average }}</div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-800 p-2 rounded">
            <div class="text-gray-500">Max</div>
            <div class="font-bold">{{ max }}</div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-800 p-2 rounded">
            <div class="text-gray-500">Min</div>
            <div class="font-bold">{{ min }}</div>
          </div>
        </div>
      </div>
      <div v-else-if="isGpsStream" class="text-center text-gray-500 py-8">
        GPS data is available, but there are not enough route points to render a map.
      </div>
      <div v-else class="text-center text-gray-500 py-8">No data available for this stream.</div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <UButton color="neutral" variant="ghost" label="Close" @click="isOpen = false" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { convertVelocity, isRideWorkoutType } from '~/utils/metrics'
  import BaseStreamChart from './BaseStreamChart.vue'
  import UiWorkoutMap from '~/components/ui/WorkoutMap.vue'

  const userStore = useUserStore()

  const props = defineProps<{
    workoutId: string
    streamKey: string
    title: string
    color?: string
    unit?: string
    activityType?: string | null
  }>()

  const isOpen = defineModel<boolean>('open')

  const loading = ref(false)
  const isExporting = ref(false)
  const error = ref<string | null>(null)
  const streamData = ref<unknown[]>([])
  const workoutStreams = ref<Record<string, any> | null>(null)
  const timeData = ref<number[]>([])

  const chartColor = computed(() => props.color || '#3b82f6')
  const yAxisLabel = computed(() => props.unit || '')
  const workoutId = computed(() => props.workoutId)
  const isGpsStream = computed(() => props.streamKey === 'latlng')
  const modalDescription = computed(() =>
    isGpsStream.value
      ? 'Route overview for this workout, including a map of recorded GPS points.'
      : 'Detailed view of the specific data stream for this workout, including averages and peaks.'
  )
  const distanceUnits = computed(() => userStore.profile?.distanceUnits || 'Kilometers')
  const showVelocityAsSpeed = computed(
    () => props.streamKey === 'velocity' && isRideWorkoutType(props.activityType)
  )
  const numericStreamData = computed(() =>
    streamData.value.filter(
      (value): value is number => typeof value === 'number' && Number.isFinite(value)
    )
  )
  const displayStreamData = computed(() =>
    showVelocityAsSpeed.value
      ? numericStreamData.value.map((value) => convertVelocity(value, distanceUnits.value))
      : numericStreamData.value
  )
  const gpsCoordinates = computed<[number, number][]>(() =>
    streamData.value.flatMap((point) => {
      if (
        Array.isArray(point) &&
        point.length >= 2 &&
        typeof point[0] === 'number' &&
        Number.isFinite(point[0]) &&
        typeof point[1] === 'number' &&
        Number.isFinite(point[1])
      ) {
        return [[point[0], point[1]] as [number, number]]
      }

      if (
        point &&
        typeof point === 'object' &&
        'lat' in point &&
        'lng' in point &&
        typeof point.lat === 'number' &&
        Number.isFinite(point.lat) &&
        typeof point.lng === 'number' &&
        Number.isFinite(point.lng)
      ) {
        return [[point.lat, point.lng] as [number, number]]
      }

      return []
    })
  )

  function formatCoordinate(value?: [number, number]) {
    if (!value) return '-'
    return `${value[0].toFixed(5)}, ${value[1].toFixed(5)}`
  }

  const startCoordinateLabel = computed(() => formatCoordinate(gpsCoordinates.value[0]))
  const endCoordinateLabel = computed(() =>
    formatCoordinate(gpsCoordinates.value[gpsCoordinates.value.length - 1])
  )

  function formatStat(value: number) {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1)
  }

  const average = computed(() => {
    if (!displayStreamData.value.length) return '-'
    const sum = displayStreamData.value.reduce((a, b) => a + b, 0)
    return formatStat(sum / displayStreamData.value.length)
  })

  const max = computed(() => {
    if (!displayStreamData.value.length) return '-'
    return formatStat(Math.max(...displayStreamData.value))
  })

  const min = computed(() => {
    if (!displayStreamData.value.length) return '-'
    return formatStat(Math.min(...displayStreamData.value))
  })

  // Fetch stream data when modal opens
  watch(isOpen, async (val) => {
    if (val && props.workoutId && props.streamKey) {
      await fetchStreamData()
    }
  })

  async function fetchStreamData() {
    loading.value = true
    error.value = null
    try {
      // We reuse the existing workout detail endpoint which includes streams
      // Ideally we might want a specific endpoint for just streams if payload is large,
      // but for now we extract from the full workout object or we can add a specific API.
      // Let's check if we can fetch just the streams or if we already have them in the parent.
      // Assuming we fetch fresh to ensure we get the full array data if it was truncated/optimized elsewhere.

      // Actually, looking at the previous step, the workout detail endpoint returns `streams: true`.
      // So the data might be huge.
      // Let's define a new lightweight endpoint for specific stream data if we want to be efficient,
      // OR just use the /api/workouts/:id response if we assume client has it.
      // BUT the 'streamKey' passed here (e.g. 'torque') matches the DB column name.

      const response = (await $fetch(`/api/workouts/${props.workoutId}`)) as any

      if (response && response.streams) {
        workoutStreams.value = response.streams
        // Map the prop streamKey (e.g., 'torque') to the response stream data
        // The API returns streams object with keys like 'torque', 'watts', etc.
        // And they are JSON arrays.

        // Handle case mapping if needed, but we standardized on camelCase/db names
        const key = props.streamKey

        if (response.streams[key] && Array.isArray(response.streams[key])) {
          streamData.value = response.streams[key]
          timeData.value = response.streams.time || []
        } else {
          error.value = `Stream '${props.title}' not found.`
        }
      } else {
        error.value = 'Streams not available for this workout.'
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to load stream data'
    } finally {
      loading.value = false
    }
  }

  async function downloadGPX() {
    if (!props.workoutId || !import.meta.client) return

    try {
      isExporting.value = true
      const url = `/api/workouts/${props.workoutId}/export/gpx`
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', '')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('Failed to download GPX:', e)
    } finally {
      isExporting.value = false
    }
  }
</script>
