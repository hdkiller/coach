<template>
  <UDashboardPanel id="workout-intervals-debug">
    <template #header>
      <UDashboardNavbar :title="`Interval Audit: ${data?.audit?.plannedTitle || 'Workout'}`">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            :to="`/workouts/${route.params.id}`"
          >
            Back to Workout
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-8">
        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-10 h-10 animate-spin text-primary-500 mb-4"
          />
          <p class="text-sm font-black uppercase tracking-widest text-zinc-500">
            Executing Deep Telemetry Audit...
          </p>
        </div>

        <div
          v-else-if="error"
          class="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center"
        >
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="w-12 h-12 text-red-500 mx-auto mb-4"
          />
          <p class="text-red-500 font-bold">{{ error }}</p>
          <UButton color="error" variant="outline" class="mt-4" @click="fetchData"
            >Retry Audit</UButton
          >
        </div>

        <div v-else-if="data" class="space-y-8">
          <!-- Summary Info -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <UCard :ui="{ body: 'p-4' }">
              <template #default>
                <div
                  class="font-mono text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1"
                >
                  Active Detection
                </div>
                <div class="text-2xl font-black text-primary-500">{{ data.detectionMetric }}</div>
              </template>
            </UCard>
            <UCard :ui="{ body: 'p-4' }">
              <template #default>
                <div
                  class="font-mono text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1"
                >
                  Engine Metric
                </div>
                <div class="text-2xl font-black text-amber-500">
                  {{ data.audit?.autoDetectionMetric || 'None' }}
                </div>
              </template>
            </UCard>
            <UCard :ui="{ body: 'p-4' }">
              <template #default>
                <div
                  class="font-mono text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1"
                >
                  Calculation FTP
                </div>
                <div class="text-2xl font-black">{{ data.audit?.calculationFtp }}W</div>
              </template>
            </UCard>
            <UCard :ui="{ body: 'p-4' }">
              <template #default>
                <div
                  class="font-mono text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1"
                >
                  Interval Counts
                </div>
                <div class="text-2xl font-black flex gap-2">
                  <span class="text-primary-500" title="Active">{{ data.intervals.length }}</span>
                  <span class="text-zinc-500">/</span>
                  <span class="text-amber-500" title="Engine">{{
                    data.audit?.detected.length
                  }}</span>
                </div>
              </template>
            </UCard>
          </div>

          <!-- Stream Chart -->
          <UCard
            v-if="data.chartData && data.chartData.time.length > 0"
            :ui="{ body: 'p-0 overflow-hidden' }"
            class="bg-zinc-900 border-zinc-800"
          >
            <template #header>
              <div class="flex items-center justify-between px-4 py-2">
                <h3
                  class="font-mono text-[10px] font-black text-zinc-400 uppercase tracking-widest"
                >
                  Telemetry Stream Analysis
                </h3>
                <div class="flex gap-4">
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-amber-500" />
                    <span class="text-[10px] font-bold text-zinc-400 uppercase">Power</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-zinc-500" />
                    <span class="text-[10px] font-bold text-zinc-400 uppercase">Planned</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-amber-200" />
                    <span class="text-[10px] font-bold text-zinc-400 uppercase">Smoothed</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-red-500" />
                    <span class="text-[10px] font-bold text-zinc-400 uppercase">Heart Rate</span>
                  </div>
                </div>
              </div>
            </template>

            <div class="h-64 sm:h-80 w-full relative">
              <ClientOnly>
                <ChartsStreamsBaseStreamChart
                  :labels="data.chartData.time"
                  :datasets="chartDatasets"
                  :highlight-range="chartHighlightRange"
                  height-class="h-full"
                  @chart-hover="onChartHover"
                  @chart-leave="onChartLeave"
                />
              </ClientOnly>
            </div>
          </UCard>

          <!-- Audit Tabs -->
          <UTabs :items="tabs" class="w-full">
            <!-- Active Intervals -->
            <template #active>
              <IntervalTable
                :intervals="data.intervals"
                title="Active Intervals (Production Selection)"
                @interval-hover="onIntervalHover"
                @interval-leave="onIntervalLeave"
              />
            </template>

            <!-- Engine Intervals -->
            <template #engine>
              <IntervalTable
                :intervals="data.audit?.detected || []"
                title="Coach Watts Engine Detection"
                color="amber"
                @interval-hover="onIntervalHover"
                @interval-leave="onIntervalLeave"
              />
            </template>

            <!-- Synced Intervals -->
            <template #synced>
              <IntervalTable
                :intervals="data.audit?.synced || []"
                title="Intervals.icu / Strava Raw Sync"
                color="blue"
                @interval-hover="onIntervalHover"
                @interval-leave="onIntervalLeave"
              />
            </template>

            <!-- Planned Intervals -->
            <template #planned>
              <div class="space-y-8">
                <IntervalTable
                  v-if="data.audit?.planned?.length > 0"
                  :intervals="data.audit.planned"
                  title="Planned Structured Steps"
                  color="zinc"
                  @interval-hover="onIntervalHover"
                  @interval-leave="onIntervalLeave"
                />
                <div v-else class="py-12 text-center text-zinc-500 italic">
                  No structured plan found for this workout.
                </div>

                <div v-if="data.audit?.plannedRaw" class="pt-4">
                  <UAccordion
                    :items="[
                      {
                        label: 'Raw Step Manifest (JSON)',
                        slot: 'raw',
                        icon: 'i-heroicons-code-bracket'
                      }
                    ]"
                    :ui="{
                      trigger:
                        'font-mono text-[10px] font-black text-zinc-500 uppercase tracking-widest',
                      root: 'border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden'
                    }"
                  >
                    <template #raw>
                      <div
                        class="bg-white dark:bg-black p-4 border-t border-zinc-200 dark:border-zinc-800"
                      >
                        <pre class="p-2 font-mono text-xs overflow-auto max-h-[500px]">{{
                          JSON.stringify(data.audit.plannedRaw, null, 2)
                        }}</pre>
                      </div>
                    </template>
                  </UAccordion>
                </div>
              </div>
            </template>
          </UTabs>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  const route = useRoute()
  const data = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const chartHighlightRange = ref<[number, number] | null>(null)

  const tabs = [
    { label: 'Active', slot: 'active', icon: 'i-heroicons-check-circle' },
    { label: 'Engine', slot: 'engine', icon: 'i-heroicons-cpu-chip' },
    { label: 'Synced', slot: 'synced', icon: 'i-heroicons-arrow-path' },
    { label: 'Planned', slot: 'planned', icon: 'i-heroicons-calendar' }
  ]

  const chartDatasets = computed(() => {
    if (!data.value?.chartData) return []
    const datasets = []

    if (data.value.chartData.power?.length > 0) {
      datasets.push({
        label: 'Power',
        data: data.value.chartData.power,
        color: 'rgba(245, 158, 11, 0.4)', // amber-500 with low opacity
        unit: 'W'
      })
    }

    if (data.value.chartData.plannedPower?.length > 0) {
      datasets.push({
        label: 'Planned Power',
        data: data.value.chartData.plannedPower,
        color: '#71717a', // zinc-500
        unit: 'W'
      })
    }

    if (data.value.chartData.smoothedPower?.length > 0) {
      datasets.push({
        label: 'Smoothed Power',
        data: data.value.chartData.smoothedPower,
        color: '#fef3c7', // amber-100/200-ish
        unit: 'W'
      })
    }

    if (data.value.chartData.heartrate?.length > 0) {
      datasets.push({
        label: 'Heart Rate',
        data: data.value.chartData.heartrate,
        color: '#ef4444', // red-500
        unit: 'BPM'
      })
    }

    return datasets
  })

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      data.value = await $fetch(`/api/workouts/${route.params.id}/intervals?debug=true`)
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to fetch interval audit data'
    } finally {
      loading.value = false
    }
  }

  function onIntervalHover(interval: any) {
    if (!data.value?.chartData?.time || !data.value?.sampleRate) return

    // Convert stream indices to chart indices
    const sampleRate = data.value.sampleRate

    const startIdx = Math.floor(interval.start_index / sampleRate)
    const endIdx = Math.floor(interval.end_index / sampleRate)

    chartHighlightRange.value = [startIdx, endIdx]
  }

  function onIntervalLeave() {
    chartHighlightRange.value = null
  }

  function onChartHover(index: number) {
    // Optional: Highlight table rows based on chart position
  }

  function onChartLeave() {
    // Optional: Reset table highlighting
  }

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  onMounted(() => {
    fetchData()
  })
</script>

<style scoped>
  pre {
    scrollbar-width: thin;
    scrollbar-color: rgba(120, 120, 120, 0.3) transparent;
  }
</style>
