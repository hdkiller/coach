<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              HRV & RHR Dashboard Settings
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

            <div v-if="settings.type === 'line'" class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Line Smoothing</div>
              <USwitch v-model="settings.smooth" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Show Baseline Shading</div>
                <div class="text-xs text-muted">Toggle the 7d ±10% range band.</div>
              </div>
              <USwitch v-model="settings.showBand" />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Fill Opacity</div>
                <span class="text-xs text-muted">{{ Math.round((settings.opacity || 0) * 100) }}%</span>
              </div>
              <USlider
                :model-value="(settings.opacity || 0) * 100"
                :min="0"
                :max="100"
                :step="1"
                size="sm"
                @update:model-value="val => settings.opacity = Array.isArray(val) ? val[0] / 100 : val / 100"
              />
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

  const isOpen = defineModel<boolean>('open', { default: false })
  const userStore = useUserStore()

  const defaultSettings = {
    type: 'line',
    smooth: true,
    showBand: true,
    opacity: 0.15
  }

  const settings = ref({
    ...defaultSettings,
    ...(userStore.user?.dashboardSettings?.fitnessCharts?.hrvRhrDual || {})
  })

  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        settings.value = {
          ...defaultSettings,
          ...(userStore.user?.dashboardSettings?.fitnessCharts?.hrvRhrDual || {})
        }
      }
    }
  )

  const saveSettings = useDebounceFn(async () => {
    const currentFitnessCharts = userStore.user?.dashboardSettings?.fitnessCharts || {}
    const currentDashboardSettings = userStore.user?.dashboardSettings || {}

    await userStore.updateDashboardSettings({
      ...currentDashboardSettings,
      fitnessCharts: {
        ...currentFitnessCharts,
        hrvRhrDual: settings.value
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
