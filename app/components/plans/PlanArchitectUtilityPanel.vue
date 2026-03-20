<template>
  <aside
    class="flex min-h-full flex-col overflow-hidden rounded-none border-y border-default/80 bg-default/90 shadow-sm backdrop-blur sm:rounded-3xl sm:border"
  >
    <div class="border-b border-default/80 px-4 py-4 sm:px-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-[10px] font-black uppercase tracking-[0.24em] text-primary/80">
            Utility Panel
          </div>
          <h3 class="mt-2 text-lg font-black tracking-tight text-highlighted">
            Blueprint Heuristics
          </h3>
          <p class="mt-1 text-xs leading-5 text-muted">
            Manage plan strategy, coach notes, and athlete-facing instructions.
          </p>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
      <div class="space-y-8">
        <!-- Blueprint Overview Stats -->
        <section class="space-y-4">
          <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            Health & Density
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="stat in enhancedStats"
              :key="stat.label"
              class="rounded-2xl border border-default/70 bg-muted/25 px-4 py-3"
            >
              <div class="text-[9px] font-black uppercase tracking-[0.18em] text-muted">
                {{ stat.label }}
              </div>
              <div class="mt-1.5 text-sm font-bold text-highlighted">{{ stat.value }}</div>
              <div v-if="stat.subValue" class="mt-0.5 text-[10px] text-muted">
                {{ stat.subValue }}
              </div>
            </div>
          </div>
        </section>

        <!-- Discipline Distribution -->
        <section v-if="distribution.length" class="space-y-4">
          <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            Discipline Mix
          </div>
          <div class="space-y-3">
            <div v-for="item in distribution" :key="item.label" class="space-y-1.5">
              <div
                class="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider"
              >
                <span class="text-highlighted">{{ item.label }}</span>
                <span class="text-muted">{{ item.percentage }}%</span>
              </div>
              <UProgress :model-value="item.percentage" :color="item.color" size="xs" />
            </div>
          </div>
        </section>

        <!-- Coach Notes (Private) -->
        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              Notes for Coach
            </div>
            <UBadge color="neutral" variant="soft" size="sm">Private</UBadge>
          </div>
          <UTextarea
            v-model="coachNotesModel"
            placeholder="Internal strategy, block progression logic, or season priorities..."
            :rows="6"
            variant="soft"
            class="w-full bg-muted/10"
            @blur="$emit('update:coachNotes', coachNotesModel)"
          />
        </section>

        <!-- Athlete Notes (Visible) -->
        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              Notes for Athlete
            </div>
            <UBadge color="primary" variant="soft" size="sm">Visible</UBadge>
          </div>
          <UTextarea
            v-model="athleteNotesModel"
            placeholder="General advice, gear requirements, or psychological focus for this plan..."
            :rows="6"
            variant="soft"
            class="w-full bg-muted/10"
            @blur="$emit('update:athleteNotes', athleteNotesModel)"
          />
        </section>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
  const props = defineProps<{
    coachNotes: string
    athleteNotes: string
    stats: {
      totalWeeks: number
      totalWorkouts: number
      avgWeeklyMinutes: number
      avgWeeklyTss: number
      workoutDensity: number
      disciplineBreakdown: Record<string, number>
    }
  }>()

  const emit = defineEmits<{
    'update:coachNotes': [value: string]
    'update:athleteNotes': [value: string]
  }>()

  const coachNotesModel = ref(props.coachNotes)
  const athleteNotesModel = ref(props.athleteNotes)

  watch(
    () => props.coachNotes,
    (val) => {
      coachNotesModel.value = val
    }
  )
  watch(
    () => props.athleteNotes,
    (val) => {
      athleteNotesModel.value = val
    }
  )

  const enhancedStats = computed(() => [
    {
      label: 'Weekly density',
      value: `${props.stats.workoutDensity.toFixed(1)} sesh`,
      subValue: 'Avg workouts per week'
    },
    {
      label: 'Avg weekly vol',
      value: `${Math.round(props.stats.avgWeeklyMinutes)} min`,
      subValue: 'Target duration'
    },
    {
      label: 'Avg weekly load',
      value: `${Math.round(props.stats.avgWeeklyTss)} TSS`,
      subValue: 'Target stress'
    },
    {
      label: 'Total span',
      value: `${props.stats.totalWeeks} weeks`,
      subValue: `${props.stats.totalWorkouts} total workouts`
    }
  ])

  const distribution = computed(() => {
    const total = Object.values(props.stats.disciplineBreakdown).reduce((a, b) => a + b, 0)
    if (!total) return []

    const colorMap: Record<string, any> = {
      Run: 'success',
      Ride: 'info',
      Gym: 'secondary',
      'Rest/Recovery': 'warning',
      Other: 'neutral'
    }

    return Object.entries(props.stats.disciplineBreakdown)
      .map(([label, count]) => ({
        label,
        count,
        percentage: Math.round((count / total) * 100),
        color: colorMap[label] || 'neutral'
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.percentage - a.percentage)
  })
</script>
