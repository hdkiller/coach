<template>
  <UCard
    :ui="{
      root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
      body: 'p-4'
    }"
  >
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-chart-pie" class="size-4 text-emerald-500" />
          <h3 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Volume Distribution
          </h3>
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
    <div v-if="loading" class="h-[200px] flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="size-6 animate-spin text-gray-400" />
    </div>
    <div v-else class="h-[200px] flex justify-center">
      <ClientOnly>
        <Doughnut
          :key="`distribution-${settings?.showLabels}`"
          :data="chartData"
          :options="chartOptions"
          :plugins="plugins"
          :height="200"
        />
      </ClientOnly>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { Doughnut } from 'vue-chartjs'

  defineProps<{
    loading: boolean
    chartData: any
    chartOptions: any
    settings: any
    plugins: any[]
  }>()

  defineEmits(['settings'])
</script>
