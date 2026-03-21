<template>
  <UDashboardPanel id="coaching-calendar">
    <template #header>
      <UDashboardNavbar title="Coaching Calendar">
        <template #leading>
          <div class="flex items-center gap-1">
            <UDashboardSidebarCollapse />
            <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" to="/coaching" />
          </div>
        </template>
        <template #right>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <UButton
              icon="i-heroicons-rectangle-group"
              color="neutral"
              variant="outline"
              size="sm"
              @click="railCollapsed = !railCollapsed"
            >
              {{ railCollapsed ? 'Show roster' : 'Hide roster' }}
            </UButton>
            <UButton
              icon="i-heroicons-rectangle-group"
              color="neutral"
              variant="outline"
              size="sm"
              @click="toggleLibraryPanel"
            >
              {{ isLibraryPanelVisible ? 'Hide library' : 'Show library' }}
            </UButton>
            <UButton
              icon="i-heroicons-rectangle-stack"
              color="neutral"
              variant="outline"
              size="sm"
              @click="toggleDrawer"
            >
              {{ isWorkoutDrawerVisible ? 'Hide drawer' : 'Show drawer' }}
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full min-h-0">
        <aside
          class="overflow-hidden border-r border-default bg-default/80 transition-all duration-200"
          :class="railCollapsed ? 'w-0 border-r-0 opacity-0' : 'w-80 opacity-100'"
        >
          <div class="p-3 space-y-3">
            <div
              v-if="isLibraryDockedLeft"
              class="inline-flex w-full items-center rounded-2xl border border-default bg-muted/20 p-1"
            >
              <UButton
                size="sm"
                :color="leftRailTab === 'roster' ? 'primary' : 'neutral'"
                :variant="leftRailTab === 'roster' ? 'soft' : 'ghost'"
                class="flex-1"
                @click="leftRailTab = 'roster'"
              >
                Roster
              </UButton>
              <UButton
                size="sm"
                :color="leftRailTab === 'library' ? 'primary' : 'neutral'"
                :variant="leftRailTab === 'library' ? 'soft' : 'ghost'"
                class="flex-1"
                @click="leftRailTab = 'library'"
              >
                Library
              </UButton>
            </div>

            <div v-if="leftRailTab === 'roster'" class="space-y-1">
              <div class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                Athlete roster
              </div>
              <UInput
                v-model="athleteSearch"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search athletes"
                size="sm"
              />
            </div>

            <div
              v-if="leftRailTab === 'roster'"
              class="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1"
            >
              <button
                v-for="rel in filteredAthletes"
                :key="rel.athlete.id"
                class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
                :class="
                  primaryAthleteId === rel.athlete.id || secondaryAthleteId === rel.athlete.id
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-default/70 bg-default'
                "
                @click="setPrimaryAthlete(rel.athlete.id)"
              >
                <div class="flex items-center gap-3">
                  <UAvatar :src="rel.athlete.image" :alt="rel.athlete.name" size="md" />
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-bold text-highlighted">{{ rel.athlete.name }}</div>
                    <div class="text-xs text-muted">{{ rel.athlete.email }}</div>
                  </div>
                </div>

                <div class="mt-3 flex items-center gap-2">
                  <UButton
                    size="xs"
                    :color="primaryAthleteId === rel.athlete.id ? 'primary' : 'neutral'"
                    :variant="primaryAthleteId === rel.athlete.id ? 'solid' : 'soft'"
                    @click.stop="setPrimaryAthlete(rel.athlete.id)"
                  >
                    Primary
                  </UButton>
                  <UButton
                    size="xs"
                    :color="secondaryAthleteId === rel.athlete.id ? 'primary' : 'neutral'"
                    :variant="secondaryAthleteId === rel.athlete.id ? 'solid' : 'soft'"
                    :disabled="!isSplitView && secondaryAthleteId !== rel.athlete.id"
                    @click.stop="setSecondaryAthlete(rel.athlete.id)"
                  >
                    Compare
                  </UButton>
                </div>
              </button>
            </div>

            <div v-else class="h-[calc(100vh-180px)] min-h-[520px]">
              <PlanArchitectWorkoutDrawer
                surface="rail"
                :open="true"
                :templates="workoutTemplates || []"
                :loading="workoutTemplateStatus === 'pending'"
                :error="workoutTemplateStatus === 'error'"
                :library-source="workoutLibrarySource"
                :is-coaching-mode="true"
                allow-calendar-target
                :schedule-targets="workoutDrawerScheduleTargets"
                @created="refreshWorkoutTemplates"
                @update:library-source="workoutLibrarySource = $event"
                @open-calendar-picker="openTemplateCalendarPicker"
                @schedule-template="onQuickScheduleTemplate"
              />
            </div>
          </div>
        </aside>

        <div class="flex min-h-0 flex-1 flex-col">
          <div class="border-b border-default/70 px-4 py-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <UButton
                  icon="i-heroicons-chevron-left"
                  color="neutral"
                  variant="soft"
                  @click="movePanel('primary', -1)"
                />
                <UButton
                  icon="i-heroicons-chevron-right"
                  color="neutral"
                  variant="soft"
                  @click="movePanel('primary', 1)"
                />
                <UButton color="neutral" variant="ghost" @click="goToToday()">Today</UButton>
                <span class="text-sm font-bold text-highlighted">{{ toolbarLabel }}</span>
              </div>

              <div class="flex flex-wrap items-center justify-end gap-2">
                <div
                  class="inline-flex items-center rounded-xl border border-default bg-muted/30 p-1"
                >
                  <UButton
                    size="sm"
                    :color="viewMode === 'week-board' ? 'primary' : 'neutral'"
                    :variant="viewMode === 'week-board' ? 'soft' : 'ghost'"
                    icon="i-heroicons-calendar-days"
                    @click="viewMode = 'week-board'"
                  >
                    Week board
                  </UButton>
                  <UButton
                    size="sm"
                    :color="viewMode === 'month-grid' ? 'primary' : 'neutral'"
                    :variant="viewMode === 'month-grid' ? 'soft' : 'ghost'"
                    icon="i-heroicons-squares-2x2"
                    @click="viewMode = 'month-grid'"
                  >
                    Month grid
                  </UButton>
                </div>

                <UButton
                  :icon="
                    isSplitView ? 'i-heroicons-rectangle-group' : 'i-heroicons-rectangle-stack'
                  "
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="toggleSplitView"
                >
                  {{ isSplitView ? 'Split on' : 'Split off' }}
                </UButton>

                <UButton
                  v-if="isSplitView"
                  :icon="isNavigationSynced ? 'i-heroicons-link' : 'i-heroicons-link-slash'"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="isNavigationSynced = !isNavigationSynced"
                >
                  {{ isNavigationSynced ? 'Synced' : 'Unlocked' }}
                </UButton>

                <UButton
                  v-if="isSplitView"
                  icon="i-heroicons-arrows-right-left"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="swapAthletes"
                >
                  Swap
                </UButton>
              </div>
            </div>
          </div>

          <div
            class="min-h-0 flex-1 p-4"
            :class="[calendarViewportClass, bottomLibrarySpacerClass]"
          >
            <div class="grid min-h-0 gap-4" :class="calendarGridClass">
              <CoachCalendarPanel
                :athlete="primaryAthlete"
                :athlete-options="athletePickerOptions"
                :selected-athlete-id="primaryAthleteId"
                placeholder="Choose athlete"
                :view-mode="viewMode"
                :current-date="panelDates.primary"
                :data="panelState.primary.data"
                :loading="panelState.primary.pending"
                :error="panelState.primary.error"
                @select-athlete="setPrimaryAthlete"
                @schedule-template="onScheduleTemplate"
                @move-planned-workout="onMovePlannedWorkout"
                @duplicate-planned-workout="onDuplicatePlannedWorkout"
                @activity-click="onActivityClick"
              />

              <CoachCalendarPanel
                v-if="isSplitView"
                :athlete="secondaryAthlete"
                :athlete-options="comparisonAthletePickerOptions"
                :selected-athlete-id="secondaryAthleteId"
                placeholder="Choose compare athlete"
                :view-mode="viewMode"
                :current-date="panelDates.secondary"
                :data="panelState.secondary.data"
                :loading="panelState.secondary.pending"
                :error="panelState.secondary.error"
                @select-athlete="setSecondaryAthlete"
                @schedule-template="onScheduleTemplate"
                @move-planned-workout="onMovePlannedWorkout"
                @duplicate-planned-workout="onDuplicatePlannedWorkout"
                @activity-click="onActivityClick"
              />
            </div>

            <div v-if="showAddLaneButton" class="mt-6 flex justify-center">
              <UButton
                icon="i-heroicons-plus"
                color="neutral"
                variant="outline"
                size="sm"
                @click="enableCompareLane"
              >
                Add athlete lane
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <ClientOnly>
        <PlanArchitectWorkoutDrawer
          v-if="isWorkoutDrawerVisible"
          :open="isWorkoutDrawerOpen"
          :templates="workoutTemplates || []"
          :loading="workoutTemplateStatus === 'pending'"
          :error="workoutTemplateStatus === 'error'"
          :library-source="workoutLibrarySource"
          :is-coaching-mode="true"
          allow-calendar-target
          :schedule-targets="workoutDrawerScheduleTargets"
          class="z-[70]"
          @toggle="isWorkoutDrawerOpen = !isWorkoutDrawerOpen"
          @created="refreshWorkoutTemplates"
          @update:library-source="workoutLibrarySource = $event"
          @open-calendar-picker="openTemplateCalendarPicker"
          @schedule-template="onQuickScheduleTemplate"
        />
      </ClientOnly>

      <UModal
        v-model:open="showTemplateCalendarPicker"
        title="Schedule Workout"
        description="Choose the athlete and day for this library item."
      >
        <template #body>
          <div class="space-y-4 p-4">
            <USelectMenu
              v-model="calendarPickerAthleteId"
              value-key="value"
              :items="athletePickerOptions"
              placeholder="Choose athlete"
            />
            <div class="flex justify-center">
              <UCalendar v-model="calendarPickerDate" />
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showTemplateCalendarPicker = false">
              Cancel
            </UButton>
            <UButton
              color="primary"
              :disabled="!calendarPickerTemplate || !calendarPickerDate || !calendarPickerAthleteId"
              @click="confirmTemplateCalendarPicker"
            >
              Schedule
            </UButton>
          </div>
        </template>
      </UModal>

      <PlannedWorkoutModal
        v-model="showPlannedWorkoutModal"
        :planned-workout="selectedPlannedWorkout"
        :endpoint-base="selectedPlannedWorkoutEndpointBase"
        :show-completion-actions="false"
        :show-structure-actions="false"
        :show-save-to-library="false"
        @completed="refreshAffectedPanel(selectedPlannedWorkoutAthleteId)"
        @deleted="handlePlannedWorkoutDeleted"
      />

      <UModal
        v-model:open="showWorkoutPreviewModal"
        title="Workout Overview"
        description="A quick coach-facing summary of the completed session."
      >
        <template #body>
          <div v-if="selectedWorkout" class="space-y-4 p-2">
            <div>
              <div class="text-lg font-black">{{ selectedWorkout.title }}</div>
              <div class="text-xs uppercase tracking-widest text-muted">
                {{ selectedWorkout.type || 'Workout' }} •
                {{ formatDateUTC(selectedWorkout.date, 'MMM d, yyyy') }}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-xl border border-default/70 p-3">
                <div class="text-[10px] font-black uppercase tracking-wider text-muted">
                  Duration
                </div>
                <div class="mt-1 text-base font-black">
                  {{ formatDuration(selectedWorkout.durationSec) }}
                </div>
              </div>
              <div class="rounded-xl border border-default/70 p-3">
                <div class="text-[10px] font-black uppercase tracking-wider text-muted">TSS</div>
                <div class="mt-1 text-base font-black">
                  {{ Math.round(selectedWorkout.tss || 0) }}
                </div>
              </div>
              <div class="rounded-xl border border-default/70 p-3">
                <div class="text-[10px] font-black uppercase tracking-wider text-muted">Avg HR</div>
                <div class="mt-1 text-base font-black">{{ selectedWorkout.averageHr || '--' }}</div>
              </div>
              <div class="rounded-xl border border-default/70 p-3">
                <div class="text-[10px] font-black uppercase tracking-wider text-muted">
                  CTL / ATL
                </div>
                <div class="mt-1 text-base font-black">
                  {{ selectedWorkout.ctl ?? '--' }} / {{ selectedWorkout.atl ?? '--' }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
  import PlanArchitectWorkoutDrawer from '~/components/plans/PlanArchitectWorkoutDrawer.vue'
  import CoachCalendarPanel from '~/components/coaching/CoachCalendarPanel.vue'
  import { useCoachCalendar } from '~/composables/useCoachCalendar'

  definePageMeta({
    middleware: 'auth'
  })

  const { formatDateUTC } = useFormat()
  const toast = useToast()
  const route = useRoute()
  const athleteSearch = ref('')
  const railCollapsed = ref(false)
  const leftRailTab = ref<'roster' | 'library'>('roster')
  const isLibraryDockedLeft = ref(true)
  const showTemplateCalendarPicker = ref(false)
  const calendarPickerTemplate = ref<any | null>(null)
  const calendarPickerAthleteId = ref<string | null>(null)
  const calendarPickerDate = ref<any>(null)
  const showPlannedWorkoutModal = ref(false)
  const selectedPlannedWorkout = ref<any | null>(null)
  const selectedPlannedWorkoutAthleteId = ref<string | null>(null)
  const showWorkoutPreviewModal = ref(false)
  const selectedWorkout = ref<any | null>(null)


  const athletes = ref<any[]>([])
  const loadingAthletes = ref(true)
  const workoutLibrarySource = ref<'coach' | 'athlete' | 'all'>('coach')
  const isWorkoutDrawerVisible = ref(false)
  const isWorkoutDrawerOpen = ref(false)

  const {
    primaryAthleteId,
    secondaryAthleteId,
    viewMode,
    isSplitView,
    isNavigationSynced,
    panelDates,
    setPrimaryAthlete,
    setSecondaryAthlete,
    toggleSplitView,
    swapAthletes,
    movePanel,
    goToToday
  } = useCoachCalendar()

  const {
    data: workoutTemplates,
    status: workoutTemplateStatus,
    refresh: refreshWorkoutTemplates
  } = useLazyFetch<any[]>('/api/library/workouts', {
    server: false,
    default: () => [],
    query: computed(() => ({
      scope: workoutLibrarySource.value
    }))
  })

  const panelState = reactive({
    primary: {
      pending: false,
      error: null as any,
      data: null as any
    },
    secondary: {
      pending: false,
      error: null as any,
      data: null as any
    }
  })

  const primaryAthlete = computed(
    () => athletes.value.find((rel) => rel.athlete.id === primaryAthleteId.value)?.athlete || null
  )
  const secondaryAthlete = computed(
    () => athletes.value.find((rel) => rel.athlete.id === secondaryAthleteId.value)?.athlete || null
  )
  const filteredAthletes = computed(() => {
    const query = athleteSearch.value.trim().toLowerCase()
    if (!query) return athletes.value
    return athletes.value.filter((rel) =>
      `${rel.athlete.name || ''} ${rel.athlete.email || ''}`.toLowerCase().includes(query)
    )
  })
  const athletePickerOptions = computed(() =>
    athletes.value.map((rel) => ({
      label: rel.athlete.name,
      value: rel.athlete.id,
      avatar: rel.athlete.image ? { src: rel.athlete.image, alt: rel.athlete.name } : undefined
    }))
  )
  const comparisonAthletePickerOptions = computed(() =>
    athletes.value
      .filter((rel) => rel.athlete.id !== primaryAthleteId.value)
      .map((rel) => ({
        label: rel.athlete.name,
        value: rel.athlete.id,
        avatar: rel.athlete.image ? { src: rel.athlete.image, alt: rel.athlete.name } : undefined
      }))
  )
  const selectedPlannedWorkoutEndpointBase = computed(() =>
    selectedPlannedWorkoutAthleteId.value
      ? `/api/coaching/athletes/${selectedPlannedWorkoutAthleteId.value}/planned-workouts`
      : '/api/planned-workouts'
  )
  const calendarViewportClass = computed(() =>
    viewMode.value === 'week-board' ? 'overflow-auto' : 'overflow-hidden'
  )
  const bottomLibrarySpacerClass = computed(() =>
    viewMode.value === 'week-board' && isWorkoutDrawerVisible.value && !isLibraryDockedLeft.value
      ? 'pb-[24rem] sm:pb-[28rem]'
      : ''
  )
  const isLibraryPanelVisible = computed(
    () => !railCollapsed.value && isLibraryDockedLeft.value && leftRailTab.value === 'library'
  )
  const calendarGridClass = computed(() => {
    if (viewMode.value === 'week-board') return 'grid-cols-1 content-start'
    return isSplitView.value ? 'h-full grid-cols-2' : 'h-full grid-cols-1'
  })
  const showAddLaneButton = computed(
    () => viewMode.value === 'week-board' && !isSplitView.value && athletes.value.length > 1
  )

  const toolbarLabel = computed(() => {
    return viewMode.value === 'week-board'
      ? `${formatDateUTC(panelDates.value.primary, 'MMM d')} - ${formatDateUTC(addDays(panelDates.value.primary, 6), 'MMM d, yyyy')}`
      : formatDateUTC(panelDates.value.primary, 'MMMM yyyy')
  })

  function addDays(date: Date, days: number) {
    const next = new Date(date)
    next.setUTCDate(next.getUTCDate() + days)
    return next
  }

  function startOfMonthGrid(date: Date) {
    const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    const day = monthStart.getUTCDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const gridStart = new Date(monthStart)
    gridStart.setUTCDate(monthStart.getUTCDate() + diffToMonday)
    const gridEnd = new Date(gridStart)
    gridEnd.setUTCDate(gridStart.getUTCDate() + 41)
    return { start: gridStart, end: gridEnd }
  }

  function getRangeForPanel(panel: 'primary' | 'secondary') {
    const base = panelDates.value[panel]
    if (viewMode.value === 'week-board') {
      return { start: base, end: addDays(base, 6) }
    }
    return startOfMonthGrid(base)
  }

  function toggleLibraryPanel() {
    isLibraryDockedLeft.value = true
    if (isLibraryPanelVisible.value) {
      railCollapsed.value = true
      return
    }
    railCollapsed.value = false
    leftRailTab.value = 'library'
  }

  async function fetchAthletes() {
    loadingAthletes.value = true
    try {
      athletes.value = (await $fetch('/api/coaching/athletes')) as any[]
      const requestedAthleteId =
        typeof route.query.athlete === 'string' ? route.query.athlete : null
      if (
        requestedAthleteId &&
        athletes.value.some((rel) => rel.athlete.id === requestedAthleteId)
      ) {
        setPrimaryAthlete(requestedAthleteId)
      }
      if (!primaryAthleteId.value && athletes.value[0]?.athlete?.id) {
        setPrimaryAthlete(athletes.value[0].athlete.id)
      }
      if (!secondaryAthleteId.value && athletes.value[1]?.athlete?.id) {
        setSecondaryAthlete(athletes.value[1].athlete.id)
      }
    } catch (error) {
      toast.add({ title: 'Failed to load athletes', color: 'error' })
    } finally {
      loadingAthletes.value = false
    }
  }

  function enableCompareLane() {
    if (!isSplitView.value) {
      toggleSplitView()
    }
    if (!secondaryAthleteId.value || secondaryAthleteId.value === primaryAthleteId.value) {
      const fallback =
        athletes.value.find((rel) => rel.athlete.id !== primaryAthleteId.value)?.athlete?.id || null
      if (fallback) {
        setSecondaryAthlete(fallback)
      }
    }
    railCollapsed.value = false
  }

  async function fetchPanel(panel: 'primary' | 'secondary') {
    const athleteId = panel === 'primary' ? primaryAthleteId.value : secondaryAthleteId.value
    if (!athleteId || (panel === 'secondary' && !isSplitView.value)) {
      panelState[panel].data = null
      panelState[panel].error = null
      return
    }

    panelState[panel].pending = true
    panelState[panel].error = null
    try {
      const range = getRangeForPanel(panel)
      panelState[panel].data = await $fetch(`/api/coaching/athletes/${athleteId}/calendar`, {
        query: {
          startDate: range.start.toISOString(),
          endDate: range.end.toISOString(),
          viewMode: viewMode.value
        }
      })
    } catch (error: any) {
      panelState[panel].error = error
    } finally {
      panelState[panel].pending = false
    }
  }

  async function refreshAffectedPanel(athleteId: string | null) {
    if (!athleteId) return
    if (primaryAthleteId.value === athleteId) {
      await fetchPanel('primary')
    }
    if (secondaryAthleteId.value === athleteId) {
      await fetchPanel('secondary')
    }
  }

  async function onScheduleTemplate({
    athleteId,
    template,
    date
  }: {
    athleteId: string
    template: any
    date: Date
  }) {
    if (!template?.title) {
      toast.add({
        title: 'Scheduling failed',
        description: 'This library item is missing required workout details.',
        color: 'error'
      })
      return
    }

    try {
      await $fetch(`/api/coaching/athletes/${athleteId}/planned-workouts`, {
        method: 'POST',
        body: {
          date: formatDateUTC(date, 'yyyy-MM-dd'),
          title: template.title,
          description: template.description || '',
          type: template.type || template.category || 'Ride',
          category: template.category || 'Workout',
          durationSec: template.durationSec || 0,
          tss: template.tss ?? null,
          workIntensity: template.workIntensity ?? null,
          structuredWorkout: template.structuredWorkout ?? undefined
        }
      })

      await refreshAffectedPanel(athleteId)
      toast.add({
        title: 'Workout scheduled',
        description: `"${template.title}" added to ${formatDateUTC(date, 'MMM d')}.`,
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Scheduling failed',
        description: error.data?.message || 'Could not schedule workout.',
        color: 'error'
      })
    }
  }

  async function onDuplicatePlannedWorkout({
    sourceAthleteId,
    targetAthleteId,
    workoutId,
    date
  }: {
    sourceAthleteId: string
    targetAthleteId: string
    workoutId: string
    date: Date
  }) {
    try {
      const sourceWorkout = await $fetch(
        `/api/coaching/athletes/${sourceAthleteId}/planned-workouts/${workoutId}`
      )

      if (!sourceWorkout) {
        throw new Error('Source workout not found')
      }

      await $fetch(`/api/coaching/athletes/${targetAthleteId}/planned-workouts`, {
        method: 'POST',
        body: {
          date: formatDateUTC(date, 'yyyy-MM-dd'),
          title: sourceWorkout.title,
          description: sourceWorkout.description || '',
          type: sourceWorkout.type || sourceWorkout.category || 'Ride',
          category: sourceWorkout.category || 'Workout',
          durationSec: sourceWorkout.durationSec || 0,
          tss: sourceWorkout.tss ?? null,
          workIntensity: sourceWorkout.workIntensity ?? null,
          structuredWorkout: sourceWorkout.structuredWorkout ?? undefined
        }
      })

      await refreshAffectedPanel(targetAthleteId)
      toast.add({
        title: 'Workout copied',
        description: `"${sourceWorkout.title}" copied to ${formatDateUTC(date, 'MMM d')}.`,
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Copy failed',
        description: error.data?.message || 'Could not copy workout to this athlete.',
        color: 'error'
      })
    }
  }

  async function onMovePlannedWorkout({
    athleteId,
    workoutId,
    date
  }: {
    athleteId: string
    workoutId: string
    date: Date
  }) {
    try {
      await $fetch(`/api/coaching/athletes/${athleteId}/planned-workouts/${workoutId}/move`, {
        method: 'POST',
        body: { targetDate: date.toISOString() }
      })
      await refreshAffectedPanel(athleteId)
      toast.add({ title: 'Workout moved', color: 'success' })
    } catch (error: any) {
      toast.add({
        title: 'Move failed',
        description: error.data?.message || 'Could not move workout.',
        color: 'error'
      })
    }
  }

  async function onActivityClick(athleteId: string, activity: any) {
    if (activity.source === 'planned') {
      selectedPlannedWorkoutAthleteId.value = athleteId
      selectedPlannedWorkout.value = await $fetch(
        `/api/coaching/athletes/${athleteId}/planned-workouts/${activity.id}`
      )
      showPlannedWorkoutModal.value = true
      return
    }

    if (activity.source === 'completed') {
      selectedWorkout.value = await $fetch(
        `/api/coaching/athletes/${athleteId}/workouts/${activity.id}`
      )
      showWorkoutPreviewModal.value = true
    }
  }

  function handlePlannedWorkoutDeleted() {
    showPlannedWorkoutModal.value = false
    void refreshAffectedPanel(selectedPlannedWorkoutAthleteId.value)
  }

  function toggleDrawer() {
    if (isWorkoutDrawerVisible.value) {
      isWorkoutDrawerVisible.value = false
      return
    }
    isWorkoutDrawerVisible.value = true
    isWorkoutDrawerOpen.value = true
  }

  function toCalendarDate(date: Date) {
    return new CalendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
  }

  function openTemplateCalendarPicker({ template }: { template: any }) {
    calendarPickerTemplate.value = template
    calendarPickerAthleteId.value = primaryAthleteId.value
    calendarPickerDate.value = toCalendarDate(new Date())
    showTemplateCalendarPicker.value = true
  }

  async function confirmTemplateCalendarPicker() {
    if (
      !calendarPickerTemplate.value ||
      !calendarPickerDate.value ||
      !calendarPickerAthleteId.value
    ) {
      return
    }
    const selectedDate = (calendarPickerDate.value as any).toDate(getLocalTimeZone())
    await onScheduleTemplate({
      athleteId: calendarPickerAthleteId.value,
      template: calendarPickerTemplate.value,
      date: new Date(
        Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      )
    })
    showTemplateCalendarPicker.value = false
  }

  async function onQuickScheduleTemplate({
    template,
    date,
    athleteId
  }: {
    template: any
    date: string
    athleteId?: string
  }) {
    const resolvedAthleteId = athleteId || primaryAthleteId.value
    if (!resolvedAthleteId) return
    await onScheduleTemplate({
      athleteId: resolvedAthleteId,
      template,
      date: new Date(`${date}T00:00:00Z`)
    })
  }

  const workoutDrawerScheduleTargets = computed(() => {
    const targets: Array<{ label: string; date: string; athleteId?: string }> = []
    const visible = [
      { panel: 'primary' as const, athlete: primaryAthlete.value, date: panelDates.value.primary },
      {
        panel: 'secondary' as const,
        athlete: secondaryAthlete.value,
        date: panelDates.value.secondary
      }
    ].filter((entry) => entry.athlete && (entry.panel === 'primary' || isSplitView.value))

    for (const entry of visible) {
      const start = entry.date
      for (let index = 0; index < 7; index++) {
        const nextDate = addDays(start, index)
        targets.push({
          athleteId: entry.athlete.id,
          label: `${entry.athlete.name} • ${formatDateUTC(nextDate, 'EEE, MMM d')}`,
          date: formatDateUTC(nextDate, 'yyyy-MM-dd')
        })
      }
    }

    return targets
  })

  function formatDuration(seconds: number) {
    if (!seconds) return '--'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (!hours) return `${minutes}m`
    if (!minutes) return `${hours}h`
    return `${hours}h ${minutes}m`
  }

  watch(
    () => [primaryAthleteId.value, panelDates.value.primary.getTime(), viewMode.value],
    () => {
      void fetchPanel('primary')
    },
    { immediate: true }
  )

  watch(
    () => [
      secondaryAthleteId.value,
      panelDates.value.secondary.getTime(),
      viewMode.value,
      isSplitView.value
    ],
    () => {
      void fetchPanel('secondary')
    },
    { immediate: true }
  )

  watch(primaryAthleteId, (nextPrimary) => {
    if (!nextPrimary || secondaryAthleteId.value !== nextPrimary) return
    const fallback =
      athletes.value.find((rel) => rel.athlete.id !== nextPrimary)?.athlete?.id || null
    secondaryAthleteId.value = fallback
  })

  onMounted(() => {
    goToToday()
    void fetchAthletes()
  })
</script>
