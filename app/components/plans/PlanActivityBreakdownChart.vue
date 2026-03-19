<template>
  <div class="h-[180px] w-full flex justify-center">
    <Doughnut :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
  import { Doughnut } from 'vue-chartjs'
  import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartOptions } from 'chart.js'

  ChartJS.register(ArcElement, Tooltip, Legend)

  const props = defineProps<{
    data: Array<{
      label: string
      minutes: number
      tss: number
      count: number
    }>
    metric: 'minutes' | 'tss'
  }>()

  function activityColor(label: string) {
    if (label === 'Run') return 'rgba(16, 185, 129, 0.7)'
    if (label === 'Ride') return 'rgba(14, 165, 233, 0.7)'
    if (label === 'Gym') return 'rgba(217, 70, 239, 0.7)'
    if (label === 'Rest/Recovery') return 'rgba(245, 158, 11, 0.7)'
    return 'rgba(148, 163, 184, 0.7)'
  }

  const chartData = computed(() => {
    const labels = props.data.map((d) => d.label)
    const values = props.data.map((d) => (props.metric === 'minutes' ? d.minutes : d.tss))
    const backgroundColors = props.data.map((d) => activityColor(d.label))

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          hoverOffset: 4
        }
      ]
    }
  })

  const chartOptions = computed<ChartOptions<'doughnut'>>(() => {
    const isDark =
      typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    const textColor = isDark ? '#94a3b8' : '#64748b'

    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right' as const,
          labels: {
            color: textColor,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 6,
            boxHeight: 6,
            font: {
              size: 10,
              weight: 'bold'
            },
            padding: 10
          }
        },
        tooltip: {
          callbacks: {
            label: (item: any) => {
              const value = item.raw
              const unit = props.metric === 'tss' ? ' TSS' : ' min'
              return ` ${item.label}: ${value}${unit}`
            }
          }
        }
      }
    }
  })
</script>
