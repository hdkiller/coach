<template>
  <UDashboardPanel id="plan-library">
    <template #header>
      <UDashboardNavbar title="Plans">
        <template #right>
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            label="New Plan"
            :loading="isCreating"
            @click="createNewPlanTemplate"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6 px-0 py-4 sm:p-6">
        <div class="flex flex-col justify-between gap-4 px-4 md:flex-row md:items-center sm:px-0">
          <div>
            <h1 class="text-3xl font-black uppercase tracking-tight">Plans</h1>
            <p class="text-xs font-bold text-muted uppercase tracking-[0.2em] mt-1 italic">
              Architectural Blueprint for Your Season
            </p>
          </div>
          <div class="flex flex-col items-stretch gap-2 md:items-end">
            <div v-if="isCoachingMode" class="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <UButton
                v-for="option in librarySourceOptions"
                :key="option.value"
                size="xs"
                :color="librarySource === option.value ? 'primary' : 'neutral'"
                :variant="librarySource === option.value ? 'solid' : 'ghost'"
                class="shrink-0 rounded-xl px-3"
                @click="librarySource = option.value"
              >
                {{ option.label }}
              </UButton>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-folder-open"
                class="lg:hidden"
                :disabled="librarySource === 'all'"
                @click="showFolderSlideover = true"
              >
                Folders
              </UButton>
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search plans..."
                class="w-full md:w-64"
              />
            </div>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <!-- Left Pane: Folders & Filters -->
          <div class="hidden lg:block space-y-4">
            <UCard :ui="{ body: 'p-4' }" class="sticky top-4 shadow-sm space-y-6">
              <!-- Content Tabs -->
              <div class="space-y-1">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted mb-2">
                  Library
                </div>
                <UButton
                  v-for="tab in planTabs"
                  :key="tab.value"
                  class="w-full justify-start gap-3 rounded-2xl border px-3 py-2 text-left transition-colors"
                  :color="selectedTab === tab.value ? 'primary' : 'neutral'"
                  :variant="selectedTab === tab.value ? 'soft' : 'ghost'"
                  :icon="tab.icon"
                  @click="selectedTab = tab.value"
                >
                  <span class="flex-1 text-sm font-medium">{{ tab.label }}</span>
                </UButton>
              </div>

              <UDivider />

              <TrainingPlanFolderSelector
                v-if="selectedTab === 'my'"
                title="My Folders"
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
                @drop-plans="dropPlansToFolder"
                @drag-start="draggedItem = $event"
                @drag-end="draggedItem = null"
              />
            </UCard>
          </div>

          <div class="space-y-4">
            <!-- Bulk Actions -->
            <div
              v-if="selectedPlanIds.length"
              class="flex flex-wrap items-center justify-between gap-3 rounded-none border-y border-primary/20 bg-primary/5 px-4 py-4 sm:rounded-2xl sm:border sm:p-4"
            >
              <div class="text-sm font-medium text-highlighted">
                {{ selectedPlanIds.length }} plan{{
                  selectedPlanIds.length === 1 ? '' : 's'
                }}
                selected
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  v-if="selectedTab === 'my'"
                  size="sm"
                  color="primary"
                  variant="soft"
                  icon="i-heroicons-folder-open"
                  @click="openMovePlansModal(selectedPlanIds)"
                >
                  Move to folder
                </UButton>
                <UButton size="sm" color="neutral" variant="ghost" @click="selectedPlanIds = []">
                  Clear
                </UButton>
              </div>
            </div>

            <!-- Main Catalog -->
            <div
              v-if="loading && !planItems.length"
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
              v-else-if="filteredPlans.length === 0"
              class="border-y border-dashed border-gray-200 bg-gray-50 px-4 py-20 text-center dark:border-gray-800 dark:bg-gray-900/50 sm:rounded-xl sm:border"
            >
              <UIcon name="i-heroicons-document-duplicate" class="w-12 h-12 text-gray-300 mb-4" />
              <h3 class="text-lg font-bold">No plans found</h3>
              <p class="text-sm text-muted max-w-xs mx-auto mb-6">
                {{
                  searchQuery
                    ? 'Try a different search or folder.'
                    : 'Start by creating your first training plan template.'
                }}
              </p>
              <UButton color="primary" @click="createNewPlanTemplate">Create Plan Template</UButton>
            </div>

            <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <UCard
                v-for="plan in filteredPlans"
                :key="plan.id"
                class="group relative hover:border-primary/50 transition-all cursor-pointer flex flex-col"
                :draggable="selectedTab === 'my'"
                @click="editPlan(plan.id)"
                @dragstart="onPlanDragStart(plan)"
                @dragend="draggedItem = null"
              >
                <template #header>
                  <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <div class="font-bold truncate text-highlighted group-hover:text-primary">
                          {{ plan.name || 'Untitled Plan' }}
                        </div>
                        <UButton
                          :icon="plan.isFavorite ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                          :color="plan.isFavorite ? 'warning' : 'neutral'"
                          variant="ghost"
                          size="xs"
                          class="p-0 h-5 w-5"
                          @click.stop="toggleFavorite(plan)"
                        />
                      </div>
                      <div class="flex items-center gap-2 mt-1">
                        <div class="text-[10px] text-muted uppercase font-bold tracking-wider">
                          {{ plan.strategy }}
                        </div>
                        <UBadge
                          v-if="plan.ownerScope && selectedTab === 'all'"
                          color="primary"
                          variant="outline"
                          size="xs"
                        >
                          {{ plan.ownerScope === 'coach' ? 'Coach' : 'Athlete' }}
                        </UBadge>
                        <UBadge v-if="plan.folder?.name" color="neutral" variant="soft" size="xs">
                          {{ plan.folder.name }}
                        </UBadge>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <UDropdownMenu :items="getPlanActions(plan)" :content="{ align: 'end' }">
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
                        :model-value="selectedPlanIds.includes(plan.id)"
                        @click.stop
                        @update:model-value="togglePlanSelection(plan.id)"
                      />
                    </div>
                  </div>
                </template>

                <div class="space-y-4 flex-1">
                  <p class="text-xs text-muted line-clamp-2 min-h-[2.5rem]">
                    {{ plan.description || 'No description provided.' }}
                  </p>

                  <div
                    class="flex justify-between items-center text-[11px] font-bold border-t border-default/40 pt-3 text-muted uppercase tracking-tight"
                  >
                    <div class="flex items-center gap-1.5">
                      <UIcon name="i-heroicons-calendar-days" class="w-3.5 h-3.5 text-primary" />
                      {{ getTotalWeeks(plan) }} Weeks
                    </div>
                    <div class="flex items-center gap-1.5">
                      <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5 text-amber-500" />
                      {{ plan.difficulty || 5 }}/10
                    </div>
                    <div v-if="plan.primarySport" class="flex items-center gap-1.5">
                      <UIcon name="i-heroicons-tag" class="w-3.5 h-3.5" />
                      {{ plan.primarySport }}
                    </div>
                  </div>
                </div>

                <template #footer>
                  <div class="flex justify-between items-center w-full">
                    <div class="flex items-center gap-2">
                      <UBadge
                        v-if="plan.visibility === 'PUBLIC'"
                        color="success"
                        variant="soft"
                        size="xs"
                        >Public</UBadge
                      >
                      <UBadge
                        v-else-if="plan.visibility === 'TEAM'"
                        color="info"
                        variant="soft"
                        size="xs"
                        >Team</UBadge
                      >
                    </div>
                    <UButton
                      size="xs"
                      color="primary"
                      variant="soft"
                      label="Architect"
                      icon="i-heroicons-pencil-square"
                      @click.stop="editStructure(plan.id)"
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

  <!-- Folder Management Modals -->
  <UModal
    v-model:open="isFolderModalOpen"
    :title="folderModalMode === 'rename' ? 'Rename Folder' : 'New Folder'"
  >
    <template #body>
      <div class="space-y-4 p-4">
        <UFormField label="Folder Name">
          <UInput v-model="folderFormName" placeholder="Base Phase, Race Prep..." />
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
    description="Child folders move up one level and plans in this folder become Unfiled."
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

  <UModal v-model:open="isMovePlansModalOpen" title="Move to Folder">
    <template #body>
      <div class="p-4">
        <TrainingPlanFolderSelector
          title="Choose Destination"
          :tree="folderTree"
          :counts="folderCounts"
          :selected-scope="movePlansTargetScope"
          :expanded-set="expandedSet"
          @select-scope="movePlansTargetScope = $event"
          @toggle-folder="toggleExpanded"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton color="neutral" variant="ghost" @click="isMovePlansModalOpen = false"
          >Cancel</UButton
        >
        <UButton color="primary" :loading="movingPlans" @click="moveSelectedPlans"> Move </UButton>
      </div>
    </template>
  </UModal>

  <USlideover v-model:open="showFolderSlideover" side="left" title="Library Context">
    <template #body>
      <div class="p-4 space-y-6">
        <div class="space-y-1">
          <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted mb-2">View</div>
          <UButton
            v-for="tab in planTabs"
            :key="tab.value"
            class="w-full justify-start gap-3 rounded-2xl border px-3 py-2 text-left"
            :color="selectedTab === tab.value ? 'primary' : 'neutral'"
            :variant="selectedTab === tab.value ? 'soft' : 'ghost'"
            :icon="tab.icon"
            @click="
              selectedTab = tab.value
              showFolderSlideover = false
            "
          >
            <span class="flex-1 text-sm font-medium">{{ tab.label }}</span>
          </UButton>
        </div>

        <UDivider v-if="selectedTab === 'my'" />

        <TrainingPlanFolderSelector
          v-if="selectedTab === 'my'"
          title="My Folders"
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
          @drop-plans="dropPlansToFolder"
          @drag-start="draggedItem = $event"
          @drag-end="draggedItem = null"
        />
      </div>
    </template>
  </USlideover>

  <PlanShareModal v-model:open="isShareModalOpen" :plan="activePlan" @updated="refresh" />
