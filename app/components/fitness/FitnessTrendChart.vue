<template>
  <UCard
    v-if="settings.visible !== false"
    :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
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
    
    <div v-if="loading" class="h-[300px] flex items-center justify-center">
      <USkeleton class="h-full w-full" />
    </div>
    <div v-else class="h-[300px]">
      <ClientOnly>
        <component
          :is="settings.type === 'bar' ? Bar : Line"
          :key="`chart-${metricKey}-${settings.type}`"
          :data="data"
          :options="options"
          :height="300"
        />
      </ClientOnly>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { Line, Bar } from 'vue-chartjs'

  defineProps<{
    metricKey: string
    title: string
    loading: boolean
    data: any
    options: any
    settings: any
  }>()

  defineEmits(['settings'])
</script>
