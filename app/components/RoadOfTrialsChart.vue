<template>
  <UCard class="bg-gray-900 border-gray-800">
    <template #header>
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 class="text-xl font-bold text-white uppercase font-athletic tracking-tight">
            The Road of Trials
          </h3>
          <p class="text-sm text-gray-400">
            Track your subjective training and wellness metrics over time.
          </p>
        </div>

        <div v-if="!pending && !error" class="flex flex-wrap gap-2">
          <!-- Dataset toggles -->
          <UBadge
            v-for="(ds, idx) in chartData.datasets"
            :key="ds.label"
            :color="ds.hidden ? 'gray' : ds.themeColor"
            variant="subtle"
            class="cursor-pointer transition-colors"
            @click="toggleDataset(idx)"
          >
            {{ ds.label }}
          </UBadge>
        </div>
      </div>
    </template>

    <div v-if="pending" class="h-[400px] flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 animate-spin" />
    </div>

    <div
      v-else-if="error"
      class="h-[400px] flex flex-col items-center justify-center text-center p-6"
    >
      <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-500 mb-4" />
      <h3 class="text-lg font-bold text-white mb-2">Failed to load chart data</h3>
      <p class="text-gray-400 mb-4">{{ error.message }}</p>
      <UButton @click="refresh">Retry</UButton>
    </div>

    <div
      v-else-if="historyData.length === 0"
      class="h-[400px] flex flex-col items-center justify-center text-center p-6"
    >
      <UIcon name="i-heroicons-chart-bar" class="w-12 h-12 text-gray-600 mb-4" />
      <h3 class="text-lg font-bold text-white mb-2">No Data Yet</h3>
      <p class="text-gray-400">
        Submit your first Weekly Check-In to start tracking your progress.
      </p>
    </div>

    <div v-else class="h-[400px] relative w-full">
      <Line ref="chartRef" :data="chartData" :options="chartOptions" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { format } from 'date-fns'
  import { Line } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  } from 'chart.js'

  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

  const {
    data: historyData,
    pending,
    error,
    refresh
  } = useFetch('/api/check-ins/history', {
    default: () => []
  })

  const chartRef = ref<InstanceType<typeof Line> | null>(null)

  // For Vue reactivity to track hidden state
  const hiddenStates = ref<Record<number, boolean>>({})

  function toggleDataset(index: number) {
    hiddenStates.value[index] = !hiddenStates.value[index]
  }

  const chartData = computed(() => {
    if (!historyData.value || historyData.value.length === 0) {
      return { labels: [], datasets: [] }
    }

    const labels = historyData.value.map((item) => format(new Date(item.createdAt), 'MMM dd'))

    // Define the metrics mapping and styles
    const rawDatasets = [
      {
        label: 'Intensity',
        data: historyData.value.map((item) => item.trainingDifficulty || 0),
        borderColor: '#3b82f6', // blue-500
        backgroundColor: '#3b82f6',
        themeColor: 'blue'
      },
      {
        label: 'Load',
        data: historyData.value.map((item) => item.trainingLoad || 0),
        borderColor: '#06b6d4', // cyan-500
        backgroundColor: '#06b6d4',
        themeColor: 'cyan'
      },
      {
        label: 'Recovery',
        data: historyData.value.map((item) => item.trainingRecovery || 0),
        borderColor: '#0ea5e9', // sky-500
        backgroundColor: '#0ea5e9',
        themeColor: 'sky'
      },
      {
        label: 'Nutrition',
        data: historyData.value.map((item) => item.trainingNutrition || 0),
        borderColor: '#2563eb', // blue-600
        backgroundColor: '#2563eb',
        themeColor: 'blue'
      },
      {
        label: 'Hydration',
        data: historyData.value.map((item) => item.trainingHydration || 0),
        borderColor: '#0284c7', // sky-600
        backgroundColor: '#0284c7',
        themeColor: 'sky'
      },
      {
        label: 'Sleep',
        data: historyData.value.map((item) => item.wellnessSleep || 0),
        borderColor: '#f97316', // orange-500
        backgroundColor: '#f97316',
        themeColor: 'orange'
      },
      {
        label: 'Pain',
        data: historyData.value.map((item) => item.wellnessPainScore || 0),
        borderColor: '#ef4444', // red-500
        backgroundColor: '#ef4444',
        themeColor: 'red'
      },
      {
        label: 'Stress',
        data: historyData.value.map((item) => item.wellnessStress || 0),
        borderColor: '#f59e0b', // amber-500
        backgroundColor: '#f59e0b',
        themeColor: 'amber'
      },
      {
        label: 'Energy',
        data: historyData.value.map((item) => item.personalFatigue || 0),
        borderColor: '#eab308', // yellow-500
        backgroundColor: '#eab308',
        themeColor: 'yellow'
      }
    ]

    return {
      labels,
      datasets: rawDatasets.map((ds, idx) => ({
        ...ds,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        hidden: hiddenStates.value[idx] || false
      }))
    }
  })

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // We use our custom badges
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)', // gray-900
        titleColor: '#fff',
        bodyColor: '#e5e7eb', // gray-200
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        min: 1,
        max: 10,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          tickLength: 0,
          borderDash: [5, 5]
        },
        ticks: {
          color: '#9ca3af', // gray-400
          stepSize: 1
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#9ca3af', // gray-400
          maxRotation: 45,
          minRotation: 45
        },
        border: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }
</script>
