<template>
  <div class="relative h-full w-full p-2 sm:p-4 flex flex-col gap-2 overflow-hidden">
    <div class="flex items-center justify-between px-2">
      <div class="text-[10px] font-black uppercase tracking-widest text-muted">
        {{ config.name || 'Density Analysis' }}
      </div>
      <div class="flex items-center gap-4 text-[10px] font-bold text-muted">
        <div class="flex items-center gap-1.5">
          <div class="h-2 w-2 rounded-full bg-blue-500/20" />
          Low
        </div>
        <div class="flex items-center gap-1.5">
          <div class="h-2 w-2 rounded-full bg-red-500" />
          High
        </div>
      </div>
    </div>

    <div
      class="relative flex-1 min-h-0 bg-muted/5 rounded-2xl border border-default overflow-hidden"
    >
      <!-- Y-Axis (Power) -->
      <div
        class="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between py-2 text-[9px] font-bold text-muted z-10 bg-default/50 backdrop-blur-sm border-r border-default"
      >
        <div v-for="tick in yTicks" :key="tick" class="px-1 text-right truncate">
          {{ tick }}
        </div>
      </div>

      <!-- Main Grid Area -->
      <div ref="containerRef" class="absolute left-12 right-0 top-0 bottom-8 overflow-hidden">
        <canvas ref="canvasRef" class="w-full h-full" />
      </div>

      <!-- X-Axis (Cadence) -->
      <div
        class="absolute left-12 right-0 bottom-0 h-8 flex justify-between px-4 items-center text-[9px] font-bold text-muted z-10 bg-default/50 backdrop-blur-sm border-t border-default"
      >
        <div v-for="tick in xTicks" :key="tick">
          {{ tick }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    data: any
    config: any
  }>()

  const containerRef = ref<HTMLElement | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const theme = useTheme()

  const MAX_TICKS = 6

  function thinLabels(labels: string[]): string[] {
    if (labels.length <= MAX_TICKS) return labels
    const step = Math.ceil(labels.length / MAX_TICKS)
    return labels.filter((_, i) => i % step === 0 || i === labels.length - 1)
  }

  const xTicks = computed(() => thinLabels(props.data?.xLabels || []))
  const yTicks = computed(() => thinLabels([...(props.data?.yLabels || [])].reverse()))

  function renderHeatmap() {
    const canvas = canvasRef.value
    const container = containerRef.value
    if (!canvas || !container || !props.data?.matrix) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const matrix = props.data.matrix
    const rows = props.data.yLabels.length
    const cols = props.data.xLabels.length

    if (rows === 0 || cols === 0) return

    const cellW = rect.width / cols
    const cellH = rect.height / rows

    // Find max value for normalization
    const values = matrix.map((p: any) => p.value || 0)
    const max = Math.max(...values, 1)

    ctx.clearRect(0, 0, rect.width, rect.height)

    // Render cells
    matrix.forEach((point: any) => {
      // Find index of x and y labels
      const col = props.data.xLabels.indexOf(point.x)
      const row = props.data.yLabels.indexOf(point.y)

      if (col === -1 || row === -1 || !point.value) return

      const intensity = point.value / max
      // Blue -> Purple -> Red gradient
      const hue = 220 - intensity * 220 // 220 (blue) to 0 (red)
      ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${0.2 + intensity * 0.8})`

      // Invert row because Y axis goes bottom-up visually
      const drawRow = rows - 1 - row

      ctx.fillRect(col * cellW + 0.5, drawRow * cellH + 0.5, cellW - 1, cellH - 1)
    })

    // Quadrant dividers + labels
    const midX = rect.width / 2
    const midY = rect.height / 2

    ctx.save()
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(midX, 0)
    ctx.lineTo(midX, rect.height)
    ctx.moveTo(0, midY)
    ctx.lineTo(rect.width, midY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.font = 'bold 9px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(148, 163, 184, 0.55)'

    const xField = props.data?.meta?.xField || 'cadence'
    const isGrade = xField === 'grade'

    const quadrants = isGrade
      ? [
          { x: midX / 2, y: midY / 2, label: 'Low Grade · High Power' },
          { x: midX + midX / 2, y: midY / 2, label: 'High Grade · High Power' },
          { x: midX / 2, y: midY + midY / 2, label: 'Low Grade · Low Power' },
          { x: midX + midX / 2, y: midY + midY / 2, label: 'High Grade · Low Power' }
        ]
      : [
          { x: midX / 2, y: midY / 2, label: 'High Torque · Low Cadence' },
          { x: midX + midX / 2, y: midY / 2, label: 'High Torque · High Cadence' },
          { x: midX / 2, y: midY + midY / 2, label: 'Low Torque · Low Cadence' },
          { x: midX + midX / 2, y: midY + midY / 2, label: 'Low Torque · High Cadence' }
        ]

    quadrants.forEach(({ x, y, label }) => {
      ctx.fillText(label, x, y)
    })

    ctx.restore()
  }

  onMounted(() => {
    renderHeatmap()
    window.addEventListener('resize', renderHeatmap)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', renderHeatmap)
  })

  watch(() => props.data, renderHeatmap, { deep: true })
</script>
