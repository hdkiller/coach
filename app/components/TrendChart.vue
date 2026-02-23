<template>
  <div class="h-full w-full relative min-h-[300px]">
    <div
      v-if="!data || data.length === 0"
      class="flex items-center justify-center h-full text-gray-500 font-bold uppercase tracking-widest text-[10px]"
    >
      No performance data available
    </div>
    <component
      :is="chartComponent"
      v-else
      :key="`trend-${type}-${chartSettings.type}-${chartSettings.smooth}-${chartSettings.showPoints}-${chartSettings.yScale}`"
      :data="chartData"
      :options="chartOptions"
      :plugins="plugins"
      :height="300"
    />
  </div>
</template>

<script setup lang="ts">
  import { Bar, Line } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  } from 'chart.js'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )

  const props = defineProps<{
    data: any[]
    type: 'workout' | 'nutrition'
    settings?: any
    plugins?: any[]
  }>()

  const theme = useTheme()
  const { formatDate: baseFormatDate } = useFormat()

  const chartSettings = computed(() => ({
    type: 'line',
    smooth: true,
    showPoints: false,
    showLabels: false,
    yScale: 'dynamic',
    yMin: 0,
    ...props.settings
  }))

  const chartComponent = computed(() => (chartSettings.value.type === 'bar' ? Bar : Line))

  const metrics = computed(() => {
    if (props.type === 'workout') {
      return [
        {
          key: 'overallScore',
          label: 'Overall',
          color: theme.colors.value.get('amber', 500)
        },
        {
          key: 'technicalScore',
          label: 'Technical',
          color: theme.colors.value.get('blue', 500)
        },
        {
          key: 'effortScore',
          label: 'Effort',
          color: theme.colors.value.get('red', 500)
        },
        {
          key: 'pacingScore',
          label: 'Pacing',
          color: theme.colors.value.get('green', 500)
        },
        {
          key: 'executionScore',
          label: 'Execution',
          color: theme.colors.value.get('purple', 500)
        }
      ]
    } else {
      return [
        {
          key: 'overallScore',
          label: 'Overall',
          color: theme.colors.value.get('amber', 500)
        },
        {
          key: 'macroBalanceScore',
          label: 'Macro Balance',
          color: theme.colors.value.get('blue', 500)
        },
        {
          key: 'qualityScore',
          label: 'Quality',
          color: theme.colors.value.get('green', 500)
        },
        {
          key: 'adherenceScore',
          label: 'Adherence',
          color: theme.colors.value.get('purple', 500)
        },
        {
          key: 'hydrationScore',
          label: 'Hydration',
          color: theme.colors.value.get('cyan', 500)
        }
      ]
    }
  })

  const formatDate = (date: string) => {
    return baseFormatDate(date, 'MMM d')
  }

  const chartData = computed(() => {
    if (!props.data || props.data.length === 0) {
      return { labels: [], datasets: [] }
    }

    const isBar = chartSettings.value.type === 'bar'
    const labels = props.data.map((item) => formatDate(item.date))

    const datasets = metrics.value.map((metric) => ({
      type: isBar ? 'bar' : 'line',
      label: metric.label,
      data: props.data.map((item) => item[metric.key] || 0),
      borderColor: metric.color,
      backgroundColor: isBar ? `${metric.color}33` : 'transparent',
      fill: false,
      tension: isBar ? 0 : chartSettings.value.smooth ? 0.4 : 0,
      borderWidth: isBar ? 1 : 2,
      borderRadius: isBar ? 3 : 0,
      pointRadius: (ctx: any) => {
        if (isBar) return 0
        const isGhost = props.data[ctx.dataIndex]?.isGhost
        if (isGhost) return 0
        return chartSettings.value.showPoints ? 3 : 0
      },
      pointHoverRadius: isBar ? 0 : 6,
      pointBackgroundColor: metric.color,
      pointBorderColor: theme.isDark.value ? '#111827' : '#fff',
      pointBorderWidth: 1.5,
      // For ghost data (synthetic/backfilled), show dashed line
      segment: isBar
        ? undefined
        : {
            borderDash: (ctx: any) => {
              const point = props.data[ctx.p1DataIndex]
              return point?.isGhost ? [4, 4] : undefined
            },
            borderColor: (ctx: any) => {
              const point = props.data[ctx.p1DataIndex]
              return point?.isGhost ? `${metric.color}80` : metric.color
            }
          }
    }))

    return { labels, datasets }
  })

  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 5
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          usePointStyle: true,
          boxWidth: 6,
          padding: 15,
          generateLabels: (chart: any) => {
            const generate = Legend.defaults?.labels?.generateLabels
            const original = generate ? generate(chart) : []
            return original.map((label: any) => ({
              ...label,
              text: label.text.toUpperCase()
            }))
          }
        }
      },
      datalabels: {
        display: (context: any) => {
          if (!chartSettings.value.showLabels) return false
          // Only show for primary metric (index 0) if enabled
          if (context.datasetIndex !== 0) return false

          // If too many points for the current width, hide labels to avoid overlap
          const numPoints = context.chart.data.labels.length
          const chartWidth = context.chart.width
          if (chartWidth > 0 && chartWidth < numPoints * 40) return false

          return true
        },
        color: theme.isDark.value ? '#94a3b8' : '#64748b',
        align: 'top' as const,
        anchor: 'end' as const,
        offset: 4,
        font: {
          size: 9,
          weight: 'bold' as const
        },
        formatter: (value: any) => value.toFixed(1)
      },
      tooltip: {
        backgroundColor: theme.isDark.value ? '#111827' : '#ffffff',
        titleColor: theme.isDark.value ? '#f3f4f6' : '#111827',
        bodyColor: theme.isDark.value ? '#d1d5db' : '#374151',
        borderColor: theme.isDark.value ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          label: (context: any) => {
            const isGhost = props.data[context.dataIndex]?.isGhost
            const suffix = isGhost ? ' (Predicted)' : ''
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}/10${suffix}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
            weight: 'bold' as const
          },
          maxTicksLimit: 7,
          maxRotation: 0,
          autoSkip: true
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: false,
        min: chartSettings.value.yScale === 'fixed' ? chartSettings.value.yMin || 0 : undefined,
        max: 10.5, // Slight padding for icons/labels
        position: 'right' as const,
        ticks: {
          stepSize: 2,
          color: '#94a3b8',
          font: {
            size: 10,
            weight: 'bold' as const
          },
          callback: (val: any) => (val % 2 === 0 ? val : '')
        },
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          drawTicks: false
        },
        border: {
          display: false
        }
      }
    }
  }))
</script>
