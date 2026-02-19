<template>
  <UModal v-model:open="isOpen" title="Dialog" description="Dialog content and actions.">
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

            <div v-if="settings.type === 'line'" class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Smoothing</div>
              <USwitch v-model="settings.smooth" />
            </div>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Show Points</div>
              <USwitch v-model="settings.showPoints" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Show Data Labels
                </div>
                <div class="text-xs text-muted">Show values on top of bars/points.</div>
              </div>
              <USwitch v-model="settings.showLabels" />
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

          <!-- Scaling Settings -->
          <div class="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">Scaling</h4>
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
                color="neutral"
                variant="outline"
              />
            </div>

            <div v-if="settings.yScale === 'fixed'" class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Axis Minimum</div>
                <span class="text-xs font-bold text-primary-500"
                  >{{ settings.yMin || 0 }}{{ unitLabel }}</span
                >
              </div>
              <USlider
                v-model="settings.yMin"
                :min="0"
                :max="maxSliderValue"
                :step="sliderStep"
                size="sm"
              />
            </div>
          </div>

          <!-- Target Line -->
          <div
            v-if="['weight', 'bp', 'hrv', 'restingHr'].includes(metricKey)"
            class="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-4"
          >
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">Goals & Targets</h4>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Show Target Line
                </div>
                <USwitch v-model="settings.showTarget" />
              </div>
              <div v-if="settings.showTarget" class="space-y-2">
                <div class="flex items-center gap-3">
                  <UInput
                    v-model.number="settings.targetValue"
                    type="number"
                    size="sm"
                    :placeholder="
                      metricKey === 'weight' && weightGoal?.targetValue
                        ? `Goal: ${weightGoal.targetValue}kg`
                        : 'Target value...'
                    "
                    class="w-full"
                  />
                </div>
                <p
                  v-if="metricKey === 'weight' && weightGoal && !settings.targetValue"
                  class="text-[10px] text-primary-500 font-bold uppercase tracking-wider italic"
                >
                  Automatically using your weight goal: {{ weightGoal.targetValue }}kg
                </p>
              </div>
            </div>
          </div>

          <!-- Analysis Overlays -->
          <div class="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">Analysis Overlays</h4>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  7d Rolling Average
                </div>
                <div class="text-xs text-muted">Show short-term trend.</div>
              </div>
              <USwitch v-model="settings.show7dAvg" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">30d Baseline</div>
                <div class="text-xs text-muted">Show long-term average.</div>
              </div>
              <USwitch v-model="settings.show30dAvg" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Normal Range (Std Dev)
                </div>
                <div class="text-xs text-muted">Show 30d baseline with 1σ deviation band.</div>
              </div>
              <USwitch v-model="settings.showStdDev" />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Median Line</div>
                <div class="text-xs text-muted">Identify the middle point of your data.</div>
              </div>
              <USwitch v-model="settings.showMedian" />
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
    weightGoal?: any
  }>()

  const isOpen = defineModel<boolean>('open', { default: false })
  const userStore = useUserStore()

  // Default structure for a single chart's settings
  const defaultSettings = {
    type: props.metricKey === 'sleep' ? 'bar' : 'line',
    smooth: true,
    showPoints: false,
    showLabels: false,
    opacity: 0.5,
    yScale: 'dynamic',
    yMin: 0,
    show7dAvg: false,
    show30dAvg: false,
    showStdDev: false,
    showMedian: false,
    showTarget: false,
    targetValue: undefined
  }

  // Helpers for dynamic sliders based on metric
  const unitLabel = computed(() => {
    if (props.metricKey === 'recovery') return '%'
    if (props.metricKey === 'sleep') return 'h'
    if (props.metricKey === 'hrv') return 'ms'
    if (props.metricKey === 'restingHr') return 'bpm'
    if (props.metricKey === 'weight') return 'kg'
    return ''
  })

  const maxSliderValue = computed(() => {
    if (props.metricKey === 'weight') return 150
    if (props.metricKey === 'hrv') return 120
    if (props.metricKey === 'restingHr') return 100
    if (props.metricKey === 'sleep') return 10
    return 100
  })

  const sliderStep = computed(() => {
    if (props.metricKey === 'sleep' || props.metricKey === 'weight') return 0.5
    return 1
  })

  // Local state for the specific metric's settings
  const settings = ref({
    ...defaultSettings,
    ...(userStore.user?.dashboardSettings?.fitnessCharts?.[props.metricKey] || {})
  })

  // Sync with store when modal opens
  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        settings.value = {
          ...defaultSettings,
          ...(userStore.user?.dashboardSettings?.fitnessCharts?.[props.metricKey] || {})
        }
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
