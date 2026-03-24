<script setup lang="ts">
  interface HeatmapPoint {
    x: string
    y: string
    value: number | null
  }

  interface HeatmapPayload {
    chartType: 'heatmap'
    xLabels: string[]
    yLabels: string[]
    matrix: HeatmapPoint[]
    valueLabel?: string
  }

  const props = defineProps<{
    data: HeatmapPayload
    mode?: string
  }>()

  const theme = useTheme()

  const heatmapMatrix = computed(() => {
    return new Map(
      (props.data.matrix as HeatmapPoint[]).map((point) => [`${point.y}::${point.x}`, point.value])
    )
  })

  function heatmapColor(value: number | null) {
    if (value === null || Number.isNaN(value)) {
      return theme.isDark.value ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)'
    }

    const intensity = Math.max(0.12, Math.min(1, Math.abs(value) / 100))

    if (props.mode === 'fatigue') {
      if (value >= 10) return `rgba(16, 185, 129, ${intensity})`
      if (value >= -10) return `rgba(245, 158, 11, ${intensity})`
      return `rgba(239, 68, 68, ${intensity})`
    }

    if (value >= 80) return `rgba(16, 185, 129, ${intensity})`
    if (value >= 60) return `rgba(59, 130, 246, ${intensity})`
    if (value >= 40) return `rgba(245, 158, 11, ${intensity})`
    return `rgba(239, 68, 68, ${intensity})`
  }
</script>

<template>
  <div class="h-full overflow-auto rounded-2xl border border-default/60 bg-default/70 p-4">
    <div class="min-w-max space-y-2">
      <div
        class="grid gap-2"
        :style="{
          gridTemplateColumns: `180px repeat(${data.xLabels.length}, minmax(48px, 1fr))`
        }"
      >
        <div />
        <div
          v-for="label in data.xLabels"
          :key="label"
          class="text-center text-[10px] font-black uppercase tracking-[0.18em] text-muted"
        >
          {{ label.slice(5) }}
        </div>
      </div>

      <div
        v-for="athlete in data.yLabels"
        :key="athlete"
        class="grid items-center gap-2"
        :style="{
          gridTemplateColumns: `180px repeat(${data.xLabels.length}, minmax(48px, 1fr))`
        }"
      >
        <div class="truncate pr-3 text-sm font-bold text-highlighted">
          {{ athlete }}
        </div>
        <div
          v-for="label in data.xLabels"
          :key="`${athlete}-${label}`"
          class="flex h-12 items-center justify-center rounded-xl border border-default/50 text-xs font-bold text-highlighted"
          :style="{
            backgroundColor: heatmapColor(heatmapMatrix.get(`${athlete}::${label}`) ?? null)
          }"
        >
          {{ heatmapMatrix.get(`${athlete}::${label}`) ?? '—' }}
        </div>
      </div>
    </div>
  </div>
</template>
