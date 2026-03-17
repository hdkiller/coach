<template>
  <div
    class="group/workout rounded-xl border bg-default p-2.5 shadow-sm transition-colors hover:bg-muted/10"
    :class="workoutCardTone(workout)"
  >
    <div class="flex items-start gap-2 text-left">
      <button class="min-w-0 flex-1 text-left" @click="$emit('edit', workout)">
        <div class="text-[14px] font-bold leading-[1.2] text-highlighted">
          {{ workout.title }}
        </div>
        <div class="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-muted">
          {{ workout.type || 'Workout' }}
        </div>
        <MiniWorkoutChart
          v-if="workout.structuredWorkout"
          :workout="workout"
          class="mt-2 h-8 w-16 opacity-80"
        />
        <div
          class="mt-2 flex items-center justify-between gap-3 text-[10px] font-medium text-muted"
        >
          <span class="whitespace-nowrap">{{
            formatMinutes(Math.round((workout.durationSec || 0) / 60))
          }}</span>
          <span class="whitespace-nowrap text-right">{{ Math.round(workout.tss || 0) }} TSS</span>
        </div>
      </button>

      <div class="flex shrink-0 flex-col items-end gap-1">
        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 text-primary">
          <UIcon :name="getWorkoutIcon(workout.type)" class="h-4 w-4" />
        </div>

        <div
          class="flex items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover/workout:opacity-100"
        >
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-heroicons-document-plus"
            :disabled="inLibrary"
            :title="inLibrary ? 'Already in library' : 'Copy to library'"
            @click.stop="$emit('copy-to-library', workout)"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-heroicons-pencil-square"
            @click.stop="$emit('edit', workout)"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-heroicons-trash"
            @click.stop="$emit('remove', workout.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import { getWorkoutIcon } from '~/utils/activity-types'

  defineProps<{
    workout: any
    inLibrary?: boolean
  }>()

  defineEmits<{
    edit: [workout: any]
    remove: [id: string]
    'copy-to-library': [workout: any]
  }>()

  function formatMinutes(minutes: number) {
    const safeMinutes = Math.max(0, Math.round(minutes || 0))
    const hours = Math.floor(safeMinutes / 60)
    const remainder = safeMinutes % 60
    if (!hours) return `${remainder}m`
    if (!remainder) return `${hours}h`
    return `${hours}h ${remainder}m`
  }

  function workoutCardTone(workout: any) {
    const type = String(workout.type || '').toUpperCase()
    if (type.includes('RUN')) return 'border-emerald-500/25'
    if (type.includes('RIDE') || type.includes('BIKE') || type.includes('CYCLE'))
      return 'border-sky-500/25'
    if (type.includes('REST') || type.includes('RECOVERY')) return 'border-amber-500/25'
    if (type.includes('GYM') || type.includes('STRENGTH')) return 'border-fuchsia-500/25'
    return 'border-default'
  }
</script>
