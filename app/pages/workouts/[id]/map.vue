<template>
  <UDashboardPanel id="workout-map-detail">
    <template #header>
      <UDashboardNavbar :title="workout ? `Map Analysis: ${workout.title}` : 'Map Analysis'">
        <template #leading>
          <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" @click="goBack">
            Back to Workout
          </UButton>
        </template>
        <template #right>
          <div v-if="workout" class="flex items-center gap-4">
            <div class="hidden sm:flex flex-col items-end">
              <span class="text-[10px] font-black uppercase text-gray-500">{{
                formatDateWeekday(workout.date)
              }}</span>
              <span class="text-xs font-bold">{{ formatDatePrimary(workout.date) }}</span>
            </div>
            <UiDataAttribution :provider="workout.source" :device-name="workout.deviceName" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center h-full">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
      </div>

      <div v-else-if="error" class="p-8">
        <UAlert
          icon="i-heroicons-exclamation-triangle"
          color="error"
          variant="soft"
          :title="error"
        />
      </div>

      <div v-else-if="workout" class="h-full flex flex-col p-4 gap-4 overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Layout
            </span>
            <div
              class="flex items-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <UButton
                size="xs"
                color="neutral"
                :variant="layoutMode === 'default' ? 'solid' : 'ghost'"
                icon="i-heroicons-rectangle-group"
                @click="layoutMode = 'default'"
              >
                Default
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                :variant="layoutMode === 'chart-focus' ? 'solid' : 'ghost'"
                icon="i-heroicons-chart-bar-square"
                @click="layoutMode = 'chart-focus'"
              >
                Charts Wide
              </UButton>
            </div>
          </div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {{
              layoutMode === 'chart-focus'
                ? 'Charts left, map stacked under splits'
                : 'Map-first layout'
            }}
          </p>
        </div>

        <div :class="contentGridClass">
          <div :class="mapCardClass">
            <UiWorkoutMap
              ref="workoutMap"
              :coordinates="workout.streams?.latlng || []"
              :streams="workout.streams"
              :workout-id="workout.id"
              :highlight-index="hoverIndex"
              :interactive="true"
              class="!h-full !rounded-none !border-0"
            />
          </div>

          <div :class="splitsCardClass">
            <div
              class="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50"
            >
              <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Lap Splits
              </h3>
              <UBadge size="xs" color="neutral" variant="subtle"
                >{{ lapSplits.length }} Laps</UBadge
              >
            </div>
            <div class="flex-1 overflow-y-auto">
              <table class="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead class="bg-gray-50/30 dark:bg-gray-950/30 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th class="px-4 py-2 text-left text-[9px] font-black text-gray-400 uppercase">
                      Lap
                    </th>
                    <th class="px-4 py-2 text-left text-[9px] font-black text-gray-400 uppercase">
                      Pace
                    </th>
                    <th class="px-4 py-2 text-left text-[9px] font-black text-gray-400 uppercase">
                      Dist
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr
                    v-for="split in lapSplits"
                    :key="split.lap"
                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td class="px-4 py-2.5 text-xs font-black text-gray-900 dark:text-white">
                      {{ split.lap }}
                    </td>
                    <td
                      class="px-4 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 tabular-nums"
                    >
                      {{ split.pace }}
                    </td>
                    <td
                      class="px-4 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 tabular-nums"
                    >
                      {{ formatDistance(split.distance) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div :class="chartsCardClass">
            <div
              class="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50"
            >
              <div class="flex items-center gap-4">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Stream Analysis
                </h3>
                <div class="flex gap-2">
                  <UButton
                    v-if="zoomRange"
                    icon="i-heroicons-magnifying-glass-minus"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    @click="resetZoom"
                  >
                    Reset Zoom
                  </UButton>
                  <client-only>
                    <USelectMenu
                      v-model="selectedStreamValues"
                      multiple
                      placeholder="Add streams..."
                      :items="availableStreamOptions"
                      value-key="value"
                      label-key="label"
                      size="xs"
                      class="w-48"
                    >
                      <template #leading>
                        <UIcon name="i-heroicons-plus-circle" class="w-3.5 h-3.5" />
                      </template>
                    </USelectMenu>
                  </client-only>
                </div>
              </div>
              <div
                v-if="hoverIndex !== null && workout?.streams?.time"
                class="text-[10px] font-black text-primary-500 uppercase"
              >
                T: {{ formatTime(workout.streams.time[hoverIndex]) }} |
                <span v-if="workout.streams.heartrate"
                  >{{ workout.streams.heartrate[hoverIndex] }} bpm</span
                >
                <span v-if="workout.streams.altitude">
                  | {{ Math.round(workout.streams.altitude[hoverIndex]) }}m</span
                >
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-0">
              <div
                v-if="selectedStreamObjects.length === 0"
                class="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 py-12"
              >
                <UIcon name="i-heroicons-chart-bar" class="w-12 h-12 opacity-20" />
                <p class="text-xs font-bold uppercase tracking-widest">
                  Select streams to analyze data points
                </p>
              </div>

              <draggable
                v-else
                v-model="selectedStreamObjects"
                item-key="value"
                handle=".drag-handle"
                ghost-class="opacity-50"
                class="space-y-0"
              >
                <template #item="{ element: streamObject, index: idx }">
                  <div
                    class="relative group border-b border-gray-100 dark:border-gray-800 last:border-0 pb-1 pt-1 first:pt-0"
                  >
                    <div
                      class="absolute top-1 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      <div
                        class="drag-handle cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <UIcon name="i-heroicons-bars-2" class="w-4 h-4" />
                      </div>
                      <UButton
                        icon="i-heroicons-x-mark"
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        @click="
                          selectedStreamObjects = selectedStreamObjects.filter(
                            (s) => s.value !== streamObject.value
                          )
                        "
                      />
                    </div>
                    <div class="mb-0 flex items-center gap-2 px-2">
                      <div
                        class="w-2 h-2 rounded-full"
                        :style="{ backgroundColor: getStreamMetadata(streamObject.value).color }"
                      />
                      <span class="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        {{ getStreamMetadata(streamObject.value).label }}
                      </span>
                    </div>
                    <div class="h-40">
                      <client-only>
                        <StreamChart
                          :label="getStreamMetadata(streamObject.value).label"
                          :data-points="zoomedStreams[streamObject.value]"
                          :labels="zoomedStreams.time"
                          :color="getStreamMetadata(streamObject.value).color"
                          :y-axis-label="getStreamMetadata(streamObject.value).unit"
                          :height-class="'h-40'"
                          :highlight-index="
                            zoomRange
                              ? hoverIndex !== null
                                ? hoverIndex - zoomRange[0]
                                : null
                              : hoverIndex
                          "
                          :show-x-axis="idx === selectedStreamObjects.length - 1"
                          :fixed-y-axis-width="80"
                          @chart-hover="onChartHover"
                          @chart-leave="onChartLeave"
                          @chart-zoom="onChartZoom"
                        />
                      </client-only>
                    </div>
                  </div>
                </template>
              </draggable>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { ref, computed, watch, toRaw } from 'vue'
  import draggable from 'vuedraggable'
  import StreamChart from '~/components/charts/streams/BaseStreamChart.vue'

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()
  const workoutId = route.params.id as string

  const loading = ref(true)
  const error = ref<string | null>(null)
  const workout = ref<any>(null)
  const lapSplits = ref<any[]>([])
  const hoverIndex = ref<number | null>(null)
  const zoomRange = ref<[number, number] | null>(null)
  const selectedStreamObjects = ref<{ label: string; value: string }[]>([])
  const selectedStreamValues = ref<string[]>([])

  const zoomedStreams = computed(() => {
    if (!workout.value?.streams) return null
    if (!zoomRange.value) return workout.value.streams

    const [start, end] = zoomRange.value
    const filtered: Record<string, any> = {}

    Object.keys(workout.value.streams).forEach((key) => {
      const data = workout.value.streams[key]
      if (Array.isArray(data)) {
        filtered[key] = data.slice(start, end + 1)
      } else {
        filtered[key] = data
      }
    })

    return filtered
  })

  // Save selection and order when changed
  watch(
    selectedStreamObjects,
    (newObjs) => {
      const newValues = newObjs.map((o) => o.value)

      // Sync values ref for dropdown checkmarks
      if (
        JSON.stringify(newValues.slice().sort()) !==
        JSON.stringify(selectedStreamValues.value.slice().sort())
      ) {
        selectedStreamValues.value = newValues
      }

      // Save preference including ORDER
      if (newValues.length > 0) {
        userStore.updateDashboardSettings({ mapSelectedStreams: newValues })
      }
    },
    { deep: true }
  )

  // Sync string values from dropdown back to objects (for adding new ones)
  watch(
    selectedStreamValues,
    (newValues) => {
      if (newValues.length !== selectedStreamObjects.value.length) {
        // Rebuild objects maintaining order of existing ones where possible
        const currentMap = new Map(selectedStreamObjects.value.map((o) => [o.value, o]))
        const newObjs = newValues
          .map((v) => currentMap.get(v) || availableStreamOptions.value.find((o) => o.value === v))
          .filter(Boolean) as { label: string; value: string }[]

        const currentKeys = selectedStreamObjects.value.map((o) => o.value)
        const newKeys = newObjs.map((o) => o.value)

        if (JSON.stringify(currentKeys) !== JSON.stringify(newKeys)) {
          selectedStreamObjects.value = newObjs
        }
      }
    },
    { deep: true }
  )

  const layoutMode = ref<'default' | 'chart-focus'>(
    userStore.user?.dashboardSettings?.mapLayoutMode || 'default'
  )

  // Sync layout mode from user settings when they load
  watch(
    () => userStore.user?.dashboardSettings?.mapLayoutMode,
    (newVal) => {
      if (newVal && newVal !== layoutMode.value) {
        layoutMode.value = newVal
      }
    }
  )

  // Save layout preference when changed
  watch(layoutMode, (newMode) => {
    userStore.updateDashboardSettings({ mapLayoutMode: newMode })
  })

  const contentGridClass = computed(() => {
    const base = 'grid flex-1 min-h-0 grid-cols-1 gap-4'
    if (layoutMode.value === 'chart-focus') {
      return `${base} lg:grid-cols-3 lg:grid-rows-[minmax(220px,0.42fr)_minmax(320px,0.58fr)]`
    }
    return `${base} lg:grid-cols-3 lg:grid-rows-[500px_minmax(0,1fr)]`
  })

  const mapCardClass = computed(() => {
    const base =
      'relative min-h-[320px] overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-sm dark:border-gray-800 dark:bg-gray-900'
    if (layoutMode.value === 'chart-focus') {
      return `${base} lg:col-start-3 lg:col-span-1 lg:row-start-2 lg:min-h-0`
    }
    return `${base} lg:col-span-2 lg:row-start-1 lg:min-h-0`
  })

  const splitsCardClass = computed(() => {
    const base =
      'flex min-h-[220px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900'
    if (layoutMode.value === 'chart-focus') {
      return `${base} lg:col-start-3 lg:col-span-1 lg:row-start-1 lg:min-h-0`
    }
    return `${base} lg:col-span-1 lg:row-start-1 lg:min-h-0`
  })

  const chartsCardClass = computed(() => {
    const base =
      'flex min-h-[380px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900'
    if (layoutMode.value === 'chart-focus') {
      return `${base} lg:col-start-1 lg:col-span-2 lg:row-span-2 lg:min-h-0`
    }
    return `${base} lg:col-span-3 lg:row-start-2 lg:min-h-0`
  })

  function getStreamMetadataMap() {
    return {
      heartrate: { label: 'Heart Rate', color: '#ef4444', unit: ' bpm' },
      altitude: { label: 'Altitude', color: '#10b981', unit: 'm' },
      watts: { label: 'Power', color: '#8b5cf6', unit: 'W' },
      velocity: { label: 'Pace', color: '#3b82f6', unit: '' }, // Pace is complex to add as suffix
      cadence: { label: 'Cadence', color: '#f59e0b', unit: ' rpm' },
      temp: { label: 'Temperature', color: '#06b6d4', unit: '°C' },
      grade: { label: 'Grade', color: '#14b8a6', unit: '%' },
      distance: { label: 'Distance', color: '#6366f1', unit: 'm' }
    } as Record<string, { label: string; color: string; unit: string }>
  }

  function getStreamMetadata(key: string) {
    return getStreamMetadataMap()[key] || { label: key, color: '#9ca3af', unit: '' }
  }

  const availableStreamOptions = computed(() => {
    if (!workout.value?.streams) return []
    const metadata = getStreamMetadataMap()
    // Convert to plain object keys to avoid proxy issues during enumeration
    const streams = toRaw(workout.value.streams)
    const availableKeys = new Set(Object.keys(streams))

    // Always include currently selected streams in options to avoid selection disappearance
    selectedStreamValues.value.forEach((key) => availableKeys.add(key))

    return Array.from(availableKeys)
      .filter((key) => {
        const data = streams[key]
        const isArray = Array.isArray(data)
        const isSelected = selectedStreamValues.value.includes(key)
        return metadata[key] && (isArray || isSelected) && key !== 'time' && key !== 'latlng'
      })
      .map((key) => ({
        label: metadata[key]?.label || key,
        value: key
      }))
  })

  // Fetch workout and streams using useFetch
  const { data: workoutData, error: workoutError } = await useFetch<any>(
    `/api/workouts/${workoutId}`,
    {
      lazy: true
    }
  )
  const { data: streamsData, error: streamsError } = await useFetch<any>(
    `/api/workouts/${workoutId}/streams`,
    {
      lazy: true
    }
  )

  watch(
    [workoutData, streamsData],
    ([newWorkout, newStreams]) => {
      if (newWorkout && newStreams) {
        workout.value = {
          ...newWorkout,
          streams: newStreams
        }

        if (newStreams.lapSplits) {
          lapSplits.value = newStreams.lapSplits
        }

        // Initialize from user settings or auto-detect
        const savedSelection = userStore.user?.dashboardSettings?.mapSelectedStreams
        if (Array.isArray(savedSelection) && savedSelection.length > 0) {
          selectedStreamObjects.value = savedSelection.map((key) => ({
            label: getStreamMetadata(key).label,
            value: key
          }))
        } else if (selectedStreamObjects.value.length === 0) {
          const initial: string[] = []
          if (newStreams.heartrate) initial.push('heartrate')
          if (newStreams.altitude) initial.push('altitude')
          if (newStreams.watts) initial.push('watts')

          selectedStreamObjects.value = availableStreamOptions.value.filter((option) =>
            initial.includes(option.value)
          )
        }

        loading.value = false
      }
    },
    { immediate: true }
  )

  watch([workoutError, streamsError], ([wErr, sErr]) => {
    if (wErr || sErr) {
      error.value = wErr?.message || sErr?.message || 'Failed to load data'
      loading.value = false
    }
  })

  function onChartHover(index: number) {
    if (zoomRange.value) {
      hoverIndex.value = zoomRange.value[0] + index
    } else {
      hoverIndex.value = index
    }
  }

  function onChartLeave() {
    hoverIndex.value = null
  }

  function onChartZoom(range: [number, number]) {
    const [start, end] = range
    // If we're already zoomed, the range is relative to the CURRENT zoomed view
    if (zoomRange.value) {
      const currentStart = zoomRange.value[0]
      zoomRange.value = [currentStart + start, currentStart + end]
    } else {
      zoomRange.value = [start, end]
    }
  }

  function resetZoom() {
    zoomRange.value = null
  }

  function goBack() {
    router.push(`/workouts/${workoutId}`)
  }

  // Formatters
  function formatDateWeekday(date: string) {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
  }

  function formatDatePrimary(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatDistance(meters: number) {
    return (meters / 1000).toFixed(2) + ' km'
  }

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (h > 0) {
      return `${h}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
</script>
