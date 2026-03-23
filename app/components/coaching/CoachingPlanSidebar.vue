<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Templates List -->
    <div v-if="!selectedPlanId" class="flex flex-1 flex-col overflow-hidden">
      <div class="mb-3 px-3 space-y-2.5">
        <div class="flex items-center gap-2">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search templates..."
            size="sm"
            class="min-w-0 flex-1"
          />
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-ellipsis-horizontal"
            class="h-8 w-8 shrink-0 p-0"
            @click="refreshPlanTemplates"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            icon="i-heroicons-folder-open"
            class="h-8 min-w-0 flex-1 justify-start rounded-xl px-3"
            @click="showScopeModal = true"
          >
            <span class="truncate text-xs">{{ selectedFolderLabel }}</span>
          </UButton>

          <UButton
            size="sm"
            :color="selectedTab === 'all' ? 'neutral' : 'primary'"
            variant="soft"
            icon="i-heroicons-funnel"
            class="h-8 shrink-0 rounded-xl px-3"
            @click="cycleTabs"
          >
            <span class="text-[10px] font-bold uppercase">{{ selectedTab }}</span>
          </UButton>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-1 pb-4 space-y-2 no-scrollbar">
        <div v-if="loading" class="space-y-2 px-2">
          <USkeleton v-for="i in 5" :key="i" class="h-20 w-full rounded-2xl" />
        </div>

        <div
          v-else-if="filteredTemplates.length === 0"
          class="rounded-2xl border border-dashed border-default/80 py-8 text-center text-sm text-muted mx-2"
        >
          No templates found.
        </div>

        <button
          v-for="plan in filteredTemplates"
          v-else
          :key="plan.id"
          class="w-full text-left p-3 rounded-2xl border border-default/70 bg-default transition hover:border-primary/50 group"
          @click="selectPlan(plan.id)"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="font-bold text-highlighted group-hover:text-primary truncate">
              {{ plan.name || 'Untitled Plan' }}
            </div>
            <UIcon
              v-if="plan.isFavorite"
              name="i-heroicons-star-solid"
              class="w-3.5 h-3.5 text-warning shrink-0"
            />
          </div>
          <div v-if="plan.goal?.title" class="text-[10px] text-muted uppercase tracking-wider mt-1">
            {{ plan.goal.title }}
          </div>
          <div class="mt-2 flex items-center justify-between text-[10px] text-muted">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-cube-transparent" class="w-3.5 h-3.5" />
                {{ plan._count?.blocks || 0 }} blocks
              </span>
              <span v-if="plan.primarySport" class="flex items-center gap-1">
                <UIcon name="i-heroicons-tag" class="w-3.5 h-3.5" />
                {{ plan.primarySport }}
              </span>
            </div>
            <UBadge v-if="plan.ownerScope" variant="subtle" size="xs" class="font-bold">
              {{ plan.ownerScope === 'coach' ? 'COACH' : 'MY' }}
            </UBadge>
          </div>
        </button>
      </div>
    </div>

    <!-- Template Detail (Blocks & Weeks) -->
    <div v-else class="flex flex-1 flex-col overflow-hidden">
      <div class="mb-3 flex items-center justify-between px-1">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-chevron-left"
          class="rounded-xl"
          @click="selectedPlanId = null"
        >
          Back to templates
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-top-right-on-square"
          class="rounded-xl"
          title="Open in Library"
          @click="openInLibrary"
        />
      </div>

      <div v-if="loadingPlan" class="px-3 py-4 space-y-3">
        <USkeleton class="h-6 w-3/4 rounded" />
        <USkeleton v-for="i in 3" :key="i" class="h-32 w-full rounded-2xl" />
      </div>

      <div v-else-if="detailedPlan" class="flex-1 overflow-y-auto px-1 pb-4 no-scrollbar">
        <div class="mb-4 px-2">
          <h3 class="text-sm font-black text-highlighted uppercase tracking-widest">
            {{ detailedPlan.name }}
          </h3>
          <p v-if="detailedPlan.description" class="text-[11px] text-muted mt-1 leading-relaxed">
            {{ detailedPlan.description }}
          </p>
        </div>

        <div class="space-y-3 px-1">
          <div
            v-for="(block, bIdx) in detailedPlan.blocks as any[]"
            :key="block.id"
            class="rounded-2xl border border-default/70 bg-muted/5 overflow-hidden"
          >
            <!-- Block Header -->
            <div
              class="flex items-center justify-between bg-muted/10 px-3 py-2.5 cursor-pointer border-b border-default/40"
              @click="toggleBlock(block.id)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <UIcon
                  :name="
                    expandedBlockIds.includes(block.id)
                      ? 'i-heroicons-chevron-down'
                      : 'i-heroicons-chevron-right'
                  "
                  class="h-3.5 w-3.5 shrink-0 text-muted"
                />
                <span
                  class="text-[11px] font-black uppercase tracking-wider text-highlighted truncate"
                >
                  Block {{ (bIdx as number) + 1 }}: {{ block.name }}
                </span>
              </div>
              <UBadge size="xs" color="neutral" variant="soft" class="rounded-lg">{{
                block.type
              }}</UBadge>
            </div>

            <!-- Weeks in Block -->
            <div v-if="expandedBlockIds.includes(block.id)" class="divide-y divide-default/30">
              <div v-for="week in block.weeks" :key="week.id" class="flex flex-col">
                <div
                  class="flex items-center justify-between px-6 py-2 cursor-pointer hover:bg-muted/10 transition-colors"
                  :class="{ 'bg-primary/5': expandedWeekIds.includes(week.id) }"
                  @click="toggleWeek(week.id)"
                >
                  <div class="flex items-center gap-2">
                    <UIcon
                      :name="
                        expandedWeekIds.includes(week.id)
                          ? 'i-heroicons-chevron-down'
                          : 'i-heroicons-chevron-right'
                      "
                      class="h-3 w-3 shrink-0 text-muted"
                    />
                    <span class="text-[10px] font-bold text-highlighted">
                      Week {{ week.weekNumber }}
                    </span>
                  </div>
                  <span class="text-[10px] text-muted italic">{{ week.focus || 'General' }}</span>
                </div>

                <!-- Workouts in Week -->
                <div
                  v-if="expandedWeekIds.includes(week.id)"
                  class="bg-muted/10 px-4 py-2 space-y-2"
                >
                  <div
                    v-for="workout in week.workouts"
                    :key="workout.id"
                    draggable="true"
                    class="group relative cursor-grab rounded-xl border border-default/80 bg-default p-2 transition hover:border-primary/40 active:cursor-grabbing"
                    @dragstart="onWorkoutDragStart($event, workout)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <div
                          class="truncate text-[11px] font-bold text-highlighted group-hover:text-primary"
                        >
                          {{ workout.title }}
                        </div>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          <UIcon
                            :name="getWorkoutIcon(workout.type)"
                            class="h-3 w-3 text-primary/70"
                          />
                          <span class="text-[9px] text-muted uppercase tracking-tight">
                            Day {{ ((workout.dayIndex as number) || 0) + 1 }} •
                            {{ Math.round((workout.durationSec || 0) / 60) }}m
                          </span>
                        </div>
                      </div>

                      <UDropdownMenu
                        :items="getScheduleActions(workout)"
                        :content="{ align: 'end' }"
                      >
                        <UButton
                          size="xs"
                          color="primary"
                          variant="ghost"
                          icon="i-heroicons-plus"
                          class="h-6 w-6 p-0 rounded-lg opacity-60 group-hover:opacity-100"
                          @click.stop
                        />
                      </UDropdownMenu>
                    </div>
                  </div>
                  <div
                    v-if="!week.workouts?.length"
                    class="text-[10px] text-muted italic py-1 text-center"
                  >
                    No workouts scheduled
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scope / Folder Modal -->
    <LibraryScopeModal
      v-model:open="showScopeModal"
      mode="plan"
      title="Training Plans"
      description="Choose library source and folder scope."
      :source="libraryScope"
      :source-options="librarySourceOptions"
      :is-coaching-mode="isCoachingMode"
      :folder-tree="folderTree"
      :folder-counts="folderCounts"
      :selected-scope="selectedScope"
      :expanded-set="expandedSet as Set<string>"
      @update:source="$emit('update:libraryScope', $event)"
      @select-scope="setSelectedScope"
      @toggle-folder="toggleExpanded"
    />
  </div>
