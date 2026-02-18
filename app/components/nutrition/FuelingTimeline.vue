<template>
  <div class="space-y-4">
    <div class="relative py-4">
      <template v-for="(window, index) in filteredWindows" :key="index">
        <!-- Physical Effort Anchor -->
        <div
          v-if="window.type === 'WORKOUT_EVENT'"
          class="relative pl-8 pb-10 border-l-2 border-gray-100 dark:border-gray-800 last:border-0 last:pb-0"
        >
          <!-- Timeline Icon -->
          <div
            class="absolute left-[-11px] top-0 w-5 h-5 rounded-full border-2 border-primary-500 bg-primary-500 z-10 flex items-center justify-center shadow-sm"
          >
            <UIcon name="i-heroicons-bolt" class="w-3 h-3 text-white" />
          </div>

          <div class="space-y-6">
            <div v-for="w in window.workouts" :key="w.id" class="space-y-4">
              <div>
                <h3
                  class="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white"
                >
                  Physical Effort: {{ w.title }}
                </h3>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                  {{ formatTime(w.startTime || w.date) }}
                </p>
              </div>

              <NutritionWorkoutEventCard
                :workout="w"
                :start-time="w.startTime || w.date"
                :fuel-state="getWorkoutFuelState(w)"
              />
            </div>
          </div>
        </div>

        <NutritionWindowBlock
          v-else
          :type="window.type"
          :title="formatTitle(window)"
          :start-time="window.startTime"
          :end-time="window.endTime"
          :target-carbs="window.targetCarbs"
          :target-protein="window.targetProtein"
          :target-fat="window.targetFat"
          :target-fluid="window.targetFluid"
          :target-sodium="window.targetSodium"
          :items="window.items"
          :supplements="window.supplements"
          :meals="window.meals"
          :is-locked="isLocked"
          :fuel-state="getWorkoutFuelState(window.workout)"
          :settings="chartSettings"
          @add="$emit('add', $event)"
          @add-ai="$emit('addAi', $event)"
          @edit="$emit('edit', $event)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { FuelingTimelineWindow } from '~/utils/nutrition-timeline'

  const props = defineProps<{
    windows: FuelingTimelineWindow[]
    isLocked?: boolean
    settings?: any
  }>()

  defineEmits(['add', 'addAi', 'edit'])

  const chartSettings = computed(() => ({
    hideEmptyWindows: false,
    hideHydration: false,
    hidePastSuggestions: true,
    showSupplements: true,
    mergeWindows: true,
    ...props.settings
  }))

  const filteredWindows = computed(() => {
    if (!chartSettings.value.hideEmptyWindows) return props.windows

    return props.windows.filter((w) => {
      if (w.type === 'DAILY_BASE' && w.items.length === 0) return false
      return true
    })
  })

  function getWorkoutFuelState(workout: any) {
    if (!workout) return 1
    const intensity = workout.workIntensity || workout.intensityFactor || 0.65
    if (intensity > 0.85) return 3
    if (intensity > 0.6) return 2
    return 1
  }

  const formatTime = (date: Date | string) => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    if (!(d instanceof Date) || isNaN(d.getTime())) return ''
    const { formatDate } = useFormat()
    return formatDate(d, 'HH:mm')
  }

  function formatTitle(window: FuelingTimelineWindow) {
    if (window.type === 'TRANSITION') return 'Transition Fueling'
    if (window.type === 'DAILY_BASE') {
      return window.description !== 'Daily baseline' ? window.description : 'Daily Base'
    }
    if (window.type === 'WORKOUT_EVENT') return window.workout?.title || 'Workout'

    const typeMap: Record<string, string> = {
      PRE_WORKOUT: 'Pre-Workout',
      INTRA_WORKOUT: 'Intra-Workout Fueling',
      POST_WORKOUT: 'Post-Workout Recovery'
    }

    const typeStr = typeMap[window.type] || window.type
    const title = window.workoutTitle || window.workout?.title
    return title ? `${typeStr}: ${title}` : typeStr
  }
</script>
