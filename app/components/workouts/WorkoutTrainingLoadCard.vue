<template>
  <UCard
    :ui="{
      root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
      body: 'p-4 sm:p-6'
    }"
  >
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Training Load (30d)
        </h3>
        <div class="flex items-center gap-2">
          <div
            class="rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-[10px] font-bold text-gray-600 dark:text-gray-300"
          >
            {{ stats.current }} load
          </div>
          <div
            class="rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-[10px] font-bold text-gray-600 dark:text-gray-300"
          >
            {{ stats.deltaLabel }}
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
    <div v-if="loading" class="h-[200px] flex items-center justify-center">
      <USkeleton class="h-full w-full" />
    </div>
    <div v-else class="h-[200px]">
      <ClientOnly>
        <component
          :is="settings?.type === 'line' ? Line : Bar"
          :key="`training-load-${settings?.type}-${settings?.yScale}`"
          :data="chartData"
          :options="chartOptions"
          :plugins="[ChartDataLabels]"
          :height="200"
        />
      </ClientOnly>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { Bar, Line } from 'vue-chartjs'
  import ChartDataLabels from 'chartjs-plugin-datalabels'

  const props = defineProps<{
    loading: boolean
    chartData: any
    chartOptions: any
    settings: any
    stats: {
      current: number
      deltaLabel: string
    }
  }>()

  defineEmits(['settings'])
</script>
