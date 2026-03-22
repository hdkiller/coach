<script setup lang="ts">
  const props = defineProps<{
    compact?: boolean
  }>()

  const comparisonStore = useWorkoutComparisonStore()
  const router = useRouter()
  const isOpen = ref(false)

  const canCompare = computed(() => comparisonStore.count >= 2)

  function openComparison(mode: 'summary' | 'stream' | 'interval') {
    isOpen.value = false
    router.push({
      path: '/analytics/workout-comparison',
      query: { mode }
    })
  }
</script>

<template>
  <div
    v-if="comparisonStore.count > 0"
    class="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-2xl border border-default/70 bg-default/95 p-2 shadow-2xl backdrop-blur"
  >
    <div class="hidden min-w-0 px-2 sm:block">
      <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
        Workout Compare
      </div>
      <div class="truncate text-sm font-bold text-highlighted">
        {{ comparisonStore.count }} workout{{ comparisonStore.count === 1 ? '' : 's' }} selected
      </div>
    </div>

    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      icon="i-lucide-trash"
      aria-label="Clear workout comparison basket"
      @click="comparisonStore.clear()"
    />

    <UModal v-model:open="isOpen" title="Workout Comparison">
      <UButton
        color="primary"
        :variant="canCompare ? 'solid' : 'outline'"
        size="sm"
        icon="i-lucide-git-compare-arrows"
        :disabled="!canCompare"
        @click="isOpen = true"
      >
        Compare
      </UButton>

      <template #body>
        <div class="space-y-4">
          <div class="space-y-1">
            <div class="text-sm font-bold text-highlighted">
              Choose how you want to compare these workouts
            </div>
            <p class="text-sm text-muted">
              Summary comparison is best for scalar workout metrics. Stream and interval comparison
              use the dedicated viewer.
            </p>
          </div>

          <div class="space-y-2">
            <button
              class="flex w-full items-start gap-3 rounded-2xl border border-default/70 bg-default p-3 text-left transition hover:border-primary/50"
              @click="openComparison('summary')"
            >
              <UIcon name="i-lucide-bar-chart-3" class="mt-0.5 h-4 w-4 text-primary-500" />
              <div>
                <div class="font-bold text-highlighted">Summary comparison</div>
                <p class="text-sm text-muted">
                  Compare TSS, power, efficiency, or other workout-level metrics.
                </p>
              </div>
            </button>

            <button
              class="flex w-full items-start gap-3 rounded-2xl border border-default/70 bg-default p-3 text-left transition hover:border-primary/50"
              @click="openComparison('stream')"
            >
              <UIcon name="i-lucide-waveform" class="mt-0.5 h-4 w-4 text-primary-500" />
              <div>
                <div class="font-bold text-highlighted">Stream comparison</div>
                <p class="text-sm text-muted">
                  Align power, heart rate, cadence, or other streams across the selected workouts.
                </p>
              </div>
            </button>

            <button
              class="flex w-full items-start gap-3 rounded-2xl border border-default/70 bg-default p-3 text-left transition hover:border-primary/50"
              @click="openComparison('interval')"
            >
              <UIcon name="i-lucide-split" class="mt-0.5 h-4 w-4 text-primary-500" />
              <div>
                <div class="font-bold text-highlighted">Interval comparison</div>
                <p class="text-sm text-muted">
                  Compare laps or split-level metrics when workouts expose interval structure.
                </p>
              </div>
            </button>
          </div>

          <div class="rounded-2xl border border-default/60 bg-muted/20 p-3">
            <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              Selected workouts
            </div>
            <div class="mt-2 space-y-2">
              <div
                v-for="workout in comparisonStore.selectedWorkouts"
                :key="workout.id"
                class="flex items-center justify-between gap-2 rounded-xl border border-default/60 bg-default px-3 py-2"
              >
                <div class="min-w-0">
                  <div class="truncate text-sm font-bold text-highlighted">
                    {{ workout.title }}
                  </div>
                  <div class="truncate text-xs text-muted">
                    {{ workout.athleteName || 'Athlete' }}
                  </div>
                </div>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-x"
                  @click="comparisonStore.removeWorkout(workout.id)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
