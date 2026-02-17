<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Manage Fitness Charts
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
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Select which charts you want to display on your fitness dashboard.
          </p>
          <div class="space-y-4">
            <div v-for="chart in chartOptions" :key="chart.key" class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ chart.label }}
              </div>
              <USwitch v-model="settings[chart.key].visible" />
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="resetDefaults">
              Reset Defaults
            </UButton>
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
    hrvRhrDual: { type: 'line', visible: true },
    recovery: { type: 'line', visible: true },
    sleep: { type: 'bar', visible: true },
    hrv: { type: 'line', visible: true },
    restingHr: { type: 'line', visible: true },
    weight: { type: 'line', visible: true },
    bp: { type: 'line', visible: true }
  }

  // Local state for the form, initialized from store with defaults for each key
  const settings = ref(
    Object.keys(defaultSettings).reduce((acc, key) => {
      acc[key] = {
        ...defaultSettings[key as keyof typeof defaultSettings],
        ...(userStore.user?.dashboardSettings?.fitnessCharts?.[key] || {})
      }
      return acc
    }, {} as any)
  )

  // Update local state when modal opens or user store changes
  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        settings.value = Object.keys(defaultSettings).reduce((acc, key) => {
          acc[key] = {
            ...defaultSettings[key as keyof typeof defaultSettings],
            ...(userStore.user?.dashboardSettings?.fitnessCharts?.[key] || {})
          }
          return acc
        }, {} as any)
      }
    }
  )

  // Auto-save changes
  const saveSettings = useDebounceFn(async () => {
    const currentDashboardSettings = userStore.user?.dashboardSettings || {}

    await userStore.updateDashboardSettings({
      ...currentDashboardSettings,
      fitnessCharts: settings.value
    })
  }, 500)

  watch(
    settings,
    () => {
      saveSettings()
    },
    { deep: true }
  )

  const chartOptions = [
    { key: 'hrvRhrDual', label: 'HRV & RHR Correlation' },
    { key: 'recovery', label: 'Recovery Trajectory' },
    { key: 'sleep', label: 'Sleep Duration' },
    { key: 'hrv', label: 'Heart Rate Variability' },
    { key: 'restingHr', label: 'Resting Heart Rate' },
    { key: 'weight', label: 'Mass Progression' },
    { key: 'bp', label: 'Blood Pressure' }
  ] as const

  function resetDefaults() {
    settings.value = JSON.parse(JSON.stringify(defaultSettings))
  }
</script>
