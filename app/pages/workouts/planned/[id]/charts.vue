<template>
  <ClientOnly>
    <UDashboardPanel id="planned-workout-charts">
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <div class="flex items-center gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-arrow-left"
                @click="navigateTo(`/workouts/planned/${route.params.id}`)"
              >
                Back
              </UButton>
            </div>
          </template>
          <template #title>
            <span>{{ workout?.title || 'Planned Workout Charts' }}</span>
          </template>
          <template #right>
            <UButton
              v-if="workout"
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-heroicons-eye"
              @click="openViewModal"
            >
              View
            </UButton>
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
              <div
                class="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800"
              >
                <div class="flex items-center gap-4">
                  <UButton
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    icon="i-heroicons-chevron-left"
                    class="rounded-lg"
                    :disabled="!previousWorkout"
                    @click="navigateToNeighbor('previous')"
                  />
                  <div
                    class="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 text-center min-w-[132px]"
                  >
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500">
                      {{ formatDateUTC(workout.date, 'EEEE') }}
                    </div>
                    <div
                      class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight"
                    >
                      {{ formatDateUTC(workout.date, 'MMMM d, yyyy') }}
                    </div>
                  </div>
                  <UButton
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    icon="i-heroicons-chevron-right"
                    class="rounded-lg"
                    :disabled="!nextWorkout"
                    @click="navigateToNeighbor('next')"
                  />
                </div>
              </div>

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
              <p
                v-if="workout.description"
                class="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap"
              >
                {{ workout.description }}
              </p>
            </div>

            <div
              class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
            >
              <div class="mb-4">
                <div class="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                  Mini Charts
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div
                  class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
                >
                  <div class="p-4 border-b border-gray-100 dark:border-gray-800">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-light-bulb" class="w-5 h-5 text-primary-500" />
                      <div class="text-sm font-bold tracking-tight uppercase">
                        Training Recommendation
                      </div>
                    </div>
                  </div>

                  <div class="p-4">
                    <div
                      class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
                    >
                      <div class="flex items-center justify-between mb-3">
                        <span
                          class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest"
                        >
                          Today&apos;s Plan
                        </span>
                        <UButton
                          size="xs"
                          color="neutral"
                          variant="ghost"
                          icon="i-heroicons-sparkles"
                          label="Új"
                          class="-my-1 h-6 text-[10px]"
                          disabled
                        />
                      </div>

                      <div class="relative flex items-center justify-between gap-3 pt-0">
                        <div class="flex items-start gap-3 min-w-0 z-10">
                          <div
                            class="p-2 rounded-lg shrink-0 bg-primary-500/10 dark:bg-primary-500/20 text-primary-500"
                          >
                            <UIcon
                              :name="
                                workout?.type?.toLowerCase().includes('run')
                                  ? 'i-heroicons-fire'
                                  : 'i-heroicons-bolt'
                              "
                              class="w-5 h-5"
                            />
                          </div>
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                              <h4
                                class="font-bold text-sm text-gray-900 dark:text-white break-words"
                              >
                                {{ workout.title }}
                              </h4>
                            </div>
                            <div
                              class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-1"
                            >
                              <span v-if="workout.durationSec"
                                >{{ Math.round(workout.durationSec / 60) }}m</span
                              >
                              <span v-if="workout.tss"
                                ><span v-if="workout.durationSec">•</span>
                                {{ Math.round(workout.tss) }} TSS</span
                              >
                              <span>• {{ workout.type }}</span>
                            </div>
                          </div>
                        </div>

                        <UIcon
                          name="i-heroicons-chevron-right"
                          class="w-5 h-5 text-gray-400 transition-colors shrink-0 z-10"
                        />

                        <div
                          class="absolute right-0 bottom-0 w-32 h-12 opacity-15 dark:opacity-25 pointer-events-none -mb-1 translate-y-1"
                        >
                          <MiniWorkoutChart
                            :workout="workout"
                            :sport-settings="effectiveSportSettings"
                            :preference="preference"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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
                  class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4 md:col-span-2"
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
          </div>
        </div>
      </template>
    </UDashboardPanel>

    <UModal
      v-if="showViewModal"
      v-model:open="showViewModal"
      title="Workout View"
      description="Preview the Intervals.icu description and inspect the raw planned workout JSON."
    >
      <template #body>
        <div class="p-6 space-y-4">
          <UTabs v-model="viewTab" :items="viewTabs" />

          <div v-if="viewTab === 'intervals'" class="space-y-3">
            <div v-if="loadingViewPreview" class="space-y-2">
              <USkeleton class="h-4 w-full" />
              <USkeleton class="h-4 w-5/6" />
              <USkeleton class="h-4 w-2/3" />
            </div>
            <UAlert
              v-else-if="viewPreviewError"
              color="error"
              variant="soft"
              :title="viewPreviewError"
              icon="i-heroicons-exclamation-triangle"
            />
            <pre
              v-else
              class="text-xs whitespace-pre-wrap break-words max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-gray-800 dark:text-gray-100"
              >{{ intervalsPreviewText || 'No Intervals.icu description available.' }}</pre
            >
            <div class="flex justify-end">
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                icon="i-heroicons-clipboard-document"
                :disabled="!intervalsPreviewText"
                @click="copyViewContent('intervals')"
              >
                Copy Text
              </UButton>
            </div>
          </div>

          <div v-else class="space-y-3">
            <pre
              class="text-xs whitespace-pre-wrap break-words max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-gray-800 dark:text-gray-100"
              >{{ plannedWorkoutRawJson }}</pre
            >
            <div class="flex justify-end">
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                icon="i-heroicons-clipboard-document"
                @click="copyViewContent('raw')"
              >
                Copy JSON
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <template #fallback>
      <div class="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-4">
        <USkeleton class="h-10 w-64" />
        <USkeleton class="h-80 w-full rounded-xl" />
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <USkeleton v-for="i in 5" :key="i" class="h-28 w-full rounded-xl" />
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
  const toast = useToast()
  const { formatDateUTC } = useFormat()

  const { data: workoutResponse, pending } = (await useAsyncData<any>(
    `planned-workout-charts-${route.params.id}`,
    () => ($fetch as any)(`/api/workouts/planned/${route.params.id}`)
  )) as any

  const { data: profile } = (await useAsyncData<any>('planned-workout-charts-profile', () =>
    ($fetch as any)('/api/profile')
  )) as any

  const workout = computed(() => workoutResponse.value?.workout || null)
  const allSportSettings = computed(() => profile.value?.profile?.sportSettings || [])
  const { previousWorkout, nextWorkout } = usePlannedWorkoutNeighbors(
    computed(() => workout.value?.id)
  )
  const showViewModal = ref(false)
  const loadingViewPreview = ref(false)
  const intervalsPreviewText = ref('')
  const viewPreviewError = ref('')
  const viewTab = ref('intervals')
  const viewTabs = [
    { label: 'Intervals.icu', value: 'intervals' },
    { label: 'Raw JSON', value: 'raw' }
  ]
  const plannedWorkoutRawJson = computed(() => JSON.stringify(workout.value || {}, null, 2))

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

  function navigateToNeighbor(direction: 'previous' | 'next') {
    const neighbor = direction === 'previous' ? previousWorkout.value : nextWorkout.value
    if (!neighbor?.id) return
    navigateTo(`/workouts/planned/${neighbor.id}/charts`)
  }

  async function openViewModal() {
    showViewModal.value = true
    viewTab.value = 'intervals'
    intervalsPreviewText.value = ''
    viewPreviewError.value = ''

    if (!workout.value?.id || !workout.value?.structuredWorkout) {
      intervalsPreviewText.value = ''
      return
    }

    loadingViewPreview.value = true
    try {
      const response = (await ($fetch as any)(
        `/api/workouts/planned/${workout.value.id}/intervals-preview`
      )) as { intervalsDescription: string }
      intervalsPreviewText.value = response?.intervalsDescription || ''
    } catch (error: any) {
      viewPreviewError.value = error?.data?.message || 'Failed to load Intervals.icu preview.'
    } finally {
      loadingViewPreview.value = false
    }
  }

  async function copyViewContent(kind: 'intervals' | 'raw') {
    const text = kind === 'intervals' ? intervalsPreviewText.value : plannedWorkoutRawJson.value
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.add({
        title: kind === 'intervals' ? 'Text Copied' : 'JSON Copied',
        description:
          kind === 'intervals'
            ? 'Intervals.icu description copied to clipboard.'
            : 'Raw planned workout JSON copied to clipboard.',
        color: 'success'
      })
    } catch {
      toast.add({
        title: 'Copy Failed',
        description: 'Unable to copy to clipboard.',
        color: 'error'
      })
    }
  }
</script>
