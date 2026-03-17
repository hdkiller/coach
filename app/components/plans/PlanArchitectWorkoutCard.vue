<template>
  <div
    class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-2 shadow-sm group/card relative hover:border-primary/50 transition-colors"
  >
    <div class="flex items-start justify-between gap-1">
      <div class="min-w-0">
        <div class="text-[10px] font-black truncate leading-tight uppercase">
          {{ workout.title }}
        </div>
        <div class="flex items-center gap-1 mt-0.5">
          <UIcon :name="getWorkoutIcon(workout.type)" class="w-3 h-3 text-primary" />
          <span class="text-[8px] font-bold text-muted uppercase"
            >{{ Math.round(workout.durationSec / 60) }}m • {{ Math.round(workout.tss) }}TSS</span
          >
        </div>
      </div>
      <UButton
        color="error"
        variant="ghost"
        icon="i-heroicons-x-mark"
        size="xs"
        class="opacity-0 group-hover/card:opacity-100 transition-opacity p-0.5"
        @click="$emit('delete')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { getWorkoutIcon } from '~/utils/activity-types'

  defineProps<{
    workout: any
  }>()

  defineEmits(['delete'])
</script>
