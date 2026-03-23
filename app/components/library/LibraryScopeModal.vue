<template>
  <UModal v-model:open="isOpen" :title="title" :description="description">
    <template #body>
      <div class="space-y-4 p-4">
        <div v-if="isCoachingMode" class="space-y-1">
          <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
            Library source
          </div>
          <USelectMenu
            :model-value="source"
            value-key="value"
            :items="sourceOptions"
            @update:model-value="$emit('update:source', $event)"
          />
        </div>

        <div v-if="source !== 'all'" class="space-y-1">
          <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
            Folder scope
          </div>
          <WorkoutFolderSelector
            v-if="mode === 'workout'"
            :tree="folderTree"
            :counts="folderCounts"
            :selected-scope="selectedScope"
            :expanded-set="expandedSet"
            @select-scope="onSelectScope"
            @toggle-folder="$emit('toggle-folder', $event)"
          />
          <TrainingPlanFolderSelector
            v-else
            :tree="folderTree"
            :counts="folderCounts"
            :selected-scope="selectedScope"
            :expanded-set="expandedSet"
            @select-scope="onSelectScope"
            @toggle-folder="$emit('toggle-folder', $event)"
          />
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">Close</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import WorkoutFolderSelector from '~/components/workouts/library/WorkoutFolderSelector.vue'
  import TrainingPlanFolderSelector from '~/components/plans/library/TrainingPlanFolderSelector.vue'

  const props = defineProps<{
    mode: 'workout' | 'plan'
    title?: string
    description?: string
    source: string
    sourceOptions: any[]
    isCoachingMode: boolean
    folderTree: any[]
    folderCounts: { total: number; unfiled: number }
    selectedScope: string
    expandedSet: Set<string>
  }>()

  const emit = defineEmits<{
    'update:source': [value: string]
    'select-scope': [scope: string]
    'toggle-folder': [folderId: string]
  }>()

  const isOpen = defineModel<boolean>('open', { default: false })

  function onSelectScope(scope: string) {
    emit('select-scope', scope)
  }
</script>
