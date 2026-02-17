<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ title }} Settings
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="space-y-6">
          <!-- Common Settings -->
          <div class="space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">Visuals</h4>
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Chart Type</div>
              <USelect
                v-model="settings.type"
                :items="chartTypeOptions"
                size="sm"
                class="w-32"
                color="neutral"
                variant="outline"
              />
            </div>
          </div>

          <!-- Metric Specific Settings (Future Expansion) -->
          <div v-if="metricKey === 'recovery'" class="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">Recovery Specific</h4>
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Show 7d Average</div>
                <div class="text-xs text-muted">Overlay a trend line for better context.</div>
              </div>
              <USwitch v-model="settings.showAverage" />
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="primary" @click="isOpen = false"> Done </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { useDebounceFn } from '@vueuse/core'

  const props = defineProps<{
    metricKey: string
    title: string
  }>()

  const isOpen = defineModel<boolean>('open', { default: false })
  const userStore = useUserStore()

  // Default structure for a single chart's settings
  const defaultSettings = {
    type: props.metricKey === 'sleep' ? 'bar' : 'line',
    showAverage: false
  }

  // Local state for the specific metric's settings
  const settings = ref(
    JSON.parse(
      JSON.stringify(userStore.user?.dashboardSettings?.fitnessCharts?.[props.metricKey] || defaultSettings)
    )
  )

  // Sync with store when modal opens
  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        settings.value = JSON.parse(
          JSON.stringify(userStore.user?.dashboardSettings?.fitnessCharts?.[props.metricKey] || defaultSettings)
        )
      }
    }
  )

  // Auto-save changes
  const saveSettings = useDebounceFn(async () => {
    const currentFitnessCharts = userStore.user?.dashboardSettings?.fitnessCharts || {}
    const currentDashboardSettings = userStore.user?.dashboardSettings || {}

    await userStore.updateDashboardSettings({
      ...currentDashboardSettings,
      fitnessCharts: {
        ...currentFitnessCharts,
        [props.metricKey]: {
          ...currentFitnessCharts[props.metricKey],
          ...settings.value
        }
      }
    })
  }, 500)

  watch(
    settings,
    () => {
      saveSettings()
    },
    { deep: true }
  )

  const chartTypeOptions = [
    { label: 'Line Chart', value: 'line' },
    { label: 'Bar Chart', value: 'bar' }
  ]
</script>
