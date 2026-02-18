<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Chart Settings
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
          <!-- Visuals -->
          <div class="space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">Visuals</h4>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Smooth Wave</div>
              <USwitch v-model="settings.smooth" />
            </div>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                Show Event Markers
              </div>
              <USwitch v-model="settings.showMarkers" />
            </div>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Show "Now" Line</div>
              <USwitch v-model="settings.showNowLine" />
            </div>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                Show Predicted Path
              </div>
              <USwitch v-model="settings.showProjected" />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Fill Opacity</div>
                <span class="text-xs text-muted"
                  >{{ Math.round((settings.opacity || 0) * 100) }}%</span
                >
              </div>
              <USlider
                :model-value="(settings.opacity || 0) * 100"
                :min="0"
                :max="100"
                :step="1"
                size="sm"
                @update:model-value="
                  (val) => {
                    if (val !== undefined)
                      settings.opacity = Array.isArray(val) ? val[0] / 100 : val / 100
                  }
                "
              />
            </div>
          </div>

          <!-- Scaling -->
          <div class="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">Scaling</h4>
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Y-Axis Scaling</div>
                <div class="text-xs text-muted">Fixed or Dynamic Zoom based on data range.</div>
              </div>
              <USelect
                v-model="settings.yScale"
                :items="[
                  { label: 'Fixed', value: 'fixed' },
                  { label: 'Dynamic', value: 'dynamic' }
                ]"
                size="sm"
                class="w-32"
                color="neutral"
                variant="outline"
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

  // Default structure for nutrition detail settings
  const defaultSettings = {
    smooth: true,
    opacity: 0.1,
    showMarkers: true,
    showNowLine: true,
    showProjected: true,
    yScale: 'fixed'
  }

  // Local state
  const settings = ref({
    ...defaultSettings,
    ...(userStore.user?.dashboardSettings?.nutritionCharts?.detail || {})
  })

  // Sync with store when modal opens
  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        settings.value = {
          ...defaultSettings,
          ...(userStore.user?.dashboardSettings?.nutritionCharts?.detail || {})
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
        detail: {
          ...currentNutritionCharts.detail,
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
