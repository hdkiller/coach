import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '#imports'

export type ViewMode = 'board' | 'table'
export type ChartMetric = 'tss' | 'minutes'
export type PlanItemKind = 'workout' | 'note'

export function usePlanArchitect(planId: string) {
  const toast = useToast()
  const router = useRouter()
  const { source: librarySource } = useLibrarySource(`plan-architect:${planId}`)

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const blockTypeOptions = ['BASE', 'BUILD', 'PEAK', 'RECOVERY', 'DELOAD', 'TAPER']
  const viewModeKey = `architect-view-mode:${planId}`

  // API Data
  const {
    data: planResponse,
    status,
    refresh
  } = (useFetch as any)(`/api/library/plans/${planId}/architect`)

  // Initialize draftPlan synchronously if data exists (for SSR)
  const draftPlan = ref<any | null>(planResponse.value ? normalizePlan(planResponse.value) : null)
  const lastSavedSnapshot = ref(draftPlan.value ? serializePlan(draftPlan.value) : '')

  const {
    data: workoutTemplates,
    status: workoutTemplateStatus,
    refresh: refreshWorkoutTemplates
  } = (useLazyFetch as any)('/api/library/workouts', {
    server: false,
    default: () => [] as any[],
    query: computed(() => ({
      scope: librarySource.value
    }))
  }) as any

  // State
  const loading = computed(() => status.value === 'pending' && !draftPlan.value)
  const saving = ref(false)
  const isWorkoutDrawerOpen = ref(true)
  const dragOverDayKey = ref<string | null>(null)

  const activeWeekId = ref<string | null>(null)
  const viewMode = ref<ViewMode>('board')
  const chartMetric = ref<ChartMetric>('tss')
  const selectedChartWeekId = ref<string | null>(null)
  const collapsedBlockIds = ref<string[]>([])
  const expandedAnalyticsBlockIds = ref<string[]>([])

  // Editors UI state
  const isPlanEditorOpen = ref(false)
  const isUtilityPanelOpen = ref(false)
  const isBlockEditorOpen = ref(false)
  const isWeekEditorOpen = ref(false)
  const isWorkoutEditorOpen = ref(false)

  // Editing items
  const editingBlock = ref<any | null>(null)
  const editingWeek = ref<any | null>(null)
  const editingWeekTarget = ref<{ blockId: string; weekId: string } | null>(null)
  const editingWorkout = ref<any | null>(null)
  const editingWorkoutTarget = ref<{ weekId: string; workoutId: string } | null>(null)

  // Initialization
  if (import.meta.client) {
    const storedViewMode = sessionStorage.getItem(viewModeKey)
    if (storedViewMode === 'board' || storedViewMode === 'table') {
      viewMode.value = storedViewMode as ViewMode
    }
  }

  watch(
    viewMode,
    (newValue) => {
      if (import.meta.client) {
        sessionStorage.setItem(viewModeKey, newValue)
      }
    },
    { flush: 'post' }
  )

  // Keep draftPlan in sync with planResponse refresh
  watch(
    planResponse,
    (value) => {
      if (!value) {
        draftPlan.value = null
        lastSavedSnapshot.value = ''
        return
      }
      // Only update if we don't have a draft yet or it was a server-to-client handoff
      if (!draftPlan.value || lastSavedSnapshot.value === '') {
        const normalized = normalizePlan(value)
        draftPlan.value = normalized
        lastSavedSnapshot.value = serializePlan(normalized)
      }
    },
    { immediate: true }
  )

  // Computed
  const sortedBlocks = computed(() => {
    if (!draftPlan.value?.blocks) return []
    return [...draftPlan.value.blocks].sort((a, b) => a.order - b.order)
  })

  const totalWeeks = computed(() =>
    sortedBlocks.value.reduce((sum: number, block: any) => sum + (block.weeks?.length || 0), 0)
  )

  const totalWorkouts = computed(() =>
    sortedBlocks.value.reduce(
      (sum: number, block: any) =>
        sum +
        orderedWeeks(block).reduce(
          (weekSum: number, week: any) => weekSum + (week.workouts?.length || 0),
          0
        ),
      0
    )
  )

  const totalTargetMinutes = computed(() =>
    sortedBlocks.value.reduce(
      (sum: number, block: any) =>
        sum +
        orderedWeeks(block).reduce(
          (weekSum: number, week: any) => weekSum + (Number(week.volumeTargetMinutes) || 0),
          0
        ),
      0
    )
  )

  const totalTargetTss = computed(() =>
    sortedBlocks.value.reduce(
      (sum: number, block: any) =>
        sum +
        orderedWeeks(block).reduce(
          (weekSum: number, week: any) => weekSum + (Number(week.tssTarget) || 0),
          0
        ),
      0
    )
  )

  const hasUnsavedChanges = computed(() => {
    if (!draftPlan.value) return false
    return serializePlan(draftPlan.value) !== lastSavedSnapshot.value
  })

  const orderedPlanWeeks = computed(() =>
    sortedBlocks.value.flatMap((block: any) => orderedWeeks(block))
  )

  // Logic Helpers
  function normalizePlan(plan: any) {
    return {
      ...structuredClone(plan),
      coachNotes: plan.coachNotes || '',
      athleteNotes: plan.athleteNotes || '',
      strategy: plan.strategy || 'LINEAR',
      recoveryRhythm: plan.recoveryRhythm || 4,
      visibility: plan.visibility || 'PRIVATE',
      accessState: plan.accessState || 'PRIVATE',
      primarySport: plan.primarySport || '',
      sportSubtype: plan.sportSubtype || '',
      skillLevel: plan.skillLevel || '',
      planLanguage: plan.planLanguage || '',
      daysPerWeek: plan.daysPerWeek || null,
      weeklyVolumeBand: plan.weeklyVolumeBand || '',
      goalLabel: plan.goalLabel || '',
      equipmentTags: Array.isArray(plan.equipmentTags) ? plan.equipmentTags.join(', ') : '',
      publicHeadline: plan.publicHeadline || '',
      publicDescription: plan.publicDescription || '',
      methodology: plan.methodology || '',
      whoItsFor: plan.whoItsFor || '',
      faq: plan.faq || '',
      extraContent: plan.extraContent || '',
      sampleWeekIds: Array.isArray(plan.sampleWeeks)
        ? plan.sampleWeeks.map((entry: any) => entry.weekId)
        : [],
      blocks: (plan.blocks || []).map((block: any, blockIndex: number) => ({
        ...block,
        name: block.name || `Block ${blockIndex + 1}`,
        type: block.type || 'BUILD',
        primaryFocus: block.primaryFocus || 'AEROBIC_ENDURANCE',
        durationWeeks: block.durationWeeks || block.weeks?.length || 0,
        order: block.order || blockIndex + 1,
        weeks: (block.weeks || []).map((week: any, weekIndex: number) => ({
          ...week,
          weekNumber: week.weekNumber || weekIndex + 1,
          volumeTargetMinutes: week.volumeTargetMinutes || 0,
          tssTarget: week.tssTarget || 0,
          focus: week.focus || null,
          workouts: (week.workouts || []).map((workout: any) => ({
            ...workout,
            title: workout.title || 'Untitled workout',
            description: workout.description || '',
            type: workout.type || 'Workout',
            durationSec: workout.durationSec || 0,
            tss: workout.tss || 0,
            category: workout.category || 'Workout'
          }))
        }))
      }))
    }
  }

  function serializePlan(plan: any) {
    return JSON.stringify({
      architect: buildArchitectPayload(plan),
      publication: buildPublicationPayload(plan)
    })
  }

  function buildArchitectPayload(plan: any) {
    return {
      name: plan.name,
      description: plan.description,
      coachNotes: plan.coachNotes,
      athleteNotes: plan.athleteNotes,
      difficulty: Number(plan.difficulty) || 1,
      strategy: plan.strategy,
      recoveryRhythm: Number(plan.recoveryRhythm) || 4,
      isPublic: Boolean(plan.isPublic),
      blocks: sortedPayloadBlocks(plan.blocks || [])
    }
  }

  function buildPublicationPayload(plan: any) {
    const equipmentTags =
      typeof plan.equipmentTags === 'string'
        ? plan.equipmentTags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : Array.isArray(plan.equipmentTags)
          ? plan.equipmentTags
          : []

    return {
      visibility: plan.visibility,
      accessState: plan.accessState,
      slug: plan.slug || null,
      primarySport: plan.primarySport || null,
      sportSubtype: plan.sportSubtype || null,
      skillLevel: plan.skillLevel || null,
      planLanguage: plan.planLanguage || null,
      daysPerWeek: plan.daysPerWeek ? Number(plan.daysPerWeek) : null,
      weeklyVolumeBand: plan.weeklyVolumeBand || null,
      goalLabel: plan.goalLabel || null,
      equipmentTags,
      publicHeadline: plan.publicHeadline || null,
      publicDescription: plan.publicDescription || null,
      methodology: plan.methodology || null,
      whoItsFor: plan.whoItsFor || null,
      faq: plan.faq || null,
      extraContent: plan.extraContent || null,
      sampleWeekIds: Array.isArray(plan.sampleWeekIds) ? plan.sampleWeekIds : []
    }
  }

  function sortedPayloadBlocks(blocks: any[]) {
    return [...blocks]
      .sort((a, b) => a.order - b.order)
      .map((block, blockIndex) => ({
        id: block.id,
        name: block.name,
        type: block.type,
        primaryFocus: block.primaryFocus || 'AEROBIC_ENDURANCE',
        durationWeeks: orderedWeeks(block).length,
        order: blockIndex + 1,
        weeks: orderedWeeks(block).map((week: any, weekIndex: number) => ({
          id: week.id,
          weekNumber: weekIndex + 1,
          volumeTargetMinutes: Number(week.volumeTargetMinutes) || 0,
          tssTarget: Number(week.tssTarget) || 0,
          focus: week.focus || null,
          workouts: orderedWorkouts(week).map((workout: any) => ({
            id: workout.id?.startsWith('temp-') ? undefined : workout.id,
            dayIndex: workout.dayIndex,
            weekIndex: weekIndex + 1,
            title: workout.title,
            description: workout.description || null,
            type: workout.type || null,
            durationSec: Number(workout.durationSec) || 0,
            tss: Number(workout.tss) || 0,
            category: workout.category || null,
            structuredWorkout: workout.structuredWorkout || null
          }))
        }))
      }))
  }

  function orderedWeeks(block: any) {
    return [...(block.weeks || [])].sort((a, b) => a.weekNumber - b.weekNumber)
  }

  function orderedWorkouts(week: any) {
    return [...(week.workouts || [])].sort((a, b) => a.dayIndex - b.dayIndex)
  }

  function renumberPlan() {
    if (!draftPlan.value) return
    let globalWeek = 1
    draftPlan.value.blocks
      .sort((a: any, b: any) => a.order - b.order)
      .forEach((block: any, blockIndex: number) => {
        block.order = blockIndex + 1
        block.weeks
          .sort((a: any, b: any) => a.weekNumber - b.weekNumber)
          .forEach((week: any, weekIndex: number) => {
            week.weekNumber = globalWeek
            week.workouts = (week.workouts || []).map((workout: any) => ({
              ...workout,
              weekIndex: globalWeek
            }))
            globalWeek += 1
            if (!week.focus) week.focus = `Week ${weekIndex + 1} focus`
          })
        block.durationWeeks = block.weeks.length
      })
  }

  // CRUD Operations
  function addBlock() {
    if (!draftPlan.value) return
    const nextOrder = draftPlan.value.blocks.length + 1
    draftPlan.value.blocks.push({
      id: `temp-block-${Date.now()}`,
      name: `New Block ${nextOrder}`,
      type: 'BUILD',
      primaryFocus: 'AEROBIC_ENDURANCE',
      durationWeeks: 4,
      order: nextOrder,
      weeks: Array.from({ length: 4 }, (_, index) => ({
        id: `temp-week-${Date.now()}-${index}`,
        weekNumber: totalWeeks.value + index + 1,
        volumeTargetMinutes: 240,
        tssTarget: 150,
        focus: `Week ${index + 1} focus`,
        workouts: []
      }))
    })
    renumberPlan()
    toast.add({ title: 'Block added', color: 'success' })
  }

  function removeBlock(blockId: string) {
    if (!draftPlan.value) return
    draftPlan.value.blocks = draftPlan.value.blocks.filter((block: any) => block.id !== blockId)
    renumberPlan()
    toast.add({ title: 'Block removed', color: 'info' })
  }

  function openBlockEditor(block: any) {
    editingBlock.value = { ...block }
    isBlockEditorOpen.value = true
  }

  function applyBlockEditor() {
    if (!draftPlan.value || !editingBlock.value) return
    const block = draftPlan.value.blocks.find((entry: any) => entry.id === editingBlock.value.id)
    if (!block) return
    Object.assign(block, editingBlock.value)
    isBlockEditorOpen.value = false
    editingBlock.value = null
    toast.add({ title: 'Block updated', color: 'success' })
  }

  function openWeekEditor(blockId: string, week: any) {
    editingWeekTarget.value = { blockId, weekId: week.id }
    editingWeek.value = { ...week }
    isWeekEditorOpen.value = true
  }

  function applyWeekEditor() {
    if (!draftPlan.value || !editingWeek.value || !editingWeekTarget.value) return
    const block = draftPlan.value.blocks.find(
      (entry: any) => entry.id === editingWeekTarget.value?.blockId
    )
    const week = block?.weeks.find((entry: any) => entry.id === editingWeekTarget.value?.weekId)
    if (!week) return
    week.focus = editingWeek.value.focus || null
    week.volumeTargetMinutes = Number(editingWeek.value.volumeTargetMinutes) || 0
    week.tssTarget = Number(editingWeek.value.tssTarget) || 0
    isWeekEditorOpen.value = false
    editingWeek.value = null
    editingWeekTarget.value = null
    toast.add({ title: 'Week updated', color: 'success' })
  }

  function addWeekToBlock(blockId: string) {
    if (!draftPlan.value) return
    const block = draftPlan.value.blocks.find((entry: any) => entry.id === blockId)
    if (!block) return
    const nextWeekNum = block.weeks.length + 1
    block.weeks.push({
      id: `temp-week-${Date.now()}`,
      weekNumber: nextWeekNum,
      volumeTargetMinutes: 240,
      tssTarget: 150,
      focus: `Week ${nextWeekNum} focus`,
      workouts: []
    })
    renumberPlan()
    toast.add({ title: 'Week added to block', color: 'success' })
  }

  function duplicateWeek(blockId: string, weekId: string) {
    if (!draftPlan.value) return
    const block = draftPlan.value.blocks.find((entry: any) => entry.id === blockId)
    const source = block?.weeks.find((entry: any) => entry.id === weekId)
    if (!block || !source) return
    const clone = structuredClone(source)
    clone.id = `temp-week-${Date.now()}`
    clone.weekNumber = source.weekNumber + 1
    clone.focus = source.focus ? `${source.focus} Copy` : 'Duplicated week'
    clone.workouts = (clone.workouts || []).map((workout: any, index: number) => ({
      ...workout,
      id: `temp-workout-${Date.now()}-${index}`,
      weekIndex: clone.weekNumber
    }))
    const sourceIndex = block.weeks.findIndex((entry: any) => entry.id === weekId)
    block.weeks.splice(sourceIndex + 1, 0, clone)
    renumberPlan()
    toast.add({ title: 'Week duplicated', color: 'success' })
  }

  function createPlanItem(week: any, dayIndex: number, kind: PlanItemKind, source: any = {}) {
    const isNote = kind === 'note'
    const item = {
      id: `temp-workout-${Date.now()}`,
      dayIndex,
      weekIndex: week.weekNumber,
      title: source.title || (isNote ? 'New note' : 'New workout'),
      description: source.description || '',
      type: source.type || (isNote ? 'Note' : 'Workout'),
      durationSec: isNote ? 0 : Number(source.durationSec) || 1800,
      tss: isNote ? 0 : Number(source.tss) || 20,
      category: source.category || (isNote ? 'Note' : 'Workout'),
      structuredWorkout: isNote ? null : (source.structuredWorkout ?? null)
    }
    week.workouts.push(item)
    return item
  }

  function addWorkout(weekId: string, dayIndex: number) {
    const week = findWeek(weekId)
    if (!week) return null
    const workout = createPlanItem(week, dayIndex, 'workout')
    toast.add({ title: 'Workout added', color: 'success' })
    return workout
  }

  function addNote(weekId: string, dayIndex: number) {
    const week = findWeek(weekId)
    if (!week) return null
    const note = createPlanItem(week, dayIndex, 'note')
    toast.add({ title: 'Note added', color: 'success' })
    return note
  }

  function addWorkoutFromTemplate(weekId: string, dayIndex: number, template: any) {
    const week = findWeek(weekId)
    if (!week) return null
    const kind: PlanItemKind =
      template.category === 'Note' || template.type === 'Note' ? 'note' : 'workout'
    const item = createPlanItem(week, dayIndex, kind, template)
    toast.add({
      title: kind === 'note' ? 'Note added from library' : 'Workout added from library',
      color: 'success'
    })
    return item
  }

  function removeWorkout(weekId: string, workoutId: string) {
    const week = findWeek(weekId)
    if (!week) return
    week.workouts = week.workouts.filter((workout: any) => workout.id !== workoutId)
    toast.add({ title: 'Workout removed', color: 'info' })
  }

  function moveWorkout(
    fromWeekId: string,
    workoutId: string,
    toWeekId: string,
    toDayIndex: number
  ) {
    const fromWeek = findWeek(fromWeekId)
    const toWeek = findWeek(toWeekId)
    if (!fromWeek || !toWeek) return
    const workoutIndex = fromWeek.workouts.findIndex((w: any) => w.id === workoutId)
    if (workoutIndex === -1) return
    const [workout] = fromWeek.workouts.splice(workoutIndex, 1)
    workout.dayIndex = toDayIndex
    toWeek.workouts.push(workout)
  }

  function openWorkoutEditor(weekId: string, _dayIndex: number, workout: any) {
    editingWorkoutTarget.value = { weekId, workoutId: workout.id }
    editingWorkout.value = {
      ...workout,
      description: workout.description || '',
      durationMinutes: Math.round((workout.durationSec || 0) / 60)
    }
    isWorkoutEditorOpen.value = true
  }

  function applyWorkoutEditor() {
    if (!editingWorkout.value || !editingWorkoutTarget.value) return
    const week = findWeek(editingWorkoutTarget.value.weekId)
    const workout = week?.workouts.find(
      (entry: any) => entry.id === editingWorkoutTarget.value?.workoutId
    )
    if (!workout) return
    workout.title = editingWorkout.value.title || 'Untitled workout'
    workout.description = editingWorkout.value.description || ''
    workout.type = editingWorkout.value.type || 'Workout'
    workout.category = editingWorkout.value.category || 'Workout'
    const isNote =
      workout.category === 'Note' ||
      workout.type === 'Note' ||
      editingWorkout.value.category === 'Note' ||
      editingWorkout.value.type === 'Note'
    workout.durationSec = isNote ? 0 : (Number(editingWorkout.value.durationMinutes) || 0) * 60
    workout.tss = isNote ? 0 : Number(editingWorkout.value.tss) || 0
    workout.structuredWorkout = isNote ? null : (workout.structuredWorkout ?? null)
    isWorkoutEditorOpen.value = false
    editingWorkout.value = null
    editingWorkoutTarget.value = null
    toast.add({ title: isNote ? 'Note updated' : 'Workout updated', color: 'success' })
  }

  function findWeek(weekId: string) {
    for (const block of draftPlan.value?.blocks || []) {
      const week = block.weeks.find((entry: any) => entry.id === weekId)
      if (week) return week
    }
    return null
  }

  function findBlock(blockId: string) {
    return draftPlan.value?.blocks.find((b: any) => b.id === blockId)
  }

  async function savePlan() {
    if (!draftPlan.value) return
    saving.value = true
    try {
      const architectPayload = buildArchitectPayload(draftPlan.value)
      const publicationPayload = buildPublicationPayload(draftPlan.value)
      await $fetch(`/api/library/plans/${planId}/architect`, {
        method: 'PATCH',
        body: architectPayload
      })
      await $fetch(`/api/library/plans/${planId}/publication`, {
        method: 'PATCH',
        body: publicationPayload
      })
      lastSavedSnapshot.value = JSON.stringify({
        architect: architectPayload,
        publication: publicationPayload
      })
      toast.add({ title: 'Blueprint saved', color: 'success' })
      await refresh()
    } catch (error: any) {
      toast.add({
        title: 'Save failed',
        description: error.data?.message || 'Please review the blueprint data and try again.',
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }

  return {
    DAYS,
    blockTypeOptions,
    loading,
    saving,
    isWorkoutDrawerOpen,
    dragOverDayKey,
    draftPlan,
    activeWeekId,
    viewMode,
    chartMetric,
    selectedChartWeekId,
    collapsedBlockIds,
    expandedAnalyticsBlockIds,
    isPlanEditorOpen,
    isUtilityPanelOpen,
    isBlockEditorOpen,
    isWeekEditorOpen,
    isWorkoutEditorOpen,
    editingBlock,
    editingWeek,
    editingWorkout,
    editingWorkoutTarget,
    workoutTemplates,
    workoutTemplateStatus,
    librarySource,
    sortedBlocks,
    totalWeeks,
    totalWorkouts,
    totalTargetMinutes,
    totalTargetTss,
    hasUnsavedChanges,
    orderedPlanWeeks,
    refreshWorkoutTemplates,
    addBlock,
    removeBlock,
    openBlockEditor,
    applyBlockEditor,
    openWeekEditor,
    applyWeekEditor,
    addWeekToBlock,
    duplicateWeek,
    addWorkout,
    addNote,
    addWorkoutFromTemplate,
    moveWorkout,
    removeWorkout,
    openWorkoutEditor,
    applyWorkoutEditor,
    savePlan,
    findWeek,
    findBlock,
    orderedWeeks,
    orderedWorkouts,
    renumberPlan
  }
}
