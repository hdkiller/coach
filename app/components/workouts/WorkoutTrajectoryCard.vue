<template>
  <UCard
    :ui="{
      root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
      body: 'p-4 sm:p-6'
    }"
  >
    <template #header>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
            Performance Trajectory
          </h3>
          <p class="text-[10px] text-gray-500 uppercase font-medium mt-0.5">
            30-day cross-metric integrity trend
          </p>
        </div>
        <UButton
          icon="i-heroicons-cog-6-tooth"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="$emit('settings')"
        />
      </div>
    </template>

    <div v-if="loading" class="h-[300px] flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="size-8 animate-spin text-primary-500" />
    </div>
    <div v-else class="h-[300px]">
      <ClientOnly>
        <TrendChart :data="data" type="workout" :settings="settings" :plugins="[ChartDataLabels]" />
      </ClientOnly>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import TrendChart from '~/components/TrendChart.vue'
  import ChartDataLabels from 'chartjs-plugin-datalabels'

  defineProps<{
    loading: boolean
    data: any[]
    settings: any
  }>()

  defineEmits(['settings'])
</script>
