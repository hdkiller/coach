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
            <p class="mt-1 text-xs font-bold uppercase italic tracking-[0.2em] text-muted">
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
                variant="soft"
                icon="i-heroicons-folder-open"
                class="min-w-0 flex-1 justify-start rounded-xl px-3 lg:hidden"
                @click="showContextModal = true"
              >
                <span class="truncate text-xs">{{ contextButtonLabel }}</span>
              </UButton>

              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search plans..."
                class="min-w-0 flex-1 md:w-64 md:flex-none"
              />
            </div>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div class="hidden space-y-4 lg:block">
            <UCard :ui="{ body: 'p-4' }" class="sticky top-4 space-y-6 shadow-sm">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-heroicons-folder-open"
                class="w-full justify-start rounded-xl px-3"
                @click="showContextModal = true"
              >
                <span class="truncate">{{ selectedTabLabel }}</span>
              </UButton>

              <div
                v-if="selectedTab === 'my'"
                class="space-y-1 border-t border-default/60 pt-6"
              >
                <TrainingPlanFolderSelector
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
            </UCard>
          </div>

          <div class="space-y-4">
            <div
              v-if="selectedPlanIds.length"
              class="flex flex-wrap items-center justify-between gap-3 rounded-none border-y border-primary/20 bg-primary/5 px-4 py-4 sm:rounded-2xl sm:border sm:p-4"
            >
              <div class="text-sm font-medium text-highlighted">
                {{ selectedPlanIds.length }} plan{{ selectedPlanIds.length === 1 ? '' : 's' }}
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
              <UIcon name="i-heroicons-document-duplicate" class="mb-4 h-12 w-12 text-gray-300" />
              <h3 class="text-lg font-bold">No plans found</h3>
              <p class="mx-auto mb-6 max-w-xs text-sm text-muted">
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
                class="group relative flex cursor-pointer flex-col transition-all hover:border-primary/50"
                :draggable="selectedTab === 'my'"
                @click="editPlan(plan)"
                @dragstart="onPlanDragStart(plan)"
                @dragend="draggedItem = null"
              >
                <template #header>
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <div class="truncate font-bold text-highlighted group-hover:text-primary">
                          {{ plan.name || 'Untitled Plan' }}
                        </div>
                        <UButton
                          :icon="plan.isFavorite ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                          :color="plan.isFavorite ? 'warning' : 'neutral'"
                          variant="ghost"
                          size="xs"
                          class="h-5 w-5 p-0"
                          @click.stop="toggleFavorite(plan)"
                        />
                      </div>

                      <div class="mt-1 flex items-center gap-2">
                        <div class="text-[10px] font-bold uppercase tracking-wider text-muted">
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

                <div class="flex-1 space-y-4">
                  <p class="min-h-[2.5rem] line-clamp-2 text-xs text-muted">
                    {{ plan.description || 'No description provided.' }}
                  </p>

                  <div
                    class="flex items-center justify-between border-t border-default/40 pt-3 text-[11px] font-bold uppercase tracking-tight text-muted"
                  >
                    <div class="flex items-center gap-1.5">
                      <UIcon name="i-heroicons-calendar-days" class="h-3.5 w-3.5 text-primary" />
                      {{ getTotalWeeks(plan) }} Weeks
                    </div>
                    <div class="flex items-center gap-1.5">
                      <UIcon name="i-heroicons-bolt" class="h-3.5 w-3.5 text-amber-500" />
                      {{ plan.difficulty || 5 }}/10
                    </div>
                    <div v-if="plan.primarySport" class="flex items-center gap-1.5">
                      <UIcon name="i-heroicons-tag" class="h-3.5 w-3.5" />
                      {{ plan.primarySport }}
                    </div>
                  </div>
                </div>

                <template #footer>
                  <div class="flex w-full items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UBadge v-if="plan.visibility === 'PUBLIC'" color="success" variant="soft" size="xs">
                        Public
                      </UBadge>
                      <UBadge v-else-if="plan.visibility === 'TEAM'" color="info" variant="soft" size="xs">
                        Team
                      </UBadge>
                    </div>

                    <UButton
                      size="xs"
                      color="primary"
                      variant="soft"
                      :label="canEditPlan(plan) ? 'Architect' : 'Add to Library'"
                      icon="i-heroicons-pencil-square"
                      :loading="importingPlanIds.includes(plan.id)"
                      @click.stop="editStructure(plan)"
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
        <UButton color="neutral" variant="ghost" @click="isDeleteFolderModalOpen = false">
          Cancel
        </UButton>
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
        <UButton color="neutral" variant="ghost" @click="isMovePlansModalOpen = false">
          Cancel
        </UButton>
        <UButton color="primary" :loading="movingPlans" @click="moveSelectedPlans">Move</UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="showContextModal"
    title="Plan Library"
    description="Choose the plan view and folder scope."
  >
    <template #body>
      <div class="space-y-6 p-4">
        <div class="space-y-1">
          <div class="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted">View</div>
          <UButton
            v-for="tab in planTabs"
            :key="tab.value"
            class="w-full justify-start gap-3 rounded-2xl border px-3 py-2 text-left"
            :color="selectedTab === tab.value ? 'primary' : 'neutral'"
            :variant="selectedTab === tab.value ? 'soft' : 'ghost'"
            :icon="tab.icon"
            @click="selectPlanTab(tab.value)"
          >
            <span class="flex-1 text-sm font-medium">{{ tab.label }}</span>
          </UButton>
        </div>

        <div v-if="selectedTab === 'my'" class="space-y-4">
          <div v-if="isCoachingMode" class="space-y-2 border-t border-default/60 pt-4">
            <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
              Library Source
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="option in librarySourceOptions"
                :key="option.value"
                size="sm"
                :color="librarySource === option.value ? 'primary' : 'neutral'"
                :variant="librarySource === option.value ? 'soft' : 'ghost'"
                class="rounded-xl px-3"
                @click="librarySource = option.value"
              >
                {{ option.label }}
              </UButton>
            </div>
          </div>

          <div class="space-y-2 border-t border-default/60 pt-4">
            <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
              Folders
            </div>
            <TrainingPlanFolderSelector
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
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton color="primary" variant="soft" @click="showContextModal = false">Done</UButton>
      </div>
    </template>
  </UModal>

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
  const showContextModal = ref(false)
  const draggedItem = ref<{ type: 'folder' | 'plans'; ids: string[] } | null>(null)
  const importingPlanIds = ref<string[]>([])

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

  const selectedTabLabel = computed(
    () => planTabs.find((tab) => tab.value === selectedTab.value)?.label || 'Plans'
  )
  const selectedLibrarySourceLabel = computed(
    () =>
      librarySourceOptions.value.find((option) => option.value === librarySource.value)?.label ||
      'Coach'
  )
  const selectedFolderContextLabel = computed(() => {
    if (librarySource.value === 'all') return `${selectedLibrarySourceLabel.value} plans`
    if (selectedScope.value === 'all') return `${selectedLibrarySourceLabel.value} • All plans`
    if (selectedScope.value === 'unfiled') {
      return `${selectedLibrarySourceLabel.value} • Unfiled plans`
    }
    return `${selectedLibrarySourceLabel.value} • ${selectedFolderLabel.value}`
  })
  const contextButtonLabel = computed(() =>
    selectedTab.value === 'my'
      ? `${selectedTabLabel.value} • ${selectedFolderContextLabel.value}`
      : selectedTabLabel.value
  )

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

  function canEditPlan(plan: any) {
    return !!plan?.isEditable
  }

  async function importPlanToLibrary(
    plan: any,
    destination: 'overview' | 'architect' = 'architect'
  ) {
    if (!plan?.id) return
    if (importingPlanIds.value.includes(plan.id)) return

    importingPlanIds.value = [...importingPlanIds.value, plan.id]
    try {
      const imported: any = await $fetch(`/api/library/plans/${plan.id}/import`, {
        method: 'POST',
        body: {
          folderId:
            selectedTab.value === 'my' &&
            selectedScope.value !== 'all' &&
            selectedScope.value !== 'unfiled'
              ? selectedScope.value
              : null
        }
      })

      if (imported.imported) {
        toast.add({ title: 'Plan added to your library', color: 'success' })
      }

      const targetPath =
        destination === 'overview'
          ? `/library/plans/${imported.planId}/overview`
          : `/library/plans/${imported.planId}/architect`

      await Promise.all([refresh(), refreshFolders()])
      navigateTo(targetPath)
    } catch (error: any) {
      toast.add({
        title: 'Could not add plan to library',
        description: error?.data?.message || 'Please try again.',
        color: 'error'
      })
    } finally {
      importingPlanIds.value = importingPlanIds.value.filter((id) => id !== plan.id)
    }
  }

  function editPlan(plan: any) {
    if (canEditPlan(plan)) {
      navigateTo(`/library/plans/${plan.id}/overview`)
      return
    }
    void importPlanToLibrary(plan, 'overview')
  }

  function editStructure(plan: any) {
    if (canEditPlan(plan)) {
      navigateTo(`/library/plans/${plan.id}/architect`)
      return
    }
    void importPlanToLibrary(plan, 'architect')
  }

  function selectPlanTab(tab: typeof selectedTab.value) {
    selectedTab.value = tab
  }

  async function toggleFavorite(plan: any) {
    const next = !plan.isFavorite
    plan.isFavorite = next
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
    if (!canEditPlan(plan)) {
      return [
        [
          {
            label: 'Add to library',
            icon: 'i-heroicons-plus',
            onSelect: () => importPlanToLibrary(plan, 'architect')
          }
        ]
      ]
    }

    return [
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

  function confirmDelete(_plan: any) {
    toast.add({ title: 'Delete coming soon', color: 'info' })
  }

  function getTotalWeeks(plan: any) {
    if (!plan.blocks) return 0
    return plan.blocks.reduce(
      (acc: number, b: any) => acc + (b._count?.weeks || b.durationWeeks || 0),
      0
    )
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
          body: { name: folderFormName.value.trim(), ownerScope: librarySource.value }
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
