<template>
  <UCard
    :ui="{
      root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
      body: 'p-4 sm:p-6'
    }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-base font-black uppercase tracking-widest text-gray-400">
          Fitness & Readiness (PMC)
        </h2>
        <div class="flex items-center gap-2">
          <USelect
            v-model="period"
            :items="periodOptions"
            class="w-32 sm:w-36"
            size="xs"
            color="neutral"
            variant="outline"
          />
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

    <PMCChart :days="period" :settings="settings" />
  </UCard>
</template>

<script setup lang="ts">
  import PMCChart from '~/components/PMCChart.vue'

  defineProps<{
    settings: any
    periodOptions: any[]
  }>()

  const period = defineModel<number | string>('period')

  defineEmits(['settings'])
</script>
