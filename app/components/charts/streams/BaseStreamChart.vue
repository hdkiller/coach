<template>
  <div :class="['w-full', heightClass]">
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

  interface Props {
    label: string
    dataPoints: number[]
    labels: any[]
    color?: string
    yAxisLabel?: string
    heightClass?: string
    xAxisLabel?: string
    xAxisType?: 'linear' | 'category'
    highlightIndex?: number | null
    showXAxis?: boolean
    fixedYAxisWidth?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    showXAxis: true,
    xAxisType: 'linear',
    heightClass: 'h-64'
  })

  const emit = defineEmits(['chart-hover', 'chart-leave'])

  const chartRef = ref<any>(null)

  // Custom plugin to draw vertical crosshair line
  const crosshairPlugin = {
    id: 'crosshair',
    afterDraw: (chart: any) => {
      const activeElements = chart.getActiveElements()
      if (activeElements?.length) {
        const activePoint = activeElements[0]
        const ctx = chart.ctx
        const x = activePoint.element.x
        const topY = chart.scales.y.top
        const bottomY = chart.scales.y.bottom

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
    }
  }

  watch(
    () => props.highlightIndex,
    (newIndex) => {
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
    }
  )

  const heightClass = computed(() => props.heightClass || 'h-64')

  const chartData = computed(() => ({
    labels: props.labels,
    datasets: [
      {
        label: props.label,
        data: props.dataPoints,
        borderColor: props.color || '#3b82f6', // blue-500 default
        backgroundColor: (props.color || '#3b82f6') + '20', // transparent fill
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.1
      }
    ]
  }))

  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    onHover: (event: any, elements: any[]) => {
      if (elements && elements.length > 0) {
        emit('chart-hover', elements[0].index)
      } else {
        emit('chart-leave')
      }
    },
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
              label += context.parsed.y + (props.yAxisLabel || '')
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
          if (props.fixedYAxisWidth) {
            axis.width = props.fixedYAxisWidth
          }
        },
        ticks: {
          callback: (value: any) => `${value}${props.yAxisLabel || ''}`
        },
        title: {
          display: false, // Hide title since we have unit on ticks
          text: props.yAxisLabel
        }
      }
    }
  }))
</script>