</template>

<script setup lang="ts">
  import TrainingPlanFolderSelector from '~/components/plans/library/TrainingPlanFolderSelector.vue'
  import PlanShareModal from '~/components/plans/library/PlanShareModal.vue'

  const toast = useToast()
  const isCoachingMode = computed(() => useCoachingStore().isCoachingMode)
  const { source: librarySource, options: librarySourceOptions } = useLibrarySource(
    'plan-library',
    { itemLabel: 'plans' }
  )

  const selectedTab = ref<'my' | 'team' | 'public' | 'favorites'>('my')
  const searchQuery = ref('')
  const isCreating = ref(false)
  const selectedPlanIds = ref<string[]>([])
  const showFolderSlideover = ref(false)
  const draggedItem = ref<{ type: 'folder' | 'plans'; ids: string[] } | null>(null)

  const {
    tree: folderTree,
    counts: folderCounts,
    selectedScope,
    expandedSet,
    scopedFolderIds,
    ensureFoldersLoaded,
    refreshFolders,
    setSelectedScope,
    toggleExpanded
  } = useTrainingPlanFolders('plan-library', {
    librarySource
  })

  const planTabs = [
    { label: 'My Plans', value: 'my' as const, icon: 'i-heroicons-document-text' },
    { label: 'Favorites', value: 'favorites' as const, icon: 'i-heroicons-star' },
    { label: 'Team Plans', value: 'team' as const, icon: 'i-heroicons-users' },
    { label: 'Public Store', value: 'public' as const, icon: 'i-heroicons-globe-alt' }
  ]

  const {
    data: plans,
    refresh,
    status
  } = await useFetch<any>('/api/library/plans', {
    query: computed(() => ({
      scope: librarySource.value,
      type: selectedTab.value,
      folderId:
        selectedTab.value === 'my' && selectedScope.value !== 'all'
          ? selectedScope.value === 'unfiled'
            ? null
            : selectedScope.value
          : undefined
    }))
  })

  const loading = computed(() => status.value === 'pending')

  const planItems = computed(() => {
    if (Array.isArray(plans.value)) return plans.value
    return [...(plans.value?.coach || []), ...(plans.value?.athlete || [])]
  })

  const filteredPlans = computed(() => {
    let result = planItems.value
    const query = searchQuery.value.trim().toLowerCase()
    if (query) {
      result = result.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.goal?.title?.toLowerCase().includes(query)
      )
    }
    return result
  })

  // Folder Management State
  const isFolderModalOpen = ref(false)
  const isDeleteFolderModalOpen = ref(false)
  const folderModalMode = ref<'create' | 'rename'>('create')
  const folderFormName = ref('')
  const folderParentId = ref<string | null>(null)
  const activeFolder = ref<any>(null)
  const savingFolder = ref(false)
  const isMovePlansModalOpen = ref(false)
  const movingPlans = ref(false)
  const movePlanIds = ref<string[]>([])
  const movePlansTargetScope = ref<string>('all')

  // Share State
  const isShareModalOpen = ref(false)
  const activePlan = ref<any>(null)

  async function createNewPlanTemplate() {
    isCreating.value = true
    try {
      const newPlan: any = await $fetch('/api/library/plans', {
        method: 'POST',
        body: {
          name: 'New Training Blueprint',
          description: 'A professional-grade training progression.',
          folderId:
            selectedTab.value === 'my' &&
            selectedScope.value !== 'all' &&
            selectedScope.value !== 'unfiled'
              ? selectedScope.value
              : null
        }
      })

      toast.add({ title: 'Blueprint created', color: 'success' })
      navigateTo(`/library/plans/${newPlan.id}/architect`)
    } catch (error: any) {
      toast.add({ title: 'Creation failed', color: 'error' })
    } finally {
      isCreating.value = false
    }
  }

  function editPlan(id: string) {
    navigateTo(`/library/plans/${id}/overview`)
  }
  function editStructure(id: string) {
    navigateTo(`/library/plans/${id}/architect`)
  }

  async function toggleFavorite(plan: any) {
    const next = !plan.isFavorite
    plan.isFavorite = next // Optimistic update
    try {
      await $fetch('/api/library/plans/favorite', {
        method: 'POST',
        body: { planId: plan.id, isFavorite: next }
      })
    } catch (e) {
      plan.isFavorite = !next
      toast.add({ title: 'Update failed', color: 'error' })
    }
  }

  function togglePlanSelection(id: string) {
    selectedPlanIds.value = selectedPlanIds.value.includes(id)
      ? selectedPlanIds.value.filter((i) => i !== id)
      : [...selectedPlanIds.value, id]
  }

  function onPlanDragStart(plan: any) {
    if (selectedTab.value !== 'my') return
    const ids = selectedPlanIds.value.includes(plan.id) ? selectedPlanIds.value : [plan.id]
    draggedItem.value = { type: 'plans', ids }
  }

  function getPlanActions(plan: any) {
    const actions = [
      [
        {
          label: 'Copy private link',
          icon: 'i-heroicons-link',
          onSelect: () => sharePlan(plan)
        },
        {
          label: 'Share settings',
          icon: 'i-heroicons-share',
          onSelect: () => {
            activePlan.value = plan
            isShareModalOpen.value = true
          }
        },
        {
          label: 'Move to folder',
          icon: 'i-heroicons-folder-open',
          onSelect: () => openMovePlansModal([plan.id]),
          disabled: selectedTab.value !== 'my'
        }
      ],
      [
        {
          label: 'Delete',
          icon: 'i-heroicons-trash',
          color: 'error',
          onSelect: () => confirmDelete(plan),
          disabled: plan.ownerScope === 'coach' && !isCoachingMode.value
        }
      ]
    ]
    return actions
  }

  async function sharePlan(plan: any) {
    try {
      const res = await $fetch<{ url: string }>('/api/share/generate', {
        method: 'POST',
        body: { resourceType: 'TRAINING_PLAN', resourceId: plan.id }
      })
      if (import.meta.client && navigator?.clipboard) {
        await navigator.clipboard.writeText(res.url)
      }
      toast.add({ title: 'Private link copied', color: 'success' })
    } catch (error: any) {
      toast.add({ title: 'Share failed', color: 'error' })
    }
  }

  function confirmDelete(plan: any) {
    // Implementation for plan delete...
    toast.add({ title: 'Delete coming soon', color: 'info' })
  }

  function getTotalWeeks(plan: any) {
    if (!plan.blocks) return 0
    return plan.blocks.reduce(
      (acc: number, b: any) => acc + (b._count?.weeks || b.durationWeeks || 0),
      0
    )
  }

  // Folder Actions
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
        await $fetch('/api/library/plan-folders', {
          method: 'POST',
          body: {
            name: folderFormName.value.trim(),
            parentId: folderParentId.value,
            ownerScope: librarySource.value
          }
        })
      } else {
        await $fetch(`/api/library/plan-folders/${activeFolder.value.id}`, {
          method: 'PATCH',
          body: { name: folderFormName.value.trim(), ownerScope: libraryScope.value }
        })
      }
      await refreshFolders()
      isFolderModalOpen.value = false
    } finally {
      savingFolder.value = false
    }
  }

  async function deleteFolder() {
    if (!activeFolder.value) return
    savingFolder.value = true
    try {
      await $fetch(`/api/library/plan-folders/${activeFolder.value.id}`, {
        method: 'DELETE',
        query: { scope: librarySource.value }
      })
      await Promise.all([refresh(), refreshFolders()])
      isDeleteFolderModalOpen.value = false
    } finally {
      savingFolder.value = false
    }
  }

  async function moveFolder(payload: any) {
    try {
      await $fetch(`/api/library/plan-folders/${payload.folderId}`, {
        method: 'PATCH',
        body: { ...payload, ownerScope: librarySource.value }
      })
      await refreshFolders()
    } catch (e) {
      toast.add({ title: 'Move failed', color: 'error' })
    }
  }

  function openMovePlansModal(ids: string[]) {
    movePlanIds.value = [...ids]
    movePlansTargetScope.value = 'all'
    isMovePlansModalOpen.value = true
  }

  async function moveSelectedPlans() {
    if (movePlansTargetScope.value === 'all') return
    movingPlans.value = true
    try {
      await $fetch('/api/library/plans/bulk-move', {
        method: 'POST',
        body: {
          planIds: movePlanIds.value,
          folderId: movePlansTargetScope.value === 'unfiled' ? null : movePlansTargetScope.value,
          ownerScope: librarySource.value
        }
      })
      selectedPlanIds.value = []
      isMovePlansModalOpen.value = false
      await Promise.all([refresh(), refreshFolders()])
    } finally {
      movingPlans.value = false
    }
  }

  async function dropPlansToFolder({ planIds, folderId }: any) {
    try {
      await $fetch('/api/library/plans/bulk-move', {
        method: 'POST',
        body: { planIds, folderId, ownerScope: librarySource.value }
      })
      await Promise.all([refresh(), refreshFolders()])
      toast.add({ title: 'Plans moved', color: 'success' })
    } catch (e) {
      toast.add({ title: 'Move failed', color: 'error' })
    }
  }

  onMounted(() => {
    if (librarySource.value !== 'all') void ensureFoldersLoaded()
  })
  watch(librarySource, () => {
    selectedPlanIds.value = []
  })
  watch(selectedTab, () => {
    selectedPlanIds.value = []
  })
</script>
