<template>
  <UDashboardPanel id="performance">
    <template #header>
      <UDashboardNavbar :title="t('page_title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>
            <UButton
              icon="i-heroicons-adjustments-horizontal"
              color="neutral"
              variant="outline"
              size="sm"
              @click="isPerformanceSettingsModalOpen = true"
            >
              {{ t('nav_customize') }}
            </UButton>
            <UButton
              :loading="generatingExplanations"
              color="primary"
              variant="solid"
              icon="i-heroicons-sparkles"
              size="sm"
              class="font-bold"
              @click="generateExplanations"
            >
              <span class="sm:hidden">{{ t('nav_generate') }}</span>
              <span class="hidden sm:inline">{{ t('nav_generate_insights') }}</span>
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="relative p-0 sm:p-6 space-y-4 sm:space-y-6 pb-24">
        <PerformanceSettingsModal v-model:open="isPerformanceSettingsModalOpen" />
        <div
          v-if="isGarminConnected"
          class="px-4 pt-1 sm:px-0 sm:pt-0 sm:absolute sm:right-6 sm:top-6 sm:z-10"
        >
          <div class="flex items-center gap-1.5">
            <span
              class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
            >
              {{ tc('attribution_garmin') }}
            </span>
            <img
              src="/images/logos/Garmin-Tag-black-high-res.png"
              class="h-5 w-auto dark:hidden"
              alt="Garmin"
            />
            <img
              src="/images/logos/Garmin-Tag-white-high-res.png"
              class="hidden h-5 w-auto dark:block"
              alt="Garmin"
            />
          </div>
        </div>

        <!-- Dashboard Branding -->
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            {{ t('branding_title') }}
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            {{ t('branding_subtitle') }}
          </p>
        </div>

        <!-- 1. Activity Highlights (Big Numbers) -->
        <div v-if="sectionSettings.highlights?.visible !== false" class="space-y-4">
          <div class="flex items-center justify-between px-4 sm:px-0">
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400">
              {{ t('highlights_header') }}
            </h2>
            <div class="flex gap-2">
              <USelectMenu
                v-model="highlightsScope"
                :items="workoutScopeOptions"
                value-key="value"
                label-key="label"
                class="w-40 sm:w-52"
                size="xs"
                color="neutral"
                variant="outline"
              />
              <USelect
                v-model="highlightsPeriod"
                :items="periodOptions"
                size="xs"
                class="w-32 sm:w-36"
                color="neutral"
                variant="outline"
              />
            </div>
          </div>
          <ActivityHighlights
            :period="highlightsPeriod"
            :sport="scopeToSport(highlightsScope)"
            :tags="scopeToTags(highlightsScope)"
          />
        </div>

        <!-- 2. Athlete Profile Scores -->
        <div v-if="sectionSettings.athleteProfile?.visible !== false" class="space-y-4">
          <div class="flex items-center justify-between px-4 sm:px-0">
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400">
              {{ t('profile_header') }}
            </h2>
            <UBadge
              v-if="profileData?.scores?.lastUpdated"
              color="neutral"
              variant="soft"
              size="sm"
              class="font-black uppercase tracking-widest text-[9px]"
            >
              {{ t('profile_sync', { date: formatDateLocal(profileData.scores.lastUpdated) }) }}
            </UBadge>
          </div>

          <div v-if="profileLoading" class="flex justify-center py-12">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
          </div>

          <div v-else-if="profileData" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ScoreCard
              :title="t('profile_fitness_title')"
              :score="profileData.scores?.currentFitness"
              :explanation="
                profileData.scores?.currentFitnessExplanationJson
                  ? t('profile_click_detailed')
                  : profileData.scores?.currentFitnessExplanation
              "
              icon="i-heroicons-bolt"
              color="blue"
              @click="
                (data) =>
                  openModalWithStructured(data, profileData?.scores?.currentFitnessExplanationJson)
              "
            />
            <ScoreCard
              :title="t('profile_recovery_title')"
              :score="profileData.scores?.recoveryCapacity"
              :explanation="
                profileData.scores?.recoveryCapacityExplanationJson
                  ? t('profile_click_detailed')
                  : profileData.scores?.recoveryCapacityExplanation
              "
              icon="i-heroicons-heart"
              color="green"
              @click="
                (data) =>
                  openModalWithStructured(
                    data,
                    profileData?.scores?.recoveryCapacityExplanationJson
                  )
              "
            />
            <ScoreCard
              v-if="nutritionEnabled"
              :title="t('profile_nutrition_title')"
              :score="profileData.scores?.nutritionCompliance"
              :explanation="
                profileData.scores?.nutritionComplianceExplanationJson
                  ? t('profile_click_detailed')
                  : profileData.scores?.nutritionComplianceExplanation
              "
              icon="i-heroicons-cake"
              color="purple"
              @click="
                (data) =>
                  openModalWithStructured(
                    data,
                    profileData?.scores?.nutritionComplianceExplanationJson
                  )
              "
            />
            <ScoreCard
              :title="t('profile_consistency_title')"
              :score="profileData.scores?.trainingConsistency"
              :explanation="
                profileData.scores?.trainingConsistencyExplanationJson
                  ? t('profile_click_detailed')
                  : profileData.scores?.trainingConsistencyExplanation
              "
              icon="i-heroicons-calendar"
              color="orange"
              @click="
                (data) =>
                  openModalWithStructured(
                    data,
                    profileData?.scores?.trainingConsistencyExplanationJson
                  )
              "
            />
          </div>
        </div>

        <!-- Personal Bests Summary -->
        <div
          v-if="sectionSettings.records?.visible !== false && hasPersonalBests"
          class="space-y-4"
        >
          <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
            {{ t('bests_header') }}
          </h2>
          <PerformanceBestsSummary :personal-bests="profileData?.personalBests || []" />
        </div>

        <!-- Score Detail Modal -->
        <ScoreDetailModal
          v-model="showModal"
          :title="modalData.title"
          :score="modalData.score"
          :explanation="modalData.explanation"
          :analysis-data="modalData.analysisData"
          :color="modalData.color"
        />

        <!-- 3. PMC Chart (Performance Management Chart) -->
        <div v-if="sectionSettings.pmc?.visible !== false && nutritionEnabled" class="space-y-4">
          <PerformancePmcCard
            v-model:period="pmcPeriod"
            :period-options="pmcPeriodOptions"
            :settings="chartSettings.pmc"
            @settings="
              openChartSettings('pmc', t('pmc_title'), {
                max: 150,
                step: 5,
                showOverlays: false,
                showWellnessEventsOption: true
              })
            "
          />
        </div>

        <!-- 4. Power Duration Curve -->
        <div v-if="sectionSettings.powerCurve?.visible !== false" class="space-y-4">
          <PerformancePowerCurveCard
            v-model:period="powerCurvePeriod"
            v-model:scope="powerCurveScope"
            :period-options="periodOptions"
            :scope-options="workoutScopeOptions"
            :sport="scopeToSport(powerCurveScope)"
            :tags="scopeToTags(powerCurveScope)"
            :settings="chartSettings.powerCurve"
            @settings="
              openChartSettings('powerCurve', t('power_curve_title'), {
                unit: 'W',
                max: 1500,
                step: 50,
                showOverlays: false,
                showFreshnessBandsOption: true
              })
            "
          />
        </div>

        <!-- 5. Efficiency & Decoupling -->
        <div v-if="sectionSettings.efficiency?.visible !== false" class="space-y-4">
          <PerformanceEfficiencyCard
            v-model:period="efficiencyPeriod"
            v-model:scope="efficiencyScope"
            :period-options="periodOptions"
            :scope-options="workoutScopeOptions"
            :sport="scopeToSport(efficiencyScope)"
            :tags="scopeToTags(efficiencyScope)"
            :settings="chartSettings.efficiency"
            @settings="
              openChartSettings('efficiency', t('efficiency_title'), {
                max: 5,
                step: 0.1,
                showOverlays: false
              })
            "
          />
        </div>

        <!-- 7. FTP Evolution Chart -->
        <div v-if="sectionSettings.ftp?.visible !== false" class="space-y-4">
          <PerformanceFtpEvolutionCard
            v-model:period="ftpPeriod"
            v-model:scope="ftpScope"
            :period-options="ftpPeriodOptions"
            :scope-options="workoutScopeOptions"
            :sport="scopeToSport(ftpScope)"
            :tags="scopeToTags(ftpScope)"
            :settings="chartSettings.ftp"
            @settings="
              openChartSettings('ftp', t('ftp_evolution_title'), {
                unit: 'W',
                max: 500,
                step: 10,
                showOverlays: false,
                showEstimatedFtpOption: true
              })
            "
          />
        </div>

        <!-- 8. Training Intensity Distribution -->
        <div v-if="sectionSettings.distribution?.visible !== false" class="space-y-4">
          <PerformanceIntensityDistributionCard
            v-model:period="distributionPeriod"
            v-model:scope="distributionScope"
            :period-options="distributionPeriodOptions"
            :scope-options="workoutScopeOptions"
            :sport="scopeToSport(distributionScope)"
            :tags="scopeToTags(distributionScope)"
            :settings="chartSettings.distribution"
            @settings="
              openChartSettings('distribution', t('intensity_dist_title'), {
                unit: 'h',
                max: 50,
                step: 1,
                showOverlays: false
              })
            "
          />
        </div>

        <!-- 9. Workout Scores -->
        <div v-if="sectionSettings.workoutScores?.visible !== false" class="space-y-4">
          <div class="flex items-center justify-between px-1">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
              {{ t('workout_header') }}
            </h2>
            <div class="flex gap-2">
              <USelectMenu
                v-model="workoutScope"
                :items="workoutScopeOptions"
                value-key="value"
                label-key="label"
                class="w-40 sm:w-52"
                size="xs"
                color="neutral"
                variant="outline"
              />
              <USelect
                v-model="selectedPeriod"
                :items="periodOptions"
                class="w-32 sm:w-36"
                size="xs"
                color="neutral"
                variant="outline"
              />
            </div>
          </div>

          <div v-if="workoutLoading" class="flex justify-center py-12">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
          </div>

          <div v-else-if="workoutData" class="space-y-6">
            <!-- Score Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <ScoreCard
                :title="t('workout_overall_title')"
                :score="workoutData.summary?.avgOverall"
                icon="i-heroicons-star"
                color="yellow"
                compact
                :explanation="t('workout_click_insights')"
                @click="
                  () =>
                    workoutData &&
                    openWorkoutModal(
                      t('workout_overall_full'),
                      workoutData.summary?.avgOverall,
                      'yellow'
                    )
                "
              />
              <ScoreCard
                :title="t('workout_technical_title')"
                :score="workoutData.summary?.avgTechnical"
                icon="i-heroicons-cog"
                color="blue"
                compact
                :explanation="t('workout_click_insights')"
                @click="
                  () =>
                    workoutData &&
                    openWorkoutModal(
                      t('workout_technical_full'),
                      workoutData.summary?.avgTechnical,
                      'blue'
                    )
                "
              />
              <ScoreCard
                :title="t('workout_effort_title')"
                :score="workoutData.summary?.avgEffort"
                icon="i-heroicons-fire"
                color="red"
                compact
                :explanation="t('workout_click_insights')"
                @click="
                  () =>
                    workoutData &&
                    openWorkoutModal(
                      t('workout_effort_full'),
                      workoutData.summary?.avgEffort,
                      'red'
                    )
                "
              />
              <ScoreCard
                :title="t('workout_pacing_title')"
                :score="workoutData.summary?.avgPacing"
                icon="i-heroicons-chart-bar"
                color="green"
                compact
                :explanation="t('workout_click_insights')"
                @click="
                  () =>
                    workoutData &&
                    openWorkoutModal(
                      t('workout_pacing_full'),
                      workoutData.summary?.avgPacing,
                      'green'
                    )
                "
              />
              <ScoreCard
                :title="t('workout_execution_title')"
                :score="workoutData.summary?.avgExecution"
                icon="i-heroicons-check-circle"
                color="purple"
                compact
                :explanation="t('workout_click_insights')"
                @click="
                  () =>
                    workoutData &&
                    openWorkoutModal(
                      t('workout_execution_full'),
                      workoutData.summary?.avgExecution,
                      'purple'
                    )
                "
              />
            </div>

            <!-- Trend Chart and Radar Chart Side by Side -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Score Trends (2/3 width) -->
              <div class="lg:col-span-2 space-y-4">
                <PerformanceScoreTrajectoryCard
                  :title="t('trajectory_workout_title')"
                  :data="workoutData.workouts"
                  type="workout"
                  :settings="chartSettings.performance"
                  @settings="
                    openChartSettings('performance', t('trajectory_workout_title'), {
                      max: 10,
                      step: 1,
                      showOverlays: false
                    })
                  "
                />
              </div>

              <!-- Current Balance (1/3 width) -->
              <div class="lg:col-span-1 space-y-4">
                <UCard
                  :ui="{
                    root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
                    body: 'p-4 sm:p-6'
                  }"
                >
                  <template #header>
                    <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
                      {{ t('execution_balance_header') }}
                    </h3>
                  </template>
                  <div class="h-[320px]">
                    <ClientOnly>
                      <RadarChart
                        :scores="{
                          overall: workoutData.summary?.avgOverall,
                          technical: workoutData.summary?.avgTechnical,
                          effort: workoutData.summary?.avgEffort,
                          pacing: workoutData.summary?.avgPacing,
                          execution: workoutData.summary?.avgExecution
                        }"
                        type="workout"
                      />
                    </ClientOnly>
                  </div>
                </UCard>
              </div>
            </div>
          </div>
        </div>

        <!-- 10. Nutrition Scores -->
        <div
          v-if="sectionSettings.nutritionScores?.visible !== false && nutritionEnabled"
          class="space-y-4"
        >
          <div class="px-1">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
              {{ t('nutrition_header') }}
            </h2>
          </div>

          <div v-if="nutritionLoading" class="flex justify-center py-12">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
          </div>

          <div v-else-if="nutritionData" class="space-y-6">
            <!-- Score Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <ScoreCard
                :title="t('workout_overall_title')"
                :score="nutritionData.summary?.avgOverall"
                icon="i-heroicons-star"
                color="yellow"
                compact
                :explanation="t('workout_click_insights')"
                @click="
                  () =>
                    nutritionData &&
                    openNutritionModal(
                      t('nutrition_overall_full'),
                      nutritionData.summary?.avgOverall,
                      'yellow'
                    )
                "
              />
              <ScoreCard
                :title="t('nutrition_macro_title')"
                :score="nutritionData.summary?.avgMacroBalance"
                icon="i-heroicons-scale"
                color="blue"
                compact
                :explanation="t('workout_click_insights')"
                @click="
                  () =>
                    nutritionData &&
                    openNutritionModal(
                      t('nutrition_macro_full'),
                      nutritionData.summary?.avgMacroBalance,
                      'blue'
                    )
                "
              />
              <ScoreCard
                :title="t('nutrition_quality_title')"
                :score="nutritionData.summary?.avgQuality"
                icon="i-heroicons-sparkles"
                color="green"
                compact
                :explanation="t('workout_click_insights')"
                @click="
                  () =>
                    nutritionData &&
                    openNutritionModal(
                      t('nutrition_quality_full'),
                      nutritionData.summary?.avgQuality,
                      'green'
                    )
                "
              />
              <ScoreCard
                :title="t('nutrition_adherence_title')"
                :score="nutritionData.summary?.avgAdherence"
                icon="i-heroicons-check-badge"
                color="purple"
                compact
                :explanation="t('workout_click_insights')"
                @click="
                  () =>
                    nutritionData &&
                    openNutritionModal(
                      t('nutrition_adherence_full'),
                      nutritionData.summary?.avgAdherence,
                      'purple'
                    )
                "
              />
              <ScoreCard
                :title="t('nutrition_hydration_title')"
                :score="nutritionData.summary?.avgHydration"
                icon="i-heroicons-beaker"
                color="cyan"
                compact
                :explanation="t('workout_click_insights')"
                @click="
                  () =>
                    nutritionData &&
                    openNutritionModal(
                      t('nutrition_hydration_full'),
                      nutritionData.summary?.avgHydration,
                      'cyan'
                    )
                "
              />
            </div>

            <!-- Trend Chart and Radar Chart Side by Side -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Score Trends (2/3 width) -->
              <div class="lg:col-span-2 space-y-4">
                <PerformanceScoreTrajectoryCard
                  :title="t('trajectory_nutrition_title')"
                  :data="nutritionData.nutrition"
                  type="nutrition"
                  :settings="chartSettings.nutrition"
                  @settings="
                    openChartSettings('nutrition', t('trajectory_nutrition_title'), {
                      max: 10,
                      step: 1,
                      showOverlays: false
                    })
                  "
                />
              </div>

              <!-- Current Balance (1/3 width) -->
              <div class="lg:col-span-1 space-y-4">
                <UCard
                  :ui="{
                    root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
                    body: 'p-4 sm:p-6'
                  }"
                >
                  <template #header>
                    <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
                      {{ t('metabolic_balance_header') }}
                    </h3>
                  </template>
                  <div class="h-[320px]">
                    <ClientOnly>
                      <RadarChart
                        :scores="{
                          overall: nutritionData.summary?.avgOverall,
                          macroBalance: nutritionData.summary?.avgMacroBalance,
                          quality: nutritionData.summary?.avgQuality,
                          adherence: nutritionData.summary?.avgAdherence,
                          hydration: nutritionData.summary?.avgHydration
                        }"
                        type="nutrition"
                      />
                    </ClientOnly>
                  </div>
                </UCard>
              </div>
            </div>
          </div>
        </div>

        <ChartSettingsModal
          v-if="activeMetricSettings"
          :metric-key="activeMetricSettings.key"
          :title="activeMetricSettings.title"
          :group-key="'performanceCharts'"
          :unit="activeMetricSettings.unit"
          :max="activeMetricSettings.max"
          :step="activeMetricSettings.step"
          :show-overlays="activeMetricSettings.showOverlays"
          :show-freshness-bands-option="activeMetricSettings.showFreshnessBandsOption"
          :show-estimated-ftp-option="activeMetricSettings.showEstimatedFtpOption"
          :show-wellness-events-option="activeMetricSettings.showWellnessEventsOption"
          :default-type="activeMetricSettings.defaultType"
          :open="!!activeMetricSettings"
          @update:open="activeMetricSettings = null"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import ActivityHighlights from '~/components/ActivityHighlights.vue'
  import PowerCurveChart from '~/components/PowerCurveChart.vue'
  import EfficiencyTrendChart from '~/components/EfficiencyTrendChart.vue'
  import ReadinessCorrelationChart from '~/components/ReadinessCorrelationChart.vue'
  import ChartSettingsModal from '~/components/charts/ChartSettingsModal.vue'
  import PerformanceSettingsModal from '~/components/performance/PerformanceSettingsModal.vue'
  import PerformancePmcCard from '~/components/performance/PerformancePmcCard.vue'
  import PerformancePowerCurveCard from '~/components/performance/PerformancePowerCurveCard.vue'
  import PerformanceEfficiencyCard from '~/components/performance/PerformanceEfficiencyCard.vue'
  import PerformanceFtpEvolutionCard from '~/components/performance/PerformanceFtpEvolutionCard.vue'
  import PerformanceIntensityDistributionCard from '~/components/performance/PerformanceIntensityDistributionCard.vue'
  import PerformanceScoreTrajectoryCard from '~/components/performance/PerformanceScoreTrajectoryCard.vue'
  import PerformanceBestsSummary from '~/components/performance/PerformanceBestsSummary.vue'
  import ChartDataLabels from 'chartjs-plugin-datalabels'

  const { t } = useTranslate('performance')
  const { t: tc } = useTranslate('common')

  const userStore = useUserStore()
  const integrationStore = useIntegrationStore()
  const theme = useTheme()
  const { formatDate: baseFormatDate } = useFormat()
  const isGarminConnected = computed(() => {
    return (
      integrationStore.integrationStatus?.integrations?.some((i: any) => i.provider === 'garmin') ??
      false
    )
  })

  const activeMetricSettings = ref<{
    key: string
    title: string
    unit?: string
    max?: number
    step?: number
    showOverlays?: boolean
    showFreshnessBandsOption?: boolean
    showEstimatedFtpOption?: boolean
    showWellnessEventsOption?: boolean
    defaultType?: 'line' | 'bar'
  } | null>(null)

  const defaultChartSettings: any = {
    pmc: { smooth: true, yScale: 'dynamic', yMin: 0, showWellnessEvents: true },
    powerCurve: { smooth: true, showFreshnessBands: true, yScale: 'dynamic', yMin: 0 },
    efficiency: { smooth: true, showPoints: true, yScale: 'dynamic', yMin: 0 },
    ftp: {
      type: 'line',
      smooth: false,
      showPoints: true,
      showEstimatedFtp: true,
      yScale: 'dynamic',
      yMin: 0
    },
    distribution: { type: 'bar', yScale: 'dynamic', yMin: 0 },
    performance: { smooth: true, showPoints: false, yScale: 'dynamic', yMin: 0 },
    nutrition: { smooth: true, showPoints: false, yScale: 'dynamic', yMin: 0 }
  }

  const chartSettings = computed(() => {
    const userSettings = userStore.user?.dashboardSettings?.performanceCharts || {}
    const merged: any = {}
    for (const key in defaultChartSettings) {
      merged[key] = {
        ...defaultChartSettings[key],
        ...(userSettings[key] || {})
      }
    }
    return merged
  })

  const defaultSectionSettings = {
    highlights: { visible: true },
    athleteProfile: { visible: true },
    records: { visible: true },
    pmc: { visible: true },
    powerCurve: { visible: true },
    efficiency: { visible: true },
    ftp: { visible: true },
    distribution: { visible: true },
    workoutScores: { visible: true },
    nutritionScores: { visible: true }
  }

  const sectionSettings = computed(() => {
    const userSections = userStore.user?.dashboardSettings?.performanceSections || {}
    const merged: any = {}
    for (const key in defaultSectionSettings) {
      merged[key] = {
        ...defaultSectionSettings[key as keyof typeof defaultSectionSettings],
        ...(userSections[key] || {})
      }
    }
    return merged
  })

  function openChartSettings(key: string, title: string, options: any = {}) {
    activeMetricSettings.value = { key, title, ...options }
  }

  definePageMeta({
    middleware: 'auth',
    layout: 'default'
  })
  const nutritionEnabled = computed(
    () =>
      userStore.profile?.nutritionTrackingEnabled !== false &&
      userStore.user?.nutritionTrackingEnabled !== false
  )

  useHead({
    title: 'Performance Scores',
    meta: [
      {
        name: 'description',
        content:
          'Detailed analysis of your athletic performance, including FTP evolution, training load, nutrition quality, and workout execution.'
      },
      { property: 'og:title', content: 'Performance Scores | Coach Watts' },
      {
        property: 'og:description',
        content:
          'Detailed analysis of your athletic performance, including FTP evolution, training load, nutrition quality, and workout execution.'
      }
    ]
  })

  const selectedPeriod = ref<number | string>(30)
  const highlightsPeriod = ref<number | string>(30)
  const highlightsScope = ref<string>('all')
  const efficiencyPeriod = ref<number | string>(90)
  const efficiencyScope = ref<string>('all')
  const readinessPeriod = ref<number | string>(30)
  const powerCurvePeriod = ref<number | string>(90)
  const powerCurveScope = ref<string>('all')

  // Fetch available sports
  const { data: sportsData } = await useFetch<string[]>('/api/workouts/sports')
  const { data: workoutTagsData } =
    await useFetch<Array<{ value: string; count: number }>>('/api/workouts/tags')
  const sportOptions = computed(() => {
    const options = [{ label: t.value('highlights_all_sports'), value: 'all' }]
    if (sportsData.value) {
      sportsData.value.forEach((sport) => {
        options.push({ label: sport, value: sport })
      })
    }
    return options
  })

  const availableWorkoutTags = computed(() =>
    (workoutTagsData.value || []).map((tag) => ({
      label: `${tag.value} (${tag.count})`,
      value: tag.value
    }))
  )

  const workoutScopeOptions = computed(() => {
    const groups: Array<Array<{ label: string; value?: string; type?: 'label' }>> = [
      [
        { label: 'Sports', type: 'label' },
        ...sportOptions.value.map((option) => ({ label: option.label, value: option.value }))
      ]
    ]

    if (availableWorkoutTags.value.length > 0) {
      groups.push([
        { label: 'Tags', type: 'label' },
        ...availableWorkoutTags.value.map((tag) => ({
          label: tag.label,
          value: `tag:${tag.value}`
        }))
      ])
    }

    return groups
  })

  const scopeToSport = (scope: string) =>
    scope === 'all' || scope.startsWith('tag:') ? 'all' : scope

  const scopeToTags = (scope: string) => (scope.startsWith('tag:') ? [scope.slice(4)] : [])

  const periodOptions = computed(() => [
    { label: t.value('period_7_days'), value: 7 },
    { label: t.value('period_14_days'), value: 14 },
    { label: t.value('period_30_days'), value: 30 },
    { label: t.value('period_90_days'), value: 90 },
    { label: t.value('period_ytd'), value: 'YTD' },
    { label: t.value('period_all_time'), value: 3650 }
  ])

  const pmcPeriod = ref<number | string>(90)
  const pmcPeriodOptions = computed(() => [
    { label: t.value('period_30_days'), value: 30 },
    { label: t.value('period_60_days'), value: 60 },
    { label: t.value('period_90_days'), value: 90 },
    { label: t.value('period_180_days'), value: 180 },
    { label: t.value('period_ytd'), value: 'YTD' },
    { label: t.value('period_all_time'), value: 3650 }
  ])

  const ftpPeriod = ref<number | string>(12)
  const ftpScope = ref<string>('all')
  const ftpPeriodOptions = computed(() => [
    { label: t.value('period_3_months'), value: 3 },
    { label: t.value('period_6_months'), value: 6 },
    { label: t.value('period_12_months'), value: 12 },
    { label: t.value('period_24_months'), value: 24 },
    { label: t.value('period_ytd'), value: 'YTD' },
    { label: t.value('period_all_time'), value: 3650 }
  ])

  const distributionPeriod = ref<number | string>(12)
  const distributionScope = ref<string>('all')
  const distributionPeriodOptions = computed(() => [
    { label: t.value('period_4_weeks'), value: 4 },
    { label: t.value('period_8_weeks'), value: 8 },
    { label: t.value('period_12_weeks'), value: 12 },
    { label: t.value('period_24_weeks'), value: 24 },
    { label: t.value('period_ytd'), value: 'YTD' },
    { label: t.value('period_all_time'), value: 3650 }
  ])

  const workoutScope = ref<string>('all')

  const hasPersonalBests = computed(() => {
    return (profileData.value?.personalBests?.length || 0) > 0
  })

  interface AthleteProfile {
    personalBests?: any[]
    scores?: {
      lastUpdated?: string
      currentFitness?: number
      currentFitnessExplanation?: string
      currentFitnessExplanationJson?: any
      recoveryCapacity?: number
      recoveryCapacityExplanation?: string
      recoveryCapacityExplanationJson?: any
      nutritionCompliance?: number
      nutritionComplianceExplanation?: string
      nutritionComplianceExplanationJson?: any
      trainingConsistency?: number
      trainingConsistencyExplanation?: string
      trainingConsistencyExplanationJson?: any
    }
  }

  // Fetch athlete profile data
  const { data: profileData, pending: profileLoading } = await useFetch<AthleteProfile>(
    '/api/scores/athlete-profile'
  )

  // Fetch workout score trends
  const { data: workoutData, pending: workoutLoading } = await useFetch(
    '/api/scores/workout-trends',
    {
      query: computed(() => ({
        days: selectedPeriod.value,
        sport: scopeToSport(workoutScope.value),
        tags: scopeToTags(workoutScope.value).join(',')
      }))
    }
  )

  // Fetch nutrition score trends
  const { data: nutritionData, pending: nutritionLoading } = await useFetch(
    '/api/scores/nutrition-trends',
    {
      query: computed(() => ({
        days: selectedPeriod.value
      }))
    }
  )
  // Modal state
  const showModal = ref(false)
  const loadingExplanation = ref(false)
  const generatingExplanations = ref(false)
  const modalData = ref<{
    title: string
    score: number | null
    explanation: string | null
    analysisData?: any
    color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan'
  }>({
    title: '',
    score: null,
    explanation: null,
    analysisData: undefined,
    color: undefined
  })

  // Cache for explanations to avoid refetching
  const workoutExplanations = ref<Record<string, any>>({})
  const nutritionExplanations = ref<Record<string, any>>({})

  // Toast for notifications
  const toast = useToast()

  // Handle score card click (for cards with plain text explanation)
  const openModal = (data: {
    title: string
    score?: number | null
    explanation?: string | null
    color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan'
  }) => {
    modalData.value = {
      title: data.title,
      score: data.score ?? null,
      explanation: data.explanation ?? null,
      analysisData: undefined,
      color: data.color
    }
    showModal.value = true
  }

  // Handle score card click with structured data
  const openModalWithStructured = (
    data: {
      title: string
      score?: number | null
      explanation?: string | null
      color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan'
    },
    structuredData?: any
  ) => {
    modalData.value = {
      title: data.title,
      score: data.score ?? null,
      explanation: structuredData ? null : (data.explanation ?? null),
      analysisData: structuredData || undefined,
      color: data.color
    }
    showModal.value = true
  }

  // Map display titles to metric names
  const getWorkoutMetricName = (title: string): string => {
    const isTReady = typeof t.value === 'function'
    if (!isTReady) return 'overall'

    if (title === t.value('workout_overall_full')) return 'overall'
    if (title === t.value('workout_technical_full')) return 'technical'
    if (title === t.value('workout_effort_full')) return 'effort'
    if (title === t.value('workout_pacing_full')) return 'pacing'
    if (title === t.value('workout_execution_full')) return 'execution'

    return 'overall'
  }

  // Handle workout aggregate score click - fetch from database or trigger generation
  const openWorkoutModal = async (title: string, score: number | null, color?: string) => {
    if (!score || !workoutData.value) return

    modalData.value = {
      title,
      score,
      explanation: t.value('loading_insights'),
      analysisData: undefined,
      color: color as any
    }
    showModal.value = true
    loadingExplanation.value = true

    if (scopeToTags(workoutScope.value).length > 0) {
      modalData.value.explanation =
        'Detailed AI insights are currently unavailable for tag-filtered subsets.'
      loadingExplanation.value = false
      return
    }

    const metric = getWorkoutMetricName(title)
    const cacheKey = `${selectedPeriod.value}-${metric}`

    // Check memory cache first
    if (workoutExplanations.value[cacheKey]) {
      modalData.value.analysisData = workoutExplanations.value[cacheKey]
      modalData.value.explanation = null
      loadingExplanation.value = false
      return
    }

    try {
      // Fetch from database (or trigger generation if not available)
      const response: any = await $fetch('/api/scores/explanation', {
        query: {
          type: 'workout',
          period: selectedPeriod.value,
          metric
        }
      })

      if (response.cached && response.analysis) {
        // Explanation was found in database
        workoutExplanations.value[cacheKey] = response.analysis
        modalData.value.analysisData = response.analysis
        modalData.value.explanation = null
      } else if (response.generating) {
        // Explanation is being generated - show message
        modalData.value.explanation = t.value('generating_insights_wait')
        refreshRuns()
      } else {
        // Not cached and not generating (manual trigger required)
        modalData.value.explanation = response.message || t.value('no_insights_available')
      }
    } catch (error) {
      console.error('Error fetching workout explanation:', error)
      modalData.value.explanation = t.value('failed_to_load_explanation')
    } finally {
      if (!modalData.value.explanation?.includes('Generating')) {
        loadingExplanation.value = false
      }
    }
  }

  // Map display titles to metric names
  const getNutritionMetricName = (title: string): string => {
    const isTReady = typeof t.value === 'function'
    if (!isTReady) return 'overall'

    if (title === t.value('nutrition_overall_full')) return 'overall'
    if (title === t.value('nutrition_macro_full')) return 'macroBalance'
    if (title === t.value('nutrition_quality_full')) return 'quality'
    if (title === t.value('nutrition_adherence_full')) return 'adherence'
    if (title === t.value('nutrition_hydration_full')) return 'hydration'

    return 'overall'
  }

  // Handle nutrition aggregate score click - fetch from database or trigger generation
  const openNutritionModal = async (title: string, score: number | null, color?: string) => {
    if (!score || !nutritionData.value) return

    modalData.value = {
      title,
      score,
      explanation: t.value('loading_insights'),
      analysisData: undefined,
      color: color as any
    }
    showModal.value = true
    loadingExplanation.value = true

    const metric = getNutritionMetricName(title)
    const cacheKey = `${selectedPeriod.value}-${metric}`

    // Check memory cache first
    if (nutritionExplanations.value[cacheKey]) {
      modalData.value.analysisData = nutritionExplanations.value[cacheKey]
      modalData.value.explanation = null
      loadingExplanation.value = false
      return
    }

    try {
      // Fetch from database (or trigger generation if not available)
      const response: any = await $fetch('/api/scores/explanation', {
        query: {
          type: 'nutrition',
          period: selectedPeriod.value,
          metric
        }
      })

      if (response.cached && response.analysis) {
        // Explanation was found in database
        nutritionExplanations.value[cacheKey] = response.analysis
        modalData.value.analysisData = response.analysis
        modalData.value.explanation = null
      } else if (response.generating) {
        // Explanation is being generated - show message
        modalData.value.explanation = t.value('generating_insights_wait')
        refreshRuns()
      } else {
        // Not cached and not generating (manual trigger required)
        modalData.value.explanation = response.message || t.value('no_insights_available')
      }
    } catch (error) {
      console.error('Error fetching nutrition explanation:', error)
      modalData.value.explanation = t.value('failed_to_load_explanation')
    } finally {
      if (!modalData.value.explanation?.includes('Generating')) {
        loadingExplanation.value = false
      }
    }
  }

  // Background Task Monitoring
  const { refresh: refreshRuns } = useUserRuns()
  const { onTaskCompleted } = useUserRunsState()

  // Generate explanations function
  const generateExplanations = async () => {
    generatingExplanations.value = true
    try {
      await $fetch('/api/scores/generate-explanations', { method: 'POST' })
      refreshRuns()

      toast.add({
        title: t.value('toast_generation_started_title'),
        description: t.value('toast_generation_started_desc'),
        color: 'success',
        icon: 'i-heroicons-sparkles'
      })

      // Clear the caches so fresh explanations will be fetched
      workoutExplanations.value = {}
      nutritionExplanations.value = {}
    } catch (error: any) {
      generatingExplanations.value = false
      toast.add({
        title: 'Generation Failed',
        description: error.data?.message || error.message || 'Failed to start generation',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    }
  }

  const refreshCurrentModal = async () => {
    if (!showModal.value || !modalData.value) return

    // Identify if it is a workout or nutrition modal based on title/context
    const title = modalData.value.title
    const isWorkout = [
      t.value('workout_overall_full'),
      t.value('workout_technical_full'),
      t.value('workout_effort_full'),
      t.value('workout_pacing_full'),
      t.value('workout_execution_full')
    ].includes(title)

    if (isWorkout) {
      await openWorkoutModal(title, modalData.value.score, modalData.value.color)
    } else {
      await openNutritionModal(title, modalData.value.score, modalData.value.color)
    }
  }

  // Listen for completion
  onTaskCompleted('generate-score-explanations', async () => {
    generatingExplanations.value = false
    workoutExplanations.value = {}
    nutritionExplanations.value = {}

    toast.add({
      title: t.value('toast_insights_ready_title'),
      description: t.value('toast_insights_ready_desc'),
      color: 'success',
      icon: 'i-heroicons-check-badge'
    })

    if (showModal.value) {
      await refreshCurrentModal()
    }
  })

  // Watch for period changes and refetch
  watch(selectedPeriod, async () => {
    const refreshes = [refreshNuxtData('workout-trends')]
    if (nutritionEnabled.value) {
      refreshes.push(refreshNuxtData('nutrition-trends'))
    }
    await Promise.all(refreshes)
  })

  watch(workoutScope, async () => {
    await refreshNuxtData('workout-trends')
  })

  const formatDateLocal = (date: string) => {
    return baseFormatDate(date)
  }
  const isPerformanceSettingsModalOpen = ref(false)
</script>
