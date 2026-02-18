<template>
  <div class="weekly-zone-chart">
    <div v-if="pending" class="flex justify-center items-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="!data?.weeks?.length" class="text-center py-12">
      <UIcon name="i-heroicons-chart-bar" class="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p class="text-gray-500">No training data found for this period.</p>
    </div>

    <div v-else class="space-y-4">
      <div class="flex items-center gap-2">
        <UButton
          v-for="type in ['power', 'hr'] as const"
          :key="type"
          size="xs"
          :color="selectedType === type ? 'primary' : 'neutral'"
          :variant="selectedType === type ? 'solid' : 'ghost'"
          class="font-black uppercase text-[10px] tracking-widest px-3"
          @click="selectedType = type"
        >
          {{ type === 'power' ? 'Power' : 'Heart Rate' }}
        </UButton>
      </div>

      <div class="h-64 relative">
        <Bar :data="chartData" :options="chartOptions" :plugins="plugins" :height="256" />
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap gap-x-4 gap-y-1 justify-center pt-2">
        <div v-for="(label, i) in activeLabels" :key="label" class="flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: ZONE_COLORS[i] }" />
          <span class="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{{
            label.split(' ')[0]
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Bar } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  } from 'chart.js'
  import { ZONE_COLORS } from '~/utils/zone-colors'

  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

  const props = defineProps<{
    weeks?: number | string
    sport?: string
    settings?: any
    plugins?: any[]
  }>()

  const chartSettings = computed(() => ({
    yScale: 'dynamic',
    yMin: 0,
    ...props.settings
  }))

  const selectedType = ref<'power' | 'hr'>('power')

  const { data, pending, refresh } = await useFetch('/api/analytics/weekly-zones', {
    query: {
      weeks: props.weeks || 12,
      sport: props.sport
    }
  })

  watch(
    () => [props.weeks, props.sport],
    () => {
      refresh()
    }
  )

  const activeLabels = computed(() => {
    if (!data.value?.zoneLabels) return []
    const labels =
      selectedType.value === 'power' ? data.value.zoneLabels.power : data.value.zoneLabels.hr

    // Filter labels to only include those that have a corresponding color
    // AND ensure we don't try to show more zones than we have colors for
    return labels.slice(0, ZONE_COLORS.length)
  })

  const chartData = computed(() => {
    if (!data.value?.weeks) return { labels: [], datasets: [] }

    const labels = data.value.weeks.map((w) => {
      const d = new Date(w.weekStart)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })

    const datasets = []
    const numZones = activeLabels.value.length

    for (let z = 0; z < numZones; z++) {
      const zoneData = data.value.weeks.map((w) => {
        const zones = selectedType.value === 'power' ? w.powerZones : w.hrZones
        return zones[z] || 0
      })

      // Include Z1-Z5 always if they exist in labels, Z6-Z7 only if they have data
      const hasData = zoneData.some((v) => v > 0)
      // Always show at least the first 5 zones if they are defined in labels
      if (hasData || z < 5) {
        datasets.push({
          label: activeLabels.value[z],
          data: zoneData,
          backgroundColor: ZONE_COLORS[z],
          borderRadius: z === numZones - 1 ? 4 : 0,
          stack: 'intensity'
        })
      }
    }

    // Reverse to show Z1 at bottom
    return { labels, datasets }
  })

  const chartOptions = computed(() => {
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
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#111827' : '#ffffff',
          titleColor: isDark ? '#f3f4f6' : '#111827',
          bodyColor: isDark ? '#d1d5db' : '#374151',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          titleFont: { size: 12, weight: 'bold' as const },
          bodyFont: { size: 11 },
          displayColors: true,
          boxPadding: 4,
          callbacks: {
            label: (context: any) => ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)}h`
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            font: { size: 10, weight: 'bold' as const },
            color: '#94a3b8'
          },
          border: { display: false }
        },
        y: {
          stacked: true,
          beginAtZero: chartSettings.value.yScale !== 'fixed',
          min: chartSettings.value.yScale === 'fixed' ? chartSettings.value.yMin || 0 : undefined,
          position: 'right' as const,
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            drawTicks: false
          },
          ticks: {
            font: { size: 10, weight: 'bold' as const },
            color: '#94a3b8',
            callback: (value: any) => value + 'h'
          },
          border: { display: false }
        }
      }
    }
  })

  const plugins = computed(() => {
    const list = props.plugins || []
    return list
  })
</script>
