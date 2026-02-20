<template>
  <UCard
    v-if="integrationStore.intervalsConnected"
    :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow' }"
    class="flex flex-col overflow-hidden"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-primary-500" />
          <h3 class="font-bold text-sm tracking-tight uppercase">
            <span class="hidden sm:inline">Performance Scores</span>
            <span class="sm:hidden">Performance</span>
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
            <span class="hidden sm:inline">Training Load</span>
            <span class="sm:hidden">Load</span>
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
          Analysis current as of {{ formatScoreDate(profileScores.lastUpdated) }}
        </p>
      </div>
    </div>

    <!-- No scores yet -->
    <div v-else class="text-center py-4 flex-grow">
      <p class="text-sm text-muted">Generate your athlete profile to see performance scores.</p>
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
        View Analysis
      </UButton>
    </template>

    <DashboardPerformanceScoresSettingsModal v-model:open="showSettingsModal" />
  </UCard>
</template>

<script setup lang="ts">
  const integrationStore = useIntegrationStore()
  const userStore = useUserStore()
  const nutritionEnabled = computed(
    () =>
      userStore.profile?.nutritionTrackingEnabled !== false &&
      userStore.user?.nutritionTrackingEnabled !== false
  )
  const { getScoreColor: getScoreBadgeColor } = useScoreColor()
  const { formatDate, formatDateUTC, getUserLocalDate } = useFormat()

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
  const allScoreConfigs = {
    currentFitness: {
      label: 'Current Fitness',
      color: 'bg-amber-50 dark:bg-amber-900/20 ring-amber-500/10',
      sublabel: 'Fitness Level (1-10)',
      description:
        'Your current cardiovascular and muscular fitness based on recent performance data.'
    },
    recoveryCapacity: {
      label: 'Recovery Capacity',
      color: 'bg-emerald-50 dark:bg-emerald-900/20 ring-emerald-500/10',
      sublabel: 'Recovery State (1-10)',
      description:
        'How well your body is currently responding to and recovering from training stress.'
    },
    nutritionCompliance: {
      label: 'Nutrition Quality',
      color: 'bg-purple-50 dark:bg-purple-900/20 ring-purple-500/10',
      sublabel: 'Fueling Quality (1-10)',
      description: 'How closely your nutrition and fueling habits align with your training needs.'
    },
    trainingConsistency: {
      label: 'Consistency',
      color: 'bg-blue-50 dark:bg-blue-900/20 ring-blue-500/10',
      sublabel: 'Plan Adherence (1-10)',
      description: 'A measure of how reliably you have been completing your scheduled workouts.'
    },
    ctl: {
      label: 'TL (Fitness)',
      color: 'bg-purple-50 dark:bg-purple-900/20 ring-purple-500/10',
      sublabel: 'Long-term Load (~42d)',
      description:
        'Chronic Training Load (CTL) represents your long-term fitness based on the last 42 days of training.'
    },
    atl: {
      label: 'ATL (Fatigue)',
      color: 'bg-yellow-50 dark:bg-yellow-900/20 ring-yellow-500/10',
      sublabel: 'Short-term Load (~7d)',
      description:
        'Acute Training Load (ATL) represents your short-term fatigue based on the last 7 days of training.'
    },
    tsb: {
      label: 'TSB (Form)',
      color: 'bg-indigo-50 dark:bg-indigo-900/20 ring-indigo-500/10',
      sublabel: 'Freshness (CTL - ATL)',
      description:
        'Training Stress Balance (TSB) is your freshness. Positive means fresh, negative means fatigued. -10 to +5 is optimal for racing.'
    },
    avgTss: {
      label: 'Avg TSS',
      color: 'bg-blue-50 dark:bg-blue-900/20 ring-blue-500/10',
      sublabel: 'Workout Avg (7d)',
      description: 'Average Training Stress Score per workout over the last 7 days.'
    }
  }

  const visibleScoreOptions = computed(() => {
    const options = {} as any
    const visibleScores = settings.value.visibleScores || defaultSettings.visibleScores

    for (const [key, config] of Object.entries(allScoreConfigs)) {
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

    if (dStr === tStr) return 'today'
    if (dStr === yStr) return 'yesterday'

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
        title: 'Current Fitness',
        score: profileScores.value.currentFitness,
        explanation: profileScores.value.currentFitnessExplanation,
        analysisData: profileScores.value.currentFitnessExplanationJson,
        color: 'blue' as const
      },
      recoveryCapacity: {
        title: 'Recovery Capacity',
        score: profileScores.value.recoveryCapacity,
        explanation: profileScores.value.recoveryCapacityExplanation,
        analysisData: profileScores.value.recoveryCapacityExplanationJson,
        color: 'green' as const
      },
      nutritionCompliance: {
        title: 'Nutrition Compliance',
        score: profileScores.value.nutritionCompliance,
        explanation: profileScores.value.nutritionComplianceExplanation,
        analysisData: profileScores.value.nutritionComplianceExplanationJson,
        color: 'purple' as const
      },
      trainingConsistency: {
        title: 'Training Consistency',
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
