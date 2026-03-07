<template>
  <UCard
    v-if="isOnboarded"
    :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow' }"
    class="flex flex-col overflow-hidden"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-light-bulb" class="w-5 h-5 text-primary-500" />
          <h3 class="font-bold text-sm tracking-tight uppercase">
            {{ t('training_recommendation_header') }}
          </h3>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-heroicons-clipboard-document-check"
            size="xs"
            color="neutral"
            variant="ghost"
            :title="t('training_recommendation_checkin_title')"
            @click.stop="$emit('open-checkin')"
          />
          <UBadge
            v-if="recommendationStore.todayRecommendation"
            :color="getRecommendationColor(recommendationStore.todayRecommendation.recommendation)"
            variant="subtle"
            size="sm"
            class="font-bold"
          >
            {{ getRecommendationLabel(recommendationStore.todayRecommendation.recommendation) }}
          </UBadge>
        </div>
      </div>
    </template>

    <div
      v-if="
        recommendationStore.loading ||
        recommendationStore.generating ||
        recommendationStore.generatingAdHoc
      "
      class="text-sm text-muted py-4 text-center flex-grow"
    >
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin inline" />
      <p class="mt-2">{{ getLoadingText() }}</p>
      <p
        v-if="recommendationStore.generating || recommendationStore.generatingAdHoc"
        class="text-xs mt-1"
      >
        {{ t('training_recommendation_loading_time_warning') }}
      </p>
    </div>

    <div v-else class="flex-grow space-y-4">
      <!-- The Plan Section -->
      <div
        class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
      >
        <div v-if="recommendationStore.todayWorkouts.length > 0" class="space-y-3">
          <div class="flex items-center justify-between">
            <span
              class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest"
              >{{ t('training_recommendation_todays_plan') }}</span
            >
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-sparkles"
              :label="t('training_recommendation_new_adhoc')"
              class="-my-1 h-6 text-[10px]"
              @click.stop="openCreateAdHoc"
            />
          </div>

          <div class="divide-y divide-gray-100 dark:divide-gray-800 space-y-3">
            <div
              v-for="workout in recommendationStore.todayWorkouts"
              :key="workout.id"
              :class="[
                'flex items-center justify-between gap-3 group cursor-pointer relative pt-3 first:pt-0',
                workout.type === 'Rest' ? 'opacity-60 italic' : ''
              ]"
              @click="navigateTo(`/workouts/planned/${workout.id}`)"
            >
              <div class="flex items-start gap-3 min-w-0 z-10">
                <div
                  :class="[
                    'p-2 rounded-lg shrink-0',
                    workout.type === 'Rest'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      : `bg-opacity-10 dark:bg-opacity-20 ${getWorkoutColorClass(workout.type).replace('text-', 'bg-').replace('-500', '')} ${getWorkoutColorClass(workout.type)}`
                  ]"
                >
                  <UIcon :name="getWorkoutIcon(workout.type)" class="w-5 h-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h4
                      class="font-bold text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors break-words"
                    >
                      {{ workout.title }}
                    </h4>
                    <UBadge
                      v-if="workout.completed"
                      color="success"
                      variant="subtle"
                      size="sm"
                      class="shrink-0 text-[10px] px-1 py-0"
                    >
                      {{ t('training_recommendation_done') }}
                    </UBadge>
                  </div>
                  <div
                    class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-1"
                  >
                    <template v-if="workout.type !== 'Rest'">
                      <span v-if="workout.durationSec"
                        >{{ Math.round(workout.durationSec / 60) }}m</span
                      >
                      <span v-if="workout.tss"
                        ><span v-if="workout.durationSec">•</span>
                        {{ Math.round(workout.tss) }} TSS</span
                      >
                      <span>• {{ workout.type }}</span>
                    </template>
                    <template v-else>
                      <span>{{ t('training_recommendation_rest_day') }}</span>
                    </template>
                  </div>
                </div>
              </div>

              <UIcon
                name="i-heroicons-chevron-right"
                class="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors shrink-0 z-10"
              />

              <!-- Mini Workout Chart as background (only for non-rest) -->
              <div
                v-if="workout.structuredWorkout && workout.type !== 'Rest'"
                class="absolute right-0 bottom-0 w-32 h-12 opacity-15 dark:opacity-25 pointer-events-none -mb-1 translate-y-1"
              >
                <MiniWorkoutChart
                  :workout="workout"
                  :sport-settings="getChartSportSettings(workout)"
                  :preference="getChartPreference(workout)"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-else class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-gray-500">
            <UIcon name="i-heroicons-calendar" class="w-5 h-5" />
            <span class="text-sm">{{ t('training_recommendation_no_workout') }}</span>
          </div>
          <UButton
            size="xs"
            color="primary"
            variant="soft"
            icon="i-heroicons-sparkles"
            @click="openCreateAdHoc"
          >
            {{ t('training_recommendation_generate') }}
          </UButton>
        </div>
      </div>

      <!-- Daily Check-in Button (if not completed) -->
      <div v-if="!checkinStore.isCompleted">
        <UButton
          icon="i-heroicons-clipboard-document-check"
          color="primary"
          variant="solid"
          size="sm"
          block
          class="font-bold py-2 justify-start"
          @click.stop="$emit('open-checkin')"
        >
          {{ t('training_recommendation_daily_checkin_button') }}
        </UButton>
      </div>

      <!-- The Insight Section -->
      <div v-if="recommendationStore.todayRecommendation" class="space-y-3">
        <p class="text-sm break-words leading-relaxed">
          {{ recommendationStore.todayRecommendation.reasoning }}
        </p>

        <div
          v-if="recommendationStore.todayRecommendation.analysisJson?.suggested_modifications"
          class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-3 border border-blue-100 dark:border-blue-900/30"
        >
          <div class="flex justify-between items-start mb-2 gap-2">
            <p class="text-sm font-bold text-blue-900 dark:text-blue-100">
              {{ t('training_recommendation_suggested_modification') }}
            </p>
            <div
              v-if="recommendationStore.todayRecommendation.userAccepted"
              class="shrink-0 flex items-center gap-1 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-wide bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded"
            >
              <UIcon name="i-heroicons-check" class="w-3 h-3" />
              <span>{{ t('training_recommendation_accepted') }}</span>
            </div>
          </div>
          <p class="text-sm text-blue-800 dark:text-blue-200 break-words leading-snug">
            {{
              recommendationStore.todayRecommendation.analysisJson.suggested_modifications
                .description
            }}
          </p>
        </div>

        <div class="flex justify-end pt-2">
          <AiFeedback
            v-if="recommendationStore.todayRecommendation.llmUsageId"
            :llm-usage-id="recommendationStore.todayRecommendation.llmUsageId"
            :initial-feedback="recommendationStore.todayRecommendation.feedback"
            :initial-feedback-text="recommendationStore.todayRecommendation.feedbackText"
          />
        </div>
      </div>
      <div
        v-else-if="recommendationStore.todayWorkouts.length > 0"
        class="text-[10px] text-gray-500 text-center leading-tight"
      >
        {{ t('training_recommendation_get_ai_guidance') }}
      </div>
    </div>

    <template #footer>
      <div
        :class="[
          'gap-3',
          recommendationStore.todayRecommendation && !recommendationStore.generating
            ? 'grid grid-cols-1 sm:grid-cols-2'
            : 'flex flex-col'
        ]"
      >
        <div
          v-if="recommendationStore.todayRecommendation && !recommendationStore.generating"
          class="flex gap-2"
        >
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            class="font-bold flex-1"
            @click="$emit('open-details')"
          >
            {{ t('training_recommendation_details_button') }}
          </UButton>
          <UButton
            v-if="canAccept"
            color="success"
            variant="solid"
            size="sm"
            class="font-bold flex-1"
            :loading="accepting"
            @click="handleAccept"
          >
            {{ t('training_recommendation_accept_button') }}
          </UButton>
        </div>
        <div class="space-y-2">
          <UButton
            class="font-bold w-full"
            color="primary"
            variant="solid"
            size="sm"
            :loading="recommendationStore.generating || isSyncingForAnalysis"
            :disabled="
              recommendationStore.generating ||
              recommendationStore.generatingAdHoc ||
              isSyncingForAnalysis
            "
            :icon="
              !recommendationStore.todayRecommendation
                ? 'i-heroicons-sparkles'
                : 'i-heroicons-adjustments-horizontal'
            "
            @click="handleAnalyzeClick"
          >
            {{ getButtonLabel() }}
          </UButton>
          <p
            v-if="!recommendationStore.todayRecommendation"
            class="text-[10px] text-gray-500 text-center leading-tight"
          >
            {{ t('training_recommendation_coach_analysis_description') }}
          </p>
        </div>
      </div>
    </template>
  </UCard>

  <DashboardCreateAdHocModal
    v-model:open="showCreateAdHoc"
    :loading="recommendationStore.generatingAdHoc"
    @submit="handleCreateAdHoc"
  />

  <DashboardRefineRecommendationModal
    v-model:open="showRefine"
    :loading="recommendationStore.generating"
    @submit="handleRefine"
  />
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import DashboardCreateAdHocModal from '~/components/dashboard/DashboardCreateAdHocModal.vue'
  import DashboardRefineRecommendationModal from '~/components/dashboard/DashboardRefineRecommendationModal.vue'
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import { showDashboardProgressToast } from '~/utils/dashboard-progress-toast'
  import { getDefaultSportSettings, getSportSettingsForActivity } from '~/utils/sportSettings'
  import {
    getWorkoutIcon,
    getWorkoutColorClass,
    getWorkoutBorderColorClass
  } from '~/utils/activity-types'

  const { t } = useTranslate('dashboard')
  const integrationStore = useIntegrationStore()
  const recommendationStore = useRecommendationStore()
  const userStore = useUserStore()
  const checkinStore = useCheckinStore()
  const { checkProfileStale } = useDataStatus()
  const toast = useToast()
  const { trackRecommendationRequest, trackRecommendationAccept } = useAnalytics()

  const isOnboarded = computed(() => {
    // 1. Check if Intervals is connected (current behavior)
    if (integrationStore.intervalsConnected) return true

    // 2. Check if ANY integration is connected (Authorized Application)
    if ((integrationStore.integrationStatus?.integrations?.length || 0) > 0) return true

    // 3. Check if user has ANY data (Workouts, Nutrition, or Wellness)
    if (
      userStore.dataSyncStatus?.workouts ||
      userStore.dataSyncStatus?.nutrition ||
      userStore.dataSyncStatus?.wellness
    )
      return true

    return false
  })

  defineEmits(['open-details', 'open-checkin'])

  const showCreateAdHoc = ref(false)
  const showRefine = ref(false)
  const accepting = ref(false)
  const isSyncingForAnalysis = ref(false)

  onMounted(async () => {
    await recommendationStore.fetchTodayWorkout()
  })

  const canAccept = computed(() => {
    return (
      recommendationStore.todayRecommendation?.analysisJson?.suggested_modifications &&
      !recommendationStore.todayRecommendation?.userAccepted
    )
  })

  function getChartPreference(workout: any): 'power' | 'hr' | 'pace' {
    const primaryMetric = String(
      workout?.lastGenerationSettingsSnapshot?.targetPolicy?.primaryMetric ||
        workout?.createdFromSettingsSnapshot?.targetPolicy?.primaryMetric ||
        ''
    ).toLowerCase()

    if (primaryMetric === 'heartrate') return 'hr'
    if (primaryMetric === 'pace') return 'pace'
    if (primaryMetric === 'power') return 'power'

    const flattenedSteps = flattenWorkoutSteps(workout?.structuredWorkout?.steps || [])
    const primaryTargets = flattenedSteps
      .map((step: any) => String(step?.primaryTarget || '').toLowerCase())
      .filter(Boolean)

    if (primaryTargets.length > 0) {
      const counts = primaryTargets.reduce((acc: Record<string, number>, metric: string) => {
        acc[metric] = (acc[metric] || 0) + 1
        return acc
      }, {})
      if ((counts.power || 0) >= Math.max(counts.heartrate || 0, counts.pace || 0)) return 'power'
      if ((counts.heartrate || 0) >= Math.max(counts.power || 0, counts.pace || 0)) return 'hr'
      if ((counts.pace || 0) > 0) return 'pace'
    }

    if (flattenedSteps.some((step: any) => step?.power)) return 'power'
    if (flattenedSteps.some((step: any) => step?.heartRate)) return 'hr'
    if (flattenedSteps.some((step: any) => step?.pace)) return 'pace'

    return 'power'
  }

  function getChartSportSettings(workout: any) {
    const allSportSettings = userStore.profile?.profile?.sportSettings || []
    const specific = getSportSettingsForActivity(allSportSettings, workout?.type || '')
    const fallback = getDefaultSportSettings(allSportSettings)

    return (
      specific || {
        ftp: userStore.currentFtp,
        lthr: fallback?.lthr,
        maxHr: fallback?.maxHr,
        thresholdPace: fallback?.thresholdPace,
        hrZones: fallback?.hrZones || [],
        powerZones: fallback?.powerZones || [],
        paceZones: fallback?.paceZones || [],
        targetPolicy: fallback?.targetPolicy,
        loadPreference: fallback?.loadPreference
      }
    )
  }

  function flattenWorkoutSteps(steps: any[]): any[] {
    if (!Array.isArray(steps)) return []

    const flattened: any[] = []
    for (const step of steps) {
      const children = Array.isArray(step?.steps) ? step.steps : []
      if (children.length > 0) {
        const repsRaw = Number(step?.reps ?? step?.repeat ?? step?.intervals)
        const reps = repsRaw > 1 ? repsRaw : 1
        for (let i = 0; i < reps; i++) {
          flattened.push(...flattenWorkoutSteps(children))
        }
      } else {
        flattened.push(step)
      }
    }

    return flattened
  }

  function openCreateAdHoc() {
    showCreateAdHoc.value = true
  }

  function openRefineModal() {
    showRefine.value = true
  }

  async function handleAccept() {
    if (!recommendationStore.todayRecommendation?.id) return

    accepting.value = true
    await recommendationStore.acceptRecommendation(recommendationStore.todayRecommendation.id)
    accepting.value = false

    trackRecommendationAccept(
      recommendationStore.todayRecommendation.id,
      recommendationStore.todayRecommendation.recommendation
    )
  }

  async function checkProfileAndGenerate(feedback?: string) {
    // Check if profile needs update before generating recommendation
    const profileStatus = checkProfileStale(
      userStore.profile?.profileLastUpdated,
      userStore.profile?.latestWorkoutDate
    )

    if (profileStatus.isStale) {
      showDashboardProgressToast(
        toast,
        {
          title: 'Updating Profile First',
          description:
            'Your athlete profile is outdated. Updating it for better recommendations...',
          color: 'info',
          icon: 'i-heroicons-user-circle'
        },
        'dashboard.profile.precheck.stale'
      )

      try {
        await userStore.generateProfile()
      } catch (e) {
        console.error('Profile generation failed, proceeding with recommendation anyway', e)
      }
    }

    trackRecommendationRequest(!!feedback, !!feedback)

    await recommendationStore.generateTodayRecommendation(feedback)
  }

  async function handleRefine(feedback: string) {
    showRefine.value = false
    await checkProfileAndGenerate(feedback)
  }

  async function handleCreateAdHoc(data: any) {
    showCreateAdHoc.value = false
    await recommendationStore.generateAdHocWorkout(data)
  }

  async function handleAnalyzeClick() {
    if (recommendationStore.todayRecommendation) {
      openRefineModal()
      return
    }

    isSyncingForAnalysis.value = true
    try {
      await integrationStore.syncAllData()
    } finally {
      isSyncingForAnalysis.value = false
    }

    await checkProfileAndGenerate()
  }

  function getButtonLabel() {
    if (isSyncingForAnalysis.value) return t.value('training_recommendation_syncing')
    if (userStore.generating) return t.value('training_recommendation_updating_profile')
    if (recommendationStore.generating) return t.value('training_recommendation_thinking')
    if (recommendationStore.todayRecommendation)
      return t.value('training_recommendation_refine_button')
    return t.value('training_recommendation_analyze_readiness_button')
  }

  function getLoadingText() {
    if (recommendationStore.generatingAdHoc)
      return t.value('training_recommendation_loading_designing')
    if (userStore.generating) return t.value('training_recommendation_loading_profile')
    if (recommendationStore.generating)
      return t.value('training_recommendation_loading_recommendation')
    return t.value('training_recommendation_loading_generic')
  }

  function getRecommendationColor(rec: string): 'success' | 'warning' | 'error' | 'neutral' {
    const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
      proceed: 'success',
      modify: 'warning',
      reduce_intensity: 'warning',
      rest: 'error'
    }
    return colors[rec] || 'neutral'
  }

  function getRecommendationLabel(rec: string) {
    const labels: Record<string, string> = {
      proceed: t.value('training_recommendation_label_proceed'),
      modify: t.value('training_recommendation_label_modify'),
      reduce_intensity: t.value('training_recommendation_label_reduce'),
      rest: t.value('training_recommendation_label_rest')
    }
    return labels[rec] || rec
  }
</script>
