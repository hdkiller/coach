<template>
  <UCard :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="space-y-1">
          <h3 class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white">
            HRV & RHR Correlation
          </h3>
          <p class="text-[10px] text-muted font-bold uppercase tracking-tighter italic">
            Recovery Integrity Insight
          </p>
        </div>
        <div class="flex items-center gap-4">
          <!-- Mini Summary -->
          <div v-if="latestStats" class="hidden md:flex items-center gap-4 border-r border-gray-200 dark:border-gray-800 pr-4 mr-2">
            <div class="text-center">
              <div class="text-[10px] font-black text-gray-400 uppercase">HRV</div>
              <div class="text-sm font-black text-purple-500">{{ latestStats.hrv }}ms</div>
            </div>
            <div class="text-center">
              <div class="text-[10px] font-black text-gray-400 uppercase">{{ settings.baselineDays }}d Base</div>
              <div class="text-sm font-black text-gray-600 dark:text-gray-300">{{ latestStats.baseline }}ms</div>
            </div>
            <div v-if="latestStats.rhr" class="text-center">
              <div class="text-[10px] font-black text-gray-400 uppercase">RHR</div>
              <div class="text-sm font-black text-red-500">{{ latestStats.rhr }}bpm</div>
            </div>
            <div v-if="latestStats.sleep" class="text-center">
              <div class="text-[10px] font-black text-gray-400 uppercase">Sleep</div>
              <div class="text-sm font-black text-blue-500">{{ latestStats.sleep }}h</div>
            </div>
            <UBadge 
              :color="latestStats.statusColor" 
              variant="subtle" 
              size="sm" 
              class="font-black uppercase text-[10px] cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
              @click="showStatusModal = true"
            >
              {{ latestStats.status }}
            </UBadge>
          </div>
          <UButton
            icon="i-heroicons-cog-6-tooth"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="$emit('settings')"
          />
        </div>
      </div>
    </template>

    <!-- Status Explanation Modal -->
    <FitnessRecoveryStatusModal
      v-if="latestStats"
      v-model:open="showStatusModal"
      :status="latestStats.status"
      :status-color="latestStats.statusColor"
      :baseline-days="settings.baselineDays"
      :hrv="latestStats.hrv"
      :baseline="latestStats.baseline"
    />

    <div v-if="loading" class="h-[400px] flex items-center justify-center">
      <USkeleton class="h-full w-full" />
    </div>
    <div v-else class="h-[400px]">
      <ClientOnly>
        <Line
          :key="`hrv-rhr-chart-${settings.type}-${settings.inverseRhr}-${settings.yScale}`"
          :data="chartData"
          :options="chartOptions"
          :height="400"
        />
      </ClientOnly>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'

const props = defineProps<{
  wellnessData: any[]
  loading: boolean
}>()

defineEmits(['settings'])

const userStore = useUserStore()
const theme = useTheme()

const showStatusModal = ref(false)

const defaultSettings = {
  type: 'line',
  baselineDays: 30,
  stdDevMultiplier: 1.0,
  yScale: 'dynamic',
  hrvMin: 0,
  inverseRhr: false,
  smooth: true,
  showSleepBars: false,
  showBand: true,
  opacity: 0.15
}

const settings = computed(() => {
  return userStore.user?.dashboardSettings?.fitnessCharts?.hrvRhrDual || defaultSettings
})

