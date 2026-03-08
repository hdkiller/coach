<template>
  <div
    class="flex items-center justify-center overflow-hidden pointer-events-none transition-opacity duration-700"
    :class="[
      mode === 'background' ? 'absolute inset-0 w-full h-full' : size,
      mode === 'background' ? 'opacity-[0.06] group-hover:opacity-[0.20]' : ''
    ]"
    :style="
      mode === 'background'
        ? {
            maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
            webkitMaskImage:
              'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
            filter: 'blur(1px)'
          }
        : {}
    "
  >
    <svg
      v-if="pathData"
      :viewBox="viewBox"
      class="w-full h-full"
      fill="none"
      stroke="currentColor"
      :stroke-width="mode === 'background' ? 1.2 : 2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      :preserveAspectRatio="mode === 'background' ? 'xMidYMid slice' : 'xMidYMid meet'"
    >
      <path :d="pathData" class="text-gray-400 dark:text-gray-600" />
    </svg>
  </div>
</template>

<script setup lang="ts">
  import { decode } from '@googlemaps/polyline-codec'

  const props = withDefaults(
    defineProps<{
      polyline: string | null | undefined
      size?: string
      mode?: 'default' | 'background'
    }>(),
    {
      size: 'w-16 h-16',
      mode: 'default'
    }
  )

  const pathData = ref('')
  const viewBox = ref('0 0 100 100')

  const generatePath = () => {
    if (!props.polyline) return

    try {
      const points = decode(props.polyline)
      if (!points.length) return

      // Find bounding box
      let minLat = Infinity,
        maxLat = -Infinity,
        minLng = Infinity,
        maxLng = -Infinity

      points.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
      })

      const latRange = maxLat - minLat
      const lngRange = maxLng - minLng

      // For background mode, we want a tighter fit but still some padding
      const padding = props.mode === 'background' ? 2 : 5

      const maxRange = Math.max(latRange, lngRange) || 1
      const scale = (100 - 2 * padding) / maxRange

      const offsetX = (100 - lngRange * scale) / 2
      const offsetY = (100 - latRange * scale) / 2

      const project = ([lat, lng]: [number, number]) => {
        const x = offsetX + (lng - minLng) * scale
        const y = 100 - (offsetY + (lat - minLat) * scale)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }

      pathData.value =
        `M ${project(points[0])} ` +
        points
          .slice(1)
          .map((p) => `L ${project(p)}`)
          .join(' ')
    } catch (e) {
      console.error('Failed to decode polyline:', e)
    }
  }

  onMounted(() => {
    generatePath()
  })

  watch(
    () => props.polyline,
    () => {
      generatePath()
    }
  )
</script>
