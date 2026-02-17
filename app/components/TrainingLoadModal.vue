<template>
  <UModal
    v-model:open="isOpen"
    title="Training Load & Form"
    description="Track your Fitness (CTL), Fatigue (ATL), and Form (TSB) over the selected period."
    class="sm:max-w-4xl"
  >
    <template #body>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Track your Fitness (CTL), Fatigue (ATL), and Form (TSB) over the last 90 days.
          </p>
          <USelect v-model="selectedPeriod" :items="periodOptions" size="xs" class="w-32 sm:w-36" />
        </div>

        <!-- PMC Chart -->
        <PMCChart :days="selectedPeriod" />

        <!-- Actions -->
        <div class="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <UButton
            to="/performance"
            color="primary"
            variant="solid"
            icon="i-heroicons-chart-bar"
            trailing
          >
            View Full Performance Analytics
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
  }>()

  const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
  })

  const selectedPeriod = ref<number | string>(90)
  const periodOptions = [
    { label: '30 Days', value: 30 },
    { label: '60 Days', value: 60 },
    { label: '90 Days', value: 90 },
    { label: '180 Days', value: 180 },
    { label: 'Year to Date', value: 'YTD' }
  ]
</script>
