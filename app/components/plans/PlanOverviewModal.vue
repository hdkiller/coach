<template>
  <UModal
    v-model:open="open"
    :title="plan?.name || 'Training Plan'"
    fullscreen
    description="Dialog content and actions."
  >
    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"
          />
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading plan details...</p>
        </div>
      </div>

      <div v-else-if="plan" class="space-y-6">
        <!-- Header Info -->
        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div class="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div v-if="plan.goal?.title" class="flex items-center gap-1">
              <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-amber-500" />
              Goal: {{ plan.goal.title }}
            </div>
            <div v-if="plan.startDate" class="flex items-center gap-1">
              <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
              Starts {{ formatDate(plan.startDate) }}
            </div>
            <div v-if="plan.blocks?.length" class="flex items-center gap-1">
              <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
              {{ plan.blocks.length }} Blocks
            </div>
          </div>
          <p
            v-if="plan.description"
            class="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
          >
            {{ plan.description }}
          </p>
        </div>

        <!-- Blocks and Weeks -->
        <div v-for="block in plan.blocks" :key="block.id" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-cube-transparent" class="w-6 h-6 text-primary-500" />
              {{ block.name }}
            </h2>
            <UBadge color="neutral" variant="soft">{{ block.weeks?.length || 0 }} Weeks</UBadge>
          </div>

          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="week in block.weeks"
              :key="week.id"
              class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
            >
              <div
                class="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center"
              >
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  Week {{ week.weekNumber }}
                </h3>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDateRange(week.startDate, week.endDate) }}
                </span>
              </div>

              <div class="p-4 flex-1 space-y-3">
                <div v-if="week.focus" class="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  Focus: {{ week.focus }}
                </div>

                <div
                  v-if="week.workouts?.length === 0"
                  class="text-sm text-gray-500 text-center py-4"
                >
                  No workouts planned
                </div>

                <div
                  v-for="workout in week.workouts"
                  :key="workout.id"
                  class="block p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-start mb-1">
                        <div class="flex items-center gap-2 min-w-0">
                          <span
                            class="text-sm font-medium text-gray-900 dark:text-white line-clamp-1"
                            >{{ workout.title }}</span
                          >
                          <UTooltip
                            v-if="
                              workout.completionStatus === 'COMPLETED' ||
                              (workout.completedWorkouts && workout.completedWorkouts.length > 0)
                            "
                            text="Completed"
                          >
                            <UIcon
                              name="i-heroicons-check-circle"
                              class="w-4 h-4 text-success shrink-0"
                            />
                          </UTooltip>
                          <UTooltip v-else-if="workout.completionStatus === 'MISSED'" text="Missed">
                            <UIcon
                              name="i-heroicons-x-circle"
                              class="w-4 h-4 text-error shrink-0"
                            />
                          </UTooltip>
                        </div>
                      </div>
                      <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span class="flex items-center gap-1">
                          <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                          {{ formatDay(workout.date) }}
                        </span>
                        <span v-if="workout.durationSec" class="flex items-center gap-1">
                          <UIcon name="i-heroicons-clock" class="w-3 h-3" />
                          {{ formatDuration(workout.durationSec) }}
                        </span>
                        <span
                          v-if="workout.tss"
                          class="flex items-center gap-1 text-amber-600 dark:text-amber-500"
                        >
                          <UIcon name="i-heroicons-bolt" class="w-3 h-3" />
                          {{ Math.round(workout.tss) }} TSS
                        </span>
                      </div>
                    </div>

                    <div v-if="workout.structuredWorkout" class="shrink-0">
                      <MiniWorkoutChart
                        :workout="workout.structuredWorkout"
                        class="w-20 h-10 opacity-75"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <slot name="footer-actions">
          <UButton
            label="Close"
            color="neutral"
            variant="ghost"
            @click="$emit('update:open', false)"
          />
        </slot>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'

  const { formatDate: baseFormatDate, formatDateUTC, formatDuration } = useFormat()

  defineProps<{
    plan: any
    loading?: boolean
  }>()

  const open = defineModel<boolean>('open', { required: true })

  function formatDate(d: string | Date) {
    if (!d) return ''
    return baseFormatDate(d)
  }

  function formatDay(d: string | Date) {
    if (!d) return ''
    return formatDateUTC(d, 'EEE')
  }

  function formatDateRange(start: string | Date, end: string | Date) {
    if (!start || !end) return ''
    return `${formatDateUTC(start, 'MMM d')} - ${formatDateUTC(end, 'MMM d')}`
  }
</script>
