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
          Functional Threshold Evolution
        </h2>
        <div class="flex gap-2">
          <USelect
            v-model="sport"
            :items="sportOptions"
            class="w-32 sm:w-36"
            size="xs"
            color="neutral"
            variant="outline"
          />
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

    <FTPEvolutionChart :months="period" :sport="sport" :settings="settings" />
  </UCard>
</template>

<script setup lang="ts">
  import FTPEvolutionChart from '~/components/FTPEvolutionChart.vue'

  defineProps<{
    settings: any
    sportOptions: any[]
    periodOptions: any[]
  }>()

  const sport = defineModel<string>('sport')
  const period = defineModel<number | string>('period')

  defineEmits(['settings'])
</script>
