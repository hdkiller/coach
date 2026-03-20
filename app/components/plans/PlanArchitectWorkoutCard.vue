<template>
  <div
    class="group/workout relative rounded-xl border bg-default p-3 shadow-sm transition-colors hover:bg-muted/10"
    :class="workoutCardTone(workout)"
  >
    <button class="block min-w-0 max-w-full pr-12 text-left" @click="$emit('edit', workout)">
      <div class="min-w-0">
        <div class="break-words text-[14px] font-bold leading-[1.2] text-highlighted">
          {{ workout.title }}
        </div>
        <div
          v-if="workout.description"
          class="mt-3 text-[11px] leading-5 text-muted"
          :class="isNote ? 'whitespace-pre-line break-words line-clamp-6' : 'line-clamp-3'"
        >
          {{ displayDescription }}
        </div>

        <MiniWorkoutChart
          v-if="workout.structuredWorkout && !isNote"
          :workout="workout"
          class="mt-2 h-8 w-16 opacity-80"
        />
        <div
          v-if="!isNote"
          class="mt-3 flex items-center justify-between gap-3 text-[10px] font-medium text-muted"
        >
          <span class="whitespace-nowrap">{{
            formatMinutes(Math.round((workout.durationSec || 0) / 60))
          }}</span>
          <span class="whitespace-nowrap text-right">{{ Math.round(workout.tss || 0) }} TSS</span>
        </div>
      </div>
    </button>

    <div class="absolute top-3 right-3 flex flex-col items-end gap-2">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-xl"
        :class="isNote ? 'bg-amber-500/10 text-amber-300' : 'bg-muted/40 text-primary'"
      >
        <UIcon :name="cardIcon" class="h-4 w-4" />
      </div>

      <div
        class="flex items-center gap-0.5 rounded-lg bg-default/95 backdrop-blur-sm opacity-100 transition-opacity lg:opacity-0 lg:group-hover/workout:opacity-100"
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
</template>

<script setup lang="ts">
  import { computed, toRefs } from 'vue'
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import { getWorkoutIcon } from '~/utils/activity-types'

  defineEmits<{
    edit: [workout: any]
    remove: [id: string]
    'copy-to-library': [workout: any]
  }>()

  const props = defineProps<{
    workout: any
    inLibrary?: boolean
  }>()

  const { workout, inLibrary } = toRefs(props)

  const isNote = computed(
    () => workout.value?.category === 'Note' || workout.value?.type === 'Note'
  )

  const displayDescription = computed(() =>
    String(workout.value?.description || '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )

  const cardIcon = computed(() => getWorkoutIcon(isNote.value ? 'Note' : workout.value?.type))

  function formatMinutes(minutes: number) {
    const safeMinutes = Math.max(0, Math.round(minutes || 0))
    const hours = Math.floor(safeMinutes / 60)
    const remainder = safeMinutes % 60
    if (!hours) return `${remainder}m`
    if (!remainder) return `${hours}h`
    return `${hours}h ${remainder}m`
  }

  function workoutCardTone(workout: any) {
    if (workout.category === 'Note' || workout.type === 'Note') return 'border-amber-500/25'
    const type = String(workout.type || '').toUpperCase()
    if (type.includes('RUN')) return 'border-emerald-500/25'
    if (type.includes('RIDE') || type.includes('BIKE') || type.includes('CYCLE'))
      return 'border-sky-500/25'
    if (type.includes('REST') || type.includes('RECOVERY')) return 'border-amber-500/25'
    if (type.includes('GYM') || type.includes('STRENGTH')) return 'border-fuchsia-500/25'
    return 'border-default'
  }
</script>
