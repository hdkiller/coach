<template>
  <div
    class="min-h-[132px] rounded-2xl border border-default/70 bg-default p-3 transition"
    :class="[
      compact ? 'min-h-[100px] p-2.5' : '',
      isToday ? 'ring-2 ring-primary/50' : '',
      isDragTarget ? 'ring-2 ring-primary ring-inset' : ''
    ]"
    @dragover.prevent="$emit('dragover')"
    @drop.prevent="$emit('drop', $event)"
  >
    <div class="flex items-start justify-between gap-2">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
          {{ formatDateUTC(date, compact ? 'EEE' : 'EEEE') }}
        </div>
        <div class="text-lg font-black text-highlighted">
          {{ formatDateUTC(date, compact ? 'd' : 'MMM d') }}
        </div>
      </div>
      <UBadge
        v-if="readinessScore != null"
        size="xs"
        :color="readinessScore >= 80 ? 'success' : readinessScore >= 60 ? 'primary' : 'warning'"
        variant="subtle"
        class="font-bold"
      >
        {{ Math.round(readinessScore) }}%
      </UBadge>
    </div>

    <div
      v-if="readinessScore != null || daySummary"
      class="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted"
    >
      <span v-if="readinessScore != null">Ready {{ readinessLabel }}</span>
      <span v-if="daySummary" class="opacity-50">•</span>
      <span v-if="daySummary">{{ daySummary.plannedCount }}/{{ daySummary.completedCount }}</span>
    </div>

    <div class="mt-3 space-y-2">
      <button
        v-for="activity in visibleActivities"
        :key="activity.id"
        class="group relative w-full rounded-xl border px-2 py-1.5 text-left text-xs transition hover:bg-default/80"
        :class="activityClass(activity)"
        :draggable="activity.source === 'planned'"
        @click="$emit('activity-click', activity)"
        @dragstart="onActivityDragStart($event, activity)"
      >
        <div
          v-if="activity.source === 'completed' && activity.id"
          class="absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-git-compare-arrows"
            class="h-6 w-6 p-0"
            title="Add to comparison"
            @click.stop="$emit('compare-activity', activity)"
          />
        </div>

        <div class="flex items-start gap-2">
          <div class="mt-1 h-2 w-2 shrink-0 rounded-full" :class="activityDotClass(activity)" />
          <div class="min-w-0 flex-1">
            <div class="truncate font-bold">{{ activity.title }}</div>
            <div class="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
              <span>{{ activity.type || 'Workout' }}</span>
              <span v-if="activity.tss || activity.plannedTss" class="opacity-50">•</span>
              <span v-if="activity.tss || activity.plannedTss"
                >{{ Math.round(activity.tss || activity.plannedTss || 0) }} TSS</span
              >
            </div>

            <div
              v-if="activity.source === 'completed' && activity.plannedWorkoutId"
              class="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary"
            >
              <UIcon name="i-heroicons-calendar" class="h-3 w-3" />
              Matched plan
            </div>

            <div
              v-else-if="activity.source === 'planned' && activity.status === 'completed_plan'"
              class="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary"
            >
              <UIcon name="i-heroicons-check-circle" class="h-3 w-3" />
              Completed
            </div>

            <div
              v-if="activity.linkedPlannedWorkout"
              class="mt-1 text-[10px] font-medium italic text-primary/80"
            >
              {{ activity.linkedPlannedWorkout.title }}
            </div>
          </div>
        </div>
      </button>

      <div
        v-if="hiddenCount > 0"
        class="rounded-xl border border-dashed border-default/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted"
      >
        +{{ hiddenCount }} more
      </div>

      <div
        v-if="!visibleActivities.length"
        class="rounded-xl border border-dashed border-default/70 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted/60"
      >
        Empty
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { CalendarActivity } from '../../../types/calendar'

  const props = defineProps<{
    athleteId: string
    date: Date
    activities: CalendarActivity[]
    readinessScore?: number | null
    daySummary?: any
    compact?: boolean
    isToday?: boolean
    isDragTarget?: boolean
  }>()

  const emit = defineEmits<{
    dragover: []
    drop: [event: DragEvent]
    'activity-click': [activity: CalendarActivity]
    'compare-activity': [activity: CalendarActivity]
  }>()

  const { formatDateUTC } = useFormat()

  const visibleActivities = computed(() => props.activities.slice(0, props.compact ? 3 : 6))
  const hiddenCount = computed(() =>
    Math.max(0, props.activities.length - visibleActivities.value.length)
  )
  const readinessLabel = computed(() => {
    const score = props.readinessScore
    if (score == null) return '--'
    if (score >= 80) return 'High'
    if (score >= 60) return 'Moderate'
    return 'Low'
  })

  function activityClass(activity: CalendarActivity) {
    if (
      (activity.source === 'completed' && activity.plannedWorkoutId) ||
      (activity.source === 'planned' && activity.status === 'completed_plan')
    ) {
      return 'border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20'
    }
    if (activity.source === 'planned') {
      return activity.status === 'missed'
        ? 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20'
        : 'border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20'
    }
    if (activity.source === 'completed') {
      return 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20'
    }
    return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/70'
  }

  function activityDotClass(activity: CalendarActivity) {
    if (
      (activity.source === 'completed' && activity.plannedWorkoutId) ||
      (activity.source === 'planned' && activity.status === 'completed_plan')
    ) {
      return 'bg-blue-500'
    }
    if (activity.source === 'planned') {
      return activity.status === 'missed' ? 'bg-red-500' : 'bg-amber-500'
    }
    if (activity.source === 'completed') {
      return 'bg-emerald-500'
    }
    return 'bg-gray-400'
  }

  function onActivityDragStart(event: DragEvent, activity: CalendarActivity) {
    if (activity.source !== 'planned') return
    event.dataTransfer?.setData(
      'application/json',
      JSON.stringify({
        type: 'planned-workout',
        athleteId: props.athleteId,
        workoutId: activity.id
      })
    )
  }
</script>
