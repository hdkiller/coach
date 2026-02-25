<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <UIcon name="i-heroicons-moon" class="w-5 h-5 text-indigo-500" />
        Detailed Sleep Analysis
      </h3>
      <UBadge
        v-if="performancePercentage !== null"
        :color="getScoreColor(performancePercentage) as any"
        variant="subtle"
      >
        {{ performancePercentage }}% Performance
      </UBadge>
    </div>

    <!-- Sleep Stages Chart -->
    <div
      class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800"
    >
      <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Sleep Stages</h4>
      <div class="h-8 w-full flex rounded-full overflow-hidden mb-2">
        <div
          v-if="percentages.awake > 0"
          class="h-full bg-rose-400"
          :style="{ width: `${percentages.awake}%` }"
          title="Awake"
        />
        <div
          v-if="percentages.light > 0"
          class="h-full bg-blue-300"
          :style="{ width: `${percentages.light}%` }"
          title="Light Sleep"
        />
        <div
          v-if="percentages.rem > 0"
          class="h-full bg-teal-400"
          :style="{ width: `${percentages.rem}%` }"
          title="REM Sleep"
        />
        <div
          v-if="percentages.sws > 0"
          class="h-full bg-indigo-500"
          :style="{ width: `${percentages.sws}%` }"
          title="Deep Sleep (SWS)"
        />
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap gap-4 justify-center text-xs text-gray-600 dark:text-gray-400">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-full bg-rose-400" />
          <span
            >Awake ({{ formatDuration(durations.awake) }})</span
          >
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-full bg-blue-300" />
          <span
            >Light ({{
              formatDuration(durations.light)
            }})</span
          >
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-full bg-teal-400" />
          <span
            >REM ({{ formatDuration(durations.rem) }})</span
          >
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-full bg-indigo-500" />
          <span
            >Deep ({{
              formatDuration(durations.sws)
            }})</span
          >
        </div>
      </div>
    </div>

    <!-- Key Metrics Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
      >
        <div class="text-xs text-gray-500 mb-1">Efficiency</div>
        <div class="text-xl font-bold text-gray-900 dark:text-white">
          {{ efficiencyPercentage.toFixed(0) }}%
        </div>
        <div class="text-xs text-gray-400 mt-1">Time asleep / Time in bed</div>
      </div>

      <div
        v-if="consistencyPercentage !== null"
        class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
      >
        <div class="text-xs text-gray-500 mb-1">Consistency</div>
        <div class="text-xl font-bold text-gray-900 dark:text-white">
          {{ consistencyPercentage }}%
        </div>
        <div class="text-xs text-gray-400 mt-1">Bedtime regularity</div>
      </div>

      <div
        v-if="respiratoryRate !== null"
        class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
      >
        <div class="text-xs text-gray-500 mb-1">Respiratory Rate</div>
        <div class="text-xl font-bold text-gray-900 dark:text-white">
          {{ respiratoryRate.toFixed(1) }}
        </div>
        <div class="text-xs text-gray-400 mt-1">Breaths per min</div>
      </div>

      <div
        v-if="disturbances !== null"
        class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
      >
        <div class="text-xs text-gray-500 mb-1">Disturbances</div>
        <div class="text-xl font-bold text-gray-900 dark:text-white">
          {{ disturbances }}
        </div>
        <div class="text-xs text-gray-400 mt-1">Wake events</div>
      </div>
    </div>

    <!-- Sleep Need vs Actual (Whoop specific feature) -->
    <div
      v-if="sleepNeeded !== null"
      class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700"
    >
      <div class="flex justify-between items-end mb-2">
        <span class="text-sm font-medium">Sleep Performance</span>
        <div class="text-right">
          <span
            class="text-lg font-bold"
            :class="getScoreTextColor(performancePercentage || 0)"
          >
            {{ formatDuration(totalSleepTime) }}
          </span>
          <span class="text-sm text-gray-500">
            /
            {{ formatDuration(sleepNeeded) }}
            needed</span
          >
        </div>
      </div>
      <UProgress
        v-if="performancePercentage !== null"
        :model-value="performancePercentage"
        :color="getScoreColor(performancePercentage) as any"
        size="lg"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    sleep: any
  }>()

  // Unified durations normalized to milliseconds
  const durations = computed(() => {
    const s = props.sleep
    
    // Whoop format check
    if (s?.score?.stage_summary) {
      const sum = s.score.stage_summary
      return {
        awake: sum.total_awake_time_milli || 0,
        light: sum.total_light_sleep_time_milli || 0,
        rem: sum.total_rem_sleep_time_milli || 0,
        sws: sum.total_slow_wave_sleep_time_milli || 0,
        totalInBed: sum.total_in_bed_time_milli || 0
      }
    }

    // Generic format (assuming props.sleep IS the normalized object from Wellness)
    return {
      awake: (s.awakeSecs || 0) * 1000,
      light: (s.lightSecs || 0) * 1000,
      rem: (s.remSecs || 0) * 1000,
      sws: (s.deepSecs || 0) * 1000,
      totalInBed: (s.totalSecs || 0) * 1000
    }
  })

  const totalSleepTime = computed(() => {
    return durations.value.light + durations.value.rem + durations.value.sws
  })

  const percentages = computed(() => {
    const total = durations.value.totalInBed || 1 // Avoid division by zero

    return {
      awake: (durations.value.awake / total) * 100,
      light: (durations.value.light / total) * 100,
      rem: (durations.value.rem / total) * 100,
      sws: (durations.value.sws / total) * 100
    }
  })

  const performancePercentage = computed(() => {
    if (props.sleep?.score?.sleep_performance_percentage !== undefined) {
      return props.sleep.score.sleep_performance_percentage
    }
    return null
  })

  const efficiencyPercentage = computed(() => {
    if (props.sleep?.score?.sleep_efficiency_percentage !== undefined) {
      return props.sleep.score.sleep_efficiency_percentage
    }
    // Calculate from durations
    if (durations.value.totalInBed > 0) {
      return (totalSleepTime.value / durations.value.totalInBed) * 100
    }
    return 0
  })

  const consistencyPercentage = computed(() => props.sleep?.score?.sleep_consistency_percentage || null)
  const respiratoryRate = computed(() => props.sleep?.score?.respiratory_rate || null)
  const disturbances = computed(() => props.sleep?.score?.stage_summary?.disturbance_count || null)
  
  const sleepNeeded = computed(() => {
    const sn = props.sleep?.score?.sleep_needed
    if (!sn) return null
    return (sn.baseline_milli || 0) + (sn.need_from_recent_strain_milli || 0) + (sn.need_from_sleep_debt_milli || 0)
  })

  function formatDuration(ms: number) {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  function getScoreColor(score: number): string {
    if (score >= 85) return 'success'
    if (score >= 70) return 'primary'
    return 'error'
  }

  function getScoreTextColor(score: number): string {
    if (score >= 85) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    return 'text-red-600 dark:text-red-400'
  }
</script>

