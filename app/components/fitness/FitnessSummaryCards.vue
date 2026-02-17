<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
    <!-- eFTP Card -->
    <div
      class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 sm:p-4 border border-blue-100 dark:border-blue-800/50"
    >
      <div class="flex items-center justify-between mb-1">
        <span
          class="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400"
          >eFTP</span
        >
        <UIcon name="i-heroicons-bolt" class="size-3.5 text-blue-500" />
      </div>
      <div class="flex items-baseline gap-1">
        <div class="text-2xl font-black text-blue-900 dark:text-blue-100 tracking-tight">
          <USkeleton v-if="loadingFTP" class="h-8 w-12" />
          <template v-else>{{ ftpData?.summary?.currentFTP || '-' }}</template>
        </div>
        <span v-if="!loadingFTP" class="text-xs font-black text-blue-500 uppercase">W</span>
      </div>
      <div
        v-if="!loadingFTP && ftpData?.summary?.improvement !== undefined"
        class="mt-1 flex items-center gap-1"
      >
        <UIcon
          :name="
            ftpData.summary.improvement >= 0
              ? 'i-heroicons-arrow-trending-up'
              : 'i-heroicons-arrow-trending-down'
          "
          class="size-3"
          :class="ftpData.summary.improvement >= 0 ? 'text-green-500' : 'text-red-500'"
        />
        <span
          class="text-[10px] font-bold uppercase tracking-tighter"
          :class="ftpData.summary.improvement >= 0 ? 'text-green-600' : 'text-red-600'"
        >
          {{ ftpData.summary.improvement > 0 ? '+' : '' }}{{ ftpData.summary.improvement }}%
          vs start
        </span>
      </div>
    </div>

    <!-- Fitness (CTL) Card -->
    <div
      class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 sm:p-4 border border-purple-100 dark:border-purple-800/50"
    >
      <div class="flex items-center justify-between mb-1">
        <span
          class="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400"
          >Fitness (CTL)</span
        >
        <UIcon name="i-heroicons-sparkles" class="size-3.5 text-purple-500" />
      </div>
      <div class="flex items-baseline gap-1">
        <div class="text-2xl font-black text-purple-900 dark:text-purple-100 tracking-tight">
          <USkeleton v-if="loadingPMC" class="h-8 w-12" />
          <template v-else>{{ pmcData?.summary?.currentCTL?.toFixed(0) || '-' }}</template>
        </div>
        <span v-if="!loadingPMC" class="text-xs font-black text-purple-500 uppercase"
          >CTL</span
        >
      </div>
      <div v-if="!loadingPMC && ctlChange !== 0" class="mt-1 flex items-center gap-1">
        <UIcon
          :name="
            ctlChange > 0
              ? 'i-heroicons-arrow-trending-up'
              : 'i-heroicons-arrow-trending-down'
          "
          class="size-3"
          :class="ctlChange > 0 ? 'text-green-500' : 'text-red-500'"
        />
        <span
          class="text-[10px] font-bold uppercase tracking-tighter"
          :class="ctlChange > 0 ? 'text-green-600' : 'text-red-600'"
        >
          {{ ctlChange > 0 ? '+' : '' }}{{ ctlChange.toFixed(1) }} CTL change
        </span>
      </div>
    </div>

    <!-- Weekly TSS Card -->
    <div
      class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 sm:p-4 border border-emerald-100 dark:border-emerald-800/50"
    >
      <div class="flex items-center justify-between mb-1">
        <span
          class="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
          >Weekly TSS</span
        >
        <UIcon name="i-heroicons-chart-bar" class="size-3.5 text-emerald-500" />
      </div>
      <div class="flex items-baseline gap-1">
        <div
          class="text-2xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight"
        >
          <USkeleton v-if="loadingZones" class="h-8 w-12" />
          <template v-else>{{ Math.round(currentWeekTss) }}</template>
        </div>
        <span v-if="!loadingZones" class="text-xs font-black text-emerald-500 uppercase"
          >/ {{ Math.round(avgWeeklyTss) }}</span
        >
      </div>
      <div
        v-if="!loadingZones"
        class="mt-1 text-[10px] font-bold uppercase tracking-tighter text-emerald-600"
      >
        Avg: {{ Math.round(avgWeeklyTss) }} TSS/wk
      </div>
    </div>

    <!-- HRV Avg Card -->
    <div
      class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 sm:p-4 border border-amber-100 dark:border-amber-800/50"
    >
      <div class="flex items-center justify-between mb-1">
        <span
          class="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400"
          >HRV Avg</span
        >
        <UIcon name="i-heroicons-heart" class="size-3.5 text-amber-500" />
      </div>
      <div class="flex items-baseline gap-1">
        <div class="text-2xl font-black text-amber-900 dark:text-amber-100 tracking-tight">
          <USkeleton v-if="loading" class="h-8 w-12" />
          <template v-else>{{ avgHRV !== null ? avgHRV.toFixed(0) : '-' }}</template>
        </div>
        <span v-if="!loading" class="text-xs font-black text-amber-500 uppercase">ms</span>
      </div>
      <div v-if="!loading && hrvTrend !== 0" class="mt-1 flex items-center gap-1">
        <UIcon
          :name="
            hrvTrend > 0 ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'
          "
          class="size-3"
          :class="hrvTrend > 0 ? 'text-green-500' : 'text-red-500'"
        />
        <span
          class="text-[10px] font-bold uppercase tracking-tighter"
          :class="hrvTrend > 0 ? 'text-green-600' : 'text-red-600'"
        >
          {{ hrvTrend > 0 ? '+' : '' }}{{ hrvTrend.toFixed(1) }}% vs baseline
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    loadingFTP: boolean
    ftpData: any
    loadingPMC: boolean
    pmcData: any
    ctlChange: number
    loadingZones: boolean
    currentWeekTss: number
    avgWeeklyTss: number
    loading: boolean
    avgHRV: number | null
    hrvTrend: number
  }>()
</script>