// Process data for the dual-axis chart
const chartData = computed(() => {
  const data = [...props.wellnessData]
    .filter(w => w.hrv && w.restingHr)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const labels = data.map(w => 
    new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  )

  // Advanced Baseline & Std Dev logic
  const baselineWindow = settings.value.baselineDays || 7
  const multiplier = settings.value.stdDevMultiplier || 1.0

  const stats = data.map((_, index) => {
    const start = Math.max(0, index - (baselineWindow - 1))
    const window = data.slice(start, index + 1)
    
    const hrvValues = window.map(w => w.hrv)
    const mean = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length
    
    const variance = hrvValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / hrvValues.length
    const stdDev = Math.sqrt(variance)
    
    return { mean, stdDev }
  })

  const baselines = stats.map(s => Math.round(s.mean))
  const upperBands = stats.map(s => Math.round(s.mean + (s.stdDev * multiplier)))
  const lowerBands = stats.map(s => Math.round(Math.max(0, s.mean - (s.stdDev * multiplier))))

  // Visual Health Indicators (Color coding based on dynamic baseline)
  const pointColors = data.map((w, i) => {
    const s = stats[i]
    if (w.hrv > s.mean + s.stdDev) return 'rgb(34, 197, 94)' // Green (Optimal)
    if (w.hrv < s.mean - s.stdDev) return 'rgb(239, 68, 68)' // Red (Strained)
    return 'rgb(234, 179, 8)' // Yellow (Normal)
  })

  const datasets: any[] = [
    {
      type: 'bar',
      label: 'Sleep Duration',
      data: data.map(w => w.sleepHours || 0),
      backgroundColor: theme.isDark.value ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
      borderColor: 'transparent',
      borderWidth: 0,
      yAxisID: 'y2',
      zIndex: 0,
      hidden: !settings.value.showSleepBars,
      barPercentage: 0.9,
      categoryPercentage: 0.9
    },
    {
      type: settings.value.type || 'line',
      label: 'Heart Rate Variability',
      data: data.map(w => Math.round(w.hrv)),
      borderColor: 'rgb(168, 85, 247)',
      backgroundColor: `rgba(168, 85, 247, ${settings.value.opacity ?? 0.15})`,
      fill: settings.value.type === 'line' ? 'origin' : false,
      tension: settings.value.smooth ? 0.4 : 0,
      yAxisID: 'y',
      pointBackgroundColor: pointColors,
      pointBorderColor: pointColors,
      pointRadius: settings.value.type === 'bar' ? 0 : 4,
      pointHoverRadius: 7,
      zIndex: 10,
      spanGaps: true,
      // Metadata for tooltips/annotations
      metadata: data.map((w, i) => {
        const events = []
        if (settings.value.showAlcohol && (w.tags?.toLowerCase().includes('alcohol') || w.rawJson?.alcohol > 0)) events.push('🍺 Alcohol')
        if (settings.value.showIllness && (w.tags?.toLowerCase().includes('sick') || w.tags?.toLowerCase().includes('illness') || w.injury?.toLowerCase().includes('sick'))) events.push('🤒 Sickness')
        if (settings.value.showSleep && w.sleepHours > 0 && w.sleepHours < 6) events.push('😴 Poor Sleep')
        
        // High Strain: Check if TSS is high relative to baseline (CTL)
        if (settings.value.showStrain && w.ctl > 0) {
          // If this record has a high TSS activity on same day
          // Since Wellness only has summary, we can check if ATL > CTL by significant margin
          if (w.atl > w.ctl * 1.3) events.push('⚡ High Strain')
        }

        return events
      })
    },
    {
      type: 'line',
      label: 'Resting Heart Rate',
      data: data.map(w => Math.round(w.restingHr)),
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      tension: settings.value.smooth ? 0.4 : 0,
      yAxisID: 'y1',
      pointRadius: 0,
      zIndex: 5,
      spanGaps: true
    }
  ]

  // Normal Range Shaded Area
  if (settings.value.showBand) {
    datasets.push({
      label: 'Range Upper',
      data: upperBands,
      borderColor: 'transparent',
      backgroundColor: theme.isDark.value ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
      pointRadius: 0,
      fill: false,
      tension: settings.value.smooth ? 0.4 : 0,
      spanGaps: true,
      zIndex: 1
    })
    datasets.push({
      label: 'Normal Range',
      data: lowerBands,
      borderColor: 'transparent',
      backgroundColor: theme.isDark.value ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
      pointRadius: 0,
      fill: '-1',
      tension: settings.value.smooth ? 0.4 : 0,
      spanGaps: true,
      zIndex: 1
    })
  }

  return {
    labels,
    datasets
  }
})

