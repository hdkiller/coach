<template>
  <div
    class="my-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
  >
    <div v-if="chartType === 'line'" style="height: 250px">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <div v-else-if="chartType === 'area'" style="height: 250px">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <div v-else-if="chartType === 'bar'" style="height: 250px">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
    <div v-else-if="chartType === 'stackedBar'" style="height: 250px">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
    <div v-else-if="chartType === 'doughnut'" style="height: 250px">
      <Doughnut :data="chartData" :options="chartOptions" />
    </div>
    <div v-else-if="chartType === 'radar'" style="height: 250px">
      <Radar :data="chartData" :options="chartOptions" />
    </div>
    <div v-else-if="chartType === 'scatter'" style="height: 250px">
      <Scatter :data="chartData" :options="chartOptions" />
    </div>
    <div v-else-if="chartType === 'bubble'" style="height: 250px">
      <Bubble :data="chartData" :options="chartOptions" />
    </div>
    <div v-else-if="chartType === 'mixed'" style="height: 250px">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Line, Bar, Doughnut, Radar, Scatter, Bubble } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
  } from 'chart.js'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
  )

  interface ChartDataProp {
    type:
      | 'line'
      | 'bar'
      | 'doughnut'
      | 'radar'
      | 'scatter'
      | 'area'
      | 'stackedBar'
      | 'bubble'
      | 'mixed'
    title: string
    labels?: string[]
    datasets: Array<{
      label: string
      data: number[] | Array<{ x: number; y: number; r?: number }>
      type?: 'line' | 'bar'
      color?: string
      backgroundColor?: string | string[]
      borderColor?: string | string[]
      borderWidth?: number
      tension?: number
      fill?: boolean
      pointRadius?: number
      pointHoverRadius?: number
      yAxisID?: string
      borderDash?: number[]
    }>
    options?: any
  }

  const props = defineProps<{
    chartData: ChartDataProp
  }>()

  const colorMode = useColorMode()

  const chartType = computed(() => props.chartData.type)
  const isScatterLike = computed(
    () => chartType.value === 'scatter' || chartType.value === 'bubble'
  )
  const isStackedBar = computed(() => chartType.value === 'stackedBar')
  const isArea = computed(() => chartType.value === 'area')
  const isMixed = computed(() => chartType.value === 'mixed')

  const chartData = computed(() => {
    // Vibrant, distinct color palette with good contrast
    const defaultColors = [
      'rgb(59, 130, 246)', // blue
      'rgb(239, 68, 68)', // red
      'rgb(34, 197, 94)', // green
      'rgb(245, 158, 11)', // amber
      'rgb(168, 85, 247)', // purple
      'rgb(236, 72, 153)', // pink
      'rgb(14, 165, 233)', // sky
      'rgb(251, 146, 60)', // orange
      'rgb(20, 184, 166)', // teal
      'rgb(217, 70, 239)', // fuchsia
      'rgb(132, 204, 22)', // lime
      'rgb(244, 63, 94)' // rose
    ]

    return {
      labels: props.chartData.labels || [],
      datasets: props.chartData.datasets.map((dataset, index) => {
        const color =
          dataset.color || defaultColors[index % defaultColors.length] || 'rgb(59, 130, 246)'
        const defaultBorderColor =
          props.chartData.type === 'doughnut'
            ? colorMode.value === 'dark'
              ? 'rgb(17, 24, 39)'
              : 'rgb(255, 255, 255)'
            : color

        // For doughnut charts, use different colors for each segment
        const defaultBackgroundColor =
          props.chartData.type === 'doughnut'
            ? dataset.data.map((_, i) => defaultColors[i % defaultColors.length])
            : color.replace('rgb', 'rgba').replace(')', ', 0.2)')

        return {
          label: dataset.label,
          type: isMixed.value ? dataset.type || 'bar' : undefined,
          data: dataset.data,
          borderColor: dataset.borderColor || defaultBorderColor,
          backgroundColor: dataset.backgroundColor || defaultBackgroundColor,
          borderWidth: dataset.borderWidth ?? (props.chartData.type === 'doughnut' ? 3 : 2),
          tension: dataset.tension ?? 0.4,
          fill: dataset.fill ?? isArea.value,
          pointRadius:
            dataset.pointRadius ??
            (chartType.value === 'line' || chartType.value === 'area' ? 3 : undefined),
          pointHoverRadius:
            dataset.pointHoverRadius ??
            (chartType.value === 'line' || chartType.value === 'area' ? 5 : undefined),
          yAxisID: dataset.yAxisID,
          borderDash: dataset.borderDash
        }
      })
    }
  })

  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: colorMode.value === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)',
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: props.chartData.title,
        color: colorMode.value === 'dark' ? 'rgb(229, 231, 235)' : 'rgb(17, 24, 39)',
        font: {
          size: 14,
          weight: 'bold' as const
        },
        padding: {
          bottom: 15
        }
      },
      tooltip: {
        backgroundColor: colorMode.value === 'dark' ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
        titleColor: colorMode.value === 'dark' ? 'rgb(229, 231, 235)' : 'rgb(17, 24, 39)',
        bodyColor: colorMode.value === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)',
        borderColor: colorMode.value === 'dark' ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)',
        borderWidth: 1,
        padding: 12
      }
    },
    scales:
      props.chartData.type !== 'doughnut' && props.chartData.type !== 'radar'
        ? {
            x: {
              type: isScatterLike.value ? ('linear' as const) : ('category' as const),
              position: isScatterLike.value ? ('bottom' as const) : undefined,
              stacked: isStackedBar.value,
              grid: {
                color:
                  colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.5)',
                display: props.chartData.type !== 'bar' && props.chartData.type !== 'stackedBar'
              },
              ticks: {
                color: colorMode.value === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
                font: {
                  size: 11
                }
              },
              border: {
                color:
                  colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'
              }
            },
            y: {
              type: isScatterLike.value ? ('linear' as const) : undefined,
              stacked: isStackedBar.value,
              ticks: {
                color: colorMode.value === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
                font: {
                  size: 11
                }
              },
              grid: {
                color:
                  colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.5)'
              },
              border: {
                color:
                  colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'
              }
            }
          }
        : undefined,
    ...props.chartData.options
  }))
</script>
