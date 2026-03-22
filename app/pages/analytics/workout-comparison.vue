<script setup lang="ts">
  import {
    WORKOUT_COMPARISON_CATEGORIES,
    WORKOUT_COMPARISON_PRESETS,
    findWorkoutComparisonPresetById,
    type WorkoutComparisonCategory,
    type WorkoutComparisonPreset
  } from '~/utils/workout-comparison-presets'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Workout Comparison | Coach Watts',
    meta: [
      {
        name: 'description',
        content: 'Browse workout comparison charts, select sessions, and pin them to dashboards.'
      }
    ]
  })

  const comparisonStore = useWorkoutComparisonStore()
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const { data: dashboards, refresh: refreshDashboards } = await useFetch(
    '/api/analytics/dashboards'
  )

  const leftRailTab = ref<'workouts' | 'library'>('workouts')
  const workoutSearch = ref('')
  const librarySearch = ref('')
  const activeCategory = ref<'all' | WorkoutComparisonCategory>('all')
  const athleteFilter = ref('all')
  const workoutTypeFilter = ref('all')
  const workoutSourceFilter = ref('all')
  const startDateFilter = ref('')
  const endDateFilter = ref('')
  const showAdvanced = ref(false)
  const saving = ref(false)

  const summaryChartType = ref<'bar' | 'scatter' | 'line'>('bar')
  const sortMode = ref<'selected_order' | 'chronological' | 'metric_desc'>('selected_order')
  const primaryMetric = ref('trainingLoad')
  const secondaryMetric = ref('tss')
  const streamField = ref<'watts' | 'heartrate' | 'cadence' | 'velocity' | 'altitude' | 'grade'>(
    'watts'
  )
  const streamAlignment = ref<'elapsed_time' | 'distance' | 'percent_complete'>('elapsed_time')
  const intervalField = ref<'avgPower' | 'avgHr' | 'duration' | 'distance'>('avgPower')

  const metricOptions = [
    { label: 'Training Load', value: 'trainingLoad' },
    { label: 'TSS', value: 'tss' },
    { label: 'Duration', value: 'durationSec' },
    { label: 'Elapsed Time', value: 'elapsedTimeSec' },
    { label: 'Distance', value: 'distanceMeters' },
    { label: 'Average Power', value: 'averageWatts' },
    { label: 'Normalized Power', value: 'normalizedPower' },
    { label: 'Average HR', value: 'averageHr' },
    { label: 'Intensity', value: 'intensity' },
    { label: 'Calories', value: 'calories' },
    { label: 'Efficiency Factor', value: 'efficiencyFactor' },
    { label: 'Decoupling', value: 'decoupling' },
    { label: 'Power / HR Ratio', value: 'powerHrRatio' },
    { label: 'Kilojoules', value: 'kilojoules' },
    { label: 'TRIMP', value: 'trimp' },
    { label: 'HR Load', value: 'hrLoad' },
    { label: 'Work Above FTP', value: 'workAboveFtp' }
  ]

  const workoutMetricUnits: Record<string, string> = {
    trainingLoad: 'load',
    tss: 'tss',
    durationSec: 'duration',
    elapsedTimeSec: 'duration',
    distanceMeters: 'm',
    averageWatts: 'W',
    normalizedPower: 'W',
    averageHr: 'bpm',
    intensity: '',
    calories: 'kcal',
    efficiencyFactor: '',
    decoupling: '%',
    powerHrRatio: '',
    kilojoules: 'kJ',
    trimp: 'load',
    hrLoad: 'load',
    workAboveFtp: 'kJ'
  }

  const streamFieldUnits: Record<string, string> = {
    watts: 'W',
    heartrate: 'bpm',
    cadence: 'rpm',
    velocity: 'km/h',
    altitude: 'm',
    grade: '%'
  }

  const streamAlignmentUnits: Record<string, string> = {
    elapsed_time: 'duration',
    distance: 'm',
    percent_complete: '%'
  }

  const intervalFieldUnits: Record<string, string> = {
    avgPower: 'W',
    avgHr: 'bpm',
    duration: 'duration',
    distance: 'm'
  }

  const selectedPreset = ref<WorkoutComparisonPreset>(
    findWorkoutComparisonPresetById((route.query.preset as string) || '') ||
      WORKOUT_COMPARISON_PRESETS[0]!
  )

  function applyPreset(preset: WorkoutComparisonPreset) {
    selectedPreset.value = preset

    if (preset.mode === 'summary' && preset.summary) {
      summaryChartType.value = preset.summary.chartType
      sortMode.value = preset.summary.sortMode
      primaryMetric.value = preset.summary.primaryMetric
      secondaryMetric.value = preset.summary.secondaryMetric || preset.summary.primaryMetric
    }

    if (preset.mode === 'stream' && preset.stream) {
      streamField.value = preset.stream.field
      streamAlignment.value = preset.stream.alignment
    }

    if (preset.mode === 'interval' && preset.interval) {
      intervalField.value = preset.interval.field
    }
  }

  watch(
    () => route.query.ids,
    (value) => {
      if (typeof value !== 'string') return

      const ids = value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)

      if (ids.length >= 2) {
        comparisonStore.setWorkoutIds(ids)
      }
    },
    { immediate: true }
  )

  watch(
    () => route.query.mode,
    (value) => {
      if (typeof route.query.preset === 'string') return
      if (value !== 'summary' && value !== 'stream' && value !== 'interval') return

      const fallbackPreset =
        WORKOUT_COMPARISON_PRESETS.find((preset) => preset.mode === value) ||
        WORKOUT_COMPARISON_PRESETS[0]

      if (fallbackPreset) {
        applyPreset(fallbackPreset)
      }
    },
    { immediate: true }
  )

  watch(
    () => route.query.preset,
    (value) => {
      if (typeof value !== 'string') return
      const preset = findWorkoutComparisonPresetById(value)
      if (preset) {
        applyPreset(preset)
      }
    },
    { immediate: true }
  )

  const workoutIds = computed(() => comparisonStore.selectedWorkoutIds)

  watch(
    [selectedPreset, workoutIds],
    ([preset, ids]) => {
      const nextQuery = {
        ...route.query,
        preset: preset.id,
        mode: preset.mode,
        ids: ids.length > 0 ? ids.join(',') : undefined
      }

      const currentIds = typeof route.query.ids === 'string' ? route.query.ids : undefined
      if (
        route.query.preset === nextQuery.preset &&
        route.query.mode === nextQuery.mode &&
        currentIds === nextQuery.ids
      ) {
        return
      }

      router.replace({ query: nextQuery })
    },
    { deep: false }
  )

  const workoutBrowserBody = computed(() => ({
    search: workoutSearch.value || undefined,
    athleteIds: athleteFilter.value !== 'all' ? [athleteFilter.value] : undefined,
    type: workoutTypeFilter.value !== 'all' ? workoutTypeFilter.value : undefined,
    source: workoutSourceFilter.value !== 'all' ? workoutSourceFilter.value : undefined,
    startDate: startDateFilter.value || undefined,
    endDate: endDateFilter.value || undefined,
    limit: 80
  }))

  const { data: browserData, pending: loadingBrowser } = await useFetch(
    '/api/analytics/workout-comparison/browse',
    {
      method: 'POST',
      body: workoutBrowserBody,
      watch: [workoutBrowserBody]
    }
  )

  const { data: selectedWorkoutsData, pending: loadingSelectedWorkouts } = await useFetch(
    '/api/analytics/workout-comparison/workouts',
    {
      method: 'POST',
      body: computed(() => ({
        workoutIds: workoutIds.value
      })),
      immediate: workoutIds.value.length > 0,
      watch: [workoutIds]
    }
  )

  watch(
    selectedWorkoutsData,
    (workouts) => {
      if (!Array.isArray(workouts) || workouts.length === 0) return

      comparisonStore.replaceWorkouts(
        workouts.map((workout: any) => ({
          id: workout.id,
          title: workout.title,
          type: workout.type,
          date: workout.date,
          athleteName: workout.athleteName
        }))
      )
    },
    { immediate: true }
  )

  const athleteOptions = computed(() => {
    const athletes = (browserData.value as any)?.athletes || []

    return [
      { label: 'All athletes', value: 'all' },
      ...athletes.map((athlete: any) => ({
        label: athlete.name,
        value: athlete.id
      }))
    ]
  })

  const workoutTypeOptions = computed(() => {
    const workouts = ((browserData.value as any)?.workouts || []) as any[]
    const types = Array.from(new Set(workouts.map((workout) => workout.type).filter(Boolean)))

    return [
      { label: 'All workout types', value: 'all' },
      ...types.map((type) => ({
        label: type,
        value: type
      }))
    ]
  })

  const workoutSourceOptions = computed(() => {
    const workouts = ((browserData.value as any)?.workouts || []) as any[]
    const sources = Array.from(new Set(workouts.map((workout) => workout.source).filter(Boolean)))

    return [
      { label: 'All sources', value: 'all' },
      ...sources.map((source) => ({
        label: source,
        value: source
      }))
    ]
  })

  const browserWorkouts = computed(() => ((browserData.value as any)?.workouts || []) as any[])
  const selectedWorkouts = computed(() => comparisonStore.selectedWorkouts)

  const filteredPresets = computed(() => {
    const search = librarySearch.value.trim().toLowerCase()

    return WORKOUT_COMPARISON_PRESETS.filter((preset) => {
      const matchesCategory =
        activeCategory.value === 'all' || preset.category === activeCategory.value
      if (!matchesCategory) return false
      if (!search) return true

      return [preset.name, preset.description, preset.category, preset.mode].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(search)
      )
    })
  })

  const groupedPresets = computed(() =>
    WORKOUT_COMPARISON_CATEGORIES.map((category) => ({
      ...category,
      presets: filteredPresets.value.filter((preset) => preset.category === category.value)
    })).filter((category) => category.presets.length > 0)
  )

  const selectedCategoryLabel = computed(
    () =>
      WORKOUT_COMPARISON_CATEGORIES.find((entry) => entry.value === selectedPreset.value.category)
        ?.label || 'Comparison'
  )

  const selectedModeLabel = computed(() => {
    if (selectedPreset.value.mode === 'stream') return 'Streams'
    if (selectedPreset.value.mode === 'interval') return 'Intervals'
    return 'Summary'
  })

  const selectedWorkoutCountLabel = computed(() => {
    const count = workoutIds.value.length
    if (count === 0) return 'No workouts'
    if (count === 1) return '1 workout'
    return `${count} workouts`
  })

  const selectedWorkoutSourceLabel = computed(() => selectedPreset.value.sourceLabel)

  function isWorkoutSelected(workoutId: string) {
    return comparisonStore.isSelected(workoutId)
  }

  function toggleWorkout(workout: any) {
    comparisonStore.toggleWorkout({
      id: workout.id,
      title: workout.title,
      type: workout.type || null,
      date: workout.date || null,
      athleteName: workout.user?.name || workout.user?.email || 'Athlete'
    })
  }

  function resetWorkoutFilters() {
    athleteFilter.value = 'all'
    workoutTypeFilter.value = 'all'
    workoutSourceFilter.value = 'all'
    startDateFilter.value = ''
    endDateFilter.value = ''
    workoutSearch.value = ''
  }

  function formatDateLabel(date: string | Date | null | undefined) {
    if (!date) return ''
    return new Date(date).toLocaleDateString()
  }

  function formatDuration(seconds: number | null | undefined) {
    if (!seconds) return '—'
    if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)} h`
    return `${Math.round(seconds / 60)} min`
  }

  function formatDistance(meters: number | null | undefined) {
    if (!meters) return '—'
    return `${(meters / 1000).toFixed(1)} km`
  }

  function presetIcon(preset: WorkoutComparisonPreset) {
    if (preset.visualType === 'scatter') return 'i-lucide-chart-scatter'
    if (preset.mode === 'stream') return 'i-lucide-waveform'
    if (preset.mode === 'interval') return 'i-lucide-split'
    return preset.visualType === 'bar' ? 'i-lucide-bar-chart-3' : 'i-lucide-line-chart'
  }

  const summaryMetrics = computed(() => {
    if (selectedPreset.value.mode !== 'summary') return []

    if (summaryChartType.value === 'scatter') {
      return [
        { field: primaryMetric.value, aggregation: 'avg' as const },
        { field: secondaryMetric.value, aggregation: 'avg' as const }
      ]
    }

    if (secondaryMetric.value && secondaryMetric.value !== primaryMetric.value) {
      return [
        { field: primaryMetric.value, aggregation: 'avg' as const },
        { field: secondaryMetric.value, aggregation: 'avg' as const }
      ]
    }

    return [{ field: primaryMetric.value, aggregation: 'avg' as const }]
  })

  const previewConfig = computed(() => {
    const base = {
      name: selectedPreset.value.name,
      comparisonPresetId: selectedPreset.value.id,
      comparisonPresetCategory: selectedPreset.value.category,
      scope: { target: 'self' as const },
      timeRange: { type: 'rolling', value: '180d' },
      comparison: {
        type: 'workouts' as const,
        mode: selectedPreset.value.mode,
        workoutIds: workoutIds.value
      }
    }

    if (selectedPreset.value.mode === 'summary') {
      return {
        ...base,
        visualType: summaryChartType.value,
        source: 'workouts' as const,
        grouping: 'weekly' as const,
        xAxis: {
          type: 'entity_label' as const,
          sort: sortMode.value,
          sortMetricField: primaryMetric.value
        },
        units:
          summaryChartType.value === 'scatter'
            ? {
                x: workoutMetricUnits[primaryMetric.value] || '',
                y: workoutMetricUnits[secondaryMetric.value] || '',
                datasets: summaryMetrics.value.map(
                  (metric) => workoutMetricUnits[metric.field] || ''
                )
              }
            : {
                y: workoutMetricUnits[primaryMetric.value] || '',
                y1:
                  secondaryMetric.value && secondaryMetric.value !== primaryMetric.value
                    ? workoutMetricUnits[secondaryMetric.value] || ''
                    : '',
                datasets: summaryMetrics.value.map(
                  (metric) => workoutMetricUnits[metric.field] || ''
                )
              },
        metrics: summaryMetrics.value
      }
    }

    if (selectedPreset.value.mode === 'stream') {
      return {
        ...base,
        visualType: 'line',
        endpoint: '/api/analytics/workout-comparison/streams',
        comparison: {
          ...base.comparison,
          field: streamField.value,
          alignment: streamAlignment.value
        },
        units: {
          x: streamAlignmentUnits[streamAlignment.value] || '',
          y: streamFieldUnits[streamField.value] || '',
          datasets: [streamFieldUnits[streamField.value] || '']
        },
        metrics: []
      }
    }

    return {
      ...base,
      visualType: 'line',
      endpoint: '/api/analytics/workout-comparison/intervals',
      comparison: {
        ...base.comparison,
        field: intervalField.value,
        alignment: 'lap_index'
      },
      units: {
        y: intervalFieldUnits[intervalField.value] || '',
        datasets: [intervalFieldUnits[intervalField.value] || '']
      },
      metrics: []
    }
  })

  async function pinToDashboard() {
    if (workoutIds.value.length < 2) {
      toast.add({ title: 'Select at least two workouts to compare', color: 'warning' })
      leftRailTab.value = 'workouts'
      return
    }

    saving.value = true

    try {
      await refreshDashboards()

      let dashboard = dashboards.value?.[0] as any
      if (!dashboard) {
        dashboard = await $fetch('/api/analytics/dashboards', {
          method: 'POST',
          body: {
            name: 'Main Dashboard',
            layout: [],
            scope: { target: 'self' }
          }
        })
        await refreshDashboards()
      }

      const layout = [...((dashboard?.layout as any[]) || []).filter(Boolean)]
      layout.push({
        ...previewConfig.value,
        instanceId: crypto.randomUUID(),
        scopeMode: 'override',
        timeRangeMode: 'override'
      })

      await $fetch('/api/analytics/dashboards', {
        method: 'POST',
        body: {
          id: dashboard.id,
          name: dashboard.name,
          layout,
          scope: dashboard.scope || { target: 'self' }
        }
      })

      toast.add({ title: 'Comparison pinned to dashboard', color: 'success' })
    } catch (error) {
      console.error(error)
      toast.add({ title: 'Failed to pin comparison', color: 'error' })
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <UDashboardPanel id="analytics-workout-comparison">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #title>
          <CoachingNavbarLinks />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-arrow-left"
              size="sm"
              class="font-bold"
              to="/analytics"
            >
              Back to Analytics
            </UButton>
            <UButton
              color="primary"
              variant="solid"
              icon="i-lucide-pin"
              size="sm"
              class="font-bold"
              :loading="saving"
              :disabled="workoutIds.length < 2"
              @click="pinToDashboard"
            >
              Pin to Dashboard
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full min-h-0 overflow-hidden">
        <aside class="w-[25rem] shrink-0 border-r border-default bg-default/80">
          <div class="flex h-full flex-col gap-4 p-4">
            <div
              class="inline-flex w-full items-center rounded-2xl border border-default bg-muted/20 p-1"
            >
              <UButton
                size="sm"
                :color="leftRailTab === 'workouts' ? 'primary' : 'neutral'"
                :variant="leftRailTab === 'workouts' ? 'soft' : 'ghost'"
                class="flex-1"
                @click="leftRailTab = 'workouts'"
              >
                Workouts
              </UButton>
              <UButton
                size="sm"
                :color="leftRailTab === 'library' ? 'primary' : 'neutral'"
                :variant="leftRailTab === 'library' ? 'soft' : 'ghost'"
                class="flex-1"
                @click="leftRailTab = 'library'"
              >
                Library
              </UButton>
            </div>

            <div v-if="leftRailTab === 'workouts'" class="flex min-h-0 flex-1 flex-col gap-4">
              <div class="space-y-1">
                <div class="text-[11px] font-black uppercase tracking-[0.24em] text-muted">
                  Selected workouts
                </div>
                <p class="text-sm text-muted">
                  Choose at least two sessions to unlock summary, stream, and interval comparisons.
                </p>
              </div>

              <div class="space-y-2">
                <div v-if="loadingSelectedWorkouts && workoutIds.length > 0" class="space-y-2">
                  <USkeleton v-for="i in 2" :key="i" class="h-16 rounded-2xl" />
                </div>

                <div
                  v-else-if="selectedWorkouts.length === 0"
                  class="rounded-2xl border border-dashed border-default/70 bg-default p-4 text-sm text-muted"
                >
                  Build a basket from the workout browser below, or keep using the compare dock from
                  activities and coaching.
                </div>

                <div v-else class="space-y-2">
                  <div
                    v-for="workout in selectedWorkouts"
                    :key="workout.id"
                    class="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="truncate font-bold text-highlighted">{{ workout.title }}</div>
                      <div class="truncate text-xs text-muted">
                        {{ workout.athleteName || 'Athlete' }} · {{ formatDateLabel(workout.date) }}
                      </div>
                    </div>
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-x"
                      @click="comparisonStore.removeWorkout(workout.id)"
                    />
                  </div>
                </div>
              </div>

              <div class="space-y-3 border-t border-default/70 pt-4">
                <div class="space-y-2">
                  <div class="text-[11px] font-black uppercase tracking-[0.24em] text-muted">
                    Workout browser
                  </div>
                  <UInput
                    v-model="workoutSearch"
                    icon="i-heroicons-magnifying-glass"
                    placeholder="Search workouts, athletes, or session types"
                    size="sm"
                  />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <USelectMenu
                    v-model="athleteFilter"
                    value-key="value"
                    :items="athleteOptions"
                    size="sm"
                    class="w-full"
                  />
                  <USelectMenu
                    v-model="workoutTypeFilter"
                    value-key="value"
                    :items="workoutTypeOptions"
                    size="sm"
                    class="w-full"
                  />
                  <USelectMenu
                    v-model="workoutSourceFilter"
                    value-key="value"
                    :items="workoutSourceOptions"
                    size="sm"
                    class="w-full"
                  />
                  <UButton
                    color="neutral"
                    variant="outline"
                    size="sm"
                    class="font-bold"
                    @click="resetWorkoutFilters"
                  >
                    Reset
                  </UButton>
                  <UInput v-model="startDateFilter" type="date" size="sm" class="w-full" />
                  <UInput v-model="endDateFilter" type="date" size="sm" class="w-full" />
                </div>
              </div>

              <div class="min-h-0 flex-1 overflow-y-auto pr-1">
                <div v-if="loadingBrowser" class="space-y-2">
                  <USkeleton v-for="i in 4" :key="i" class="h-20 rounded-2xl" />
                </div>

                <div
                  v-else-if="browserWorkouts.length === 0"
                  class="rounded-2xl border border-dashed border-default/70 bg-default p-4 text-sm text-muted"
                >
                  No workouts match the current filters.
                </div>

                <div v-else class="space-y-2">
                  <button
                    v-for="workout in browserWorkouts"
                    :key="workout.id"
                    type="button"
                    class="w-full rounded-2xl border p-3 text-left transition"
                    :class="
                      isWorkoutSelected(workout.id)
                        ? 'border-primary bg-primary/8 shadow-sm'
                        : 'border-default bg-default hover:border-primary/40 hover:bg-muted/20'
                    "
                    @click="toggleWorkout(workout)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <div class="truncate font-bold text-highlighted">{{ workout.title }}</div>
                        <div class="mt-1 truncate text-xs text-muted">
                          {{ workout.user?.name || workout.user?.email || 'Athlete' }} ·
                          {{ formatDateLabel(workout.date) }}
                        </div>
                        <div class="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                          <span>{{ workout.type || 'Workout' }}</span>
                          <span>{{ formatDuration(workout.durationSec) }}</span>
                          <span>{{ formatDistance(workout.distanceMeters) }}</span>
                          <span v-if="workout.trainingLoad"
                            >{{ Math.round(workout.trainingLoad) }} load</span
                          >
                        </div>
                      </div>
                      <UBadge
                        :color="isWorkoutSelected(workout.id) ? 'primary' : 'neutral'"
                        :variant="isWorkoutSelected(workout.id) ? 'soft' : 'outline'"
                        size="sm"
                      >
                        {{ isWorkoutSelected(workout.id) ? 'Selected' : 'Add' }}
                      </UBadge>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="flex min-h-0 flex-1 flex-col gap-4">
              <div class="space-y-2">
                <div class="text-[11px] font-black uppercase tracking-[0.24em] text-muted">
                  Workout comparison library
                </div>
                <UInput
                  v-model="librarySearch"
                  icon="i-heroicons-magnifying-glass"
                  placeholder="Search workout comparison charts"
                  size="sm"
                />
              </div>

              <div class="flex flex-wrap gap-2">
                <UButton
                  size="xs"
                  :color="activeCategory === 'all' ? 'primary' : 'neutral'"
                  :variant="activeCategory === 'all' ? 'soft' : 'outline'"
                  @click="activeCategory = 'all'"
                >
                  All
                </UButton>
                <UButton
                  v-for="category in WORKOUT_COMPARISON_CATEGORIES"
                  :key="category.value"
                  size="xs"
                  :color="activeCategory === category.value ? 'primary' : 'neutral'"
                  :variant="activeCategory === category.value ? 'soft' : 'outline'"
                  @click="activeCategory = category.value"
                >
                  {{ category.label }}
                </UButton>
              </div>

              <div class="min-h-0 flex-1 overflow-y-auto pr-1">
                <div
                  v-if="groupedPresets.length === 0"
                  class="rounded-2xl border border-dashed border-default/70 bg-default p-4 text-sm text-muted"
                >
                  No workout comparison presets match the current search.
                </div>

                <div v-else class="space-y-5">
                  <div v-for="group in groupedPresets" :key="group.value" class="space-y-2">
                    <div class="text-[11px] font-black uppercase tracking-[0.24em] text-muted">
                      {{ group.label }}
                    </div>

                    <button
                      v-for="preset in group.presets"
                      :key="preset.id"
                      type="button"
                      class="w-full rounded-2xl border p-4 text-left transition"
                      :class="
                        selectedPreset.id === preset.id
                          ? 'border-primary bg-primary/8 shadow-sm'
                          : 'border-default bg-default hover:border-primary/40 hover:bg-muted/20'
                      "
                      @click="
                        () => {
                          leftRailTab = 'library'
                          applyPreset(preset)
                        }
                      "
                    >
                      <div class="flex items-start gap-3">
                        <div class="rounded-xl border border-default bg-muted/30 p-2">
                          <UIcon :name="presetIcon(preset)" class="h-5 w-5 text-primary" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <div class="font-bold text-highlighted">{{ preset.name }}</div>
                            <UBadge v-if="preset.flagship" color="primary" variant="soft" size="xs">
                              Flagship
                            </UBadge>
                            <UBadge color="neutral" variant="outline" size="xs">
                              {{ preset.visualType }}
                            </UBadge>
                          </div>
                          <p class="mt-1 text-sm text-muted">{{ preset.description }}</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section class="min-h-0 flex-1 overflow-y-auto bg-default/30">
          <div class="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6">
            <div class="rounded-3xl border border-default bg-default p-6 shadow-sm">
              <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div class="space-y-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <h1 class="text-3xl font-black tracking-tight text-highlighted">
                      {{ selectedPreset.name }}
                    </h1>
                    <UBadge v-if="selectedPreset.flagship" color="primary" variant="soft">
                      Flagship
                    </UBadge>
                    <UBadge color="neutral" variant="outline">
                      {{ selectedCategoryLabel }}
                    </UBadge>
                    <UBadge color="neutral" variant="outline">
                      {{ selectedPreset.visualType }}
                    </UBadge>
                  </div>
                  <p class="max-w-3xl text-sm leading-6 text-muted">
                    {{ selectedPreset.description }}
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  <UButton
                    color="neutral"
                    variant="outline"
                    size="sm"
                    icon="i-lucide-list-filter"
                    @click="showAdvanced = !showAdvanced"
                  >
                    {{ showAdvanced ? 'Hide Advanced' : 'Advanced' }}
                  </UButton>
                  <UButton
                    color="primary"
                    variant="solid"
                    size="sm"
                    icon="i-lucide-pin"
                    :disabled="workoutIds.length < 2"
                    :loading="saving"
                    @click="pinToDashboard"
                  >
                    Pin to Dashboard
                  </UButton>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                <div class="rounded-full border border-default bg-muted/20 px-3 py-1.5">
                  Mode:
                  <span class="font-semibold text-highlighted">{{ selectedModeLabel }}</span>
                </div>
                <div class="rounded-full border border-default bg-muted/20 px-3 py-1.5">
                  Viewing:
                  <span class="font-semibold text-highlighted">{{
                    selectedWorkoutCountLabel
                  }}</span>
                </div>
                <div class="rounded-full border border-default bg-muted/20 px-3 py-1.5">
                  Category:
                  <span class="font-semibold text-highlighted">{{ selectedCategoryLabel }}</span>
                </div>
                <div class="rounded-full border border-default bg-muted/20 px-3 py-1.5">
                  Source:
                  <span class="font-semibold text-highlighted">{{
                    selectedWorkoutSourceLabel
                  }}</span>
                </div>
              </div>

              <div
                v-if="showAdvanced"
                class="mt-5 rounded-2xl border border-default bg-muted/15 p-4"
              >
                <div class="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-muted">
                  Advanced
                </div>

                <div
                  v-if="selectedPreset.mode === 'summary'"
                  class="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                  <UFormField label="Chart type">
                    <USelectMenu
                      v-model="summaryChartType"
                      value-key="value"
                      :items="[
                        { label: 'Bar', value: 'bar' },
                        { label: 'Scatter', value: 'scatter' },
                        { label: 'Line', value: 'line' }
                      ]"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Sort order">
                    <USelectMenu
                      v-model="sortMode"
                      value-key="value"
                      :items="[
                        { label: 'Selected order', value: 'selected_order' },
                        { label: 'Chronological', value: 'chronological' },
                        { label: 'Primary metric', value: 'metric_desc' }
                      ]"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Primary metric">
                    <USelectMenu
                      v-model="primaryMetric"
                      value-key="value"
                      :items="metricOptions"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Secondary metric">
                    <USelectMenu
                      v-model="secondaryMetric"
                      value-key="value"
                      :items="metricOptions"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <div v-else-if="selectedPreset.mode === 'stream'" class="grid gap-4 md:grid-cols-2">
                  <UFormField label="Stream field">
                    <USelectMenu
                      v-model="streamField"
                      value-key="value"
                      :items="[
                        { label: 'Power', value: 'watts' },
                        { label: 'Heart rate', value: 'heartrate' },
                        { label: 'Cadence', value: 'cadence' },
                        { label: 'Speed', value: 'velocity' },
                        { label: 'Altitude', value: 'altitude' },
                        { label: 'Grade', value: 'grade' }
                      ]"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Alignment">
                    <USelectMenu
                      v-model="streamAlignment"
                      value-key="value"
                      :items="[
                        { label: 'Elapsed time', value: 'elapsed_time' },
                        { label: 'Distance', value: 'distance' },
                        { label: 'Percent complete', value: 'percent_complete' }
                      ]"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <div v-else class="grid gap-4 md:grid-cols-2">
                  <UFormField label="Interval metric">
                    <USelectMenu
                      v-model="intervalField"
                      value-key="value"
                      :items="[
                        { label: 'Average power', value: 'avgPower' },
                        { label: 'Average heart rate', value: 'avgHr' },
                        { label: 'Duration', value: 'duration' },
                        { label: 'Distance', value: 'distance' }
                      ]"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>
            </div>

            <div class="rounded-3xl border border-default bg-default p-4 shadow-sm">
              <div
                v-if="workoutIds.length < 2"
                class="flex h-[28rem] items-center justify-center rounded-2xl border border-dashed border-default/70 bg-muted/10 p-8 text-center"
              >
                <div class="max-w-md space-y-3">
                  <div
                    class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/30"
                  >
                    <UIcon name="i-lucide-git-compare-arrows" class="h-8 w-8 text-muted" />
                  </div>
                  <h2 class="text-xl font-black tracking-tight text-highlighted">
                    Select at least two workouts
                  </h2>
                  <p class="text-sm leading-6 text-muted">
                    Use the Workouts tab to build your basket, then preview a curated comparison
                    chart from the library or tune the advanced settings.
                  </p>
                </div>
              </div>

              <div v-else class="h-[28rem]">
                <AnalyticsBaseWidget :config="previewConfig" />
              </div>
            </div>

            <div class="rounded-3xl border border-default bg-default p-6 shadow-sm">
              <div class="text-[11px] font-black uppercase tracking-[0.24em] text-muted">
                Why use this chart
              </div>
              <p class="mt-3 max-w-3xl text-sm leading-7 text-muted">
                {{ selectedPreset.insightCopy }}
              </p>
            </div>
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>

  <ClientOnly>
    <WorkoutsWorkoutComparisonDock />
  </ClientOnly>
</template>
