<template>
  <div class="pmc-chart h-full w-full">
    <div v-if="loading" class="flex justify-center items-center h-full min-h-[300px]">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-full min-h-[300px]">
      <p class="text-red-600 dark:text-red-400 font-black uppercase tracking-widest text-[10px]">
        {{ error }}
      </p>
    </div>

    <div v-else-if="pmcData" class="h-full flex flex-col">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div
          class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-blue-400/50 transition-colors"
          @click="openExplanation('fitness')"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 italic"
              >Fitness (CTL)</span
            >
            <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div
            class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tighter"
          >
            {{ (pmcData.summary?.currentCTL ?? 0).toFixed(1) }}
          </div>
          <div v-if="ctlChange !== 0" class="mt-1 flex items-center gap-1">
            <UIcon
              :name="
                ctlChange > 0 ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'
              "
              class="size-3"
              :class="ctlChange > 0 ? 'text-green-500' : 'text-red-500'"
            />
            <span
              class="text-[10px] font-bold uppercase tracking-tighter"
              :class="ctlChange > 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ ctlChange > 0 ? '+' : '' }}{{ ctlChange.toFixed(1) }} Change
            </span>
          </div>
        </div>

        <div
          class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-orange-400/50 transition-colors"
          @click="openExplanation('fatigue')"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 italic"
              >Fatigue (ATL)</span
            >
            <UIcon name="i-heroicons-fire" class="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div
            class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tighter"
          >
            {{ (pmcData.summary?.currentATL ?? 0).toFixed(1) }}
          </div>
          <div v-if="atlChange !== 0" class="mt-1 flex items-center gap-1">
            <UIcon
              :name="
                atlChange > 0 ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'
              "
              class="size-3"
              :class="atlChange > 0 ? 'text-red-500' : 'text-green-500'"
            />
            <span
              class="text-[10px] font-bold uppercase tracking-tighter"
              :class="atlChange > 0 ? 'text-red-600' : 'text-green-600'"
            >
              {{ atlChange > 0 ? '+' : '' }}{{ atlChange.toFixed(1) }} Change
            </span>
          </div>
        </div>

        <div
          class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-amber-400/50 transition-colors"
          @click="openExplanation('form')"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 italic"
              >Form (TSB)</span
            >
            <div
              class="w-1.5 h-1.5 rounded-full"
              :class="getFormStatusBg(pmcData.summary?.currentTSB ?? 0)"
            />
          </div>
          <div
            class="text-xl sm:text-2xl font-black tracking-tighter"
            :class="getFormColorClass(pmcData.summary?.currentTSB ?? 0)"
          >
            {{ (pmcData.summary?.currentTSB ?? 0) > 0 ? '+' : ''
            }}{{ (pmcData.summary?.currentTSB ?? 0).toFixed(1) }}
          </div>
          <div class="mt-1 text-[10px] font-bold uppercase tracking-tighter text-gray-500">
            {{ pmcData.summary?.formStatus }}
          </div>
        </div>

        <div
          class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-gray-400 transition-colors"
          @click="openExplanation('tss')"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 italic"
              >Avg TSS</span
            >
            <UIcon name="i-heroicons-calculator" class="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div
            class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tighter"
          >
            {{ (pmcData.summary?.avgTSS ?? 0).toFixed(1) }}
          </div>
          <div class="mt-1 text-[10px] font-bold uppercase tracking-tighter text-gray-500">
            Per session
          </div>
        </div>
      </div>

      <!-- Chart Area -->
      <div class="flex-1 min-h-[300px] relative">
        <Line
          :key="`pmc-chart-${chartSettings.smooth}-${chartSettings.yScale}`"
          :data="chartData"
          :options="chartOptions"
          :plugins="[ChartDataLabels]"
          :height="300"
        />
      </div>

      <!-- Legend -->
      <div
        class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 pt-4 border-t border-gray-50 dark:border-gray-800"
      >
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
          <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Fitness</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
          <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fatigue</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
          <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Form</span>
        </div>
      </div>
    </div>

    <!-- Explanation Modal -->
    <UModal v-model:open="showExplanation" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <UIcon
                :name="activeExplanation.icon"
                class="size-6"
                :class="activeExplanation.color"
              />
            </div>
            <div>
              <h3
                class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white"
              >
                {{ activeExplanation.title }}
              </h3>
              <p class="text-[10px] text-gray-500 font-bold uppercase italic">
                Performance Metric Explanation
              </p>
            </div>
          </div>

          <div class="space-y-4">
            <div
              class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800"
            >
              <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
                {{ activeExplanation.description }}
              </p>
            </div>

            <div v-if="activeExplanation.formula" class="space-y-1.5">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >Calculation Method</span
              >
              <div
                class="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/30"
              >
                <code class="text-xs font-bold text-blue-600 dark:text-blue-400">{{
                  activeExplanation.formula
                }}</code>
              </div>
            </div>

            <div class="space-y-1.5">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >Strategic Tip</span
              >
              <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">
                {{ activeExplanation.tip }}
              </p>
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              class="font-bold uppercase text-xs"
              @click="showExplanation = false"
            >
              Close
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  import { Line } from 'vue-chartjs'
  import ChartDataLabels from 'chartjs-plugin-datalabels'
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

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )

  const props = defineProps<{
    days?: number | string
    settings?: any
  }>()

  const theme = useTheme()
  const loading = ref(true)
  const error = ref<string | null>(null)
  const pmcData = ref<any>(null)

  const chartSettings = computed(() => ({
    smooth: true,
    showLabels: false,
    yScale: 'dynamic',
    yMin: 0,
    ...props.settings
  }))

  const ctlChange = computed(() => {
    if (!pmcData.value?.data?.length) return 0
    const data = pmcData.value.data
    const current = data[data.length - 1]?.ctl || 0
    const start = data[0]?.ctl || 0
    return current - start
  })

  const atlChange = computed(() => {
    if (!pmcData.value?.data?.length) return 0
    const data = pmcData.value.data
    const current = data[data.length - 1]?.atl || 0
    const start = data[0]?.atl || 0
    return current - start
  })

  // Explanation Modal Logic
  const showExplanation = ref(false)
  const explanationType = ref<'fitness' | 'fatigue' | 'form' | 'tss'>('fitness')

  const explanations = {
    fitness: {
      title: 'Fitness (CTL)',
      icon: 'i-heroicons-bolt',
      color: 'text-blue-500',
      description:
        'Chronic Training Load (CTL) represents your long-term training volume and intensity. It is a weighted average of your training stress over the last 42 days.',
      formula: 'CTL = Exponential Moving Average of TSS (42-day time constant)',
      tip: 'A steady increase in CTL indicates improving aerobic capacity and durability. Avoid increasing CTL by more than 5-8 points per week to minimize injury risk.'
    },
    fatigue: {
      title: 'Fatigue (ATL)',
      icon: 'i-heroicons-fire',
      color: 'text-orange-500',
      description:
        'Acute Training Load (ATL) represents your short-term training stress over the last 7 days. It reflects the immediate physiological strain on your system.',
      formula: 'ATL = Exponential Moving Average of TSS (7-day time constant)',
      tip: 'High fatigue is normal during hard training blocks, but prolonged high ATL without recovery can lead to overtraining.'
    },
    form: {
      title: 'Form (TSB)',
      icon: 'i-heroicons-scale',
      color: 'text-amber-500',
      description:
        'Training Stress Balance (TSB) represents your readiness to perform. It is the difference between your long-term fitness and short-term fatigue.',
      formula: "Form (TSB) = Yesterday's CTL - Yesterday's ATL",
      tip: 'An "Optimal" form range for racing is usually between +5 and +25. A very negative TSB (below -20) indicates high fatigue and a need for recovery.'
    },
    tss: {
      title: 'Training Stress Score',
      icon: 'i-heroicons-calculator',
      color: 'text-gray-400',
      description:
        'TSS is a standardized way to measure the physiological cost of a single workout based on its duration and intensity relative to your threshold.',
      formula: 'TSS = (sec * NP * IF) / (FTP * 3600) * 100',
      tip: '100 TSS is equivalent to riding at your functional threshold power (FTP) for exactly one hour.'
    }
  }

  const activeExplanation = computed(() => explanations[explanationType.value])

  function openExplanation(type: 'fitness' | 'fatigue' | 'form' | 'tss') {
    explanationType.value = type
    showExplanation.value = true
  }

  // Fetch PMC data
  async function fetchPMCData() {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch('/api/performance/pmc', {
        query: { days: props.days || 90 }
      })
      pmcData.value = data
    } catch (e: any) {
      console.error('Error fetching PMC data:', e)
      error.value = e.data?.message || e.message || 'Failed to load performance metrics'
    } finally {
      loading.value = false
    }
  }

  function getFormColorClass(tsb: number) {
    if (tsb >= 5) return 'text-emerald-500'
    if (tsb >= -10) return 'text-amber-500'
    return 'text-red-500'
  }

  function getFormStatusBg(tsb: number) {
    if (tsb >= 5) return 'bg-emerald-500'
    if (tsb >= -10) return 'bg-amber-500'
    return 'bg-red-500'
  }

  // Chart data computed property
  const chartData = computed(() => {
    if (!pmcData.value?.data) return { labels: [], datasets: [] }

    const data = pmcData.value.data
    const labels = data.map((d: any) =>
      new Date(d.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      })
    )

    return {
      labels,
      datasets: [
        {
          label: 'CTL (Fitness)',
          data: data.map((d: any) => d.ctl),
          borderColor: theme.colors.value.get('blue', 500),
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: chartSettings.value.smooth ? 0.4 : 0,
          fill: false,
          zIndex: 10
        },
        {
          label: 'ATL (Fatigue)',
          data: data.map((d: any) => d.atl),
          borderColor: theme.colors.value.get('orange', 500),
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: chartSettings.value.smooth ? 0.4 : 0,
          fill: false,
          zIndex: 8
        },
        {
          label: 'TSB (Form)',
          data: data.map((d: any) => d.tsb),
          borderColor: theme.colors.value.get('amber', 400),
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: chartSettings.value.smooth ? 0.4 : 0,
          fill: false,
          zIndex: 5
        }
      ]
    }
  })

  // Chart options
  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10 }
    },
    plugins: {
      legend: {
        display: false
      },
      datalabels: {
        display: (context: any) => {
          return chartSettings.value.showLabels && context.datasetIndex === 0
        },
        color: '#94a3b8',
        align: 'top' as const,
        anchor: 'end' as const,
        offset: 4,
        font: { size: 9, weight: 'bold' as const },
        formatter: (value: any) => Math.round(value)
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
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxTicksLimit: 8
        },
        border: { display: false }
      },
      y: {
        min: chartSettings.value.yScale === 'fixed' ? chartSettings.value.yMin || 0 : undefined,
        position: 'right' as const,
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          drawTicks: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxTicksLimit: 6
        },
        border: { display: false }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  }))

  // Watch for days prop changes
  watch(
    () => props.days,
    () => {
      fetchPMCData()
    }
  )

  // Load data on mount
  onMounted(() => {
    fetchPMCData()
  })
</script>

<style scoped>
  .pmc-chart {
    width: 100%;
  }
</style>
