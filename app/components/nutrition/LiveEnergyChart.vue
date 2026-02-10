<template>
  <div class="h-[200px] w-full">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import type { EnergyPoint } from '~/utils/nutrition-logic'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
)

const props = defineProps<{
  points: EnergyPoint[]
}>()

const chartData = computed(() => ({
  labels: props.points.map(p => p.time),
  datasets: [
    {
      label: 'Energy Availability',
      data: props.points.map(p => p.level),
      borderColor: '#3b82f6',
      backgroundColor: (context: any) => {
        const chart = context.chart
        const { ctx, chartArea } = chart
        if (!chartArea) return null
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.1)') // Red at bottom
        gradient.addColorStop(0.2, 'rgba(245, 158, 11, 0.1)') // Orange
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)') // Blue
        return gradient
      },
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: (context: any) => {
        const point = props.points[context.dataIndex]
        return point?.event || point?.meal ? 4 : 0
      },
      pointBackgroundColor: (context: any) => {
        const point = props.points[context.dataIndex]
        return point?.event ? '#ef4444' : '#10b981'
      }
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: (context: any) => `Fuel Level: ${context.parsed.y}%`,
        afterLabel: (context: any) => {
          const point = props.points[context.dataIndex]
          const lines = []
          if (point?.meal) lines.push(`Food: ${point.meal}`)
          if (point?.event) lines.push(`Workout: ${point.event}`)
          return lines.join('\n')
        }
      }
    },
    annotation: {
      annotations: {
        nowLine: {
          type: 'line',
          xMin: props.points.findIndex(p => p.isFuture),
          xMax: props.points.findIndex(p => p.isFuture),
          borderColor: 'rgba(156, 163, 175, 0.5)',
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            content: 'NOW',
            display: true,
            position: 'start',
            font: { size: 9, weight: 'bold' }
          }
        },
        bonkZone: {
          type: 'box',
          yMin: 0,
          yMax: 20,
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          borderWidth: 0
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        maxTicksLimit: 8,
        font: { size: 10 }
      }
    },
    y: {
      min: 0,
      max: 100,
      ticks: {
        stepSize: 20,
        font: { size: 10 },
        callback: (value: any) => `${value}%`
      }
    }
  }
}))
</script>
