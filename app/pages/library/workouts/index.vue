<template>
  <UDashboardPanel id="workout-library">
    <template #header>
      <UDashboardNavbar title="Workouts">
        <template #right>
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            label="New Workout"
            @click="createNewTemplate"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6 px-0 py-4 sm:p-6">
        <div class="flex flex-col justify-between gap-4 px-4 md:flex-row md:items-center sm:px-0">
          <div>
            <h1 class="text-3xl font-black uppercase tracking-tight">Workouts</h1>
            <p class="text-xs font-bold text-muted uppercase tracking-[0.2em] mt-1 italic">
              Your Repository of Reusable Structured Sessions
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-folder-open"
              class="lg:hidden"
              @click="showFolderSlideover = true"
            >
              Folders
            </UButton>
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search library..."
              class="w-full md:w-64"
            />
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div class="hidden lg:block">
            <UCard :ui="{ body: 'p-4' }" class="sticky top-4 shadow-sm">
              <WorkoutFolderSelector
                title="Library"
                :tree="folderTree"
                :counts="folderCounts"
                :selected-scope="selectedScope"
                :expanded-set="expandedSet"
                :dragged-item="draggedItem"
                allow-manage
                @select-scope="setSelectedScope"
                @toggle-folder="toggleExpanded"
                @create-folder="openCreateFolder"
                @rename-folder="openRenameFolder"
                @delete-folder="openDeleteFolder"
                @move-folder="moveFolder"
                @drop-templates="dropTemplatesToFolder"
                @drag-start="draggedItem = $event"
                @drag-end="draggedItem = null"
              />
            </UCard>
          </div>

          <div class="space-y-4">
            <div
              class="flex flex-col gap-3 rounded-none border-y border-default/70 bg-muted/10 px-4 py-4 md:flex-row md:flex-wrap md:items-center sm:rounded-2xl sm:border sm:p-4"
            >
              <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <UTooltip text="All Types">
                  <UButton
                    size="xs"
                    :color="selectedType === 'all' ? 'primary' : 'neutral'"
                    :variant="selectedType === 'all' ? 'solid' : 'ghost'"
                    icon="i-heroicons-squares-2x2"
                    @click="selectedType = 'all'"
                  />
                </UTooltip>
                <UTooltip v-for="type in workoutTypes" :key="type.value" :text="type.label">
                  <UButton
                    size="xs"
                    :color="selectedType === type.value ? 'primary' : 'neutral'"
                    :variant="selectedType === type.value ? 'solid' : 'ghost'"
                    :icon="type.icon"
                    @click="selectedType = type.value"
                  />
                </UTooltip>
              </div>

              <div class="hidden h-4 w-px bg-default/70 md:block" />

              <div class="flex items-center gap-1.5">
                <UButton
                  v-for="range in durationRanges"
                  :key="range.label"
                  size="xs"
                  :color="selectedDuration === range.value ? 'primary' : 'neutral'"
                  :variant="selectedDuration === range.value ? 'solid' : 'ghost'"
                  class="text-[10px] font-bold uppercase tracking-wider px-2"
                  @click="selectedDuration = range.value"
                >
                  {{ range.label }}
                </UButton>
              </div>

              <div class="hidden h-4 w-px bg-default/70 md:block" />

              <div class="flex items-center gap-2 md:ml-auto">
                <span class="text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                  Sort
                </span>
                <USelect v-model="sortBy" :items="sortOptions" size="xs" class="min-w-[150px]" />
              </div>
            </div>

            <div
              v-if="selectedTemplateIds.length"
              class="flex flex-wrap items-center justify-between gap-3 rounded-none border-y border-primary/20 bg-primary/5 px-4 py-4 sm:rounded-2xl sm:border sm:p-4"
            >
              <div class="text-sm font-medium text-highlighted">
                {{ selectedTemplateIds.length }} workout{{
                  selectedTemplateIds.length === 1 ? '' : 's'
                }}
                selected
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  size="sm"
                  color="primary"
                  variant="soft"
                  icon="i-heroicons-folder-open"
                  @click="openMoveTemplatesModal(selectedTemplateIds)"
                >
                  Move to folder
                </UButton>
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  @click="selectedTemplateIds = []"
                >
                  Clear
                </UButton>
              </div>
            </div>

            <div
              v-if="loading && !templates?.length"
              class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              <UCard v-for="i in 6" :key="i" class="min-h-[200px]">
                <USkeleton class="mb-4 h-4 w-3/4" />
                <USkeleton class="mb-4 h-20 w-full" />
                <div class="flex justify-between">
                  <USkeleton class="h-4 w-20" />
                  <USkeleton class="h-4 w-20" />
                </div>
              </UCard>
            </div>

            <div
              v-else-if="filteredTemplates.length === 0"
              class="border-y border-dashed border-gray-200 bg-gray-50 px-4 py-20 text-center dark:border-gray-800 dark:bg-gray-900/50 sm:rounded-xl sm:border"
            >
              <UIcon name="i-heroicons-bookmark-slash" class="w-12 h-12 text-gray-300 mb-4" />
              <h3 class="text-lg font-bold">
                {{
                  templates?.length
                    ? 'No workouts match this folder or filter'
                    : 'Your library is empty'
                }}
              </h3>
              <p class="text-sm text-muted max-w-xs mx-auto mb-6">
                {{
                  templates?.length
                    ? 'Try a different folder, search, or filter combination.'
                    : 'Save any workout from your calendar or create a new session to start building your library.'
                }}
              </p>
              <UButton color="primary" variant="soft" @click="createNewTemplate">
                Create First Template
              </UButton>
            </div>

            <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <UCard
                v-for="template in filteredTemplates"
                :key="template.id"
                class="group cursor-pointer transition-all hover:border-primary/50"
                :ui="{
                  header: 'px-4 py-3 sm:px-4',
                  body: 'px-4 py-3 sm:px-4',
                  footer: 'px-4 py-2 sm:px-4'
                }"
                draggable="true"
                @click="previewTemplateId = template.id"
                @dragstart="onTemplateDragStart(template)"
                @dragend="draggedItem = null"
              >
                <template #header>
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex min-w-0 items-start gap-3">
                      <UIcon
                        :name="getWorkoutIcon(template.type)"
                        class="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      />
                      <div class="min-w-0">
                        <div class="truncate text-sm font-semibold leading-snug text-highlighted">
                          {{ template.title }}
                        </div>
                        <div class="mt-2 flex min-h-6 flex-wrap items-center gap-1.5">
                          <UBadge
                            v-if="template.folder?.name"
                            color="neutral"
                            variant="soft"
                            size="xs"
                            class="font-medium"
                          >
                            {{ template.folder.name }}
                          </UBadge>
                          <UBadge
                            v-for="tag in (template.tags || []).slice(0, 2)"
                            :key="tag"
                            color="primary"
                            variant="subtle"
                            size="xs"
                            class="font-medium"
                          >
                            {{ tag }}
                          </UBadge>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-start gap-1">
                      <UDropdownMenu
                        :items="[
                          [
                            {
                              label: 'Move to folder',
                              icon: 'i-heroicons-folder-open',
                              onSelect: () => openMoveTemplatesModal([template.id])
                            }
                          ],
                          [
                            {
                              label: 'Delete',
                              icon: 'i-heroicons-trash',
                              color: 'error',
                              onSelect: () => confirmDelete(template)
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
                          class="opacity-0 transition-opacity group-hover:opacity-100"
                          @click.stop
                        />
                      </UDropdownMenu>
                      <UCheckbox
                        :model-value="selectedTemplateIds.includes(template.id)"
                        @click.stop
                        @update:model-value="toggleTemplateSelection(template.id)"
                      />
                    </div>
                  </div>
                </template>

                <div class="space-y-2">
                  <div
                    v-if="template.structuredWorkout"
                    class="h-12 w-full px-1.5 opacity-85 transition-opacity group-hover:opacity-100"
                  >
                    <MiniWorkoutChart :workout="template" class="h-full w-full" />
                  </div>
                  <div
                    v-else
                    class="mx-1.5 flex h-12 items-center justify-center rounded-lg bg-gray-50 text-[10px] italic text-muted dark:bg-gray-900"
                  >
                    No structure defined
                  </div>
                </div>

                <template #footer>
                  <div class="flex items-center justify-between gap-3 text-xs text-muted">
                    <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                      <div class="flex items-center gap-1 whitespace-nowrap">
                        <UIcon name="i-heroicons-clock" class="h-3.5 w-3.5" />
                        {{ Math.round(template.durationSec / 60) }}m
                      </div>
                      <div
                        v-if="template.tss"
                        class="flex items-center gap-1 whitespace-nowrap text-amber-500"
                      >
                        <UIcon name="i-heroicons-bolt" class="h-3.5 w-3.5" />
                        {{ Math.round(template.tss) }} TSS
                      </div>
                      <div class="flex items-center gap-1 whitespace-nowrap">
                        <UIcon name="i-heroicons-calendar" class="h-3.5 w-3.5" />
                        {{ template.usageCount || 0 }} uses
                      </div>
                    </div>

                    <UButton
                      size="xs"
                      color="primary"
                      variant="soft"
                      icon="i-heroicons-plus"
                      class="h-7 w-7 shrink-0 rounded-full"
                      :ui="{ base: 'h-7 w-7 items-center justify-center p-0' }"
                      aria-label="Use session"
                      title="Use Session"
                      @click.stop="useTemplate(template)"
                    />
                  </div>
                </template>
              </UCard>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Editor Modal -->
  <UModal
    v-model:open="isEditorOpen"
    :title="editingTemplate?.id ? 'Edit Workout Template' : 'New Workout Template'"
    description="Define your reusable workout structure here."
  >
    <template #body>
      <div class="p-6">
        <WorkoutTemplateEditor
          :template="editingTemplate"
          @save="onTemplateSaved"
          @cancel="isEditorOpen = false"
        />
      </div>
    </template>
  </UModal>

  <!-- Delete Confirmation -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Delete Template"
    description="Are you sure you want to delete this workout template? This cannot be undone."
  >
    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">Cancel</UButton>
        <UButton color="error" :loading="deleting" @click="deleteTemplate">Delete Template</UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isFolderModalOpen"
    :title="folderModalMode === 'rename' ? 'Rename Folder' : 'New Folder'"
  >
    <template #body>
      <div class="space-y-4 p-4">
        <UFormField label="Folder Name">
          <UInput v-model="folderFormName" placeholder="Base, VO2, Race Week..." />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton color="neutral" variant="ghost" @click="isFolderModalOpen = false">Cancel</UButton>
        <UButton color="primary" :loading="savingFolder" @click="submitFolderForm">
          {{ folderModalMode === 'rename' ? 'Save' : 'Create Folder' }}
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isDeleteFolderModalOpen"
    title="Delete Folder"
    description="Child folders move up one level and workouts in this folder become Unfiled."
  >
    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton color="neutral" variant="ghost" @click="isDeleteFolderModalOpen = false"
          >Cancel</UButton
        >
        <UButton color="error" :loading="savingFolder" @click="deleteFolder">Delete Folder</UButton>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="isMoveTemplatesModalOpen" title="Move to Folder">
    <template #body>
      <div class="p-4">
        <WorkoutFolderSelector
          title="Choose Destination"
          :tree="folderTree"
          :counts="folderCounts"
          :selected-scope="moveTemplatesTargetScope"
          :expanded-set="expandedSet"
          @select-scope="moveTemplatesTargetScope = $event"
          @toggle-folder="toggleExpanded"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton color="neutral" variant="ghost" @click="isMoveTemplatesModalOpen = false"
          >Cancel</UButton
        >
        <UButton color="primary" :loading="movingTemplates" @click="moveSelectedTemplates">
          Move
        </UButton>
      </div>
    </template>
  </UModal>

  <USlideover v-model:open="showFolderSlideover" side="left" title="Folders">
    <template #body>
      <div class="p-4">
        <WorkoutFolderSelector
          title="Library"
          :tree="folderTree"
          :counts="folderCounts"
          :selected-scope="selectedScope"
          :expanded-set="expandedSet"
          :dragged-item="draggedItem"
          allow-manage
          @select-scope="selectScopeFromSlideover"
          @toggle-folder="toggleExpanded"
          @create-folder="openCreateFolder"
          @rename-folder="openRenameFolder"
          @delete-folder="openDeleteFolder"
          @move-folder="moveFolder"
          @drop-templates="dropTemplatesToFolder"
          @drag-start="draggedItem = $event"
          @drag-end="draggedItem = null"
        />
      </div>
    </template>
  </USlideover>

  <WorkoutTemplatePreviewModal v-model:template-id="previewTemplateId" @view="openPreviewDetails" />
</template>

<script setup lang="ts">
  import WorkoutFolderSelector from '~/components/workouts/library/WorkoutFolderSelector.vue'
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import WorkoutTemplateEditor from '~/components/workouts/WorkoutTemplateEditor.vue'
  import WorkoutTemplatePreviewModal from '~/components/workouts/WorkoutTemplatePreviewModal.vue'
  import { getWorkoutIcon } from '~/utils/activity-types'

  const { data: templates, refresh, status } = await useFetch<any[]>('/api/library/workouts')
  const loading = computed(() => status.value === 'pending')
  const searchQuery = ref('')
  const selectedType = ref('all')
  const selectedDuration = ref('all')
  const sortBy = ref('updated')
  const toast = useToast()

  const isEditorOpen = ref(false)
  const isDeleteModalOpen = ref(false)
  const editingTemplate = ref<any>(null)
  const deleting = ref(false)
  const selectedTemplateIds = ref<string[]>([])
  const showFolderSlideover = ref(false)
  const draggedItem = ref<{ type: 'folder' | 'templates'; ids: string[] } | null>(null)
  const isFolderModalOpen = ref(false)
  const isDeleteFolderModalOpen = ref(false)
  const folderModalMode = ref<'create' | 'rename'>('create')
  const folderFormName = ref('')
  const folderParentId = ref<string | null>(null)
  const activeFolder = ref<any>(null)
  const savingFolder = ref(false)
  const isMoveTemplatesModalOpen = ref(false)
  const movingTemplates = ref(false)
  const moveTemplateIds = ref<string[]>([])
  const moveTemplatesTargetScope = ref<string>('all')
  const previewTemplateId = ref<string | null>(null)
  const {
    tree: folderTree,
    counts: folderCounts,
    selectedScope,
    selectedFolderLabel,
    expandedSet,
    scopedFolderIds,
    ensureFoldersLoaded,
    refreshFolders,
    setSelectedScope,
    toggleExpanded
  } = useWorkoutTemplateFolders('library-page')

  const workoutTypes = [
    { label: 'Ride', value: 'Ride', icon: 'i-tabler-bike' },
    { label: 'Run', value: 'Run', icon: 'i-tabler-run' },
    { label: 'Swim', value: 'Swim', icon: 'i-tabler-swimming' },
    { label: 'Gym', value: 'WeightTraining', icon: 'i-tabler-barbell' }
  ]

  const durationRanges = [
    { label: 'All', value: 'all' },
    { label: '<30m', value: 'short' },
    { label: '30-60m', value: 'medium' },
    { label: '60m+', value: 'long' }
  ]

  const sortOptions = [
    { label: 'Recently Updated', value: 'updated' },
    { label: 'Title', value: 'title' },
    { label: 'Duration', value: 'duration' },
    { label: 'TSS', value: 'tss' }
  ]

  const filteredTemplates = computed(() => {
    if (!templates.value) return []

    let result = templates.value

    if (selectedScope.value === 'unfiled') {
      result = result.filter((t) => !t.folderId)
    } else if (scopedFolderIds.value?.length) {
      result = result.filter((t) => scopedFolderIds.value?.includes(t.folderId))
    }

    if (selectedType.value !== 'all') {
      result = result.filter((t) => t.type === selectedType.value)
    }

    if (selectedDuration.value !== 'all') {
      result = result.filter((t) => {
        const mins = (t.durationSec || 0) / 60
        if (selectedDuration.value === 'short') return mins < 30
        if (selectedDuration.value === 'medium') return mins >= 30 && mins <= 60
        if (selectedDuration.value === 'long') return mins > 60
        return true
      })
    }

    const query = searchQuery.value.trim().toLowerCase()
    if (query) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query) ||
          t.type.toLowerCase().includes(query)
      )
    }

    result = [...result].sort((a, b) => {
      if (sortBy.value === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      }

      if (sortBy.value === 'duration') {
        return (b.durationSec || 0) - (a.durationSec || 0)
      }

      if (sortBy.value === 'tss') {
        return (b.tss || 0) - (a.tss || 0)
      }

      const aUpdated = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const bUpdated = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return bUpdated - aUpdated
    })

    return result
  })

  function createNewTemplate() {
    editingTemplate.value = null
    isEditorOpen.value = true
  }

  function editTemplate(template: any) {
    editingTemplate.value = template
    isEditorOpen.value = true
  }

  function openPreviewDetails() {
    const template = filteredTemplates.value.find((item) => item.id === previewTemplateId.value)
    if (!template) return
    editTemplate(template)
  }

  function onTemplateSaved() {
    isEditorOpen.value = false
    selectedTemplateIds.value = []
    refresh()
    refreshFolders()
  }

  function useTemplate(template: any) {
    toast.add({ title: 'Schedule to calendar coming soon', color: 'info' })
  }

  function confirmDelete(template: any) {
    editingTemplate.value = template
    isDeleteModalOpen.value = true
  }

  async function deleteTemplate() {
    if (!editingTemplate.value) return

    deleting.value = true
    try {
      await $fetch(`/api/library/workouts/${editingTemplate.value.id}`, {
        method: 'DELETE'
      })
      toast.add({ title: 'Template deleted', color: 'success' })
      isDeleteModalOpen.value = false
      selectedTemplateIds.value = selectedTemplateIds.value.filter(
        (id) => id !== editingTemplate.value.id
      )
      refresh()
      refreshFolders()
    } catch (error: any) {
      toast.add({ title: 'Delete failed', color: 'error' })
    } finally {
      deleting.value = false
    }
  }

  onMounted(() => {
    void ensureFoldersLoaded()
  })

  function toggleTemplateSelection(templateId: string) {
    selectedTemplateIds.value = selectedTemplateIds.value.includes(templateId)
      ? selectedTemplateIds.value.filter((id) => id !== templateId)
      : [...selectedTemplateIds.value, templateId]
  }

  function openCreateFolder(parentId: string | null) {
    folderModalMode.value = 'create'
    folderParentId.value = parentId
    folderFormName.value = ''
    isFolderModalOpen.value = true
  }

  function openRenameFolder(folder: any) {
    folderModalMode.value = 'rename'
    activeFolder.value = folder
    folderFormName.value = folder.name
    isFolderModalOpen.value = true
  }

  function openDeleteFolder(folder: any) {
    activeFolder.value = folder
    isDeleteFolderModalOpen.value = true
  }

  async function submitFolderForm() {
    if (!folderFormName.value.trim()) return

    savingFolder.value = true
    try {
      if (folderModalMode.value === 'create') {
        await $fetch('/api/library/workout-folders', {
          method: 'POST',
          body: {
            name: folderFormName.value.trim(),
            parentId: folderParentId.value
          }
        })
      } else if (activeFolder.value) {
        await $fetch(`/api/library/workout-folders/${activeFolder.value.id}`, {
          method: 'PATCH',
          body: {
            name: folderFormName.value.trim()
          }
        })
      }

      await refreshFolders()
      isFolderModalOpen.value = false
    } catch (error: any) {
      toast.add({
        title: 'Folder save failed',
        description: error.data?.message || 'Could not save folder.',
        color: 'error'
      })
    } finally {
      savingFolder.value = false
    }
  }

  async function deleteFolder() {
    if (!activeFolder.value) return

    savingFolder.value = true
    try {
      await $fetch(`/api/library/workout-folders/${activeFolder.value.id}`, {
        method: 'DELETE'
      })
      await refresh()
      await refreshFolders()
      isDeleteFolderModalOpen.value = false
    } catch (error: any) {
      toast.add({
        title: 'Folder delete failed',
        description: error.data?.message || 'Could not delete folder.',
        color: 'error'
      })
    } finally {
      savingFolder.value = false
    }
  }

  async function moveFolder(payload: {
    folderId: string
    parentId: string | null
    beforeId: string | null
  }) {
    draggedItem.value = null
    try {
      await $fetch(`/api/library/workout-folders/${payload.folderId}`, {
        method: 'PATCH',
        body: {
          parentId: payload.parentId,
          beforeId: payload.beforeId
        }
      })
      await refreshFolders()
    } catch (error: any) {
      toast.add({
        title: 'Folder move failed',
        description: error.data?.message || 'Could not move folder.',
        color: 'error'
      })
    }
  }

  function openMoveTemplatesModal(templateIds: string[]) {
    moveTemplateIds.value = [...templateIds]
    moveTemplatesTargetScope.value = 'all'
    isMoveTemplatesModalOpen.value = true
  }

  async function moveSelectedTemplates() {
    if (moveTemplatesTargetScope.value === 'all') {
      toast.add({
        title: 'Choose a destination',
        description: 'Select a folder or Unfiled as the move target.',
        color: 'warning'
      })
      return
    }

    movingTemplates.value = true
    try {
      await $fetch('/api/library/workouts/bulk-move', {
        method: 'POST',
        body: {
          templateIds: moveTemplateIds.value,
          folderId:
            moveTemplatesTargetScope.value === 'unfiled' ? null : moveTemplatesTargetScope.value
        }
      })
      selectedTemplateIds.value = selectedTemplateIds.value.filter(
        (id) => !moveTemplateIds.value.includes(id)
      )
      isMoveTemplatesModalOpen.value = false
      await refresh()
      await refreshFolders()
    } catch (error: any) {
      toast.add({
        title: 'Move failed',
        description: error.data?.message || 'Could not move templates.',
        color: 'error'
      })
    } finally {
      movingTemplates.value = false
    }
  }

  function selectScopeFromSlideover(scope: string) {
    setSelectedScope(scope)
    showFolderSlideover.value = false
  }

  function onTemplateDragStart(template: any) {
    const ids = selectedTemplateIds.value.includes(template.id)
      ? selectedTemplateIds.value
      : [template.id]

    draggedItem.value = {
      type: 'templates',
      ids
    }
  }

  async function dropTemplatesToFolder({
    templateIds,
    folderId
  }: {
    templateIds: string[]
    folderId: string | null
  }) {
    draggedItem.value = null

    try {
      await $fetch('/api/library/workouts/bulk-move', {
        method: 'POST',
        body: {
          templateIds,
          folderId
        }
      })

      selectedTemplateIds.value = selectedTemplateIds.value.filter(
        (id) => !templateIds.includes(id)
      )
      await refresh()
      await refreshFolders()
      toast.add({
        title: folderId ? 'Moved to folder' : 'Moved to Unfiled',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Move failed',
        description: error.data?.message || 'Could not move templates.',
        color: 'error'
      })
    }
  }
</script>
