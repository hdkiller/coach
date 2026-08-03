<template>
  <div class="space-y-6">
    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <USkeleton class="h-32 w-full" />
      <USkeleton class="h-32 w-full" />
      <USkeleton class="h-32 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      icon="i-heroicons-exclamation-triangle"
      title="Error loading nutrition summary"
      :description="error.message || 'Could not load fueling strategy for this athlete.'"
    />

    <template v-else-if="nutrition">
      <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <UCard :ui="mobileListCardUi">
          <template #header>
            <h3 class="font-bold text-xs text-gray-500 uppercase">Goal Profile</h3>
          </template>
          <p class="text-2xl font-black capitalize">
            {{ formatGoalProfile(nutrition.targets.goalProfile) }}
          </p>
        </UCard>

        <UCard :ui="mobileListCardUi">
          <template #header>
            <h3 class="font-bold text-xs text-gray-500 uppercase">Carb Target (g/hr)</h3>
          </template>
          <p class="text-2xl font-black">
            {{ nutrition.targets.currentCarbMaxPerHour ?? '--' }}
            <span class="text-sm font-normal text-gray-500">
              / {{ nutrition.targets.ultimateCarbGoalPerHour ?? '--' }} goal
            </span>
          </p>
        </UCard>

        <UCard :ui="mobileListCardUi">
          <template #header>
            <h3 class="font-bold text-xs text-gray-500 uppercase">Sodium Target</h3>
          </template>
          <p class="text-2xl font-black">
            {{ nutrition.targets.sodiumTargetMgPerHour ?? '--' }}
            <span class="text-sm font-normal text-gray-500">mg/hr</span>
          </p>
        </UCard>

        <UCard :ui="mobileListCardUi">
          <template #header>
            <h3 class="font-bold text-xs text-gray-500 uppercase">Protein / Fat per kg</h3>
          </template>
          <p class="text-2xl font-black">
            {{ nutrition.targets.proteinPerKg ?? '--' }}g
            <span class="text-sm font-normal text-gray-500">
              / {{ nutrition.targets.fatPerKg ?? '--' }}g
            </span>
          </p>
        </UCard>
      </div>

      <UCard :ui="mobileListCardUi">
        <template #header>
          <div>
            <h3 class="font-bold">Upcoming Fueling Plan</h3>
            <p class="text-xs text-gray-500">
              Carb targets and fueling intensity for the next
              {{ nutrition.upcomingFuelingPlan.length }}
              days. Read-only strategy view - does not include logged meals.
            </p>
          </div>
        </template>

        <div
          v-if="nutrition.upcomingFuelingPlan?.length"
          class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3"
        >
          <div
            v-for="day in nutrition.upcomingFuelingPlan"
            :key="day.date"
            class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center"
          >
            <p class="text-[10px] font-bold text-gray-400 uppercase">
              {{ formatDayShort(day.date) }}
            </p>
            <UBadge :color="getFuelStateColor(day.state)" variant="subtle" class="mt-1 font-bold">
              {{ day.label }}
            </UBadge>
            <p class="mt-2 text-lg font-black">
              {{ day.carbsTarget ?? '--' }}
              <span class="text-xs font-normal text-gray-500">g carbs</span>
            </p>
            <p v-if="day.isRest" class="text-[10px] text-gray-400 uppercase mt-1">Rest day</p>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-500 italic">
          No upcoming fueling plan available.
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { mobileListCardUi } from '~/utils/mobile-surface-ui'

  interface NutritionSummary {
    athleteId: string
    timezone: string
    targets: {
      goalProfile: string | null
      targetAdjustmentPercent: number | null
      carbsPerHour: { low: number | null; medium: number | null; high: number | null }
      currentCarbMaxPerHour: number | null
      ultimateCarbGoalPerHour: number | null
      sodiumTargetMgPerHour: number | null
      proteinPerKg: number | null
      fatPerKg: number | null
      preWorkoutWindowMinutes: number | null
      postWorkoutWindowMinutes: number | null
    }
    upcomingFuelingPlan: Array<{
      date: string
      state: number
      label: string
      carbsTarget: number | null
      isRest: boolean
    }>
  }

  const props = defineProps<{
    athleteId: string
  }>()

  const { formatDateUTC } = useFormat()

  const {
    data: nutrition,
    pending,
    error
  } = useAsyncData<NutritionSummary>(
    `athlete-nutrition-${props.athleteId}`,
    () => ($fetch as any)(`/api/coaching/athletes/${props.athleteId}/nutrition`),
    { lazy: true }
  ) as any

  function formatDayShort(date: string) {
    return formatDateUTC(date, 'EEE')
  }

  function formatGoalProfile(profile: string | null) {
    if (!profile) return '--'
    return profile.toLowerCase().replace(/_/g, ' ')
  }

  function getFuelStateColor(state: number) {
    if (state === 3) return 'error'
    if (state === 2) return 'warning'
    return 'success'
  }
</script>
