<template>
  <ClientOnly>
    <UDashboardPanel id="planned-workout-charts">
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-arrow-left"
              @click="navigateTo(`/workouts/planned/${route.params.id}`)"
            >
              Back
            </UButton>
          </template>
          <template #title>
            <span>{{ workout?.title || 'Planned Workout Charts' }}</span>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
          <div v-if="pending" class="space-y-4">
            <USkeleton class="h-10 w-64" />
            <USkeleton class="h-80 w-full rounded-xl" />
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <USkeleton v-for="i in 3" :key="i" class="h-28 w-full rounded-xl" />
            </div>
          </div>

          <div v-else-if="!workout" class="text-sm text-gray-500 dark:text-gray-400">
            Workout not found.
          </div>

          <div v-else class="space-y-6">
            <div
              class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
            >
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <UBadge color="neutral" variant="soft" class="font-bold uppercase tracking-wide">
                  {{ workout.type }}
                </UBadge>
                <UBadge color="primary" variant="subtle" class="font-bold uppercase tracking-wide">
                  Preference: {{ preference }}
                </UBadge>
                <UBadge color="neutral" variant="subtle" class="font-bold uppercase tracking-wide">
                  {{ formatDateUTC(workout.date, 'EEEE, MMMM d, yyyy') }}
                </UBadge>
              </div>

              <h1 class="text-2xl font-black tracking-tight">{{ workout.title }}</h1>
              <p v-if="workout.description" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {{ workout.description }}
              </p>
            </div>

            <div
              class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
            >
              <div class="mb-4">
                <div class="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                  Full Chart
                </div>
              </div>

              <WorkoutRunChart
                v-if="isRunWorkout"
                :workout="workout"
                :preference="preference"
                :sport-settings="effectiveSportSettings"
              />
              <WorkoutChart
                v-else
                :workout="workout"
                :user-ftp="effectiveSportSettings?.ftp"
                :sport-settings="effectiveSportSettings"
              />
            </div>

            <div
              class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
            >
              <div class="mb-4">
                <div class="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                  Mini Charts
                </div>
              </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4"
              >
                <div
                  class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3"
                >
                  Today&apos;s Plan
                </div>
                <div
                  class="relative w-32 h-12 opacity-15 dark:opacity-25 pointer-events-none -mb-1 translate-y-1"
                >
                  <MiniWorkoutChart
                    :workout="workout"
                    :sport-settings="effectiveSportSettings"
                    :preference="preference"
                  />
                </div>
              </div>

              <div
                class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4"
              >
                <div
                  class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3"
                  >
                    Calendar Size
                  </div>
                  <MiniWorkoutChart
                    :workout="workout"
                    :sport-settings="effectiveSportSettings"
                    :preference="preference"
                    class="w-full h-6 opacity-80"
                  />
                </div>

                <div
                  class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4"
                >
                  <div
                    class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3"
                  >
                    Card Size
                  </div>
                  <MiniWorkoutChart
                    :workout="workout"
                    :sport-settings="effectiveSportSettings"
                    :preference="preference"
                    class="w-24 h-8 opacity-80"
                  />
                </div>

                <div
                  class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4"
                >
                  <div
                    class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3"
                  >
                    Wide Preview
                  </div>
                  <MiniWorkoutChart
                    :workout="workout"
                    :sport-settings="effectiveSportSettings"
                    :preference="preference"
                    class="w-full h-10 opacity-80"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UDashboardPanel>

    <template #fallback>
      <div class="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-4">
        <USkeleton class="h-10 w-64" />
        <USkeleton class="h-80 w-full rounded-xl" />
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <USkeleton v-for="i in 3" :key="i" class="h-28 w-full rounded-xl" />
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import WorkoutChart from '~/components/workouts/WorkoutChart.vue'
  import WorkoutRunChart from '~/components/workouts/WorkoutRunChart.vue'
  import { getSportSettingsForActivity } from '~/utils/sportSettings'
  import {
    getStructuredWorkoutPayload,
    getWorkoutChartPreference,
    resolveWorkoutChartSportSettings
  } from '~/utils/workoutChartContext'

  definePageMeta({
    middleware: 'auth',
    layout: 'default'
  })

  const route = useRoute()
  const { formatDateUTC } = useFormat()

  const { data: workoutResponse, pending } = await useFetch<any>(
    `/api/workouts/planned/${route.params.id}`,
    {
      key: `planned-workout-charts-${route.params.id}`
    }
  )

  const { data: profile } = await useFetch<any>('/api/profile', {
    key: 'planned-workout-charts-profile'
  })

  const workout = computed(() => workoutResponse.value?.workout || null)
  const allSportSettings = computed(() => profile.value?.profile?.sportSettings || [])

  const applicableSettings = computed(() => {
    if (!workout.value) return workoutResponse.value?.sportSettings || null
    return (
      workoutResponse.value?.sportSettings ||
      getSportSettingsForActivity(allSportSettings.value, workout.value.type)
    )
  })

  const effectiveSportSettings = computed(() => {
    if (!workout.value) return applicableSettings.value
    return resolveWorkoutChartSportSettings(workout.value, applicableSettings.value)
  })

  const isRunWorkout = computed(() => workout.value?.type?.toLowerCase().includes('run'))

  const preference = computed<'hr' | 'power' | 'pace'>(() => {
    const workoutData = getStructuredWorkoutPayload(workout.value)
    if (!workoutData?.steps?.length) return 'power'

    return getWorkoutChartPreference(workout.value, applicableSettings.value, {
      hasHr: workoutData.steps.some((s: any) => s.heartRate),
      hasPower: workoutData.steps.some((s: any) => s.power),
      hasPace: workoutData.steps.some((s: any) => s.pace)
    })
  })
</script>
