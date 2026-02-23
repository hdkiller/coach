<template>
  <UModal v-model:open="isOpen" title="Dialog" description="Dialog content and actions.">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Manage Performance Sections
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
            Select which sections you want to display on your performance dashboard.
          </p>
          <div class="space-y-4">
            <div
              v-for="section in sectionOptions"
              :key="section.key"
              class="flex items-center justify-between"
            >
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ section.label }}
              </div>
              <USwitch v-model="settings[section.key].visible" />
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
    highlights: { visible: true },
    athleteProfile: { visible: true },
    pmc: { visible: true },
    powerCurve: { visible: true },
    efficiency: { visible: true },
    ftp: { visible: true },
    distribution: { visible: true },
    workoutScores: { visible: true },
    nutritionScores: { visible: true }
  }

  const settings = ref(
    Object.keys(defaultSettings).reduce((acc, key) => {
      acc[key] = {
        ...defaultSettings[key as keyof typeof defaultSettings],
        ...(userStore.user?.dashboardSettings?.performanceSections?.[key] || {})
      }
      return acc
    }, {} as any)
  )

  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        settings.value = Object.keys(defaultSettings).reduce((acc, key) => {
          acc[key] = {
            ...defaultSettings[key as keyof typeof defaultSettings],
            ...(userStore.user?.dashboardSettings?.performanceSections?.[key] || {})
          }
          return acc
        }, {} as any)
      }
    }
  )

  const saveSettings = useDebounceFn(async () => {
    const currentDashboardSettings = userStore.user?.dashboardSettings || {}
    await userStore.updateDashboardSettings({
      ...currentDashboardSettings,
      performanceSections: settings.value
    })
  }, 500)

  watch(
    settings,
    () => {
      saveSettings()
    },
    { deep: true }
  )

  const sectionOptions = [
    { key: 'highlights', label: 'Activity Highlights' },
    { key: 'athleteProfile', label: 'Athlete Profile' },
    { key: 'pmc', label: 'Fitness & Readiness (PMC)' },
    { key: 'powerCurve', label: 'Power Duration Curve' },
    { key: 'efficiency', label: 'Aerobic Efficiency' },
    { key: 'ftp', label: 'FTP Evolution' },
    { key: 'distribution', label: 'Intensity Distribution' },
    { key: 'workoutScores', label: 'Workout Performance' },
    { key: 'nutritionScores', label: 'Nutrition Quality' }
  ] as const

  function resetDefaults() {
    settings.value = JSON.parse(JSON.stringify(defaultSettings))
  }
</script>
