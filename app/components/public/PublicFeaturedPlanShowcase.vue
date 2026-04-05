<template>
  <div class="space-y-4 sm:space-y-6">
    <div
      v-for="plan in plans"
      :key="plan.id"
      class="overflow-hidden rounded-none border-y border-white/10 bg-[#0b1220] shadow-[0_24px_80px_-40px_rgba(15,23,42,0.95)] sm:rounded-[2rem] sm:border"
    >
      <div
        class="border-b border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(59,130,246,0.08),rgba(15,23,42,0.7))] p-4 sm:p-8"
      >
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <div class="flex flex-wrap gap-2">
              <UBadge color="primary" variant="soft">{{
                formatEnumLabel(plan.primarySport) || 'Plan'
              }}</UBadge>
              <UBadge v-if="plan.skillLevel" color="neutral" variant="soft">
                {{ formatEnumLabel(plan.skillLevel) }}
              </UBadge>
              <UBadge color="neutral" variant="soft">
                {{ plan.lengthWeeks || 'Flexible' }} weeks
              </UBadge>
            </div>
            <h3 class="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {{ plan.name }}
            </h3>
            <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              {{ plan.publicHeadline || plan.publicDescription || 'Featured plan preview.' }}
            </p>
            <div
              v-if="plan.coachNote"
              class="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3"
            >
              <div class="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                Coach note
              </div>
              <div class="mt-2 whitespace-pre-wrap text-sm leading-7 text-emerald-100">
                {{ plan.coachNote }}
              </div>
            </div>
            <p v-if="plan.methodology" class="mt-4 line-clamp-3 text-sm leading-7 text-slate-400">
              {{ plan.methodology }}
            </p>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <UButton
              :to="buildPublicPlanPath(plan)"
              color="primary"
              trailing-icon="i-heroicons-arrow-right"
            >
              View full plan
            </UButton>
            <UButton
              v-if="plan.author?.slug"
              :to="buildPublicCoachPath(plan.author.slug)"
              color="neutral"
              variant="outline"
            >
              Coach profile
            </UButton>
          </div>
        </div>
      </div>

      <div class="grid gap-0 xl:grid-cols-[minmax(0,1.4fr)_420px]">
        <div class="p-4 sm:p-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Training Plan Sample Week
              </div>
              <h4 class="mt-2 text-xl font-black tracking-tight text-white">
                {{
                  selectedWeek(plan)?.focus ||
                  `Sample Workouts - Week ${selectedWeek(plan)?.weekNumber || ''}`
                }}
              </h4>
            </div>
            <div class="text-sm text-slate-400">
              {{
                selectedWeek(plan)?.workouts?.filter((workout: any) => workout.durationSec > 0)
                  .length || 0
              }}
              active sessions
            </div>
          </div>

          <div v-if="plan.sampleWeeks?.length" class="mt-5 flex flex-wrap gap-2">
            <button
              v-for="week in plan.sampleWeeks"
              :key="week.id"
              class="rounded-full border px-4 py-2 text-sm font-semibold transition"
              :class="
                selectedWeekIdMap[plan.id] === week.id
                  ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white'
              "
              @click="selectedWeekIdMap[plan.id] = week.id"
            >
              Week {{ week.weekNumber }}
            </button>
          </div>

          <div class="mt-6 grid gap-4">
            <div
              class="flex gap-1.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:gap-2 sm:overflow-visible sm:pb-0"
            >
              <button
                v-for="day in buildDayPreview(selectedWeek(plan))"
                :key="`${plan.id}-${day.dayIndex}`"
                class="min-w-[64px] shrink-0 rounded-xl border px-2 py-3 text-center transition sm:min-w-0 sm:rounded-2xl sm:px-3 sm:py-4"
                :class="
                  selectedDayMap[plan.id] === day.dayIndex
                    ? 'border-emerald-400/50 bg-emerald-400/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                "
                @click="selectedDayMap[plan.id] = day.dayIndex"
              >
                <div class="text-[11px] font-black uppercase tracking-[0.18em]">
                  {{ day.label }}
                </div>
                <div
                  class="mx-auto mt-3 h-2.5 w-2.5 rounded-full"
                  :class="day.workout ? 'bg-emerald-300' : 'bg-slate-600'"
                />
              </button>
            </div>

            <div
              class="rounded-[1.3rem] border border-white/10 bg-white/5 p-4 sm:rounded-[1.5rem] sm:p-5"
            >
              <div
                v-if="selectedWorkout(plan)"
                class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
              >
                <div class="space-y-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"
                    >
                      <UIcon :name="getWorkoutIcon(selectedWorkout(plan)?.type)" class="h-6 w-6" />
                    </div>
                    <div>
                      <div class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        {{ dayLabel(selectedWorkout(plan)?.dayIndex) }}
                      </div>
                      <div class="text-2xl font-black tracking-tight text-white">
                        {{ selectedWorkout(plan)?.title }}
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2 text-sm text-slate-300">
                    <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                      {{ selectedWorkout(plan)?.type || 'Workout' }}
                    </span>
                    <span
                      v-if="selectedWorkout(plan)?.durationSec"
                      class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                    >
                      {{ formatDuration(selectedWorkout(plan)?.durationSec) }}
                    </span>
                    <span
                      v-if="selectedWorkout(plan)?.tss"
                      class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                    >
                      {{ Math.round(selectedWorkout(plan)?.tss) }} TSS
                    </span>
                  </div>
                </div>
                <div class="text-sm text-slate-400">
                  {{ selectedWeek(plan)?.blockName || 'Sample week' }}
                </div>
              </div>
              <div v-else class="space-y-2">
                <div class="text-2xl font-black tracking-tight text-white">Recovery day</div>
                <div class="text-sm text-slate-400">
                  No structured workout scheduled for this day in the sample week.
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 space-y-4">
            <div class="text-2xl font-black tracking-tight text-white">Stats</div>
            <div
              class="rounded-[1.3rem] border border-white/10 bg-white/5 p-4 sm:rounded-[1.5rem] sm:p-5"
            >
              <div class="text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                Average Weekly Breakdown
              </div>
              <div class="mt-5 space-y-3">
                <div
                  class="hidden grid-cols-[minmax(0,1.3fr)_160px_160px] gap-4 px-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 sm:grid"
                >
                  <div>Workouts Per Week</div>
                  <div class="text-right">Weekly Average</div>
                  <div class="text-right">Longest Workout</div>
                </div>
                <div
                  v-for="item in plan.stats?.activityBreakdown || []"
                  :key="item.type"
                  class="space-y-4 rounded-2xl border border-white/10 bg-[#111827] px-4 py-4 sm:grid sm:grid-cols-[minmax(0,1.3fr)_160px_160px] sm:gap-4 sm:space-y-0 sm:py-3"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"
                    >
                      <UIcon :name="getWorkoutIcon(item.type)" class="h-5 w-5" />
                    </div>
                    <div class="min-w-0">
                      <div class="truncate text-base font-semibold text-white">
                        {{ formatWorkoutType(item.type) }}
                      </div>
                      <div class="mt-1 flex gap-1">
                        <span
                          v-for="dot in renderCountDots(item.averageCountPerWeek)"
                          :key="dot"
                          class="h-2.5 w-2.5 rounded-full bg-emerald-300/80"
                        />
                      </div>
                    </div>
                  </div>
                  <div class="text-base font-semibold text-white sm:text-right">
                    <div
                      class="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:hidden"
                    >
                      Weekly Average
                    </div>
                    {{
                      formatDuration(
                        item.averageCountPerWeek ? plan.stats.weeklyAverageDurationSec : 0
                      )
                    }}
                  </div>
                  <div class="text-base font-semibold text-white sm:text-right">
                    <div
                      class="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:hidden"
                    >
                      Longest Workout
                    </div>
                    {{ item.longestWorkoutSec ? formatDuration(item.longestWorkoutSec) : '--' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-white/10 bg-[#0f172a]/80 p-4 sm:p-8 xl:border-l xl:border-t-0">
          <div class="text-sm font-black uppercase tracking-[0.18em] text-slate-300">
            Training Load By Week
          </div>
          <div class="mt-6 flex h-[280px] items-end gap-3">
            <div
              v-for="week in plan.stats?.weeklyDurations || []"
              :key="`${plan.id}-chart-${week.weekNumber}`"
              class="flex min-w-0 flex-1 flex-col items-center gap-3"
            >
              <div class="flex h-56 w-full items-end rounded-t-2xl bg-white/5 px-1 pb-1">
                <div
                  class="w-full rounded-t-xl bg-[linear-gradient(180deg,#34d399,#2563eb)]"
                  :style="{
                    height: `${chartHeight(week.durationHours, plan.stats?.weeklyDurations || [])}%`
                  }"
                />
              </div>
              <div class="text-xs font-semibold text-slate-400">{{ week.weekNumber }}</div>
            </div>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Sessions / week
              </div>
              <div class="mt-2 text-2xl font-black text-white">
                {{ (plan.stats?.workoutsPerWeek || 0).toFixed(1) }}
              </div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Weekly average
              </div>
              <div class="mt-2 text-2xl font-black text-white">
                {{ formatDuration(plan.stats?.weeklyAverageDurationSec || 0) }}
              </div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Longest workout
              </div>
              <div class="mt-2 text-2xl font-black text-white">
                {{
                  plan.stats?.longestWorkoutSec
                    ? formatDuration(plan.stats.longestWorkoutSec)
                    : '--'
                }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, watchEffect } from 'vue'
  import { buildPublicCoachPath, buildPublicPlanPath } from '#shared/public-plans'

  const { plans } = defineProps<{
    plans: any[]
  }>()

  const { formatDuration } = useFormat()

  const selectedWeekIdMap = reactive<Record<string, string>>({})
  const selectedDayMap = reactive<Record<string, number>>({})

  watchEffect(() => {
    for (const plan of plans || []) {
      if (
        !selectedWeekIdMap[plan.id] &&
        (plan.highlightedSampleWeekId || plan.sampleWeeks?.[0]?.id)
      ) {
        selectedWeekIdMap[plan.id] = plan.highlightedSampleWeekId || plan.sampleWeeks[0].id
      }
      const week =
        plan.sampleWeeks?.find((entry: any) => entry.id === selectedWeekIdMap[plan.id]) ||
        plan.sampleWeeks?.[0]
      if (week && selectedDayMap[plan.id] === undefined) {
        selectedDayMap[plan.id] = week.workouts?.[0]?.dayIndex ?? 0
      }
    }
  })

  function formatEnumLabel(value?: string | null) {
    if (!value) return null
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function formatWorkoutType(value?: string | null) {
    return formatEnumLabel(value) || 'Workout'
  }

  function selectedWeek(plan: any) {
    return (
      plan.sampleWeeks?.find((week: any) => week.id === selectedWeekIdMap[plan.id]) ||
      plan.sampleWeeks?.[0] ||
      null
    )
  }

  function selectedWorkout(plan: any) {
    const week = selectedWeek(plan)
    return (
      week?.workouts?.find((workout: any) => workout.dayIndex === selectedDayMap[plan.id]) || null
    )
  }

  function buildDayPreview(week: any) {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return dayNames.map((label, index) => ({
      label,
      dayIndex: index,
      workout: week?.workouts?.find((item: any) => item.dayIndex === index) || null
    }))
  }

  function dayLabel(dayIndex?: number | null) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return typeof dayIndex === 'number' ? dayNames[dayIndex] : 'Day'
  }

  function getWorkoutIcon(type?: string | null) {
    const normalized = (type || '').toUpperCase()
    if (normalized.includes('RUN')) return 'i-heroicons-fire'
    if (normalized.includes('RIDE') || normalized.includes('BIKE') || normalized.includes('CYCLE'))
      return 'i-heroicons-bolt'
    if (normalized.includes('SWIM')) return 'i-heroicons-trophy'
    if (normalized.includes('STRENGTH')) return 'i-heroicons-hand-thumb-up'
    if (normalized.includes('REST') || normalized.includes('OFF')) return 'i-heroicons-moon'
    return 'i-heroicons-calendar-days'
  }

  function renderCountDots(value: number) {
    return Array.from({ length: Math.max(1, Math.round(value)) }, (_, index) => index)
  }

  function chartHeight(value: number, weeklyDurations: Array<{ durationHours: number }>) {
    const max = Math.max(...weeklyDurations.map((week) => week.durationHours), 1)
    return Math.max(8, Math.round((value / max) * 100))
  }
</script>
