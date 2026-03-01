<template>
  <div
    class="h-96 w-full rounded-none sm:rounded-xl overflow-hidden border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800 z-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center shadow-none sm:shadow group"
  >
    <client-only>
      <div v-if="latLngs.length > 0" class="relative h-full w-full">
        <!-- Metric Selector Overlay -->
        <div class="absolute top-4 right-4 z-[1000] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
            :lat-lngs="latLngs"
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
  import { computed, ref, watch } from 'vue'
  import { useColorMode } from '#imports'

  const props = defineProps<{
    coordinates: any[]
    interactive?: boolean
    scrollWheelZoom?: boolean
    provider?: string
    deviceName?: string
    streams?: Record<string, any>
  }>()

  const zoom = ref(13)
  const center = ref<[number, number]>([51.505, -0.09])
  const mapObject = ref<any>(null)
  const selectedMode = ref<'route' | 'altitude' | 'heartrate' | 'velocity'>('route')

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

    // Filter out invalid coordinates to prevent Leaflet errors (COACH-WATTS-10)
    return props.coordinates.filter((coord) => {
      if (!coord) return false
      if (Array.isArray(coord)) {
        return (
          coord.length >= 2 &&
          typeof coord[0] === 'number' &&
          !isNaN(coord[0]) &&
          typeof coord[1] === 'number' &&
          !isNaN(coord[1])
        )
      }
      return (
        typeof coord.lat === 'number' &&
        !isNaN(coord.lat) &&
        typeof coord.lng === 'number' &&
        !isNaN(coord.lng)
      )
    })
  })

  const coloredSegments = computed(() => {
    if (selectedMode.value === 'route' || !props.streams || !latLngs.value.length) return []

    let streamKey: any = selectedMode.value
    if (selectedMode.value === 'velocity' && !props.streams.velocity && props.streams.velocity_smooth) {
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

  const onMapReady = (map: any) => {
    mapObject.value = map
    fitBounds()
  }

  const fitBounds = () => {
    if (mapObject.value && latLngs.value.length > 0) {
      mapObject.value.fitBounds(latLngs.value, { padding: [50, 50] })
    }
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
