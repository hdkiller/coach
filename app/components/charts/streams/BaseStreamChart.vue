<template>
  <div
    :class="['w-full cursor-crosshair select-none', heightClass]"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <Line ref="chartRef" :data="chartData" :options="chartOptions" :plugins="[crosshairPlugin]" />
  </div>
</template>

<script setup lang="ts">
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    Filler
  } from 'chart.js'
  import { Line } from 'vue-chartjs'
  import 'chartjs-adapter-date-fns'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    Filler
  )

  interface ChartDataset {
    label: string
    data: number[]
    color: string
    unit?: string
  }

  interface Props {
    label?: string
    dataPoints?: number[]
    labels: any[]
    color?: string
    yAxisLabel?: string
    heightClass?: string
    xAxisLabel?: string
    xAxisType?: 'linear' | 'category'
    highlightIndex?: number | null
    highlightRange?: [number, number] | null
    showXAxis?: boolean
    fixedYAxisWidth?: number
    datasets?: ChartDataset[]
  }

  const props = withDefaults(defineProps<Props>(), {
    showXAxis: true,
    xAxisType: 'linear',
    heightClass: 'h-64',
    label: '',
    dataPoints: () => []
  })

  const emit = defineEmits(['chart-hover', 'chart-leave', 'chart-zoom'])

  const chartRef = ref<any>(null)
  const isSelecting = ref(false)
  const selectionStart = ref<number | null>(null)
  const selectionEnd = ref<number | null>(null)

  // Custom plugin to draw vertical crosshair line and selection box
  const crosshairPlugin = {
    id: 'crosshair',
    afterDraw: (chart: any) => {
      const activeElements = chart.getActiveElements()
      const ctx = chart.ctx
      const topY = chart.scales.y.top
      const bottomY = chart.scales.y.bottom

      // Draw selection box if dragging
      if (isSelecting.value && selectionStart.value !== null && selectionEnd.value !== null) {
        const startX = chart.scales.x.getPixelForValue(props.labels[selectionStart.value])
        const endX = chart.scales.x.getPixelForValue(props.labels[selectionEnd.value])

        ctx.save()
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)' // blue-500 with low opacity
        ctx.fillRect(startX, topY, endX - startX, bottomY - topY)
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'
        ctx.lineWidth = 1
        ctx.strokeRect(startX, topY, endX - startX, bottomY - topY)
        ctx.restore()
      }

      if (activeElements?.length) {
        const activePoint = activeElements[0]
        const x = activePoint.element.x

        ctx.save()
        ctx.beginPath()
        ctx.moveTo(x, topY)
        ctx.lineTo(x, bottomY)
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)' // gray-400
        ctx.setLineDash([3, 3])
        ctx.stroke()
        ctx.restore()
      }

      // Draw persistent highlight range (e.g. from lap split hover)
      if (props.highlightRange) {
        const [startIdx, endIdx] = props.highlightRange
        // Check if indices are within visible bounds
        if (startIdx >= 0 && endIdx < props.labels.length) {
          const startX = chart.scales.x.getPixelForValue(props.labels[startIdx])
          const endX = chart.scales.x.getPixelForValue(props.labels[endIdx])

          ctx.save()
          ctx.fillStyle = 'rgba(251, 191, 36, 0.15)' // amber-400 with low opacity
          ctx.fillRect(startX, topY, endX - startX, bottomY - topY)
          ctx.restore()
        }
      }
    }
  }

  watch([() => props.highlightIndex, () => props.highlightRange], ([newIndex, newRange]) => {
    const chart = chartRef.value?.chart
    if (!chart) return

    if (newIndex !== null && newIndex !== undefined && newIndex >= 0) {
      // Trigger tooltip and hover state programmatically
      const tooltip = chart.tooltip
      if (tooltip) {
        // Find the element to get its coordinates for better tooltip placement
        const meta = chart.getDatasetMeta(0)
        const element = meta.data[newIndex]

        if (element) {
          chart.setActiveElements([
            {
              datasetIndex: 0,
              index: newIndex
            }
          ])
          tooltip.setActiveElements(
            [
              {
                datasetIndex: 0,
                index: newIndex
              }
            ],
            { x: element.x, y: element.y }
          )
        }
        chart.update()
      }
    } else {
      // Clear tooltip and hover state
      chart.setActiveElements([])
      const tooltip = chart.tooltip
      if (tooltip) {
        tooltip.setActiveElements([], { x: 0, y: 0 })
      }
      chart.update()
    }
  })

  const heightClass = computed(() => props.heightClass || 'h-64')

  const chartData = computed(() => {
    if (props.datasets && props.datasets.length > 0) {
      return {
        labels: props.labels,
        datasets: props.datasets.map((ds) => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.color + '10',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false, // Don't fill when multiple lines
          tension: 0.1
        }))
      }
    }

    return {
      labels: props.labels,
      datasets: [
        {
          label: props.label,
          data: props.dataPoints || [],
          borderColor: props.color || '#3b82f6', // blue-500 default
          backgroundColor: (props.color || '#3b82f6') + '20', // transparent fill
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.1
        }
      ]
    }
  })

  const chartOptions = computed<any>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    onHover: (event: any, elements: any[]) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index
        emit('chart-hover', index)

        if (isSelecting.value && selectionStart.value !== null) {
          selectionEnd.value = index
        }
      } else {
        emit('chart-leave')
      }
    },
    onClick: (event: any, elements: any[]) => {
      // Logic handled by mouse events for drag selection
    },
    // Use raw canvas events for reliable drag selection
    plugins: {
      legend: {
        display: true
      },
      tooltip: {
        enabled: true,
        callbacks: {
          title: () => '', // Hide time from tooltip title
          label: (context: any) => {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              const unit = props.datasets?.[context.datasetIndex]?.unit || props.yAxisLabel || ''
              label += context.parsed.y + unit
            }
            return label
          }
        }
      }
    },
    scales: {
      x: {
        type: props.xAxisType as 'linear' | 'category',
        display: props.showXAxis,
        min: props.labels[0],
        max: props.labels[props.labels.length - 1],
        bounds: 'ticks',
        ticks: {
          callback: (value: any) => {
            const seconds = Number(value)
            const h = Math.floor(seconds / 3600)
            const m = Math.floor((seconds % 3600) / 60)
            const s = Math.floor(seconds % 60)
            if (h > 0) {
              return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
            }
            return `${m}:${s.toString().padStart(2, '0')}`
          }
        },
        title: {
          display: props.showXAxis,
          text: props.xAxisLabel || 'Time'
        }
      },
      y: {
        display: true,
        afterFit: (axis: any) => {
          if (props.fixedYAxisWidth && !props.datasets?.length) {
            axis.width = props.fixedYAxisWidth
          }
        },
        ticks: {
          callback: (value: any) => {
            if (props.datasets?.length) return value
            return `${value}${props.yAxisLabel || ''}`
          }
        },
        title: {
          display: false, // Hide title since we have unit on ticks
          text: props.yAxisLabel
        }
      }
    }
  }))

  const handleMouseDown = (e: MouseEvent) => {
    const chart = chartRef.value?.chart
    if (!chart) return

    const points = chart.getElementsAtEventForMode(e, 'index', { intersect: false }, false)
    if (points.length) {
      isSelecting.value = true
      selectionStart.value = points[0].index
      selectionEnd.value = points[0].index
    }
  }

  const handleMouseUp = () => {
    if (isSelecting.value && selectionStart.value !== null && selectionEnd.value !== null) {
      const start = Math.min(selectionStart.value, selectionEnd.value)
      const end = Math.max(selectionStart.value, selectionEnd.value)

      if (end - start > 5) {
        // Minimum threshold to trigger zoom
        emit('chart-zoom', [start, end])
      }
    }

    isSelecting.value = false
    selectionStart.value = null
    selectionEnd.value = null
  }
</script>
