<script setup lang="ts">
  import EventGoalWizard from '~/components/goals/EventGoalWizard.vue'
  import GoalCard from '~/components/goals/GoalCard.vue'

  definePageMeta({
    middleware: 'auth'
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const showWizard = computed(() => !!route.query.new || !!route.query.edit)
  const editingGoalId = computed(() => route.query.edit as string)

  const { data, pending: loading, refresh } = await useFetch('/api/goals')

  const goals = computed(() => data.value?.goals || [])
  const activeGoals = computed(() => goals.value.filter((g: any) => g.status === 'ACTIVE'))
  const editingGoal = computed(() => goals.value.find((g: any) => g.id === editingGoalId.value))

  const showDeleteModal = ref(false)
  const goalToDelete = ref<string | null>(null)

  // AI Features
  const suggestionsLoading = ref(false)
  const reviewLoading = ref(false)
  const suggestions = ref<any>(null)
  const review = ref<any>(null)
  const showSuggestions = ref(false)
  const showReview = ref(false)
  const acceptingSuggestionKeys = ref<string[]>([])
  const acceptedSuggestionKeys = ref<string[]>([])

  // Background Task Monitoring
  const { refresh: refreshRuns } = useUserRuns()
  const { onTaskCompleted, onTaskFailed } = useUserRunsState()

  const visibleSuggestions = computed(() =>
    (suggestions.value?.suggested_goals || []).filter(
      (_: any, index: number) => !acceptedSuggestionKeys.value.includes(getSuggestionKey(_, index))
    )
  )

  function getSuggestionKey(suggestion: any, index: string | number) {
    return suggestion?.title || suggestion?.metric || `suggestion-${index}`
  }

  function isAcceptingSuggestion(suggestion: any, index: string | number) {
    return acceptingSuggestionKeys.value.includes(getSuggestionKey(suggestion, index))
  }

  function getPriorityColor(priority?: string) {
    if (priority === 'HIGH') return 'error'
    if (priority === 'MEDIUM') return 'warning'
    return 'primary'
  }

  function getDifficultyColor(difficulty?: string) {
    if (difficulty === 'easy') return 'success'
    if (difficulty === 'moderate') return 'primary'
    if (difficulty === 'challenging') return 'warning'
    return 'error'
  }

  function formatGoalType(type?: string) {
    return type?.replaceAll('_', ' ') || 'Goal'
  }

  function getGoalBalanceColor(balance?: string) {
    if (balance === 'well_balanced') return 'success'
    if (balance === 'needs_rebalancing') return 'warning'
    return 'error'
  }

  function getAlignmentColor(alignment?: string) {
    if (alignment === 'excellent') return 'success'
    if (alignment === 'good') return 'primary'
    return 'warning'
  }

  function getAssessmentColor(assessment?: string) {
    if (assessment === 'realistic') return 'success'
    if (assessment === 'slightly_ambitious') return 'primary'
    if (assessment === 'too_ambitious') return 'error'
    if (assessment === 'too_conservative') return 'warning'
    return 'neutral'
  }

  function formatSuggestionTarget(suggestion: any) {
    if (
      suggestion?.currentValue == null ||
      suggestion?.targetValue == null ||
      !suggestion?.metric
    ) {
      return null
    }

    return `${suggestion.currentValue} -> ${suggestion.targetValue} ${suggestion.metric}`
  }

  async function fetchRunOutput(runId: string) {
    try {
      const run = await $fetch<any>(`/api/runs/${runId}`)
      return run?.output ?? null
    } catch {
      return null
    }
  }

  // Listeners
  onTaskCompleted('suggest-goals', async (run) => {
    const output = run.output ?? (await fetchRunOutput(run.id))

    if (output?.suggestions) {
      suggestions.value = output.suggestions
      suggestionsLoading.value = false
      toast.add({
        title: 'Suggestions Ready',
        description: 'AI has analyzed your profile and generated goal suggestions',
        color: 'success'
      })
      return
    }

    if (output?.reason === 'QUOTA_EXCEEDED') {
      suggestionsLoading.value = false
      toast.add({
        title: 'Suggestion Limit Reached',
        description: 'You have reached your goal suggestion limit for now. Please try again later.',
        color: 'warning'
      })
      return
    }

    suggestionsLoading.value = false
  })

  onTaskCompleted('review-goals', async (run) => {
    const output = run.output ?? (await fetchRunOutput(run.id))

    if (output?.review) {
      review.value = output.review
      reviewLoading.value = false
      toast.add({
        title: 'Review Complete',
        description: 'AI has reviewed your active goals',
        color: 'success'
      })
      return
    }

    if (output?.reason === 'QUOTA_EXCEEDED') {
      reviewLoading.value = false
      toast.add({
        title: 'Review Limit Reached',
        description: 'You have reached your goal review limit for now. Please try again later.',
        color: 'warning'
      })
      return
    }

    reviewLoading.value = false
  })

  onTaskFailed('suggest-goals', async (run) => {
    suggestionsLoading.value = false
    toast.add({
      title: 'Suggestion Failed',
      description:
        run.error?.message ||
        'Goal suggestions hit a rate or processing limit. Please try again later.',
      color: 'error'
    })
  })

  onTaskFailed('review-goals', async (run) => {
    reviewLoading.value = false
    toast.add({
      title: 'Review Failed',
      description:
        run.error?.message || 'Goal review hit a rate or processing limit. Please try again later.',
      color: 'error'
    })
  })

  function handleEdit(goal: any) {
    router.push({ query: { edit: goal.id } })
  }

  function openNewGoal() {
    router.push({ query: { new: 'true' } })
  }

  function closeWizard() {
    router.push({ query: {} })
  }

  async function refreshGoals() {
    await refresh()
  }

  function onGoalCreated() {
    refreshGoals()
    closeWizard()
  }

  function onGoalUpdated() {
    refreshGoals()
    closeWizard()
  }

  function deleteGoal(id: string) {
    goalToDelete.value = id
    showDeleteModal.value = true
  }

  async function confirmDelete() {
    if (!goalToDelete.value) return

    try {
      await $fetch(`/api/goals/${goalToDelete.value}`, {
        method: 'DELETE'
      })
      refreshGoals()
      toast.add({
        title: 'Goal Deleted',
        color: 'success'
      })
    } catch (error) {
      toast.add({
        title: 'Error',
        description: 'Failed to delete goal',
        color: 'error'
      })
    } finally {
      showDeleteModal.value = false
      goalToDelete.value = null
    }
  }

  // AI Suggestions
  async function generateSuggestions() {
    suggestionsLoading.value = true
    suggestions.value = null
    acceptedSuggestionKeys.value = []
    acceptingSuggestionKeys.value = []
    showSuggestions.value = true

    try {
      const result = await $fetch('/api/goals/suggest', { method: 'POST' })
      refreshRuns()

      toast.add({
        title: 'Generating Suggestions',
        description: result.message,
        color: 'primary'
      })
    } catch (error) {
      toast.add({
        title: 'Error',
        description: 'Failed to generate goal suggestions',
        color: 'error'
      })
      suggestionsLoading.value = false
    }
  }

  // Goal Review
  async function reviewGoals() {
    if (activeGoals.value.length === 0) {
      toast.add({
        title: 'No Active Goals',
        description: 'Create some goals first before requesting a review',
        color: 'warning'
      })
      return
    }

    reviewLoading.value = true
    review.value = null
    showReview.value = true

    try {
      const result = await $fetch('/api/goals/review', { method: 'POST' })
      refreshRuns()

      toast.add({
        title: 'Reviewing Goals',
        description: result.message,
        color: 'primary'
      })
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to review goals',
        color: 'error'
      })
      reviewLoading.value = false
    }
  }

  async function acceptSuggestion(suggestion: any, index: string | number) {
    const suggestionKey = getSuggestionKey(suggestion, index)
    if (acceptingSuggestionKeys.value.includes(suggestionKey)) return

    acceptingSuggestionKeys.value = [...acceptingSuggestionKeys.value, suggestionKey]

    try {
      await $fetch('/api/goals', {
        method: 'POST',
        body: {
          type: suggestion.type,
          title: suggestion.title,
          description: suggestion.description,
          metric: suggestion.metric,
          currentValue: suggestion.currentValue,
          targetValue: suggestion.targetValue,
          startValue: suggestion.currentValue,
          targetDate: suggestion.targetDate,
          priority: suggestion.priority,
          aiContext: suggestion.rationale
        }
      })

      await refreshGoals()
      acceptedSuggestionKeys.value = [...acceptedSuggestionKeys.value, suggestionKey]

      toast.add({
        title: 'Goal Created',
        description: `Added: ${suggestion.title}`,
        color: 'success'
      })
    } catch (error) {
      toast.add({
        title: 'Error',
        description: 'Failed to create goal from suggestion',
        color: 'error'
      })
    } finally {
      acceptingSuggestionKeys.value = acceptingSuggestionKeys.value.filter(
        (key) => key !== suggestionKey
      )
    }
  }

  useHead({
    title: 'Goals',
    meta: [
      {
        name: 'description',
        content: 'Set and track your fitness goals to stay motivated and measure progress.'
      }
    ]
  })
