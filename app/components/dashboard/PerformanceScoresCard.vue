<template>
  <UCard
    v-if="isOnboarded"
    :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow' }"
    class="flex flex-col overflow-hidden"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-primary-500" />
          <h3 class="font-bold text-sm tracking-tight uppercase">
            <span class="hidden sm:inline">{{ t('performance_scores_header') }}</span>
            <span class="sm:hidden">{{ t('navigation_performance') }}</span>
          </h3>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-heroicons-presentation-chart-line"
            @click="$emit('open-training-load')"
          >
            <span class="hidden sm:inline">{{ t('performance_scores_load_button') }}</span>
            <span class="sm:hidden">{{ t('performance_scores_load_badge') }}</span>
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-heroicons-cog-6-tooth"
            @click="showSettingsModal = true"
          />
        </div>
      </div>
    </template>

    <!-- Loading skeleton -->
    <div v-if="loadingScores" class="space-y-4 animate-pulse flex-grow">
      <div
        v-for="i in 4"
        :key="i"
        class="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40"
      >
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12" />
      </div>
    </div>

    <!-- Actual scores data -->
    <div v-else-if="profileScores || pmcSummary" class="grid grid-cols-2 gap-3 flex-grow p-4">
      <UTooltip
        v-for="(score, key) in visibleScoreOptions"
        :key="key"
        :text="score.description"
        :content="{ side: 'top' }"
        class="w-full"
      >
        <button
          class="flex flex-col items-start p-3 rounded-xl ring-1 ring-inset hover:ring-primary-500/50 transition-all duration-200 text-left h-full w-full"
          :class="score.color"
          @click="openScoreModal(key as string)"
        >
          <div class="mb-auto">
            <span
              class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight leading-tight block"
              >{{ score.label }}</span
            >
          </div>

          <div class="flex items-center gap-1.5 mt-2">
            <TrendIndicator
              v-if="settings.showTrends && getHistory(key as string).length > 1"
              :current="getCurrentValue(key as string) ?? 0"
              :previous="getHistory(key as string)"
              :type="key === 'atl' ? 'lower-is-better' : 'higher-is-better'"
              compact
              icon-only
            />
            <div class="text-xl font-bold text-gray-900 dark:text-white">
              <template v-if="key === 'tsb' && (getCurrentValue(key as string) ?? 0) > 0"
                >+</template
              >
              {{
                [
                  'atl',
                  'avgTss',
                  'currentFitness',
                  'recoveryCapacity',
                  'nutritionCompliance',
                  'trainingConsistency'
                ].includes(key as string)
                  ? getCurrentValue(key as string)?.toFixed(0) || 'N/A'
                  : getCurrentValue(key as string)?.toFixed(1) || 'N/A'
              }}
            </div>
          </div>

          <div v-if="score.sublabel" class="mt-1">
            <span
              class="text-[9px] text-gray-500 dark:text-gray-400 font-medium leading-tight block"
              >{{ score.sublabel }}</span
            >
          </div>
        </button>
      </UTooltip>

      <div
        v-if="profileScores?.lastUpdated"
        class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 col-span-2"
      >
        <p
          class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight text-center italic"
        >
          {{
            t('performance_scores_analysis_current', {
              date: formatScoreDate(profileScores.lastUpdated)
            })
          }}
        </p>
      </div>
    </div>

    <!-- No scores yet -->
    <div v-else class="text-center py-4 flex-grow">
      <p class="text-sm text-muted">{{ t('performance_scores_empty_message') }}</p>
    </div>

    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        block
        class="font-bold"
        @click="$emit('open-training-load')"
      >
        {{ t('performance_scores_view_analysis') }}
      </UButton>
    </template>

    <DashboardPerformanceScoresSettingsModal v-model:open="showSettingsModal" />
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('dashboard')
  const integrationStore = useIntegrationStore()
  const userStore = useUserStore()
  const nutritionEnabled = computed(
    () =>
      userStore.profile?.nutritionTrackingEnabled !== false &&
      userStore.user?.nutritionTrackingEnabled !== false
  )
  const { getScoreColor: getScoreBadgeColor } = useScoreColor()
  const { formatDate, formatDateUTC, getUserLocalDate } = useFormat()

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

  const emit = defineEmits(['open-score-modal', 'open-training-load'])

  // Fetch athlete profile scores
  const { data: scoresData, pending: loadingScores } = useFetch<any>(
    '/api/scores/athlete-profile',
    {
      lazy: true,
      server: false,
      watch: [() => integrationStore.intervalsConnected]
    }
  )

  const profileScores = computed(() => scoresData.value?.scores || null)
  const scoresHistory = computed(() => scoresData.value?.history || [])

  // Fetch PMC data for TL/ATL/TSB if enabled
  const { data: pmcData, pending: loadingPMC } = useFetch<any>('/api/performance/pmc', {
    lazy: true,
    server: false,
    query: { days: 7 },
    immediate: true,
    watch: [() => integrationStore.intervalsConnected]
  })

  const pmcSummary = computed(() => pmcData.value?.summary || null)
  const pmcHistory = computed(() => pmcData.value?.data || [])

  // Settings State
  const showSettingsModal = ref(false)

  const defaultSettings = {
    showTrends: true,
    visibleScores: {
      currentFitness: true,
      recoveryCapacity: true,
      nutritionCompliance: true,
      trainingConsistency: true,
      ctl: false,
      atl: false,
      tsb: false,
      avgTss: false
    }
  }

  const settings = computed(() => {
    const userSettings = userStore.user?.dashboardSettings?.performanceScores
    if (userSettings) {
      return {
        ...defaultSettings,
        ...userSettings,
        visibleScores: {
          ...defaultSettings.visibleScores,
          ...(userSettings.visibleScores || {})
        }
      }
    }
    return defaultSettings
  })

  // Computed visible scores
  const allScoreConfigs = computed(() => ({
    currentFitness: {
      label: t.value('score_label_fitness'),
      color: 'bg-amber-50 dark:bg-amber-900/20 ring-amber-500/10',
      sublabel: t.value('score_sublabel_fitness'),
      description: t.value('score_desc_fitness')
    },
    recoveryCapacity: {
      label: t.value('score_label_recovery'),
      color: 'bg-emerald-50 dark:bg-emerald-900/20 ring-emerald-500/10',
      sublabel: t.value('score_sublabel_recovery'),
      description: t.value('score_desc_recovery')
    },
    nutritionCompliance: {
      label: t.value('score_label_nutrition'),
      color: 'bg-purple-50 dark:bg-purple-900/20 ring-purple-500/10',
      sublabel: t.value('score_sublabel_nutrition'),
      description: t.value('score_desc_nutrition')
    },
    trainingConsistency: {
      label: t.value('score_label_consistency'),
      color: 'bg-blue-50 dark:bg-blue-900/20 ring-blue-500/10',
      sublabel: t.value('score_sublabel_consistency'),
      description: t.value('score_desc_consistency')
    },
    ctl: {
      label: t.value('score_label_ctl'),
      color: 'bg-purple-50 dark:bg-purple-900/20 ring-purple-500/10',
      sublabel: t.value('score_sublabel_ctl'),
      description: t.value('score_desc_ctl')
    },
    atl: {
      label: t.value('score_label_atl'),
      color: 'bg-yellow-50 dark:bg-yellow-900/20 ring-yellow-500/10',
      sublabel: t.value('score_sublabel_atl'),
      description: t.value('score_desc_atl')
    },
    tsb: {
      label: t.value('score_label_tsb'),
      color: 'bg-indigo-50 dark:bg-indigo-900/20 ring-indigo-500/10',
      sublabel: t.value('score_sublabel_tsb'),
      description: t.value('score_desc_tsb')
    },
    avgTss: {
      label: t.value('score_label_avg_tss'),
      color: 'bg-blue-50 dark:bg-blue-900/20 ring-blue-500/10',
      sublabel: t.value('score_sublabel_avg_tss'),
      description: t.value('score_desc_avg_tss')
    }
  }))

  const visibleScoreOptions = computed(() => {
    const options = {} as any
    const visibleScores = settings.value.visibleScores || defaultSettings.visibleScores

    for (const [key, config] of Object.entries(allScoreConfigs.value)) {
      if (key === 'nutritionCompliance' && !nutritionEnabled.value) continue
      if (visibleScores[key as keyof typeof visibleScores] !== false) {
        options[key] = config
      }
    }
    return options
  })

  // Helper to get score color
  function getScoreColor(
    key: string,
    value: number | null
  ): 'error' | 'warning' | 'success' | 'neutral' {
    if (key === 'tsb') {
      if (value === null) return 'neutral'
      if (value >= 5) return 'success'
      if (value < -30) return 'error'
      if (value < -10) return 'warning'
      return 'neutral'
    }

    // Performance scores use standard badge color
    if (
      ['currentFitness', 'recoveryCapacity', 'nutritionCompliance', 'trainingConsistency'].includes(
        key
      )
    ) {
      return getScoreBadgeColor(value)
    }

    return 'neutral'
  }

  // Helper to format score date
  function formatScoreDate(date: string | Date): string {
    const scoreDate = new Date(date)
    const today = getUserLocalDate()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const dStr = formatDate(scoreDate, 'yyyy-MM-dd')
    const tStr = formatDateUTC(today, 'yyyy-MM-dd')
    const yStr = formatDateUTC(yesterday, 'yyyy-MM-dd')

    if (dStr === tStr) return t.value('navigation_search_nutrition_today').toLowerCase()
    if (dStr === yStr) return t.value('navigation_search_nutrition_yesterday').toLowerCase()

    const diffDays = Math.floor((today.getTime() - scoreDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`
    return formatDate(scoreDate, 'MMM d')
  }

  // Get current value for a key
  function getCurrentValue(key: string) {
    if (key === 'ctl') return pmcSummary.value?.currentCTL
    if (key === 'atl') return pmcSummary.value?.currentATL
    if (key === 'tsb') return pmcSummary.value?.currentTSB
    if (key === 'avgTss') return pmcSummary.value?.avgTSS
    return (profileScores.value as any)?.[key]
  }

  // Get history for a key
  function getHistory(key: string) {
    if (key === 'ctl') return pmcHistory.value.slice(0, -1).map((h: any) => h.ctl)
    if (key === 'atl') return pmcHistory.value.slice(0, -1).map((h: any) => h.atl)
    if (key === 'tsb') return pmcHistory.value.slice(0, -1).map((h: any) => h.tsb)
    if (key === 'avgTss') return pmcHistory.value.slice(0, -1).map((h: any) => h.tss)

    return scoresHistory.value
      .slice(0, -1)
      .map((h: any) => h[key])
      .filter((v: any) => v != null)
  }

  // Function to open score detail modal
  function openScoreModal(scoreType: string) {
    if (['ctl', 'atl', 'tsb', 'avgTss'].includes(scoreType)) {
      emit('open-training-load')
      return
    }

    if (!profileScores.value) return

    const scoreConfig = {
      currentFitness: {
        title: t.value('score_label_fitness'),
        score: profileScores.value.currentFitness,
        explanation: profileScores.value.currentFitnessExplanation,
        analysisData: profileScores.value.currentFitnessExplanationJson,
        color: 'blue' as const
      },
      recoveryCapacity: {
        title: t.value('score_label_recovery'),
        score: profileScores.value.recoveryCapacity,
        explanation: profileScores.value.recoveryCapacityExplanation,
        analysisData: profileScores.value.recoveryCapacityExplanationJson,
        color: 'green' as const
      },
      nutritionCompliance: {
        title: t.value('score_label_nutrition'),
        score: profileScores.value.nutritionCompliance,
        explanation: profileScores.value.nutritionComplianceExplanation,
        analysisData: profileScores.value.nutritionComplianceExplanationJson,
        color: 'purple' as const
      },
      trainingConsistency: {
        title: t.value('score_label_consistency'),
        score: profileScores.value.trainingConsistency,
        explanation: profileScores.value.trainingConsistencyExplanation,
        analysisData: profileScores.value.trainingConsistencyExplanationJson,
        color: 'orange' as const
      }
    } as any

    const config = scoreConfig[scoreType]

    emit('open-score-modal', {
      title: config.title,
      score: config.score ?? null,
      explanation: config.analysisData ? null : (config.explanation ?? null),
      analysisData: config.analysisData || undefined,
      color: config.color
    })
  }
</script>
