<template>
  <UModal
    v-model:open="isOpen"
    title="Monthly Progress Settings"
    description="Customize your monthly training progress visualization and targets."
  >
    <template #content>
      <UCard :ui="{ body: 'p-0 sm:p-6' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Customize Monthly Progress
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="p-4 sm:p-0 space-y-6 overflow-y-auto max-h-[70vh]">
          <p class="text-sm text-muted">
            Configure how your monthly training data is visualized and set goals.
          </p>

          <!-- Display Toggles -->
          <div class="space-y-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-gray-500">Visual Options</h4>
            <div
              class="border rounded-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800"
            >
              <div class="flex items-center justify-between p-3">
                <div class="flex flex-col">
                  <span class="text-sm font-medium">Smooth Lines</span>
                  <span class="text-[10px] text-muted font-mono"
                    >Use curved interpolation for the chart</span
                  >
                </div>
                <USwitch v-model="settings.smooth" />
              </div>
              <div class="flex items-center justify-between p-3">
                <div class="flex flex-col">
                  <span class="text-sm font-medium">Show Last Month</span>
                  <span class="text-[10px] text-muted font-mono"
                    >Show the comparison ghost line</span
                  >
                </div>
                <USwitch v-model="settings.showComparison" />
              </div>
              <div class="flex items-center justify-between p-3">
                <div class="flex flex-col">
                  <span class="text-sm font-medium">Show Planned Training</span>
                  <span class="text-[10px] text-muted font-mono"
                    >Show scheduled workouts for this month</span
                  >
                </div>
                <USwitch v-model="settings.showPlanned" />
              </div>
              <div class="flex items-center justify-between p-3">
                <div class="flex flex-col">
                  <span class="text-sm font-medium">Show Projection</span>
                  <span class="text-[10px] text-muted font-mono"
                    >Predict month-end based on current rate</span
                  >
                </div>
                <USwitch v-model="settings.showProjection" />
              </div>
              <div class="flex items-center justify-between p-3">
                <div class="flex flex-col">
                  <span class="text-sm font-medium">Show Summary Footer</span>
                  <span class="text-[10px] text-muted font-mono"
                    >Display monthly stats at the bottom</span
                  >
                </div>
                <USwitch v-model="settings.showFooter" />
              </div>
            </div>
          </div>

          <!-- Monthly Targets -->
          <div class="space-y-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-gray-500">
              Monthly Targets
            </h4>
            <div
              class="space-y-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-800"
            >
              <UFormField label="TSS Target (pts)">
                <UInput
                  v-model.number="settings.targets.tss"
                  type="number"
                  placeholder="e.g. 1500"
                />
              </UFormField>
              <UFormField label="Distance Target (km)">
                <UInput
                  v-model.number="settings.targets.distance"
                  type="number"
                  placeholder="e.g. 500"
                />
              </UFormField>
              <UFormField label="Duration Target (hours)">
                <UInput
                  v-model.number="settings.targets.duration"
                  type="number"
                  placeholder="e.g. 40"
                />
              </UFormField>
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
    smooth: true,
    showComparison: true,
    showFooter: true,
    showProjection: false,
    showPlanned: false,
    targets: {
      tss: null,
      distance: null,
      duration: null
    }
  }

  // Local state for the form, initialized from store
  const settings = ref(JSON.parse(JSON.stringify(defaultSettings)))

  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        const stored = userStore.user?.dashboardSettings?.monthlyComparison
        if (stored) {
          settings.value = {
            ...defaultSettings,
            ...stored,
            targets: { ...defaultSettings.targets, ...(stored.targets || {}) }
          }
        }
      }
    },
    { immediate: true }
  )

  // Auto-save changes
  const saveSettings = useDebounceFn(async () => {
    const currentDashboardSettings = userStore.user?.dashboardSettings || {}
    const currentCompSettings = currentDashboardSettings.monthlyComparison || {}

    await userStore.updateDashboardSettings({
      ...currentDashboardSettings,
      monthlyComparison: {
        ...currentCompSettings,
        ...settings.value
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

  function resetDefaults() {
    settings.value = JSON.parse(JSON.stringify(defaultSettings))
  }
</script>
