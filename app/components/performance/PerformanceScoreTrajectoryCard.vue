<template>
  <UCard
    :ui="{
      root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
      body: 'p-4 sm:p-6'
    }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
          {{ title }}
        </h3>
        <UButton
          icon="i-heroicons-cog-6-tooth"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="$emit('settings')"
        />
      </div>
    </template>
    <div class="h-[300px]">
      <ClientOnly>
        <TrendChart :data="data" :type="type" :settings="settings" :plugins="[ChartDataLabels]" />
      </ClientOnly>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import TrendChart from '~/components/TrendChart.vue'
  import ChartDataLabels from 'chartjs-plugin-datalabels'

  defineProps<{
    title: string
    data: any[]
    type: 'workout' | 'nutrition'
    settings: any
  }>()

  defineEmits(['settings'])
</script>
