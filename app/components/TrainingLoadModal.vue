<template>
  <UModal v-model:open="isOpen" class="sm:max-w-4xl" title="Training Load & Form">
    <template #header>
      <div class="flex w-full items-start justify-between gap-6">
        <div class="min-w-0">
          <div>Training Load & Form</div>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Track your Fitness (CTL), Fatigue (ATL), and Form (TSB) over the selected period.
          </p>
        </div>

        <div class="flex shrink-0 flex-col items-end gap-2">
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Close"
            class="-mr-2"
            @click="isOpen = false"
          />

          <div v-if="isGarminConnected" class="flex items-center gap-1.5 whitespace-nowrap">
            <span
              class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
            >
              Includes data from
            </span>
            <img
              src="/images/logos/Garmin-Tag-black-high-res.png"
              class="h-4 w-auto dark:hidden"
              alt="Garmin"
            />
            <img
              src="/images/logos/Garmin-Tag-white-high-res.png"
              class="hidden h-4 w-auto dark:block"
              alt="Garmin"
            />
          </div>
        </div>
      </div>
    </template>

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

  const integrationStore = useIntegrationStore()

  const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
  })
  const isGarminConnected = computed(() => {
    return (
      integrationStore.integrationStatus?.integrations?.some((i: any) => i.provider === 'garmin') ??
      false
    )
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
