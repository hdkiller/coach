<template>
  <div
    v-bind="rootAttrs"
    :class="[
      rootContainerClass,
      attrs.class,
      'transition-all duration-200 ease-out',
      dragPassThrough ? 'pointer-events-none' : '',
      isDragging ? 'opacity-[0.04] scale-[0.985] saturate-50' : 'opacity-100 scale-100'
    ]"
  >
    <div :class="shellClass">
      <div
        v-if="isBottomSurface && open"
        class="flex items-center justify-center px-4 pt-2 pb-1 cursor-ns-resize touch-none"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize workout drawer"
        @pointerdown.stop.prevent="startResize"
      >
        <div class="h-1.5 w-16 rounded-full bg-default/80" />
      </div>

      <button
        v-if="isBottomSurface"
        class="hidden w-full items-center justify-between gap-3 border-b border-default/70 px-4 py-3 text-left sm:flex sm:py-3.5"
        @click="$emit('toggle')"
      >
        <div class="flex min-w-0 items-center gap-3">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-8 sm:w-8 sm:rounded-xl"
          >
            <UIcon name="i-heroicons-rectangle-stack" class="h-4 w-4" />
          </div>
          <div class="hidden min-w-0 sm:block">
            <div class="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">
              Workouts Drawer
            </div>
            <div class="truncate text-base font-semibold text-highlighted sm:text-sm">
              Drag items from {{ selectedFolderLabel.toLowerCase() }}
            </div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-3">
          <span class="hidden text-xs text-muted sm:inline">{{ templates.length }} items</span>
          <span class="text-xs text-muted sm:hidden">{{ templates.length }}</span>
          <UIcon
            :name="open ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
            class="hidden h-4 w-4 text-muted sm:block"
          />
        </div>
      </button>

      <div v-if="surfaceOpen" class="overflow-hidden flex flex-col" :style="surfaceBodyStyle">
        <div :class="toolbarClass">
          <div v-if="isRailSurface" class="flex flex-col gap-2.5">
            <div class="flex items-center gap-2">
              <UInput
                v-model="localSearch"
                placeholder="Search items..."
                size="sm"
                icon="i-heroicons-magnifying-glass"
                class="min-w-0 flex-1"
              />

              <UDropdownMenu :items="railActionMenuItems" :content="{ align: 'end' }">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-ellipsis-horizontal"
                  class="h-9 w-9 shrink-0 justify-center rounded-xl p-0"
                  title="Workout actions"
                  aria-label="Workout actions"
                />
              </UDropdownMenu>
            </div>

            <div class="flex items-center gap-2">
              <UButton
                size="sm"
                color="neutral"
                variant="soft"
                icon="i-heroicons-folder-open"
                class="h-9 min-w-0 flex-1 justify-start rounded-xl px-3"
                @click="showFolderPicker = true"
              >
                <span class="truncate">{{ selectedScopeLabel }}</span>
              </UButton>

              <UPopover>
                <UButton
                  size="sm"
                  color="neutral"
                  variant="soft"
                  icon="i-heroicons-funnel"
                  class="h-9 shrink-0 rounded-xl px-3"
                >
                  {{ filtersButtonLabel }}
                </UButton>

                <template #content>
                  <div class="w-72 space-y-3 p-3">
                    <div class="space-y-1">
                      <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                        Type
                      </div>
                      <USelectMenu
                        v-model="selectedType"
                        value-key="value"
                        :items="typeFilterOptions"
                        size="sm"
                        class="w-full"
                        :ui="railCompactSelectUi"
                      />
                    </div>

                    <div class="space-y-1">
                      <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                        Duration
                      </div>
                      <USelectMenu
                        v-model="selectedDuration"
                        value-key="value"
                        :items="durationFilterOptions"
                        size="sm"
                        class="w-full"
                        :ui="railCompactSelectUi"
                      />
                    </div>

                    <div class="flex justify-end">
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        :disabled="activeRailFilterCount === 0"
                        @click="resetRailFilters"
                      >
                        Reset filters
                      </UButton>
                    </div>
                  </div>
                </template>
              </UPopover>
            </div>

            <div v-if="activeRailFilterChips.length" class="flex flex-wrap gap-1.5">
              <UBadge
                v-for="chip in activeRailFilterChips"
                :key="chip.key"
                color="neutral"
                variant="soft"
                class="cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-bold"
                @click="chip.clear"
              >
                {{ chip.label }}
              </UBadge>
            </div>
          </div>

          <div v-else class="hidden items-center gap-2 sm:flex">
            <div v-if="isCoachingMode" class="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <UButton
                v-for="option in librarySourceOptions"
                :key="option.value"
                size="xs"
                :color="librarySource === option.value ? 'primary' : 'neutral'"
                :variant="librarySource === option.value ? 'solid' : 'ghost'"
                class="h-8 shrink-0 justify-start rounded-xl px-3"
                @click="$emit('update:librarySource', option.value)"
              >
                {{ option.label }}
              </UButton>
            </div>

            <UButton
              size="xs"
              :color="selectedScope === 'all' ? 'primary' : 'neutral'"
              :variant="selectedScope === 'all' ? 'solid' : 'ghost'"
              icon="i-heroicons-squares-2x2"
              class="h-8 shrink-0 justify-start rounded-xl px-3"
              :disabled="librarySource === 'all'"
              @click="setSelectedScope('all')"
            >
              Show all
            </UButton>

            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-heroicons-folder-open"
              class="min-w-0 max-w-[220px] shrink-0 justify-start rounded-xl px-3 h-8"
              :disabled="librarySource === 'all'"
              @click="showFolderPicker = true"
            >
              <span class="truncate">{{ selectedFolderLabel }}</span>
            </UButton>

            <div class="mx-1 h-6 w-px shrink-0 bg-default/70" />

            <div class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
              <UTooltip text="All Types">
                <UButton
                  size="xs"
                  :color="selectedType === 'all' ? 'primary' : 'neutral'"
                  :variant="selectedType === 'all' ? 'solid' : 'ghost'"
                  icon="i-heroicons-squares-2x2"
                  class="h-8 shrink-0 rounded-xl px-2.5"
                  @click="selectedType = 'all'"
                />
              </UTooltip>
              <UTooltip v-for="type in workoutTypes" :key="type.value" :text="type.label">
                <UButton
                  size="xs"
                  :color="selectedType === type.value ? 'primary' : 'neutral'"
                  :variant="selectedType === type.value ? 'solid' : 'ghost'"
                  :icon="type.icon"
                  class="h-8 shrink-0 rounded-xl px-2.5"
                  @click="selectedType = type.value"
                />
              </UTooltip>

              <div class="mx-1 h-6 w-px shrink-0 bg-default/70" />

              <UButton
                v-for="range in durationRanges"
                :key="range.label"
                size="xs"
                :color="selectedDuration === range.value ? 'primary' : 'neutral'"
                :variant="selectedDuration === range.value ? 'solid' : 'ghost'"
                class="h-8 shrink-0 rounded-xl px-3 text-[10px] font-bold uppercase tracking-wider"
                @click="selectedDuration = range.value"
              >
                {{ range.label }}
              </UButton>
            </div>

            <div class="flex items-center gap-2 pl-2">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-plus"
                class="h-8 w-8 shrink-0 justify-center rounded-xl p-0"
                title="Create item"
                @click="openCreateModal('workout')"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :icon="open ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
                class="h-8 w-8 shrink-0 justify-center rounded-xl p-0"
                @click="$emit('toggle')"
              />
            </div>
          </div>

          <!-- Mobile Toolbar -->
          <div class="flex flex-col gap-3 sm:hidden">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <UIcon name="i-heroicons-rectangle-stack" class="h-4 w-4" />
                </div>
                <div class="text-sm font-bold text-highlighted">Workouts</div>
              </div>

              <div class="flex items-center gap-1">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-magnifying-glass"
                  class="h-9 w-9 rounded-xl p-0"
                  @click="mobileSearchOpen = !mobileSearchOpen"
                />
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-folder-open"
                  class="h-9 w-9 rounded-xl p-0"
                  @click="showFolderPicker = true"
                />
                <UDropdownMenu :items="mobileActionMenuItems" :content="{ align: 'end' }">
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-ellipsis-horizontal"
                    class="h-9 w-9 rounded-xl p-0"
                  />
                </UDropdownMenu>
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  :icon="open ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
                  class="h-9 w-9 rounded-xl p-0"
                  :aria-label="open ? 'Collapse drawer' : 'Expand drawer'"
                  @click.stop="$emit('toggle')"
                />
              </div>
            </div>

            <UInput
              v-if="mobileSearchOpen || localSearch"
              v-model="localSearch"
              placeholder="Search items..."
              size="sm"
              icon="i-heroicons-magnifying-glass"
              class="w-full"
            />

            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <UTooltip text="All Types">
                <UButton
                  size="xs"
                  :color="selectedType === 'all' ? 'primary' : 'neutral'"
                  :variant="selectedType === 'all' ? 'solid' : 'ghost'"
                  icon="i-heroicons-squares-2x2"
                  class="h-9 shrink-0 rounded-xl px-2.5"
                  @click="selectedType = 'all'"
                />
              </UTooltip>
              <UTooltip v-for="type in workoutTypes" :key="type.value" :text="type.label">
                <UButton
                  size="xs"
                  :color="selectedType === type.value ? 'primary' : 'neutral'"
                  :variant="selectedType === type.value ? 'solid' : 'ghost'"
                  :icon="type.icon"
                  class="h-9 shrink-0 rounded-xl px-2.5"
                  @click="selectedType = type.value"
                />
              </UTooltip>

              <div class="mx-1 h-6 w-px shrink-0 bg-default/70" />

              <UButton
                v-for="range in durationRanges"
                :key="range.label"
                size="xs"
                :color="selectedDuration === range.value ? 'primary' : 'neutral'"
                :variant="selectedDuration === range.value ? 'solid' : 'ghost'"
                class="h-9 shrink-0 rounded-xl px-3 text-[10px] font-bold uppercase tracking-wider"
                @click="selectedDuration = range.value"
              >
                {{ range.label }}
              </UButton>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-3 sm:py-4">
          <div v-if="loading" :class="templatesGridClass">
            <USkeleton v-for="i in 6" :key="i" class="h-24 w-full rounded-2xl" />
          </div>

          <UAlert
            v-else-if="error"
            color="warning"
            variant="soft"
            title="Workouts unavailable"
            description="Workout templates failed to load."
          />

          <div
            v-else-if="filteredTemplates.length === 0"
            class="rounded-2xl border border-dashed border-default/80 px-4 py-8 text-center text-sm text-muted"
          >
            No matching items found.
          </div>

          <div v-else :class="templatesGridClass">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              draggable="true"
              class="group/card relative cursor-grab rounded-[24px] border border-default/80 bg-muted/10 p-3.5 transition hover:border-primary/40 hover:bg-muted/20 active:cursor-grabbing sm:rounded-2xl sm:p-4"
              @dragstart="onTemplateDragStart($event, template)"
              @dragend="onTemplateDragEnd"
              @click="previewTemplateId = template.id"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="line-clamp-2 text-[15px] font-semibold text-highlighted sm:text-sm">
                    {{ template.title }}
                  </div>
                  <div class="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                    {{ getTemplateLabel(template) }}
                  </div>
                  <div
                    v-if="librarySource === 'all' && template.ownerScope"
                    class="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary/80"
                  >
                    {{ template.ownerScope === 'coach' ? 'Coach workouts' : 'Athlete workouts' }}
                  </div>
                  <div
                    v-if="template.description"
                    class="mt-1.5 hidden line-clamp-3 text-[11px] leading-5 text-muted sm:block"
                  >
                    {{ template.description }}
                  </div>
                </div>

                <div class="flex flex-col items-end gap-2">
                  <UDropdownMenu :items="scheduleMenuItems(template)" :content="{ align: 'end' }">
                    <UButton
                      size="xs"
                      color="primary"
                      variant="soft"
                      icon="i-heroicons-plus"
                      class="h-8 w-8 rounded-xl p-0 opacity-0 transition-opacity group-hover/card:opacity-100 sm:h-7 sm:w-7"
                      title="Add to calendar"
                      @click.stop
                    />
                  </UDropdownMenu>

                  <div class="text-right">
                    <div class="text-[13px] font-black text-highlighted sm:text-xs">
                      {{ formatMinutes((template.durationSec || 0) / 60) }}
                    </div>
                    <div
                      v-if="template.tss"
                      class="text-[10px] font-bold uppercase tracking-wider text-muted sm:text-[9px]"
                    >
                      {{ template.tss }} TSS
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="template.structuredWorkout?.steps"
                class="mt-3.5 overflow-hidden rounded-xl border border-default/60 bg-default sm:mt-3"
              >
                <MiniWorkoutChart
                  :steps="template.structuredWorkout.steps"
                  class="h-14 w-full sm:h-12"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <WorkoutTemplatePreviewModal
    v-model:open="previewTemplateId"
    :template-id="previewTemplateId!"
    :template-owner-scope="
      normalizedTemplates.find((item) => item.id === previewTemplateId)?.ownerScope
    "
    @view="onPreviewViewDetails"
  />

  <LibraryScopeModal
    v-model:open="showFolderPicker"
    mode="workout"
    title="Choose Folder"
    description="Choose the workout source and folder scope for this drawer."
    :source="librarySource"
    :source-options="librarySourceOptions"
    :is-coaching-mode="isCoachingMode"
    :folder-tree="folderTree"
    :folder-counts="folderCounts"
    :selected-scope="selectedScope"
    :expanded-set="expandedSet"
    @update:source="updateLibrarySourceFromPicker"
    @select-scope="selectScopeFromPicker"
    @toggle-folder="toggleExpanded"
  />

  <!-- Technical View Modal -->
  <WorkoutTechnicalViewModal
    v-if="showTechnicalModal"
    :workout="technicalWorkout"
    @update:open="showTechnicalModal = $event"
  />

  <UModal
    v-model:open="isCreateModalOpen"
    :title="createMode === 'note' ? 'Create note' : 'Create workout'"
  >
    <template #body>
      <div class="space-y-4 p-4">
        <UFormField :label="createMode === 'note' ? 'Note title' : 'Workout title'">
          <UInput v-model="draftTemplate.title" />
        </UFormField>

        <div v-if="createMode !== 'note'" class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Type">
            <USelect v-model="draftTemplate.type" :items="workoutTypeOptions" />
          </UFormField>
          <UFormField label="Category">
            <UInput v-model="draftTemplate.category" placeholder="Workout" />
          </UFormField>
        </div>

        <div v-if="createMode !== 'note'" class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Minutes">
            <UInput v-model.number="draftTemplate.durationMinutes" type="number" min="0" />
          </UFormField>
          <UFormField label="TSS">
            <UInput v-model.number="draftTemplate.tss" type="number" min="0" />
          </UFormField>
        </div>

        <UFormField :label="createMode === 'note' ? 'Body' : 'Description'">
          <UTextarea v-model="draftTemplate.description" :rows="createMode === 'note' ? 6 : 4" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 p-4 pt-0">
        <UButton color="neutral" variant="ghost" @click="isCreateModalOpen = false">Cancel</UButton>
        <UButton color="primary" :loading="creatingTemplate" @click="createLibraryTemplate"
          >Create</UButton
        >
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { useMediaQuery } from '@vueuse/core'
  import { useAttrs } from 'vue'
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import LibraryScopeModal from '~/components/library/LibraryScopeModal.vue'
  import WorkoutFolderSelector from '~/components/workouts/library/WorkoutFolderSelector.vue'
  import WorkoutTemplatePreviewModal from '~/components/workouts/WorkoutTemplatePreviewModal.vue'
  import WorkoutTechnicalViewModal from '~/components/workouts/WorkoutTechnicalViewModal.vue'
  import { getWorkoutIcon } from '~/utils/activity-types'

  defineOptions({
    inheritAttrs: false
  })

  const props = defineProps<{
    open: boolean
    surface?: 'bottom' | 'rail'
    templates: any[] | Record<string, any[]>
    loading?: boolean
    error?: boolean
    allowCalendarTarget?: boolean
    librarySource?: 'athlete' | 'coach' | 'all'
    isCoachingMode?: boolean
    scheduleTargets?: Array<{
      label: string
      date: string
      athleteId?: string
    }>
  }>()

  const emit = defineEmits<{
    toggle: []
    created: []
    'open-calendar-picker': [payload: { template: any }]
    'schedule-template': [payload: { template: any; date: string; athleteId?: string }]
    'update:librarySource': [value: 'athlete' | 'coach' | 'all']
  }>()

  const attrs = useAttrs()
  const rootAttrs = computed(() => {
    const { class: _class, ...rest } = attrs
    return rest
  })
  const isBottomSurface = computed(() => (props.surface || 'bottom') === 'bottom')
  const isRailSurface = computed(() => !isBottomSurface.value)
  const surfaceOpen = computed(() => (isBottomSurface.value ? props.open : true))
  const rootContainerClass = computed(() =>
    isBottomSurface.value ? 'fixed inset-x-0 bottom-0 z-[70] sm:inset-x-4 sm:bottom-4' : 'h-full'
  )
  const shellClass = computed(() =>
    isBottomSurface.value
      ? 'overflow-hidden rounded-t-3xl border-x-0 border-t border-default/80 bg-default/95 shadow-2xl backdrop-blur sm:rounded-3xl sm:border'
      : 'flex h-full flex-col overflow-hidden rounded-2xl border border-default/80 bg-default shadow-sm'
  )
  const toolbarClass = computed(() =>
    isBottomSurface.value
      ? 'sticky top-0 z-10 border-t border-default/70 bg-default/95 px-4 py-2.5 backdrop-blur-sm sm:border-t-0 sm:border-b sm:bg-default/60 sm:py-3'
      : 'border-b border-default/70 bg-default px-3 py-3'
  )
  const surfaceBodyStyle = computed(() =>
    isBottomSurface.value ? { height: `${drawerHeight.value}px` } : undefined
  )
  const templatesGridClass = computed(() =>
    isRailSurface.value ? 'grid grid-cols-1 gap-3' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-3'
  )
  const railCompactSelectUi = {
    base: 'h-9 rounded-xl border-default/80 bg-muted/10 px-3 text-sm font-semibold text-highlighted',
    content: 'min-w-[12rem]'
  }
  const toast = useToast()
  const localSearch = ref('')
  const mobileSearchOpen = ref(false)
  const isDragging = ref(false)
  const dragPassThrough = ref(false)
  let dragPassThroughFrame: number | null = null
  const generatingId = ref<string | null>(null)
  const selectedType = ref('all')
  const selectedDuration = ref('all')
  const previewTemplateId = ref<string | null>(null)
  const isCreateModalOpen = ref(false)
  const createMode = ref<'workout' | 'note'>('workout')
  const creatingTemplate = ref(false)
  const drawerHeight = ref(420)
  const resizing = ref(false)
  const resizeStartY = ref(0)
  const resizeStartHeight = ref(420)
  const showFolderPicker = ref(false)
  const librarySource = computed(() => props.librarySource || 'athlete')

  const { options: librarySourceOptions, isCoachingMode: isCoachingLibraryMode } = useLibrarySource(
    'workout-drawer',
    { itemLabel: 'workouts' }
  )

  const {
    tree: folderTree,
    counts: folderCounts,
    selectedScope,
    selectedFolderLabel,
    expandedSet,
    scopedFolderIds,
    ensureFoldersLoaded,
    setSelectedScope,
    toggleExpanded
  } = useWorkoutTemplateFolders('workout-drawer', {
    librarySource
  })

  // Technical Modal state
  const showTechnicalModal = ref(false)
  const technicalWorkout = ref<any>(null)

  const normalizedTemplates = computed(() => {
    if (Array.isArray(props.templates)) {
      return props.templates
    }

    return [...(props.templates?.coach || []), ...(props.templates?.athlete || [])]
  })

  const workoutTypeOptions = ['Ride', 'Run', 'Swim', 'WeightTraining', 'Workout', 'Recovery']
  const draftTemplate = ref({
    title: '',
    description: '',
    type: 'Ride',
    category: 'Workout',
    durationMinutes: 60,
    tss: 50
  })

  const minDrawerHeight = 240

  function getMaxDrawerHeight() {
    if (typeof window === 'undefined') {
      return 640
    }

    return Math.max(minDrawerHeight, window.innerHeight - 140)
  }

  function clampDrawerHeight(value: number) {
    return Math.min(getMaxDrawerHeight(), Math.max(minDrawerHeight, value))
  }

  function onPreviewViewDetails() {
    const template = normalizedTemplates.value.find((t) => t.id === previewTemplateId.value)
    if (template) {
      technicalWorkout.value = template
      showTechnicalModal.value = true
    }
  }

  function isNoteTemplate(template: any) {
    return template?.category === 'Note' || template?.type === 'Note'
  }

  function getTemplateLabel(template: any) {
    return isNoteTemplate(template) ? 'Note' : template?.type || template?.category || 'Workout'
  }

  function scheduleMenuItems(template: any) {
    const items = (props.scheduleTargets || []).map((target) => ({
      label: target.label,
      icon: 'i-heroicons-calendar-days',
      onSelect: () =>
        emit('schedule-template', {
          template,
          date: target.date,
          athleteId: target.athleteId
        })
    }))

    if (props.allowCalendarTarget) {
      items.push({
        label: 'Choose from calendar',
        icon: 'i-heroicons-calendar',
        onSelect: () => emit('open-calendar-picker', { template })
      })
    }

    return items
  }

  const workoutTypes = [
    { label: 'Ride', value: 'Ride', icon: 'i-tabler-bike' },
    { label: 'Run', value: 'Run', icon: 'i-tabler-run' },
    { label: 'Swim', value: 'Swim', icon: 'i-tabler-swimming' },
    { label: 'Gym', value: 'WeightTraining', icon: 'i-tabler-barbell' },
    { label: 'Notes', value: 'Note', icon: 'i-heroicons-document-text' }
  ]

  const durationRanges = [
    { label: 'All', value: 'all' },
    { label: '<30m', value: 'short' },
    { label: '30-60m', value: 'medium' },
    { label: '60m+', value: 'long' }
  ]
  const typeFilterOptions = [
    { label: 'All types', value: 'all' },
    ...workoutTypes.map((type) => ({ label: type.label, value: type.value }))
  ]
  const durationFilterOptions = durationRanges.map((range) => ({
    label: range.value === 'all' ? 'All durations' : range.label,
    value: range.value
  }))
  const activeRailFilterCount = computed(() => {
    let count = 0
    if (selectedType.value !== 'all') count += 1
    if (selectedDuration.value !== 'all') count += 1
    return count
  })
  const filtersButtonLabel = computed(() =>
    activeRailFilterCount.value > 0 ? `Filters (${activeRailFilterCount.value})` : 'Filters'
  )
  const selectedScopeLabel = computed(() => {
    const sourceLabel =
      librarySourceOptions.value.find((option) => option.value === librarySource.value)?.label ||
      'Coach'
    const folderLabel =
      selectedScope.value === 'all'
        ? 'All workouts'
        : selectedScope.value === 'unfiled'
          ? 'Unfiled workouts'
          : selectedFolderLabel.value

    return `${sourceLabel} • ${folderLabel}`
  })
  const activeRailFilterChips = computed(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = []

    if (selectedType.value !== 'all') {
      const typeLabel =
        typeFilterOptions.find((option) => option.value === selectedType.value)?.label ||
        selectedType.value
      chips.push({
        key: `type-${selectedType.value}`,
        label: typeLabel,
        clear: () => {
          selectedType.value = 'all'
        }
      })
    }

    if (selectedDuration.value !== 'all') {
      const durationLabel =
        durationFilterOptions.find((option) => option.value === selectedDuration.value)?.label ||
        selectedDuration.value
      chips.push({
        key: `duration-${selectedDuration.value}`,
        label: durationLabel,
        clear: () => {
          selectedDuration.value = 'all'
        }
      })
    }

    return chips
  })
  const railActionMenuItems = computed(() => [
    [
      {
        label: 'New workout',
        icon: 'i-heroicons-plus',
        onSelect: () => openCreateModal('workout')
      },
      {
        label: 'New note',
        icon: 'i-heroicons-document-text',
        onSelect: () => openCreateModal('note')
      }
    ],
    [
      {
        label: 'Open workout library',
        icon: 'i-heroicons-arrow-top-right-on-square',
        onSelect: () => navigateTo('/library/workouts')
      },
      ...(librarySource.value === 'all'
        ? []
        : [
            {
              label: 'Choose folder',
              icon: 'i-heroicons-folder-open',
              onSelect: () => {
                showFolderPicker.value = true
              }
            }
          ])
    ]
  ])

  const mobileActionMenuItems = computed(() => [
    [
      {
        label: 'New note',
        icon: 'i-heroicons-document-text',
        onSelect: () => openCreateModal('note')
      },
      ...(props.librarySource === 'all'
        ? []
        : [
            {
              label: 'Choose folder',
              icon: 'i-heroicons-folder-open',
              onSelect: () => {
                showFolderPicker.value = true
              }
            }
          ])
    ],
    [
      {
        label: 'Open library',
        icon: 'i-heroicons-arrow-top-right-on-square',
        onSelect: () => navigateTo('/library/workouts')
      }
    ]
  ])

  const filteredTemplates = computed(() => {
    let result = normalizedTemplates.value

    if (props.librarySource !== 'all' && selectedScope.value === 'unfiled') {
      result = result.filter((template) => !template.folderId)
    } else if (props.librarySource !== 'all' && scopedFolderIds.value?.length) {
      result = result.filter((template) => scopedFolderIds.value?.includes(template.folderId))
    }

    // Type filter
    if (selectedType.value !== 'all') {
      result = result.filter((t) => t.type === selectedType.value)
    }

    // Duration filter
    if (selectedDuration.value !== 'all') {
      result = result.filter((t) => {
        const mins = (t.durationSec || 0) / 60
        if (selectedDuration.value === 'short') return mins < 30
        if (selectedDuration.value === 'medium') return mins >= 30 && mins <= 60
        if (selectedDuration.value === 'long') return mins > 60
        return true
      })
    }

    // Search filter
    const query = localSearch.value.trim().toLowerCase()
    if (query) {
      result = result.filter(
        (template) =>
          template.title?.toLowerCase().includes(query) ||
          getTemplateLabel(template).toLowerCase().includes(query) ||
          template.type?.toLowerCase().includes(query) ||
          template.category?.toLowerCase().includes(query)
      )
    }

    return result
  })

  function formatMinutes(minutes: number) {
    const safeMinutes = Math.max(0, Math.round(minutes || 0))
    const hours = Math.floor(safeMinutes / 60)
    const remainder = safeMinutes % 60

    if (!hours) {
      return `${remainder}m`
    }

    if (!remainder) {
      return `${hours}h`
    }

    return `${hours}h ${remainder}m`
  }

  function onTemplateDragStart(event: DragEvent, template: any) {
    if (!event.dataTransfer) {
      return
    }

    isDragging.value = true
    if (typeof window !== 'undefined') {
      if (dragPassThroughFrame !== null) {
        window.cancelAnimationFrame(dragPassThroughFrame)
      }
      // Delay pass-through until the browser has established the active drag source.
      dragPassThroughFrame = window.requestAnimationFrame(() => {
        dragPassThrough.value = true
        dragPassThroughFrame = null
      })
    }
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        source: 'library-template',
        template
      })
    )
  }

  function onTemplateDragEnd() {
    if (typeof window !== 'undefined' && dragPassThroughFrame !== null) {
      window.cancelAnimationFrame(dragPassThroughFrame)
      dragPassThroughFrame = null
    }
    isDragging.value = false
    dragPassThrough.value = false
  }

  function startResize(event: PointerEvent) {
    resizing.value = true
    resizeStartY.value = event.clientY
    resizeStartHeight.value = drawerHeight.value
    window.addEventListener('pointermove', onResizeMove)
    window.addEventListener('pointerup', stopResize)
  }

  function onResizeMove(event: PointerEvent) {
    if (!resizing.value) {
      return
    }

    const delta = resizeStartY.value - event.clientY
    drawerHeight.value = clampDrawerHeight(resizeStartHeight.value + delta)
  }

  function stopResize() {
    resizing.value = false
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', stopResize)
  }

  onBeforeUnmount(() => {
    stopResize()
    onTemplateDragEnd()
    if (typeof window !== 'undefined') {
      window.removeEventListener('dragend', onTemplateDragEnd)
      window.removeEventListener('drop', onTemplateDragEnd)
    }
  })

  onMounted(() => {
    if (props.librarySource !== 'all') {
      void ensureFoldersLoaded()
    }
    window.addEventListener('dragend', onTemplateDragEnd)
    window.addEventListener('drop', onTemplateDragEnd)
  })

  function selectScopeFromPicker(scope: string) {
    setSelectedScope(scope)
    showFolderPicker.value = false
  }

  function updateLibrarySourceFromPicker(value: 'athlete' | 'coach' | 'all') {
    emit('update:librarySource', value)
  }

  function resetRailFilters() {
    selectedType.value = 'all'
    selectedDuration.value = 'all'
  }

  function openCreateModal(mode: 'workout' | 'note') {
    createMode.value = mode
    draftTemplate.value = {
      title: '',
      description: '',
      type: mode === 'note' ? 'Note' : 'Ride',
      category: mode === 'note' ? 'Note' : 'Workout',
      durationMinutes: mode === 'note' ? 0 : 60,
      tss: mode === 'note' ? 0 : 50
    }
    isCreateModalOpen.value = true
  }

  async function createLibraryTemplate() {
    if (!draftTemplate.value.title.trim()) {
      toast.add({ title: 'Title required', color: 'warning' })
      return
    }

    creatingTemplate.value = true
    try {
      await $fetch('/api/library/workouts', {
        method: 'POST',
        body: {
          title: draftTemplate.value.title.trim(),
          description: draftTemplate.value.description.trim() || undefined,
          type: createMode.value === 'note' ? 'Note' : draftTemplate.value.type,
          category: createMode.value === 'note' ? 'Note' : draftTemplate.value.category,
          durationSec:
            createMode.value === 'note'
              ? 0
              : Math.max(0, Number(draftTemplate.value.durationMinutes) || 0) * 60,
          tss: createMode.value === 'note' ? 0 : Math.max(0, Number(draftTemplate.value.tss) || 0),
          structuredWorkout: null,
          ownerScope: props.librarySource === 'athlete' ? 'athlete' : 'coach'
        }
      })
      isCreateModalOpen.value = false
      toast.add({
        title: createMode.value === 'note' ? 'Note created' : 'Workout created',
        color: 'success'
      })
      emit('created')
    } catch (error: any) {
      toast.add({
        title: 'Create failed',
        description: error.data?.message || 'Failed to create library item.',
        color: 'error'
      })
    } finally {
      creatingTemplate.value = false
    }
  }

  async function generateTemplateStructure(id: string) {
    generatingId.value = id
    try {
      const template = normalizedTemplates.value.find((entry) => entry.id === id)
      await $fetch(`/api/library/workouts/${id}/generate-structure`, {
        method: 'POST',
        query: {
          scope: template?.ownerScope
        }
      })
      toast.add({
        title: 'Generation Started',
        description: 'AI is building the workout structure.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Generation Failed',
        description: error.data?.message || 'Failed to trigger generation',
        color: 'error'
      })
    } finally {
      generatingId.value = null
    }
  }
</script>
