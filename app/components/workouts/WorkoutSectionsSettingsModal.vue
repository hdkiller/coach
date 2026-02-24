<template>
  <UModal
    v-model:open="isOpen"
    title="Customize Workout Details"
    description="Select and reorder sections shown on this workout page."
  >
    <template #content>
      <UCard :ui="{ body: 'p-0 sm:p-6' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Customize Workout Sections
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="p-4 sm:p-0 space-y-4 overflow-y-auto max-h-[70vh]">
          <p class="text-sm text-muted">Drag to reorder sections and toggle visibility.</p>

          <div
            class="border rounded-lg divide-y border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
          >
            <draggable
              v-model="items"
              item-key="key"
              handle=".drag-handle"
              :animation="200"
              ghost-class="opacity-50"
            >
              <template #item="{ element: section }">
                <div
                  class="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <UIcon
                      name="i-lucide-grip-vertical"
                      class="drag-handle w-4 h-4 text-gray-300 cursor-move"
                    />
                    <UIcon :name="section.icon" class="w-4 h-4 text-primary-500" />
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ section.label }}
                      </span>
                      <span
                        v-if="!section.available"
                        class="text-[10px] text-amber-600 dark:text-amber-400 font-mono"
                      >
                        Not available for this workout
                      </span>
                    </div>
                  </div>

                  <USwitch
                    :model-value="section.visible"
                    :disabled="section.locked"
                    @update:model-value="section.visible = Boolean($event)"
                  />
                </div>
              </template>
            </draggable>
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
  import draggable from 'vuedraggable'
  import { useDebounceFn } from '@vueuse/core'

  type WorkoutSectionOption = {
    key: string
    label: string
    icon: string
    available?: boolean
    defaultVisible?: boolean
    locked?: boolean
  }

  type WorkoutSectionState = {
    visible: boolean
    order: number
  }

  const props = withDefaults(
    defineProps<{
      sections: WorkoutSectionOption[]
      settingsKey?: string
    }>(),
    {
      settingsKey: 'workoutDetailSections'
    }
  )

  const isOpen = defineModel<boolean>('open', { default: false })
  const userStore = useUserStore()
  const items = ref<Array<WorkoutSectionOption & { visible: boolean; order: number }>>([])

  function buildDefaultMap() {
    return props.sections.reduce(
      (acc, section, index) => {
        acc[section.key] = {
          visible: section.defaultVisible !== false,
          order: index
        }
        return acc
      },
      {} as Record<string, WorkoutSectionState>
    )
  }

  function hydrateItems() {
    const defaultMap = buildDefaultMap()
    const savedMap =
      (userStore.user?.dashboardSettings?.[props.settingsKey] as
        | Record<string, WorkoutSectionState>
        | undefined) || {}

    items.value = props.sections
      .map((section, index) => {
        const merged = {
          ...defaultMap[section.key],
          ...(savedMap[section.key] || {})
        }

        return {
          ...section,
          visible: section.locked ? true : merged.visible,
          order: typeof merged.order === 'number' ? merged.order : index
        }
      })
      .sort((a, b) => a.order - b.order)
  }

  const saveSettings = useDebounceFn(async () => {
    if (!items.value.length) return

    const nextSettings = items.value.reduce(
      (acc, section, index) => {
        acc[section.key] = {
          visible: section.locked ? true : section.visible,
          order: index
        }
        return acc
      },
      {} as Record<string, WorkoutSectionState>
    )

    const currentDashboardSettings = userStore.user?.dashboardSettings || {}
    await userStore.updateDashboardSettings({
      ...currentDashboardSettings,
      [props.settingsKey]: nextSettings
    })
  }, 400)

  watch(
    () => isOpen.value,
    (open) => {
      if (open) hydrateItems()
    }
  )

  watch(
    items,
    () => {
      if (isOpen.value) saveSettings()
    },
    { deep: true }
  )

  function resetDefaults() {
    items.value = props.sections.map((section, index) => ({
      ...section,
      visible: section.defaultVisible !== false,
      order: index
    }))
  }
</script>
