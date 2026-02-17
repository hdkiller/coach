<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Pro HRV & RHR Settings
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="space-y-6 max-h-[70vh] overflow-y-auto p-1">
          <!-- Baseline Calculations -->
          <div class="space-y-4">
            <h4 class="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-widest text-primary-500">Baseline & Logic</h4>
            
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Baseline Window</div>
                <div class="text-xs text-muted">Days used for "Normal" calculation.</div>
              </div>
              <USelect
                v-model.number="settings.baselineDays"
                :items="[
                  { label: '7 Days', value: 7 },
                  { label: '14 Days', value: 14 },
                  { label: '30 Days', value: 30 },
                  { label: '42 Days', value: 42 }
                ]"
                size="sm"
                class="w-28"
              />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Normal Range Width</div>
                <span class="text-xs font-bold text-primary-500">{{ settings.stdDevMultiplier }}x σ</span>
              </div>
              <USlider
                :model-value="settings.stdDevMultiplier * 10"
                :min="5"
                :max="20"
                :step="1"
                size="sm"
                @update:model-value="val => settings.stdDevMultiplier = Array.isArray(val) ? val[0] / 10 : val / 10"
              />
            </div>
          </div>

          <USeparator />

          <!-- Visualization -->
          <div class="space-y-4">
            <h4 class="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-widest text-primary-500">Visualization</h4>
            
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Chart Type</div>
              <USelect
                v-model="settings.type"
                :items="[
                  { label: 'Line Chart', value: 'line' },
                  { label: 'Bar Chart', value: 'bar' }
                ]"
                size="sm"
                class="w-32"
              />
            </div>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Y-Axis Scaling</div>
              <USelect
                v-model="settings.yScale"
                :items="[
                  { label: 'Dynamic (Zoom)', value: 'dynamic' },
                  { label: 'Fixed (Custom Min)', value: 'fixed' }
                ]"
                size="sm"
                class="w-32"
              />
            </div>

            <div v-if="settings.yScale === 'fixed'" class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-gray-900 dark:text-white">HRV Axis Min</div>
                <span class="text-xs font-bold text-primary-500">{{ settings.hrvMin }}ms</span>
              </div>
              <USlider
                v-model="settings.hrvMin"
                :min="0"
                :max="100"
                :step="5"
                size="sm"
              />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Inverse RHR Axis</div>
                <div class="text-xs text-muted">Flip RHR so "Up" is "Better".</div>
              </div>
              <USwitch v-model="settings.inverseRhr" />
            </div>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Line Smoothing</div>
              <USwitch v-model="settings.smooth" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Show Sleep Correlation</div>
                <div class="text-xs text-muted">Show sleep hours as background bars.</div>
              </div>
              <USwitch v-model="settings.showSleepBars" />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Area Opacity</div>
                <span class="text-xs text-muted">{{ Math.round((settings.opacity || 0) * 100) }}%</span>
              </div>
              <USlider
                :model-value="(settings.opacity || 0) * 100"
                :min="0"
                :max="50"
                :step="1"
                size="sm"
                @update:model-value="val => settings.opacity = Array.isArray(val) ? val[0] / 100 : val / 100"
              />
            </div>
          </div>

          <USeparator />

          <!-- Overlays -->
          <div class="space-y-4">
            <h4 class="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-widest text-primary-500">Contextual Overlays</h4>
            <div class="grid grid-cols-2 gap-3">
              <UCheckbox v-model="settings.showAlcohol" label="Alcohol" />
              <UCheckbox v-model="settings.showStrain" label="High Strain" />
              <UCheckbox v-model="settings.showIllness" label="Sickness" />
              <UCheckbox v-model="settings.showSleep" label="Poor Sleep" />
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="resetDefaults">Reset</UButton>
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
    baselineDays: 30,
    stdDevMultiplier: 1.0,
    yScale: 'dynamic',
    hrvMin: 0,
    inverseRhr: false,
    smooth: true,
    showSleepBars: false,
    showBand: true,
    opacity: 0.15,
    showAlcohol: true,
    showStrain: true,
    showIllness: true,
    showSleep: true
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

  function resetDefaults() {
    settings.value = { ...defaultSettings }
  }

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
</script>
