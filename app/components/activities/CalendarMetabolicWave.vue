<template>
  <div
    class="grid grid-cols-[100px_repeat(7,minmax(130px,1fr))] gap-px bg-gray-200 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
  >
    <!-- Summary Column Placeholder -->
    <div
      class="bg-gray-50 dark:bg-gray-800/50 p-2 flex flex-col items-center justify-center text-[10px] text-gray-400 font-bold uppercase tracking-wider space-y-1"
    >
      <div>Metabolic</div>
      <div class="flex flex-col gap-1 items-start scale-75 origin-left">
        <div class="flex items-center gap-1">
          <span class="w-2 h-0.5 bg-blue-600 rounded-full"></span>
          <span class="text-[9px] text-gray-500">Actual</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-2 h-0.5 border-t border-slate-400 border-dashed"></span>
          <span class="text-[9px] text-gray-500">Plan</span>
        </div>
      </div>
    </div>

    <!-- Daily Sparklines -->
    <div
      v-for="(day, index) in week"
      :key="day.date.toISOString()"
      class="relative h-16 bg-white dark:bg-gray-900 overflow-hidden"
    >
      <svg
        v-if="getDayPoints(day.date).length > 0"
        class="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient :id="`wave-gradient-${weekIndex}-${index}`" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
          </linearGradient>
        </defs>

        <path
          :d="generatePath(getDayPoints(day.date), true)"
          :fill="`url(#wave-gradient-${weekIndex}-${index})`"
        />

        <path
          :d="generatePath(getDayPoints(day.date), false)"
          fill="none"
          stroke="#2563eb"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Dashed Future Line (if applicable) -->
        <path
          v-if="hasFuturePoints(getDayPoints(day.date))"
          :d="generatePath(getDayPoints(day.date), false, true)"
          fill="none"
          stroke="#94a3b8"
          stroke-width="1.5"
          stroke-dasharray="3,3"
          stroke-linecap="round"
        />
      </svg>

      <!-- Ending Value Label -->
      <div
        v-if="getDayPoints(day.date).length"
        class="absolute bottom-1 right-1 text-[9px] font-bold text-gray-300"
      >
        {{ getDayPoints(day.date)[getDayPoints(day.date).length - 1]?.level }}%
      </div>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/50 z-10"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin text-gray-400" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { format } from 'date-fns'
  import type { EnergyPoint } from '~/utils/nutrition-logic'
  type WavePoint = EnergyPoint & {
    dateKey?: string
    dataType?: 'historical' | 'current' | 'future'
  }

  const props = defineProps<{
    week: any[]
    weekIndex: number
  }>()

  const loading = ref(false)
  const allPoints = ref<WavePoint[]>([])
  const pointsByDay = computed(() => {
    const map: Record<string, WavePoint[]> = {}
    allPoints.value.forEach((p) => {
      const dateKey = p.dateKey || new Date(p.timestamp).toISOString().split('T')[0]
      if (!dateKey) return

      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(p)
    })
    return map
  })

  function getDayPoints(date: Date): WavePoint[] {
    const key = date.toISOString().split('T')[0]
    if (!key) return []
    return pointsByDay.value[key] || []
  }

  function hasFuturePoints(points: WavePoint[]) {
    return points.some((p) => p.isFuture)
  }

  // Generate SVG Path
  // Normalize X (00:00 -> 24:00) to 0-100
  // Normalize Y (0-100%) to 100-0
  function generatePath(points: WavePoint[], isArea: boolean, onlyFuture: boolean = false) {
    if (!points.length) return ''

    const filteredPoints = (onlyFuture ? points.filter((p) => p.isFuture) : points).slice()

    if (filteredPoints.length === 0) return ''

    // Sort by time just in case
    filteredPoints.sort((a, b) => a.timestamp - b.timestamp)

    const firstPoint = filteredPoints[0]
    if (!firstPoint) return ''

    const msInDay = 24 * 60 * 60 * 1000

    const coords = filteredPoints.map((p) => {
      const match = /^(\d{2}):(\d{2})$/.exec(p.time || '')
      const hh = match ? Number(match[1]) : 0
      const mm = match ? Number(match[2]) : 0
      const msFromMidnight = (hh * 60 + mm) * 60 * 1000
      // Clamp to 0-100 range (handle slight TZ offsets if any)
      const x = Math.max(0, Math.min(100, (msFromMidnight / msInDay) * 100))
      const y = 100 - p.level
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    let d = `M ${coords.join(' L ')}`

    if (isArea) {
      // Close the loop for area fill
      const lastX = coords[coords.length - 1]?.split(',')[0] || '100'
      const firstX = coords[0]?.split(',')[0] || '0'
      d += ` L ${lastX},100 L ${firstX},100 Z`
    }

    return d
  }

  async function fetchWaveData() {
    if (!props.week.length) return

    loading.value = true
    try {
      const startDate = format(props.week[0].date, 'yyyy-MM-dd')
      const endDate = format(props.week[6].date, 'yyyy-MM-dd')

      const response = await $fetch<any>('/api/nutrition/metabolic-wave', {
        query: { startDate, endDate }
      })

      if (response.success) {
        allPoints.value = response.points
      }
    } catch (e) {
      console.error('Failed to fetch metabolic wave:', e)
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchWaveData)
  watch(() => props.week, fetchWaveData)
</script>