</template>

<script setup lang="ts">
  import { getWorkoutIcon } from '~/utils/activity-types'
  import LibraryScopeModal from '~/components/library/LibraryScopeModal.vue'
  import TrainingPlanFolderSelector from '~/components/plans/library/TrainingPlanFolderSelector.vue'

  const props = defineProps<{
    templates: any[]
    loading?: boolean
    libraryScope: 'athlete' | 'coach' | 'all'
    scheduleTargets?: Array<{
      label: string
      date: string
      athleteId?: string
    }>
  }>()

  const emit = defineEmits<{
    'schedule-template': [payload: { template: any; date: string; athleteId?: string }]
    'update:libraryScope': [value: 'athlete' | 'coach' | 'all']
    refresh: []
  }>()

  const searchQuery = ref('')
  const selectedPlanId = ref<string | null>(null)
  const detailedPlan = ref<any>(null)
  const loadingPlan = ref(false)
  const expandedBlockIds = ref<string[]>([])
  const expandedWeekIds = ref<string[]>([])
  const showScopeModal = ref(false)
  const selectedTab = ref<'all' | 'favorites' | 'team' | 'public'>('all')

  const {
    source: librarySource,
    options: librarySourceOptions,
    isCoachingMode
  } = useLibrarySource('coaching-calendar-plans')

  const {
    tree: folderTree,
    counts: folderCounts,
    selectedScope,
    selectedFolderLabel,
    expandedSet,
    scopedFolderIds,
    setSelectedScope,
    toggleExpanded
  } = useTrainingPlanFolders('coaching-calendar-plans', {
    librarySource: computed(() => props.libraryScope)
  })

  const filteredTemplates = computed(() => {
    let items = props.templates || []

    // 1. Filter by Folder from useTrainingPlanFolders
    if (props.libraryScope !== 'all') {
      if (selectedScope.value === 'unfiled') {
        items = items.filter((t) => !t.folderId)
      } else if (scopedFolderIds.value?.length) {
        items = items.filter((t) => scopedFolderIds.value?.includes(t.folderId))
      }
    }

    // 2. Filter by Tab (Favorites, Team, Public)
    if (selectedTab.value === 'favorites') {
      items = items.filter((t) => t.isFavorite)
    } else if (selectedTab.value === 'team') {
      items = items.filter((t) => t.visibility === 'TEAM' || t.teamId)
    } else if (selectedTab.value === 'public') {
      items = items.filter((t) => t.visibility === 'PUBLIC')
    }

    // 3. Search query
    const query = searchQuery.value.trim().toLowerCase()
    if (query) {
      items = items.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.goal?.title?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      )
    }

    return items
  })

  function cycleTabs() {
    const tabs = ['all', 'favorites', 'team', 'public'] as const
    const idx = tabs.indexOf(selectedTab.value)
    selectedTab.value = tabs[(idx + 1) % tabs.length] as any
  }

  async function selectPlan(id: string) {
    selectedPlanId.value = id
    loadingPlan.value = true
    try {
      detailedPlan.value = await $fetch(`/api/plans/${id}`)
      // Expand first block by default if available
      if (detailedPlan.value?.blocks?.[0]) {
        expandedBlockIds.value = [detailedPlan.value.blocks[0].id]
      }
    } catch (e) {
      console.error('Failed to load plan detail', e)
    } finally {
      loadingPlan.value = false
    }
  }

  function toggleBlock(id: string) {
    if (expandedBlockIds.value.includes(id)) {
      expandedBlockIds.value = expandedBlockIds.value.filter((i) => i !== id)
    } else {
      expandedBlockIds.value.push(id)
    }
  }

  function toggleWeek(id: string) {
    if (expandedWeekIds.value.includes(id)) {
      expandedWeekIds.value = expandedWeekIds.value.filter((i) => i !== id)
    } else {
      expandedWeekIds.value.push(id)
    }
  }

  function onWorkoutDragStart(event: DragEvent, workout: any) {
    if (!event.dataTransfer) return

    event.dataTransfer.effectAllowed = 'copy'
    // Normalize to the same format as workout templates for existing drop handlers
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        source: 'library-template',
        template: {
          ...workout,
          id: `plan-workout-${workout.id}`, // Unique ID for drag tracking
          sourceId: workout.id
        }
      })
    )
  }

  function getScheduleActions(workout: any) {
    return (props.scheduleTargets || []).map((target) => ({
      label: target.label,
      icon: 'i-heroicons-calendar-days',
      onSelect: () =>
        emit('schedule-template', {
          template: workout,
          date: target.date,
          athleteId: target.athleteId
        })
    }))
  }

  function refreshPlanTemplates() {
    emit('refresh')
  }

  function openInLibrary() {
    if (selectedPlanId.value) {
      navigateTo(`/library/plans/${selectedPlanId.value}/overview`)
    }
  }
</script>
