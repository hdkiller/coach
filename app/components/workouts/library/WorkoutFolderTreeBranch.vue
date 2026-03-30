<template>
  <div class="space-y-1">
    <template v-for="node in nodes" :key="node.id">
      <div
        v-if="allowManage"
        class="h-2 rounded-md border border-dashed border-transparent transition-colors hover:border-primary/30 hover:bg-primary/5"
        :style="{ marginLeft: `${level * 14}px` }"
        @dragover.prevent
        @drop.prevent="handleDrop(node.parentId, node.id)"
      />

      <div
        class="group flex items-center gap-2 rounded-2xl border px-3 py-2 transition-colors"
        :class="
          selectedScope === node.id
            ? 'border-primary/40 bg-primary/10 text-highlighted'
            : 'border-default/60 bg-default/70 hover:border-primary/20 hover:bg-muted/10'
        "
        :style="{ marginLeft: `${level * 14}px` }"
        :draggable="allowManage"
        @dragstart="onDragStart(node.id)"
        @dragend="$emit('drag-end')"
        @dragover.prevent
        @drop.prevent.stop="handleDrop(node.id, null)"
        @dragenter.prevent="$emit('hover-drop-scope', node.id)"
        @dragleave="$emit('hover-drop-scope', null)"
      >
        <UButton
          v-if="node.children.length"
          size="xs"
          color="neutral"
          variant="ghost"
          :icon="
            expandedSet.has(node.id) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'
          "
          class="h-6 w-6 p-0"
          @click.stop="$emit('toggle-folder', node.id)"
        />
        <div v-else class="w-6" />

        <button
          class="flex min-w-0 flex-1 items-center gap-2 text-left"
          @click="$emit('select-scope', node.id)"
        >
          <UIcon name="i-heroicons-folder" class="h-4 w-4 shrink-0 text-primary" />
          <span class="truncate text-sm font-medium">{{ node.name }}</span>
          <UBadge color="neutral" variant="soft" size="xs" class="ml-auto shrink-0">
            {{ node.subtreeCount }}
          </UBadge>
        </button>

        <UDropdownMenu
          v-if="allowManage"
          :items="[
            [
              {
                label: 'Add Subfolder',
                icon: 'i-heroicons-folder-plus',
                onSelect: () => $emit('create-folder', node.id)
              }
            ],
            [
              {
                label: 'Rename',
                icon: 'i-heroicons-pencil-square',
                onSelect: () => $emit('rename-folder', node)
              }
            ],
            [
              {
                label: 'Delete',
                icon: 'i-heroicons-trash',
                color: 'error',
                onSelect: () => $emit('delete-folder', node)
              }
            ]
          ]"
          :content="{ align: 'end' }"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-ellipsis-horizontal"
            class="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </UDropdownMenu>
      </div>

      <WorkoutFolderTreeBranch
        v-if="expandedSet.has(node.id) && node.children.length"
        :nodes="node.children"
        :level="level + 1"
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
    </template>

    <div
      v-if="allowManage"
      class="h-2 rounded-md border border-dashed border-transparent transition-colors hover:border-primary/30 hover:bg-primary/5"
      :style="{ marginLeft: `${level * 14}px` }"
      @dragover.prevent
      @drop.prevent="handleDrop(parentId, null)"
    />
  </div>
</template>

<script setup lang="ts">
  defineOptions({
    name: 'WorkoutFolderTreeBranch'
  })

  const props = withDefaults(
    defineProps<{
      nodes: any[]
      level?: number
      parentId?: string | null
      selectedScope: string
      expandedSet: Set<string>
      draggedItem?: { type: 'folder' | 'templates'; ids: string[] } | null
      allowManage?: boolean
    }>(),
    {
      level: 0,
      parentId: null,
      draggedItem: null,
      allowManage: false
    }
  )

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

  function onDragStart(folderId: string) {
    if (!props.allowManage) return
    emit('drag-start', { type: 'folder', ids: [folderId] })
  }

  function emitMove(parentId: string | null | undefined, beforeId: string | null) {
    if (!props.allowManage || props.draggedItem?.type !== 'folder') return
    const draggedFolderId = props.draggedItem.ids[0]
    if (!draggedFolderId) return
    if (beforeId === draggedFolderId) return
    if (parentId === draggedFolderId) return

    emit('move-folder', {
      folderId: draggedFolderId,
      parentId: parentId ?? null,
      beforeId
    })
  }

  function handleDrop(parentId: string | null | undefined, beforeId: string | null) {
    if (props.draggedItem?.type === 'folder') {
      emitMove(parentId, beforeId)
      return
    }

    if (props.draggedItem?.type === 'templates') {
      emit('drop-templates', {
        templateIds: props.draggedItem.ids,
        folderId: parentId ?? null
      })
    }
  }
</script>
