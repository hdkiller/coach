<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Timeline Settings
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
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">Display Options</h4>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Hide Empty Windows
                </div>
                <div class="text-xs text-muted">Hides Daily Base windows with no logged items.</div>
              </div>
              <USwitch v-model="settings.hideEmptyWindows" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Hide Hydration Advice
                </div>
                <div class="text-xs text-muted">
                  Hide fluid and sodium targets in workout windows.
                </div>
              </div>
              <USwitch v-model="settings.hideHydration" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Hide Past Suggestions
                </div>
                <div class="text-xs text-muted">
                  Hide "Coach Suggests" for windows older than 30 mins.
                </div>
              </div>
              <USwitch v-model="settings.hidePastSuggestions" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Simplify Sessions
                </div>
                <div class="text-xs text-muted">
                  Merge overlapping or back-to-back workout windows.
                </div>
              </div>
              <USwitch v-model="settings.mergeWindows" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Show Supplements
                </div>
                <div class="text-xs text-muted">
                  Display supplement pips (Caffeine, Nitrates, etc).
                </div>
              </div>
              <USwitch v-model="settings.showSupplements" />
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

  // Default structure for timeline settings
  const defaultSettings = {
    hideEmptyWindows: false,
    hideHydration: false,
    hidePastSuggestions: true,
    showSupplements: true,
    mergeWindows: true
  }

  // Local state
  const settings = ref({
    ...defaultSettings,
    ...(userStore.user?.dashboardSettings?.nutritionCharts?.timeline || {})
  })

  // Sync with store when modal opens
  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        settings.value = {
          ...defaultSettings,
          ...(userStore.user?.dashboardSettings?.nutritionCharts?.timeline || {})
        }
      }
    }
  )

  // Auto-save changes
  const saveSettings = useDebounceFn(async () => {
    const currentNutritionCharts = userStore.user?.dashboardSettings?.nutritionCharts || {}
    const currentDashboardSettings = userStore.user?.dashboardSettings || {}

    await userStore.updateDashboardSettings({
      ...currentDashboardSettings,
      nutritionCharts: {
        ...currentNutritionCharts,
        timeline: {
          ...currentNutritionCharts.timeline,
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
</script>
