<template>
  <section class="flex min-h-0 flex-col rounded-3xl border border-default bg-default shadow-sm">
    <div class="border-b border-default/70 px-4 py-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-default/70 bg-muted/20 shadow-sm"
          >
            <UAvatar :src="athlete?.image" :alt="athlete?.name || 'Athlete'" size="md" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-muted">
              Athlete
            </div>
            <USelectMenu
              :model-value="selectedAthleteId ?? undefined"
              value-key="value"
              :items="athleteOptions"
              :placeholder="placeholder || 'Choose athlete'"
              size="lg"
              class="w-full"
              :ui="selectMenuUi"
              @update:model-value="$emit('select-athlete', $event)"
            />
          </div>
        </div>

        <UBadge
          color="neutral"
          variant="soft"
          class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-black"
        >
          {{ currentLabel }}
        </UBadge>
      </div>
    </div>

    <div v-if="!athlete" class="flex-1 p-6 text-center text-sm text-muted">
      Select an athlete to load this lane.
    </div>

    <div v-else-if="loading" class="flex-1 p-6 space-y-4">
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-24 w-full" />
    </div>

    <div v-else-if="error" class="flex-1 p-6">
      <UAlert
        color="error"
        title="Calendar load failed"
        :description="error.message || 'Could not load calendar.'"
      />
    </div>

    <div v-else class="flex-1 overflow-auto p-4">
      <div v-if="viewMode === 'week-board'" class="min-w-[920px] space-y-3">
        <div class="grid grid-cols-7 gap-3">
          <div v-for="day in weekDays" :key="day.date.toISOString()" class="min-w-0">
            <CoachCalendarDayCard
              :athlete-id="athlete.id"
              :date="day.date"
              :activities="day.activities"
              :readiness-score="day.readinessScore"
              :day-summary="day.daySummary"
              :is-today="day.isToday"
              :is-drag-target="dragTargetDateKey === day.key"
              @activity-click="$emit('activity-click', athlete.id, $event)"
              @dragover="dragTargetDateKey = day.key"
              @drop="onDrop(day.date, $event)"
            />
          </div>
        </div>
      </div>

      <div v-else class="min-w-[920px]">
        <div class="grid grid-cols-7 gap-3">
          <div
            v-for="cell in monthDays"
            :key="cell.key"
            :class="cell.isCurrentMonth ? '' : 'opacity-45'"
          >
            <CoachCalendarDayCard
              :athlete-id="athlete.id"
              :date="cell.date"
              :activities="cell.activities"
              :readiness-score="cell.readinessScore"
              :day-summary="cell.daySummary"
              :compact="true"
              :is-today="cell.isToday"
              :is-drag-target="dragTargetDateKey === cell.key"
              @activity-click="$emit('activity-click', athlete.id, $event)"
              @dragover="dragTargetDateKey = cell.key"
              @drop="onDrop(cell.date, $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { CalendarActivity } from '../../../types/calendar'
  import CoachCalendarDayCard from '~/components/coaching/CoachCalendarDayCard.vue'

  const props = defineProps<{
    athlete: any | null
    athleteOptions: Array<{ label: string; value: string; avatar?: { src: string; alt: string } }>
    selectedAthleteId: string | null
    placeholder?: string
    viewMode: 'week-board' | 'month-grid'
    currentDate: Date
    data: {
      activities: CalendarActivity[]
      wellnessByDate?: Record<string, any>
      daySummaries?: Record<string, any>
    } | null
    loading?: boolean
    error?: any
  }>()

  const emit = defineEmits<{
    'select-athlete': [athleteId: string | null]
    scheduleTemplate: [payload: { athleteId: string; template: any; date: Date }]
    movePlannedWorkout: [payload: { athleteId: string; workoutId: string; date: Date }]
    duplicatePlannedWorkout: [
      payload: {
        sourceAthleteId: string
        targetAthleteId: string
        workoutId: string
        date: Date
      }
    ]
    'activity-click': [athleteId: string, activity: CalendarActivity]
  }>()

  const { formatDateUTC } = useFormat()
  const dragTargetDateKey = ref<string | null>(null)
  const selectMenuUi = {
    base: 'min-h-11 rounded-xl border-default/0 bg-transparent px-0 text-xl font-black tracking-tight text-highlighted shadow-none ring-0',
    content: 'min-w-[20rem]'
  }

  const currentLabel = computed(() =>
    props.viewMode === 'week-board'
      ? `${formatDateUTC(props.currentDate, 'MMM d')} - ${formatDateUTC(addDays(props.currentDate, 6), 'MMM d')}`
      : formatDateUTC(props.currentDate, 'MMMM yyyy')
  )

  function addDays(date: Date, days: number) {
    const next = new Date(date)
    next.setUTCDate(next.getUTCDate() + days)
    return next
  }

  function dateKey(date: Date) {
    return formatDateUTC(date, 'yyyy-MM-dd')
  }

  function getActivitiesForDate(date: Date) {
    const key = dateKey(date)
    return (props.data?.activities || []).filter((activity) => {
      const base =
        typeof activity.date === 'string' ? activity.date : new Date(activity.date).toISOString()
      return formatDateUTC(base, 'yyyy-MM-dd') === key
    })
  }

  function buildDay(date: Date, isCurrentMonth = true) {
    const key = dateKey(date)
    return {
      key,
      date,
      isCurrentMonth,
      isToday: key === formatDateUTC(new Date(), 'yyyy-MM-dd'),
      activities: getActivitiesForDate(date),
      readinessScore: props.data?.wellnessByDate?.[key]?.recoveryScore ?? null,
      daySummary: props.data?.daySummaries?.[key] ?? null
    }
  }

  const weekDays = computed(() =>
    Array.from({ length: 7 }, (_, index) => buildDay(addDays(props.currentDate, index)))
  )

  const monthDays = computed(() => {
    const monthStart = new Date(
      Date.UTC(props.currentDate.getUTCFullYear(), props.currentDate.getUTCMonth(), 1)
    )
    const startDay = monthStart.getUTCDay()
    const diffToMonday = startDay === 0 ? -6 : 1 - startDay
    const start = addDays(monthStart, diffToMonday)
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(start, index)
      return buildDay(date, date.getUTCMonth() === props.currentDate.getUTCMonth())
    })
  })

  function onDrop(date: Date, event: DragEvent) {
    dragTargetDateKey.value = null
    if (!props.athlete?.id) return
    const raw = event.dataTransfer?.getData('application/json')
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed.template) {
      emit('scheduleTemplate', {
        athleteId: props.athlete.id,
        template: parsed.template,
        date
      })
      return
    }
    if (parsed.type === 'planned-workout') {
      if (parsed.athleteId === props.athlete.id) {
        emit('movePlannedWorkout', {
          athleteId: props.athlete.id,
          workoutId: parsed.workoutId,
          date
        })
        return
      }

      emit('duplicatePlannedWorkout', {
        sourceAthleteId: parsed.athleteId,
        targetAthleteId: props.athlete.id,
        workoutId: parsed.workoutId,
        date
      })
    }
  }
</script>
