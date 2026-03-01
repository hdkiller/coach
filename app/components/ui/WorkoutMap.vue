<template>
  <div
    class="h-96 w-full rounded-none sm:rounded-xl overflow-hidden border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800 z-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center shadow-none sm:shadow group"
  >
    <client-only>
      <div v-if="latLngs.length > 0" class="relative h-full w-full">
        <!-- Metric Selector Overlay -->
        <div
          class="absolute top-4 right-4 z-[1000] flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          <UFieldGroup size="xs" variant="solid">
            <UButton
              v-for="mode in availableModes"
              :key="mode.id"
              :color="selectedMode === mode.id ? 'primary' : 'neutral'"
              :icon="mode.icon"
              @click="selectedMode = mode.id"
            >
              <span class="hidden sm:inline">{{ mode.label }}</span>
            </UButton>
          </UFieldGroup>

          <UButton
            v-if="lapSplits.length > 0"
            size="xs"
            :color="showSplits ? 'primary' : 'neutral'"
            :icon="showSplits ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
            class="self-end"
            @click="showSplits = !showSplits"
          >
            Splits
          </UButton>
        </div>

        <LMap
          ref="map"
          :zoom="zoom"
          :center="center"
          :options="mapOptions"
          class="h-full w-full z-0"
          @ready="onMapReady"
        >
          <LTileLayer :url="tileUrl" :attribution="attribution" layer-type="base" name="Base" />

          <!-- Normal Route -->
          <LPolyline
            v-if="selectedMode === 'route' || coloredSegments.length === 0"
            :lat-lngs="baseRoutePoints"
            :color="primaryColor"
            :weight="4"
            :opacity="0.8"
          />

          <!-- Colored Route Segments -->
          <template v-else>
            <LPolyline
              v-for="(segment, index) in coloredSegments"
              :key="`segment-${index}`"
              :lat-lngs="segment.points"
              :color="segment.color"
              :weight="5"
              :opacity="0.9"
            />
          </template>

          <!-- Highlight Segment (Lap) -->
          <LPolyline
            v-if="highlightSegment"
            :lat-lngs="highlightSegment"
            :color="'#3b82f6'"
            :weight="8"
            :opacity="1"
            class="z-[1500]"
          />

          <!-- Highlight Multiple Segments (Zones) -->
          <template v-if="highlightSegments">
            <LPolyline
              v-for="(seg, idx) in highlightSegments"
              :key="idx"
              :lat-lngs="seg"
              :color="'#ef4444'"
              :weight="8"
              :opacity="1"
              class="z-[1400]"
            />
          </template>

          <!-- Split Markers -->
          <template v-if="showSplits">
            <LMarker
              v-for="(split, index) in splitMarkers"
              :key="`split-${index}`"
              :lat-lng="split.position"
              :icon="splitIcon(split.rotation)"
            >
              <LTooltip>
                <div class="p-2 space-y-1 min-w-[120px]">
                  <div class="flex items-center justify-between border-b border-gray-100 pb-1 mb-1">
                    <span class="text-[10px] font-black uppercase text-gray-400"
                      >Split {{ split.label }}</span
                    >
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <span class="text-[10px] font-bold text-gray-500 uppercase">Pace</span>
                    <span class="text-sm font-black text-gray-900">{{ split.pace }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <span class="text-[10px] font-bold text-gray-500 uppercase">Time</span>
                    <span class="text-xs font-bold text-gray-700">{{
                      formatTime(split.time)
                    }}</span>
                  </div>
                </div>
              </LTooltip>
            </LMarker>
          </template>

          <!-- Start Marker -->
          <LCircleMarker
            v-if="startPoint"
            :lat-lng="startPoint"
            :radius="6"
            :color="'white'"
            :fill-color="primaryColor"
            :fill-opacity="1"
            :weight="2"
          />

          <!-- End Marker -->
          <LCircleMarker
            v-if="endPoint"
            :lat-lng="endPoint"
            :radius="6"
            :color="'white'"
            :fill-color="'red'"
            :fill-opacity="1"
            :weight="2"
          />

          <!-- Highlight Marker -->
          <LCircleMarker
            v-if="highlightPoint"
            :lat-lng="highlightPoint"
            :radius="8"
            :color="'white'"
            :fill-color="'#3b82f6'"
            :fill-opacity="1"
            :weight="3"
            class="z-[2000]"
          />
        </LMap>

        <!-- Attribution Overlay -->
        <div v-if="provider" class="absolute bottom-1 left-1 z-[1000] pointer-events-none">
          <UiDataAttribution :provider="provider" :device-name="deviceName" mode="overlay" />
        </div>
      </div>
      <div v-else class="flex flex-col items-center gap-2 text-gray-500">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" />
        <span class="text-sm">Loading map...</span>
      </div>
    </client-only>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'

  const props = defineProps<{
    coordinates: any[]
    interactive?: boolean
    scrollWheelZoom?: boolean
    provider?: string
    deviceName?: string
    streams?: Record<string, any>
    workoutId?: string
    highlightIndex?: number | null
    highlightRange?: [number, number] | null
    highlightRanges?: [number, number][] | null
  }>()

  const L = ref<any>(null)

  onMounted(async () => {
    if (import.meta.client) {
      L.value = await import('leaflet')
    }
  })

  const zoom = ref(13)
  const center = ref<[number, number]>([51.505, -0.09])
  const mapObject = ref<any>(null)

  const selectedMode = ref<'route' | 'altitude' | 'heartrate' | 'velocity'>('route')
  const showSplits = ref(true)
  const lapSplits = ref<any[]>([])

  const availableModes = computed(() => {
    const modes = [{ id: 'route', label: 'Route', icon: 'i-heroicons-map' }] as any[]

    if (props.streams?.altitude)
      modes.push({ id: 'altitude', label: 'Elevation', icon: 'i-heroicons-arrow-trending-up' })
    if (props.streams?.heartrate)
      modes.push({ id: 'heartrate', label: 'Heart Rate', icon: 'i-heroicons-heart' })
    if (props.streams?.velocity || props.streams?.velocity_smooth)
      modes.push({ id: 'velocity', label: 'Pace', icon: 'i-heroicons-bolt' })

    return modes
  })

  // Fetch splits if workoutId is provided
  if (props.workoutId) {
    onMounted(async () => {
      try {
        const data = await $fetch<any>(`/api/workouts/${props.workoutId}/streams`)
        if (data?.lapSplits) {
          lapSplits.value = data.lapSplits
        }
      } catch (e) {
        console.error('Failed to fetch splits for map:', e)
      }
    })
  }

  // Calculate split positions on the map
  const splitMarkers = computed(() => {
    if (
      !showSplits.value ||
      !lapSplits.value.length ||
      !props.streams?.time ||
      !latLngs.value.length
    )
      return []

    const markers: any[] = []
    const timeStream = props.streams.time
    let cumulativeTime = 0

    // Skip the last lap if it's just the end point (already has a marker)
    const lapsToProcess = lapSplits.value.slice(0, -1)

    lapsToProcess.forEach((split) => {
      cumulativeTime += split.time

      // Find the index in the time stream closest to this cumulative time
      let closestIdx = 0
      let minDiff = Infinity

      for (let i = 0; i < timeStream.length; i++) {
        const diff = Math.abs(timeStream[i] - cumulativeTime)
        if (diff < minDiff) {
          minDiff = diff
          closestIdx = i
        } else if (diff > minDiff) {
          break
        }
      }

      // Use raw latLngs to maintain index alignment
      const position = latLngs.value[closestIdx]
      if (position) {
        // Calculate rotation for the arrow based on the segment direction
        let rotation = 0
        if (closestIdx < latLngs.value.length - 1) {
          const p1 = latLngs.value[closestIdx]
          const p2 = latLngs.value[closestIdx + 1]
          if (p1 && p2) {
            const lat1 = Array.isArray(p1) ? p1[0] : p1.lat
            const lng1 = Array.isArray(p1) ? p1[1] : p1.lng
            const lat2 = Array.isArray(p2) ? p2[0] : p2.lat
            const lng2 = Array.isArray(p2) ? p2[1] : p2.lng
            rotation = (Math.atan2(lng2 - lng1, lat2 - lat1) * 180) / Math.PI
          }
        }

        markers.push({
          position,
          rotation,
          label: split.lap,
          pace: split.pace,
          distance: split.distance,
          time: split.time
        })
      }
    })

    return markers
  })

  // Arrow Icon for splits
  const splitIcon = (rotation: number) => {
    if (!L.value) return null
    return L.value.divIcon({
      className: 'split-marker-icon',
      html: `<div style="transform: rotate(${rotation}deg); width: 12px; height: 12px; display: flex; items-center; justify-center;">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="color: white; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));">
                 <polyline points="7 11 12 6 17 11"></polyline>
                 <polyline points="7 18 12 13 17 18"></polyline>
               </svg>
             </div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    })
  }

  // Map options
  const mapOptions = computed(() => ({
    scrollWheelZoom: props.scrollWheelZoom || false,
    dragging: props.interactive !== false,
    zoomControl: props.interactive !== false,
    doubleClickZoom: props.interactive !== false
  }))

  // Theme handling
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')

  const tileUrl = computed(() => {
    return isDark.value
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  })

  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  const primaryColor = '#22c55e'

  const latLngs = computed(() => {
    if (!props.coordinates || !Array.isArray(props.coordinates)) return []

    // Preserve original indices for highlight mapping (COACH-WATTS-13)
    return props.coordinates.map((coord) => {
      if (!coord) return null
      if (Array.isArray(coord)) {
        if (
          coord.length >= 2 &&
          typeof coord[0] === 'number' &&
          !isNaN(coord[0]) &&
          typeof coord[1] === 'number' &&
          !isNaN(coord[1])
        ) {
          return coord
        }
        return null
      }
      if (
        typeof coord.lat === 'number' &&
        !isNaN(coord.lat) &&
        typeof coord.lng === 'number' &&
        !isNaN(coord.lng)
      ) {
        return coord
      }
      return null
    })
  })

  // Leaflet-ready polyline data (removing nulls for the actual draw)
  const baseRoutePoints = computed(() => latLngs.value.filter(Boolean) as [number, number][])

  const coloredSegments = computed(() => {
    if (selectedMode.value === 'route' || !props.streams || !latLngs.value.length) return []

    let streamKey: any = selectedMode.value
    if (
      selectedMode.value === 'velocity' &&
      !props.streams.velocity &&
      props.streams.velocity_smooth
    ) {
      streamKey = 'velocity_smooth'
    }

    const stream = props.streams[streamKey]
    if (!stream || !Array.isArray(stream)) return []

    // Ensure stream and coordinates have same length (they should)
    const length = Math.min(latLngs.value.length, stream.length)
    if (length < 2) return []

    // To prevent too many DOM elements, we decimate the points for colored visualization
    // 500 segments is usually enough for a good look without killing performance
    const maxSegments = 500
    const step = Math.max(1, Math.floor(length / maxSegments))

    const segments: { points: any[]; color: string }[] = []

    // Calculate min/max for normalization (excluding potential outliers)
    const validValues = stream.filter((v) => typeof v === 'number' && !isNaN(v))
    if (validValues.length === 0) return []

    // Sort to find percentiles for better contrast
    const sorted = [...validValues].sort((a, b) => a - b)
    const min = sorted[Math.floor(sorted.length * 0.05)] // 5th percentile
    const max = sorted[Math.floor(sorted.length * 0.95)] // 95th percentile
    const range = max - min || 1

    for (let i = 0; i < length - step; i += step) {
      const p1 = latLngs.value[i]
      const p2 = latLngs.value[Math.min(i + step, length - 1)]

      // Skip segment if either end is null
      if (!p1 || !p2) continue

      // Get average value for this segment
      let avgValue = 0
      let count = 0
      for (let j = i; j < Math.min(i + step, length); j++) {
        if (typeof stream[j] === 'number' && !isNaN(stream[j])) {
          avgValue += stream[j]
          count++
        }
      }
      avgValue = count > 0 ? avgValue / count : min

      // Normalize 0 to 1
      const normalized = Math.max(0, Math.min(1, (avgValue - min) / range))

      // Map to color
      let color = ''
      if (selectedMode.value === 'heartrate') {
        // Red (high) to Green (low) - actually HR usually Red is high intensity
        // Let's go Green (low) -> Yellow -> Red (high)
        const hue = (1 - normalized) * 120 // 120 (green) to 0 (red)
        color = `hsl(${hue}, 80%, 50%)`
      } else if (selectedMode.value === 'altitude') {
        // Brown (low) to White/Blue (high)
        const light = 30 + normalized * 50
        color = `hsl(30, 50%, ${light}%)`
      } else if (selectedMode.value === 'velocity') {
        // Green (fast) to Red (slow)
        const hue = normalized * 120 // 0 (red) to 120 (green)
        color = `hsl(${hue}, 80%, 50%)`
      }

      segments.push({
        points: [p1, p2],
        color
      })
    }

    return segments
  })

  const startPoint = computed(() => (latLngs.value.length > 0 ? latLngs.value[0] : null))
  const endPoint = computed(() =>
    latLngs.value.length > 0 ? latLngs.value[latLngs.value.length - 1] : null
  )

  const highlightPoint = computed(() => {
    if (props.highlightIndex === null || props.highlightIndex === undefined) return null
    if (!latLngs.value.length) return null
    return latLngs.value[Math.min(props.highlightIndex, latLngs.value.length - 1)]
  })

  const highlightSegment = computed(() => {
    if (!props.highlightRange || !latLngs.value.length) return null
    const [start, end] = props.highlightRange
    return latLngs.value.slice(start, end + 1).filter(Boolean) as [number, number][]
  })

  const highlightSegments = computed(() => {
    if (!props.highlightRanges || !props.highlightRanges.length || !latLngs.value.length)
      return null
    return props.highlightRanges
      .map(([start, end]) => {
        return latLngs.value.slice(start, end + 1).filter(Boolean) as [number, number][]
      })
      .filter((seg) => seg.length > 0)
  })

  const onMapReady = (map: any) => {
    mapObject.value = map
    fitBounds()
  }

  const fitBounds = () => {
    if (mapObject.value && baseRoutePoints.value.length > 0) {
      mapObject.value.fitBounds(baseRoutePoints.value, { padding: [50, 50] })
    }
  }

  defineExpose({
    fitBounds,
    mapObject
  })

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.round(seconds % 60)

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  watch(
    () => props.coordinates,
    () => {
      setTimeout(() => {
        fitBounds()
      }, 100)
    },
    { deep: true }
  )
</script>

<style scoped>
  :deep(.leaflet-pane) {
    z-index: 10 !important;
  }
  :deep(.leaflet-bottom) {
    z-index: 11 !important;
  }
  :deep(.leaflet-control-attribution) {
    display: none !important;
  }
</style>
