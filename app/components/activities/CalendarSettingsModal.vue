<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Customize Activity Calendar
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
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">Visual Elements</h4>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Metabolic Horizon
                </div>
                <div class="text-xs text-muted">Show the weekly energy availability wave.</div>
              </div>
              <USwitch v-model="settings.showMetabolicWave" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Fuel State Dot</div>
                <div class="text-xs text-muted">
                  Show the color-coded daily fuel state indicator.
                </div>
              </div>
              <USwitch v-model="settings.showFuelState" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Week Separator</div>
                <div class="text-xs text-muted">Add visual space between calendar weeks.</div>
              </div>
              <USwitch v-model="settings.showWeekSeparator" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Time-Aligned Layout
                </div>
                <div class="text-xs text-muted">
                  Position activities based on time of day (Morning/Eve).
                </div>
              </div>
              <USwitch v-model="settings.alignActivitiesByTime" />
            </div>
          </div>

          <div class="border-t border-gray-200 dark:border-gray-800" />

          <div class="space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">Cell Information</h4>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Wellness Metrics</div>
              <USwitch v-model="settings.showWellness" />
            </div>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Nutrition Summary</div>
              <USwitch v-model="settings.showNutrition" />
            </div>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                Training Stress (TSB)
              </div>
              <USwitch v-model="settings.showTrainingStress" />
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
    showMetabolicWave: false,
    showFuelState: true,
    showWeekSeparator: true,
    alignActivitiesByTime: false,
    showWellness: true,
    showNutrition: true,
    showTrainingStress: true
  }

  // Local state for the form, initialized from store
  const settings = ref(
    JSON.parse(
      JSON.stringify(userStore.user?.dashboardSettings?.activityCalendar || defaultSettings)
    )
  )

  // Update local state when modal opens or user store changes
  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        settings.value = JSON.parse(
          JSON.stringify(userStore.user?.dashboardSettings?.activityCalendar || defaultSettings)
        )
      }
    }
  )

  // Auto-save changes
  const saveSettings = useDebounceFn(async () => {
    // Merge with existing dashboard settings to avoid overwriting other widgets
    const currentDashboardSettings = userStore.user?.dashboardSettings || {}

    await userStore.updateDashboardSettings({
      ...currentDashboardSettings,
      activityCalendar: settings.value
    })
  }, 500)

  watch(
    settings,
    () => {
      saveSettings()
    },
    { deep: true }
  )

  function resetDefaults() {
    settings.value = JSON.parse(JSON.stringify(defaultSettings))
  }
</script>
