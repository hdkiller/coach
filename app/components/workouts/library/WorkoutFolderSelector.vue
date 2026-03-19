<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
        {{ title }}
      </div>
      <UButton
        v-if="allowManage"
        size="xs"
        color="primary"
        variant="soft"
        icon="i-heroicons-folder-plus"
        @click="$emit('create-folder', null)"
      >
        New Folder
      </UButton>
    </div>

    <div class="space-y-1">
      <button
        class="flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors"
        :class="
          selectedScope === 'all'
            ? 'border-primary/40 bg-primary/10 text-highlighted'
            : 'border-default/60 bg-default/70 hover:border-primary/20 hover:bg-muted/10'
        "
        @click="$emit('select-scope', 'all')"
      >
        <UIcon name="i-heroicons-squares-2x2" class="h-4 w-4 shrink-0 text-primary" />
        <span class="flex-1 text-sm font-medium">Show all</span>
        <UBadge color="neutral" variant="soft" size="xs">{{ counts.total }}</UBadge>
      </button>

      <button
        class="flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors"
        :class="
          selectedScope === 'unfiled'
            ? 'border-primary/40 bg-primary/10 text-highlighted'
            : 'border-default/60 bg-default/70 hover:border-primary/20 hover:bg-muted/10'
        "
        @click="$emit('select-scope', 'unfiled')"
        @dragover.prevent="canDropTemplates && $emit('hover-drop-scope', 'unfiled')"
        @dragleave="$emit('hover-drop-scope', null)"
        @drop.prevent="emitTemplateDrop(null)"
      >
        <UIcon name="i-heroicons-inbox-stack" class="h-4 w-4 shrink-0 text-primary" />
        <span class="flex-1 text-sm font-medium">Unfiled</span>
        <UBadge color="neutral" variant="soft" size="xs">{{ counts.unfiled }}</UBadge>
      </button>
    </div>

    <WorkoutFolderTreeBranch
      :nodes="tree"
      :selected-scope="selectedScope"
      :expanded-set="expandedSet"
      :dragged-item="draggedItem"
      :allow-manage="allowManage"
      @select-scope="$emit('select-scope', $event)"
      @toggle-folder="$emit('toggle-folder', $event)"
      @create-folder="$emit('create-folder', $event)"
      @rename-folder="$emit('rename-folder', $event)"
      @delete-folder="$emit('delete-folder', $event)"
      @move-folder="$emit('move-folder', $event)"
      @drop-templates="$emit('drop-templates', $event)"
      @drag-start="$emit('drag-start', $event)"
      @drag-end="$emit('drag-end')"
      @hover-drop-scope="$emit('hover-drop-scope', $event)"
    />
  </div>
</template>

<script setup lang="ts">
  import WorkoutFolderTreeBranch from '~/components/workouts/library/WorkoutFolderTreeBranch.vue'

  const props = defineProps<{
    title?: string
    tree: any[]
    counts: { total: number; unfiled: number }
    selectedScope: string
    expandedSet: Set<string>
    draggedItem?: { type: 'folder' | 'templates'; ids: string[] } | null
    allowManage?: boolean
  }>()

  const emit = defineEmits<{
    'select-scope': [scope: string]
    'toggle-folder': [folderId: string]
    'create-folder': [parentId: string | null]
    'rename-folder': [folder: any]
    'delete-folder': [folder: any]
    'move-folder': [payload: { folderId: string; parentId: string | null; beforeId: string | null }]
    'drop-templates': [payload: { templateIds: string[]; folderId: string | null }]
    'drag-start': [payload: { type: 'folder'; ids: string[] }]
    'drag-end': []
    'hover-drop-scope': [scope: string | null]
  }>()

  const canDropTemplates = computed(() => props.draggedItem?.type === 'templates')

  function emitTemplateDrop(folderId: string | null) {
    if (props.draggedItem?.type !== 'templates') return

    emit('drop-templates', {
      templateIds: props.draggedItem.ids,
      folderId
    })
  }
</script>
