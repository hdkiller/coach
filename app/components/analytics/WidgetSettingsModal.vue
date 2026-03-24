<script setup lang="ts">
  const props = defineProps<{
    modelValue: boolean
    config: any
  }>()

  const emit = defineEmits(['update:modelValue', 'update:config'])

  const isOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  function buildSettings(settings?: Record<string, any>) {
    return {
      smooth: true,
      yScale: 'dynamic',
      yMin: 0,
      showPoints: false,
      showDelta: false,
      showRegression: false,
      opacity: 0.4,
      ...(settings || {})
    }
  }

  function settingsEqual(a: Record<string, any>, b: Record<string, any>) {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  const visualType = computed({
    get: () => props.config.visualType,
    set: (value) => {
      if (value === props.config.visualType) return
      emit('update:config', {
        ...props.config,
        visualType: value
      })
    }
  })

  const settings = ref(buildSettings(props.config.settings))
  const syncingFromProps = ref(false)

  watch(
    () => props.config.settings,
    (newSettings) => {
      const normalized = buildSettings(newSettings)
      if (settingsEqual(settings.value, normalized)) return
      syncingFromProps.value = true
      settings.value = normalized
      nextTick(() => {
        syncingFromProps.value = false
      })
    },
    { deep: true }
  )

  watch(
    settings,
    (newSettings) => {
      if (syncingFromProps.value) return
      if (settingsEqual(buildSettings(props.config.settings), newSettings)) return
      emit('update:config', {
        ...props.config,
        settings: { ...newSettings }
      })
    },
    { deep: true }
  )

  const chartTypeOptions = [
    { label: 'Line Chart', value: 'line' },
    { label: 'Bar Chart', value: 'bar' },
    { label: 'Stacked Bar', value: 'stackedBar' }
  ]
</script>

<template>
  <UModal v-model:open="isOpen" title="Chart Settings">
    <template #body>
      <div class="space-y-6">
        <!-- Visuals -->
        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-neutral-400 italic">
            Visuals
          </h4>

          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">Chart Type</div>
            <USelect
              v-model="visualType"
              :items="chartTypeOptions"
              size="sm"
              class="w-36"
              color="neutral"
              variant="outline"
            />
          </div>

          <div v-if="visualType === 'line'" class="flex items-center justify-between">
            <div class="text-sm font-medium">Smoothing</div>
            <USwitch v-model="settings.smooth" />
          </div>

          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">Show Points</div>
            <USwitch v-model="settings.showPoints" />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">Fill Opacity</div>
              <span class="text-xs font-bold text-primary-500"
                >{{ Math.round(settings.opacity * 100) }}%</span
              >
            </div>
            <USlider v-model="settings.opacity" :min="0" :max="1" :step="0.1" size="sm" />
          </div>
        </div>

        <!-- Scaling -->
        <div class="border-t border-default pt-6 space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-neutral-400 italic">
            Scaling
          </h4>

          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">Y-Axis Scaling</div>
            <USelect
              v-model="settings.yScale"
              :items="[
                { label: 'Dynamic (Zoom)', value: 'dynamic' },
                { label: 'Fixed (Custom Min)', value: 'fixed' }
              ]"
              size="sm"
              class="w-40"
              color="neutral"
              variant="outline"
            />
          </div>

          <div v-if="settings.yScale === 'fixed'" class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Axis Minimum</div>
              <UInput v-model.number="settings.yMin" type="number" size="sm" class="w-24" />
            </div>
          </div>
        </div>

        <!-- Advanced Analysis -->
        <div class="border-t border-default pt-6 space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-neutral-400 italic">
            Advanced Analysis
          </h4>

          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-sm font-medium">Comparison Delta</div>
              <div class="text-[10px] text-muted leading-tight">
                Show the difference (A-B) between the first two series.
              </div>
            </div>
            <USwitch v-model="settings.showDelta" />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-sm font-medium">Trend Analysis</div>
              <div class="text-[10px] text-muted leading-tight">
                Overlay a linear regression (best fit) trendline.
              </div>
            </div>
            <USwitch v-model="settings.showRegression" />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton
        label="Done"
        color="primary"
        variant="solid"
        class="font-bold uppercase tracking-widest px-6"
        @click="isOpen = false"
      />
    </template>
  </UModal>
</template>
