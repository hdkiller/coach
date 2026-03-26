<template>
  <div
    class="relative h-full w-full overflow-hidden rounded-none border-0 sm:rounded-xl sm:border sm:border-default bg-muted/5 group"
  >
    <client-only>
      <div v-if="hasData" class="relative h-full w-full">
        <LMap
          ref="map"
          :zoom="zoom"
          :center="center"
          :options="mapOptions"
          class="h-full w-full z-0"
          @ready="onMapReady"
        >
          <LTileLayer :url="tileUrl" :attribution="attribution" layer-type="base" name="Base" />

          <!-- Main Route (possibly colored) -->
          <template v-if="coloredSegments.length > 0">
            <LPolyline
              v-for="(segment, index) in coloredSegments"
              :key="`segment-${index}`"
              :lat-lngs="segment.points"
              :color="segment.color"
              :weight="5"
              :opacity="0.9"
            />
          </template>
          <LPolyline
            v-else
            :lat-lngs="baseRoutePoints"
            :color="primaryColor"
            :weight="4"
            :opacity="0.8"
          />

          <!-- Scrub Marker -->
          <LCircleMarker
            v-if="scrubPoint"
            :lat-lng="scrubPoint"
            :radius="8"
            :color="'white'"
            :fill-color="'#3b82f6'"
            :fill-opacity="1"
            :weight="3"
            class="z-[2000]"
          />

          <!-- Start/End Markers -->
          <LCircleMarker
            v-if="startPoint"
            :lat-lng="startPoint"
            :radius="5"
            :color="'white'"
            :fill-color="'#22c55e'"
            :fill-opacity="1"
            :weight="2"
          />
          <LCircleMarker
            v-if="endPoint"
            :lat-lng="endPoint"
            :radius="5"
            :color="'white'"
            :fill-color="'#ef4444'"
            :fill-opacity="1"
            :weight="2"
          />
        </LMap>

        <!-- Overlay Info -->
        <div class="absolute top-3 left-3 z-[1000] pointer-events-none">
          <div
            class="rounded-xl border border-default bg-default/80 p-2 shadow-sm backdrop-blur-sm"
          >
            <div class="text-[10px] font-black uppercase tracking-widest text-muted">
              {{ config.name || 'Map View' }}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex h-full flex-col items-center justify-center gap-3 text-muted">
        <UIcon name="i-lucide-map-pin-off" class="h-8 w-8" />
        <span class="text-xs font-bold uppercase tracking-widest">No GPS Data Available</span>
      </div>
    </client-only>
  </div>
</template>

<script setup lang="ts">
  import { useAnalyticsBus } from '~/composables/useAnalyticsBus'

  const props = defineProps<{
    data: any
    config: any
  }>()

  const { onScrub } = useAnalyticsBus()
  const theme = useTheme()
  const colorMode = useColorMode()

  const mapObject = ref<any>(null)
  const zoom = ref(13)
  const center = ref<[number, number]>([0, 0])
  const scrubIndex = ref<number | null>(null)

  const hasData = computed(() => {
    const dataset = props.data?.datasets?.[0]
    return dataset?.data?.some((p: any) => p.lat && p.lng)
  })

  const baseRoutePoints = computed(() => {
    const dataset = props.data?.datasets?.[0]
    if (!dataset?.data) return []
    return dataset.data
      .filter((p: any) => p.lat && p.lng)
      .map((p: any) => [p.lat, p.lng] as [number, number])
  })

  const startPoint = computed(() => baseRoutePoints.value[0] || null)
  const endPoint = computed(() => baseRoutePoints.value[baseRoutePoints.value.length - 1] || null)

  const scrubPoint = computed(() => {
    if (scrubIndex.value === null) return null
    const dataset = props.data?.datasets?.[0]
    const p = dataset?.data?.[scrubIndex.value]
    if (p?.lat && p.lng) return [p.lat, p.lng] as [number, number]
    return null
  })

  // Optional: Color the route based on the stream value
  const coloredSegments = computed(() => {
    const dataset = props.data?.datasets?.[0]
    if (!dataset?.data || baseRoutePoints.value.length < 2) return []

    // For now only color if explicitly requested or if it's a heatmap visualType
    if (props.config.visualType !== 'map-heatmap' && !props.config.settings?.showHeatmap) return []

    const segments: { points: [number, number][]; color: string }[] = []
    const data = dataset.data

    // Find range for coloring
    const values = data.map((p: any) => p.y).filter((v: any) => typeof v === 'number')
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    for (let i = 0; i < data.length - 1; i++) {
      const p1 = data[i]
      const p2 = data[i + 1]
      if (!p1.lat || !p1.lng || !p2.lat || !p2.lng) continue

      const val = (p1.y + p2.y) / 2
      const normalized = Math.max(0, Math.min(1, (val - min) / range))

      // Green (low) -> Yellow -> Red (high)
      const hue = (1 - normalized) * 120
      const color = `hsl(${hue}, 80%, 50%)`

      segments.push({
        points: [
          [p1.lat, p1.lng],
          [p2.lat, p2.lng]
        ],
        color
      })
    }

    return segments
  })

  const tileUrl = computed(() => {
    return colorMode.value === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  })

  const attribution = '&copy; OpenStreetMap contributors &copy; CARTO'
  const primaryColor = '#3b82f6'

  const mapOptions = computed(() => ({
    scrollWheelZoom: false,
    dragging: true,
    zoomControl: true,
    doubleClickZoom: true
  }))

  function onMapReady(map: any) {
    mapObject.value = map
    fitBounds()
  }

  function fitBounds() {
    if (mapObject.value && baseRoutePoints.value.length > 0) {
      mapObject.value.fitBounds(baseRoutePoints.value, { padding: [20, 20] })
    }
  }

  // Listen for global scrub events
  const stopScrub = onScrub((event) => {
    // Only respond if workoutId matches or if it's a generic scrub
    if (event.workoutId && props.config.analysis?.workoutId !== event.workoutId) return

    // Find the closest point in our downsampled data
    // Since our data is already downsampled via LTTB, we can't just use the raw index.
    // We need to find the point with the closest X value (time/distance).
    const dataset = props.data?.datasets?.[0]
    if (!dataset?.data) return

    let bestIndex = 0
    let minDiff = Infinity
    for (let i = 0; i < dataset.data.length; i++) {
      const diff = Math.abs(dataset.data[i].x - event.x)
      if (diff < minDiff) {
        minDiff = diff
        bestIndex = i
      }
    }
    scrubIndex.value = bestIndex
  })

  onUnmounted(() => {
    stopScrub.off()
  })

  watch(() => baseRoutePoints.value, fitBounds, { deep: true })
</script>

<style scoped>
  :deep(.leaflet-control-attribution) {
    display: none !important;
  }
</style>