const latestStats = computed(() => {
  if (!props.wellnessData.length) return null
  const data = [...props.wellnessData]
    .filter(w => w.hrv)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  if (data.length === 0) return null
  const latest = data[data.length - 1]
  
  // Calculate window-aware baseline
  const window = settings.value.baselineDays || 7
  const lastN = data.slice(-window)
  const mean = lastN.reduce((acc, curr) => acc + curr.hrv, 0) / lastN.length
  
  const variance = lastN.reduce((a, b) => a + Math.pow(b.hrv - mean, 2), 0) / lastN.length
  const stdDev = Math.sqrt(variance)
  
  let status = 'Balanced'
  let statusColor: any = 'warning'
  
  if (latest.hrv > mean + stdDev) {
    status = 'Optimal'
    statusColor = 'success'
  } else if (latest.hrv < mean - stdDev) {
    status = 'Strained'
    statusColor = 'error'
  }

  return {
    hrv: Math.round(latest.hrv),
    baseline: Math.round(mean),
    rhr: latest.restingHr ? Math.round(latest.restingHr) : null,
    sleep: latest.sleepHours ? latest.sleepHours.toFixed(1) : null,
    status,
    statusColor
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 500 },
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        filter: (item: any) => !item.text.includes('Range') && item.text !== 'Sleep Duration',
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' as const },
        usePointStyle: true,
        boxWidth: 6
      }
    },
    tooltip: {
      backgroundColor: theme.isDark.value ? '#111827' : '#ffffff',
      titleColor: theme.isDark.value ? '#f3f4f6' : '#111827',
      bodyColor: theme.isDark.value ? '#d1d5db' : '#374151',
      borderColor: theme.isDark.value ? '#374151' : '#e5e7eb',
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: (context: any) => {
          if (context.dataset.label.includes('Range')) return null
          let unit = ''
          if (context.dataset.yAxisID === 'y') unit = 'ms'
          else if (context.dataset.yAxisID === 'y1') unit = ' bpm'
          else if (context.dataset.yAxisID === 'y2') unit = 'h'
          return `${context.dataset.label}: ${context.parsed.y.toFixed(context.dataset.yAxisID === 'y2' ? 1 : 0)}${unit}`
        },
        afterBody: (items: any[]) => {
          const hrvItem = items.find(i => i.dataset.label === 'Heart Rate Variability')
          if (!hrvItem) return ''
          
          const hrv = hrvItem.parsed.y
          const dataIndex = hrvItem.dataIndex
          const datasets = hrvItem.chart.data.datasets
          const hrvDataset = datasets[0]
          
          const upper = datasets.find(d => d.label === 'Range Upper')?.data[dataIndex]
          const lower = datasets.find(d => d.label === 'Normal Range')?.data[dataIndex]

          let lines = []

          // 1. Contextual Events
          const events = hrvDataset.metadata?.[dataIndex] || []
          if (events.length > 0) {
            lines.push(`Context: ${events.join(', ')}`)
          }

          // 2. Recovery Insight
          if (upper !== undefined && lower !== undefined) {
            if (hrv > upper) lines.push('Insight: Optimal Recovery')
            else if (hrv < lower) lines.push('Insight: System Strained')
            else lines.push('Insight: Recovery Balanced')
          }

          return lines.join('\n')
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#94a3b8', font: { size: 10, weight: 'bold' } }
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      beginAtZero: settings.value.yScale === 'fixed' && !settings.value.hrvMin,
      min: settings.value.yScale === 'fixed' ? (settings.value.hrvMin || 0) : undefined,
      suggestedMax: settings.value.yScale === 'fixed' ? 150 : undefined,
      title: { display: true, text: 'HRV (ms)', color: '#94a3b8', font: { size: 10, weight: 'bold' } },
      grid: { color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
      ticks: { color: '#94a3b8' }
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      reverse: settings.value.inverseRhr,
      title: { display: true, text: 'RHR (bpm)', color: '#94a3b8', font: { size: 10, weight: 'bold' } },
      grid: { drawOnChartArea: false },
      ticks: { color: '#94a3b8' }
    },
    y2: {
      type: 'linear' as const,
      display: false, // Keep it hidden but used for scaling the background bars
      position: 'right' as const,
      min: 0,
      max: 12, // Standard sleep range
      grid: { display: false }
    }
  }
}))
</script>
