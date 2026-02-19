<template>
  <div class="h-full w-full relative flex items-center justify-center min-h-[300px]">
    <div
      v-if="!hasScores"
      class="flex items-center justify-center h-full text-gray-500 font-bold uppercase tracking-widest text-[10px]"
    >
      No performance data available
    </div>
    <div v-else class="w-full h-full">
      <Radar :data="chartData" :options="chartOptions" :height="320" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Radar } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
  } from 'chart.js'

  ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

  const props = defineProps<{
    scores: Record<string, number | null | undefined>
    type: 'workout' | 'nutrition'
  }>()

  const theme = useTheme()

  const labels = computed(() => {
    if (props.type === 'workout') {
      return ['Overall', 'Technical', 'Effort', 'Pacing', 'Execution']
    } else {
      return ['Overall', 'Balance', 'Quality', 'Adherence', 'Hydration']
    }
  })

  const scoreKeys = computed(() => {
    if (props.type === 'workout') {
      return ['overall', 'technical', 'effort', 'pacing', 'execution']
    } else {
      return ['overall', 'macroBalance', 'quality', 'adherence', 'hydration']
    }
  })

  const chartColor = computed(() =>
    props.type === 'workout'
      ? theme.colors.value.get('blue', 500)
      : theme.colors.value.get('green', 500)
  )

  const hasScores = computed(() => {
    return Object.values(props.scores).some(
      (score) => score != null && score !== undefined && score > 0
    )
  })

  const chartData = computed(() => ({
    labels: labels.value,
    datasets: [
      {
        label: props.type === 'workout' ? 'Workout Performance' : 'Nutrition Performance',
        data: scoreKeys.value.map((key) => props.scores[key] || 0),
        backgroundColor: chartColor.value + '26', // ~15% opacity
        borderColor: chartColor.value,
        borderWidth: 2,
        pointBackgroundColor: chartColor.value,
        pointBorderColor: theme.isDark.value ? '#111827' : '#fff',
        pointHoverBackgroundColor: theme.isDark.value ? '#111827' : '#fff',
        pointHoverBorderColor: chartColor.value,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.1
      }
    ]
  }))

  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 10
    },
    plugins: {
      legend: {
        display: false
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
        callbacks: {
          label: (context: any) => {
            return `${context.label}: ${context.parsed.r.toFixed(1)}/10`
          }
        }
      }
    },
    scales: {
      r: {
        min: 0,
        max: 10,
        beginAtZero: true,
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          circular: true
        },
        angleLines: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          display: false,
          stepSize: 2
        },
        pointLabels: {
          color: '#94a3b8',
          font: {
            size: 10,
            weight: 'bold' as const
          },
          padding: 5
        }
      }
    }
  }))
</script>