</script>

<template>
  <UDashboardPanel id="goals">
    <template #header>
      <UDashboardNavbar title="Goals">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardTriggerMonitorButton />
          <UButton
            v-if="!showWizard"
            color="primary"
            variant="solid"
            icon="i-heroicons-plus"
            size="sm"
            class="font-bold"
            @click="openNewGoal"
          >
            <span class="hidden sm:inline">Add Goal</span>
            <span class="sm:hidden">Add</span>
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-4 sm:space-y-6">
        <!-- Page Header -->
        <div v-if="!showWizard" class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Goals
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Objective Alignment & Strategic Planning
          </p>
        </div>

        <div class="space-y-6">
          <!-- AI Features Section -->
          <div v-if="!showWizard" class="flex gap-3">
            <UButton
              color="primary"
              variant="outline"
              icon="i-heroicons-sparkles"
              size="sm"
              class="font-bold"
              :loading="suggestionsLoading"
              @click="generateSuggestions"
            >
              AI Suggest
            </UButton>
            <UButton
              v-if="activeGoals.length > 0"
              color="primary"
              variant="outline"
              icon="i-heroicons-check-badge"
              size="sm"
              class="font-bold"
              :loading="reviewLoading"
              @click="reviewGoals"
            >
              Review
            </UButton>
          </div>

          <!-- AI Suggestions Section -->
          <UCard
            v-if="showSuggestions && !showWizard"
            :ui="{ body: 'p-4 sm:p-6', header: 'px-4 py-4 sm:px-6' }"
            class="overflow-hidden border-primary/15 bg-gradient-to-br from-white via-primary-50/30 to-cyan-50/40 dark:from-gray-900 dark:via-primary-950/10 dark:to-cyan-950/10"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary" />
                  <h3 class="font-semibold">AI Goal Suggestions</h3>
                </div>
                <UButton
                  icon="i-heroicons-x-mark"
                  variant="ghost"
                  size="sm"
                  @click="showSuggestions = false"
                />
              </div>
            </template>

            <div v-if="suggestionsLoading" class="space-y-4">
              <div class="flex items-center gap-3">
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-primary" />
                <p class="text-sm text-muted">
                  Analyzing your athlete profile, workouts, and performance to suggest achievable
                  goals...
                </p>
              </div>
              <USkeleton v-for="i in 3" :key="i" class="h-32 w-full" />
            </div>

            <div v-else-if="suggestions" class="space-y-6">
              <div
                v-if="suggestions.executive_summary"
                class="rounded-2xl border border-primary/20 bg-white/80 p-4 shadow-sm backdrop-blur dark:bg-gray-900/60"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary"
                  >
                    <UIcon name="i-heroicons-bolt" class="h-4 w-4" />
                  </div>
                  <div class="space-y-1">
                    <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">
                      AI Readout
                    </p>
                    <p class="text-sm leading-6 text-gray-700 dark:text-gray-200">
                      {{ suggestions.executive_summary }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-if="visibleSuggestions.length > 0" class="space-y-4">
                <div class="flex items-center justify-between gap-3">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                    Suggested Goals
                  </h4>
                  <UBadge color="neutral" variant="soft">
                    {{ visibleSuggestions.length }} to review
                  </UBadge>
                </div>

                <TransitionGroup name="suggestion-card" tag="div" class="grid gap-4 lg:grid-cols-2">
                  <div
                    v-for="(suggestion, index) in visibleSuggestions"
                    :key="getSuggestionKey(suggestion, index)"
                    class="group relative overflow-hidden rounded-2xl border border-primary/15 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg dark:bg-gray-900/80"
                  >
                    <div
                      class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 opacity-80"
                    />

                    <div class="space-y-4">
                      <div class="flex items-start justify-between gap-4">
                        <div class="space-y-3">
                          <div class="flex flex-wrap items-center gap-2">
                            <UBadge :color="getPriorityColor(suggestion.priority)" size="xs">
                              {{ suggestion.priority }}
                            </UBadge>
                            <UBadge color="neutral" variant="soft" size="xs">
                              {{ formatGoalType(suggestion.type) }}
                            </UBadge>
                            <UBadge :color="getDifficultyColor(suggestion.difficulty)" size="xs">
                              {{ suggestion.difficulty }}
                            </UBadge>
                          </div>

                          <div class="space-y-1">
                            <h5
                              class="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
                            >
                              {{ suggestion.title }}
                            </h5>
                            <p class="text-sm leading-6 text-gray-600 dark:text-gray-300">
                              {{ suggestion.description }}
                            </p>
                          </div>
                        </div>

                        <UButton
                          color="primary"
                          size="sm"
                          variant="solid"
                          icon="i-heroicons-plus"
                          :loading="isAcceptingSuggestion(suggestion, index)"
                          @click="acceptSuggestion(suggestion, index)"
                        >
                          Accept
                        </UButton>
                      </div>

                      <div
                        class="rounded-xl border border-primary/10 bg-primary/5 p-4 dark:border-primary/20 dark:bg-primary/10"
                      >
                        <p
                          class="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80"
                        >
                          Why This Goal
                        </p>
                        <p class="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">
                          {{ suggestion.rationale }}
                        </p>
                      </div>

                      <div class="grid gap-3 sm:grid-cols-2">
                        <div
                          v-if="formatSuggestionTarget(suggestion)"
                          class="rounded-xl border border-gray-200/80 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-950/40"
                        >
                          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                            Target
                          </p>
                          <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {{ formatSuggestionTarget(suggestion) }}
                          </p>
                        </div>

                        <div
                          v-if="suggestion.timeframe_weeks"
                          class="rounded-xl border border-gray-200/80 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-950/40"
                        >
                          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                            Timeframe
                          </p>
                          <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {{ suggestion.timeframe_weeks }} weeks
                          </p>
                        </div>
                      </div>

                      <div
                        v-if="
                          suggestion.prerequisites?.length || suggestion.success_indicators?.length
                        "
                        class="grid gap-3 lg:grid-cols-2"
                      >
                        <div
                          v-if="suggestion.prerequisites?.length"
                          class="rounded-xl border border-dashed border-gray-300/80 p-3 dark:border-gray-700"
                        >
                          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                            Prerequisites
                          </p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            <UBadge
                              v-for="(prereq, i) in suggestion.prerequisites"
                              :key="i"
                              color="neutral"
                              variant="subtle"
                            >
                              {{ prereq }}
                            </UBadge>
                          </div>
                        </div>

                        <div
                          v-if="suggestion.success_indicators?.length"
                          class="rounded-xl border border-dashed border-emerald-300/80 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/10"
                        >
                          <p
                            class="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300"
                          >
                            On-Track Signals
                          </p>
                          <div class="mt-2 space-y-1.5">
                            <p
                              v-for="(indicator, i) in suggestion.success_indicators"
                              :key="i"
                              class="text-sm text-gray-700 dark:text-gray-200"
                            >
                              {{ indicator }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TransitionGroup>
              </div>

              <div v-else class="text-center py-8 text-muted">
                <p>
                  {{
                    acceptedSuggestionKeys.length > 0
                      ? 'All current suggestions have been handled.'
                      : 'No suggestions available at this time.'
                  }}
                </p>
              </div>
            </div>
          </UCard>

          <!-- Goal Review Section -->
          <UCard
            v-if="showReview && !showWizard"
            :ui="{ body: 'p-4 sm:p-6', header: 'px-4 py-4 sm:px-6' }"
            class="overflow-hidden border-primary/15 bg-gradient-to-br from-white via-emerald-50/25 to-primary-50/35 dark:from-gray-900 dark:via-emerald-950/10 dark:to-primary-950/10"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-check-badge" class="w-5 h-5 text-primary" />
                  <h3 class="font-semibold">Goal Review</h3>
                </div>
                <UButton
                  icon="i-heroicons-x-mark"
                  variant="ghost"
                  size="sm"
                  @click="showReview = false"
                />
              </div>
            </template>

            <div v-if="reviewLoading" class="space-y-4">
              <div class="flex items-center gap-3">
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-primary" />
                <p class="text-sm text-muted">
                  Reviewing your active goals for rationality and achievability...
                </p>
              </div>
              <USkeleton v-for="i in 2" :key="i" class="h-32 w-full" />
            </div>

            <div v-else-if="review" class="space-y-6">
              <div v-if="review.overall_assessment" class="space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge :color="getGoalBalanceColor(review.overall_assessment.goal_balance)">
                    {{ review.overall_assessment.goal_balance?.replace('_', ' ') }}
                  </UBadge>
                  <UBadge
                    :color="getAlignmentColor(review.overall_assessment.alignment_with_profile)"
                  >
                    Alignment: {{ review.overall_assessment.alignment_with_profile }}
                  </UBadge>
                </div>

                <div
                  class="rounded-2xl border border-primary/20 bg-white/85 p-4 shadow-sm backdrop-blur dark:bg-gray-900/60"
                >
                  <div class="flex items-start gap-3">
                    <div
                      class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    >
                      <UIcon name="i-heroicons-shield-check" class="h-4 w-4" />
                    </div>
                    <div class="space-y-1">
                      <p
                        class="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300"
                      >
                        Overall Assessment
                      </p>
                      <p class="text-sm leading-6 text-gray-700 dark:text-gray-200">
                        {{ review.overall_assessment.summary }}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  v-if="review.overall_assessment.key_concerns?.length"
                  class="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-800 dark:bg-amber-950/20"
                >
                  <p
                    class="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300"
                  >
                    Key Concerns
                  </p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <UBadge
                      v-for="(concern, i) in review.overall_assessment.key_concerns"
                      :key="i"
                      color="warning"
                      variant="subtle"
                    >
                      {{ concern }}
                    </UBadge>
                  </div>
                </div>
              </div>

              <div v-if="review.goal_reviews?.length > 0" class="space-y-4">
                <div class="flex items-center justify-between gap-3">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                    Individual Goal Reviews
                  </h4>
                  <UBadge color="neutral" variant="soft">
                    {{ review.goal_reviews.length }} reviewed
                  </UBadge>
                </div>

                <div class="grid gap-4 lg:grid-cols-2">
                  <div
                    v-for="(goalReview, index) in review.goal_reviews"
                    :key="index"
                    class="relative overflow-hidden rounded-2xl border border-primary/10 bg-white/90 p-5 shadow-sm dark:bg-gray-900/80"
                  >
                    <div
                      class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-primary to-amber-400 opacity-80"
                    />

                    <div class="space-y-4">
                      <div class="space-y-3">
                        <div class="flex flex-wrap items-center gap-2">
                          <UBadge :color="getAssessmentColor(goalReview.assessment)" size="xs">
                            {{ goalReview.assessment?.replace('_', ' ') }}
                          </UBadge>
                          <UBadge
                            v-if="goalReview.support_needed?.length"
                            color="neutral"
                            variant="soft"
                            size="xs"
                          >
                            {{ goalReview.support_needed.length }} support area{{
                              goalReview.support_needed.length > 1 ? 's' : ''
                            }}
                          </UBadge>
                        </div>

                        <div class="space-y-1">
                          <h5
                            class="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
                          >
                            {{ goalReview.title }}
                          </h5>
                          <p class="text-sm leading-6 text-gray-600 dark:text-gray-300">
                            {{ goalReview.rationale }}
                          </p>
                        </div>
                      </div>

                      <div
                        v-if="goalReview.progress_analysis"
                        class="rounded-xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-900 dark:bg-sky-950/20"
                      >
                        <p
                          class="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300"
                        >
                          Progress Read
                        </p>
                        <p class="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">
                          {{ goalReview.progress_analysis }}
                        </p>
                      </div>

                      <div
                        v-if="
                          goalReview.suggested_adjustments?.targetValue ||
                          goalReview.suggested_adjustments?.targetDate ||
                          goalReview.suggested_adjustments?.priority
                        "
                        class="grid gap-3 sm:grid-cols-2"
                      >
                        <div
                          v-if="goalReview.suggested_adjustments?.targetValue"
                          class="rounded-xl border border-gray-200/80 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-950/40"
                        >
                          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                            Suggested Target
                          </p>
                          <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {{ goalReview.suggested_adjustments.targetValue }}
                          </p>
                        </div>
                        <div
                          v-if="goalReview.suggested_adjustments?.targetDate"
                          class="rounded-xl border border-gray-200/80 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-950/40"
                        >
                          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                            Suggested Date
                          </p>
                          <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {{ goalReview.suggested_adjustments.targetDate }}
                          </p>
                        </div>
                        <div
                          v-if="goalReview.suggested_adjustments?.priority"
                          class="rounded-xl border border-gray-200/80 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-950/40"
                        >
                          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                            Priority Shift
                          </p>
                          <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {{ goalReview.suggested_adjustments.priority }}
                          </p>
                        </div>
                        <div
                          v-if="goalReview.suggested_adjustments?.reasoning"
                          class="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 sm:col-span-2 dark:border-primary/20 dark:bg-primary/10"
                        >
                          <p
                            class="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80"
                          >
                            Adjustment Reasoning
                          </p>
                          <p class="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">
                            {{ goalReview.suggested_adjustments.reasoning }}
                          </p>
                        </div>
                      </div>

                      <div
                        v-if="
                          goalReview.recommendations?.length ||
                          goalReview.risks?.length ||
                          goalReview.support_needed?.length
                        "
                        class="grid gap-3"
                      >
                        <div
                          v-if="goalReview.recommendations?.length"
                          class="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/10"
                        >
                          <p
                            class="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300"
                          >
                            Recommendations
                          </p>
                          <div class="mt-2 space-y-1.5">
                            <p
                              v-for="(rec, i) in goalReview.recommendations"
                              :key="i"
                              class="text-sm text-gray-700 dark:text-gray-200"
                            >
                              {{ rec }}
                            </p>
                          </div>
                        </div>

                        <div
                          v-if="goalReview.risks?.length"
                          class="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/10"
                        >
                          <p
                            class="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300"
                          >
                            Risks To Watch
                          </p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            <UBadge
                              v-for="(risk, i) in goalReview.risks"
                              :key="i"
                              color="warning"
                              variant="subtle"
                            >
                              {{ risk }}
                            </UBadge>
                          </div>
                        </div>

                        <div
                          v-if="goalReview.support_needed?.length"
                          class="rounded-xl border border-dashed border-gray-300/80 p-4 dark:border-gray-700"
                        >
                          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                            Support Needed
                          </p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            <UBadge
                              v-for="(support, i) in goalReview.support_needed"
                              :key="i"
                              color="neutral"
                              variant="subtle"
                            >
                              {{ support }}
                            </UBadge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="review.action_plan"
                class="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900 dark:bg-emerald-950/15"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    <UIcon name="i-heroicons-map" class="h-4 w-4" />
                  </div>
                  <div>
                    <p
                      class="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300"
                    >
                      Action Plan
                    </p>
                    <p class="text-sm text-gray-700 dark:text-gray-200">
                      Suggested next moves based on the full review.
                    </p>
                  </div>
                </div>

                <div class="mt-4 grid gap-3 lg:grid-cols-2">
                  <div
                    v-if="review.action_plan.immediate_actions?.length"
                    class="rounded-xl border border-white/60 bg-white/70 p-4 dark:border-gray-800 dark:bg-gray-900/60"
                  >
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                      Immediate Actions
                    </p>
                    <div class="mt-2 space-y-1.5">
                      <p
                        v-for="(action, i) in review.action_plan.immediate_actions"
                        :key="i"
                        class="text-sm text-gray-700 dark:text-gray-200"
                      >
                        {{ action }}
                      </p>
                    </div>
                  </div>

                  <div
                    v-if="review.action_plan.goals_to_adjust?.length"
                    class="rounded-xl border border-white/60 bg-white/70 p-4 dark:border-gray-800 dark:bg-gray-900/60"
                  >
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                      Goals To Adjust
                    </p>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <UBadge
                        v-for="(goal, i) in review.action_plan.goals_to_adjust"
                        :key="i"
                        color="primary"
                        variant="subtle"
                      >
                        {{ goal }}
                      </UBadge>
                    </div>
                  </div>

                  <div
                    v-if="review.action_plan.goals_to_pause?.length"
                    class="rounded-xl border border-white/60 bg-white/70 p-4 dark:border-gray-800 dark:bg-gray-900/60"
                  >
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                      Goals To Pause
                    </p>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <UBadge
                        v-for="(goal, i) in review.action_plan.goals_to_pause"
                        :key="i"
                        color="warning"
                        variant="subtle"
                      >
                        {{ goal }}
                      </UBadge>
                    </div>
                  </div>

                  <div
                    v-if="review.action_plan.new_goals_to_consider?.length"
                    class="rounded-xl border border-white/60 bg-white/70 p-4 dark:border-gray-800 dark:bg-gray-900/60"
                  >
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                      New Goals To Consider
                    </p>
                    <div class="mt-2 space-y-1.5">
                      <p
                        v-for="(goal, i) in review.action_plan.new_goals_to_consider"
                        :key="i"
                        class="text-sm text-gray-700 dark:text-gray-200"
                      >
                        {{ goal }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <div v-if="showWizard">
            <EventGoalWizard
              :goal="editingGoal"
              @close="closeWizard"
              @created="onGoalCreated"
              @updated="onGoalUpdated"
            />
          </div>

          <div v-if="loading" class="space-y-4">
            <USkeleton v-for="i in 2" :key="i" class="h-32 w-full" />
          </div>

          <div
            v-else-if="goals.length === 0 && !showWizard"
            class="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            <div
              class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"
            >
              <UIcon name="i-heroicons-trophy" class="w-8 h-8 text-primary" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">No goals set</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-2 mb-6 max-w-md mx-auto">
              Set your first goal to get personalized AI coaching advice and track your progress.
            </p>
            <UButton color="primary" size="lg" icon="i-heroicons-plus" @click="openNewGoal">
              Create First Goal
            </UButton>
          </div>

          <div v-else-if="!showWizard" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <GoalCard
              v-for="goal in goals"
              :key="goal.id"
              :goal="goal"
              @edit="handleEdit"
              @delete="deleteGoal"
            />
          </div>

          <!-- Delete Confirmation Modal -->
          <UModal
            v-model:open="showDeleteModal"
            title="Delete Goal?"
            description="Are you sure you want to delete this goal? This action cannot be undone."
            :ui="{ footer: 'justify-end' }"
          >
            <template #footer="{ close }">
              <UButton label="Cancel" variant="outline" color="neutral" @click="close" />
              <UButton label="Delete Goal" color="error" @click="confirmDelete" />
            </template>
          </UModal>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
  .suggestion-card-enter-active,
  .suggestion-card-leave-active {
    transition:
      opacity 0.28s ease,
      transform 0.28s ease;
  }

  .suggestion-card-enter-from,
  .suggestion-card-leave-to {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }

  .suggestion-card-move {
    transition: transform 0.28s ease;
  }
</style>
