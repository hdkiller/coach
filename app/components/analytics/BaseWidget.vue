<script setup lang="ts">
  import { useAnalyticsOverlays } from '~/composables/useAnalyticsOverlays'
  import type { AnalyticsOverlayOption, AnalyticsOverlayType } from '~/utils/analytics-presets'
  import type { WellnessOverlayEvent } from '~/utils/wellness-events'
  import ChartRenderer from './ChartRenderer.vue'
  import HeatmapGrid from './HeatmapGrid.vue'
  import MapRenderer from './MapRenderer.vue'
  import DensityHeatmap from './DensityHeatmap.vue'

  interface WidgetDataset {
    label: string
    data: any[]
    color?: string
    backgroundColor?: string
    borderColor?: string
    type?: 'line' | 'bar'
    yAxisID?: string
    showLine?: boolean
    pointRadius?: number
    fill?: boolean | string
    tension?: number
    borderDash?: number[]
    overlayMeta?: Record<string, any>
  }

  interface HeatmapPoint {
    x: string
    y: string
    value: number | null
  }

  interface HeatmapPayload {
    chartType: 'heatmap'
    xLabels: string[]
    yLabels: string[]
    matrix: HeatmapPoint[]
    valueLabel?: string
  }

  interface OverlayAnnotation {
    type: 'line'
    scaleID: 'x' | 'y' | 'y1'
    value: number
    label: string
    borderColor?: string
    borderDash?: number[]
  }

  interface ChartResponsePayload {
    labels?: string[]
    datasets?: WidgetDataset[]
    chartType?: 'heatmap'
    xLabels?: string[]
    yLabels?: string[]
    matrix?: HeatmapPoint[]
    valueLabel?: string
    annotations?: OverlayAnnotation[]
    unsupportedReason?: string
  }

  const props = defineProps<{
    config: any
  }>()

  const { rollingAverage, computeBand, calculateRegression, averageSeries, calculateDelta } =
    useAnalyticsOverlays()
  const theme = useTheme()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const chartData = ref<any>(null)
  const lastFetchedConfig = ref<string | null>(null)
  const wellnessEvents = ref<WellnessOverlayEvent[]>([])
  const activeRequestId = ref(0)

  const chartColors = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316'
  ]

  const metricUnits: Record<string, string> = {
    durationSec: 'duration',
    elapsedTimeSec: 'duration',
    tss: 'tss',
    trainingLoad: 'load',
    averageWatts: 'W',
    normalizedPower: 'W',
    averageHr: 'bpm',
    distanceMeters: 'm',
    intensity: '',
    calories: 'kcal',
    efficiencyFactor: '',
    decoupling: '%',
    powerHrRatio: '',
    kilojoules: 'kJ',
    trimp: 'load',
    hrLoad: 'load',
    workAboveFtp: 'kJ',
    caloriesGoal: 'kcal',
    protein: 'g',
    proteinGoal: 'g',
    carbs: 'g',
    carbsGoal: 'g',
    fat: 'g',
    fatGoal: 'g',
    fiber: 'g',
    sugar: 'g',
    waterMl: 'ml',
    overallScore: 'score',
    macroBalanceScore: 'score',
    qualityScore: 'score',
    adherenceScore: 'score',
    hydrationScore: 'score',
    startingGlycogenPercentage: '%',
    endingGlycogenPercentage: '%',
    startingFluidDeficit: 'L',
    endingFluidDeficit: 'L',
    hrv: 'ms',
    restingHr: 'bpm',
    sleepHours: 'h',
    sleepScore: '%',
    recoveryScore: '%',
    weight: 'kg',
    ctl: 'load',
    atl: 'load',
    tsb: 'load'
  }

  const visualType = computed(() => props.config.visualType || props.config.type || 'line')
  const isHeatmap = computed(() => visualType.value === 'heatmap')
  const isDensityHeatmap = computed(() => visualType.value === 'density-heatmap')
  const isMap = computed(() => visualType.value === 'map' || visualType.value === 'map-heatmap')

  const overlayDefinitions = computed<AnalyticsOverlayOption[]>(
    () => props.config.availableOverlays || []
  )

  const activeOverlayIds = computed<string[]>(() => {
    const configured = Array.isArray(props.config.overlaySettings?.active)
      ? props.config.overlaySettings.active
      : null

    if (configured) return configured
    return props.config.defaultOverlays || []
  })

  const activeOverlays = computed(() =>
    overlayDefinitions.value.filter((overlay) => activeOverlayIds.value.includes(overlay.id))
  )

  const axisUnits = computed(() => {
    const primaryMetricUnit = props.config.metrics?.[0]?.field
      ? metricUnits[props.config.metrics[0].field] || ''
      : ''
    const secondaryMetricUnit = props.config.metrics?.[1]?.field
      ? metricUnits[props.config.metrics[1].field] || ''
      : ''

    return {
      x: props.config.units?.x || '',
      y: props.config.units?.y || primaryMetricUnit || '',
      y1: props.config.units?.y1 || secondaryMetricUnit || ''
    }
  })

  function resolveDatasetUnit(index: number) {
    if (props.config.units?.datasets?.[index]) return props.config.units.datasets[index]

    const metricField = props.config.metrics?.[index]?.field
    if (metricField) return metricUnits[metricField] || ''

    return ''
  }

  function resolveTimeRange() {
    let startDate = props.config.timeRange?.startDate
    let endDate = props.config.timeRange?.endDate

    if (props.config.timeRange?.type === 'rolling') {
      const days = parseInt(props.config.timeRange.value || '30', 10)
      const now = new Date()
      const start = new Date()
      start.setDate(now.getDate() - days)
      startDate = start.toISOString()
      endDate = now.toISOString()
    } else if (props.config.timeRange?.type === 'ytd') {
      const now = new Date()
      startDate = new Date(now.getFullYear(), 0, 1).toISOString()
      endDate = now.toISOString()
    }

    return { startDate, endDate }
  }

  function resolveOverlayTypeIds(type: AnalyticsOverlayType) {
    return activeOverlays.value.filter((overlay) => overlay.type === type)
  }

  function resolvePreviousTimeRange(current: { startDate?: string; endDate?: string }) {
    if (!current.startDate || !current.endDate) return null

    const start = new Date(current.startDate)
    const end = new Date(current.endDate)
    const span = end.getTime() - start.getTime()
    const previousEnd = new Date(start.getTime() - 1)
    const previousStart = new Date(previousEnd.getTime() - span)

    return {
      startDate: previousStart.toISOString(),
      endDate: previousEnd.toISOString()
    }
  }

  function normalizeNumericSeries(data: any[]) {
    return data.map((value) => {
      if (value === null || value === undefined || value === '') return null
      const number = Number(value)
      return Number.isNaN(number) ? null : number
    })
  }

  function isOverlayDataset(dataset: any) {
    return Boolean(dataset?.overlayMeta)
  }

  function getDateRangeDays(timeRange: { startDate?: string; endDate?: string }) {
    if (!timeRange.startDate || !timeRange.endDate) return 30
    const start = new Date(timeRange.startDate)
    const end = new Date(timeRange.endDate)
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
  }

  async function fetchWellnessEventOverlays(timeRange: { startDate?: string; endDate?: string }) {
    if (!resolveOverlayTypeIds('wellnessEvents').length) {
      wellnessEvents.value = []
      return
    }

    if (props.config.source !== 'wellness' || props.config.scope?.target !== 'self') {
      wellnessEvents.value = []
      return
    }

    const days = getDateRangeDays(timeRange)

    try {
      wellnessEvents.value = await $fetch('/api/wellness/events', {
        query: { days }
      })
    } catch {
      wellnessEvents.value = []
    }
  }

  function buildAnnotations(
    response: ChartResponsePayload & { lapAnnotations?: Record<string, any> }
  ) {
    const overlays = activeOverlays.value.filter(
      (overlay) => overlay.type === 'targetLine' || overlay.type === 'thresholdLine'
    )

    const annotationEntries: Record<string, any> = {}

    // Merge lap-band box annotations from stream API
    if (response.lapAnnotations) {
      Object.assign(annotationEntries, response.lapAnnotations)
    }

    response.annotations?.forEach((annotation, index) => {
      annotationEntries[`response-${index}`] = {
        type: 'line',
        scaleID: annotation.scaleID,
        value: annotation.value,
        borderColor: annotation.borderColor || '#94a3b8',
        borderDash: annotation.borderDash || [6, 6],
        borderWidth: 1.5,
        label: {
          display: true,
          content: annotation.label,
          color: '#cbd5e1',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          position: 'end'
        }
      }
    })

    overlays.forEach((overlay) => {
      if (overlay.value === undefined) return
      annotationEntries[overlay.id] = {
        type: 'line',
        scaleID: overlay.axis || 'y',
        value: overlay.value,
        borderColor: overlay.color || '#10b981',
        borderDash: [6, 6],
        borderWidth: 1.5,
        label: {
          display: true,
          content: overlay.label,
          color: '#cbd5e1',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          position: 'end'
        }
      }
    })

    return annotationEntries
  }

  function withOpacity(color: string | undefined | null, opacityHex: string) {
    if (!color) return 'transparent'
    if (color.startsWith('#')) return `${color}${opacityHex}`
    return color
  }

  function normalizeDataset(ds: WidgetDataset, index: number, labelsLength: number) {
    const datasetType =
      visualType.value === 'radar'
        ? undefined
        : ds.type ||
          props.config.styling?.datasetTypes?.[index] ||
          (visualType.value === 'combo'
            ? index === 0
              ? 'bar'
              : 'line'
            : props.config.type || 'line')
    const color = ds.color || ds.borderColor || chartColors[index % chartColors.length]
    const isBarDataset = datasetType === 'bar'
    const settings = props.config.settings || {}
    const baseOpacity = Math.round(Math.max(0, Math.min(1, settings.opacity ?? 0.5)) * 255)
      .toString(16)
      .padStart(2, '0')

    // Preserve array colors (e.g. zone-colored bars) — don't override with a single value
    const hasArrayColors = Array.isArray(ds.borderColor) || Array.isArray(ds.backgroundColor)

    return {
      ...ds,
      type: datasetType,
      unit: ds.overlayMeta?.unit || resolveDatasetUnit(index),
      borderColor: hasArrayColors ? ds.borderColor : color,
      backgroundColor: hasArrayColors
        ? ds.backgroundColor
        : ds.backgroundColor ||
          (isBarDataset
            ? withOpacity(color, baseOpacity)
            : visualType.value === 'scatter'
              ? color
              : 'transparent'),
      borderWidth: 2,
      borderDash: ds.borderDash,
      tension: ds.tension ?? (settings.smooth === false ? 0 : datasetType === 'line' ? 0.35 : 0),
      fill: ds.fill ?? false,
      yAxisID: ds.yAxisID || (visualType.value === 'combo' && datasetType === 'line' ? 'y1' : 'y'),
      pointRadius:
        ds.pointRadius ??
        (settings.showPoints ? 3 : visualType.value === 'scatter' ? 4 : labelsLength > 50 ? 0 : 3),
      pointHoverRadius: visualType.value === 'scatter' ? 5 : 4,
      spanGaps: true,
      overlayMeta: ds.overlayMeta
    }
  }

  function enhanceDatasets(
    response: ChartResponsePayload,
    normalizedDatasets: any[],
    previousResponse?: ChartResponsePayload | null
  ) {
    const settings = props.config.settings || {}
    const extraDatasets: any[] = []
    const annotations = buildAnnotations(response)
    const primaryDatasets = normalizedDatasets.filter((dataset) => !isOverlayDataset(dataset))

    const baseline = activeOverlays.value.find((overlay) => overlay.type === 'baselineBand')
    if (baseline && primaryDatasets[0]?.data?.length && visualType.value !== 'scatter') {
      const band = computeBand(
        normalizeNumericSeries(primaryDatasets[0].data),
        baseline.window || 7
      )

      extraDatasets.push(
        normalizeDataset(
          {
            label: `${primaryDatasets[0].label} Range Upper`,
            data: band.upper,
            color: 'rgba(148, 163, 184, 0)',
            backgroundColor: theme.isDark.value
              ? 'rgba(148, 163, 184, 0.06)'
              : 'rgba(15, 23, 42, 0.05)',
            pointRadius: 0,
            overlayMeta: {
              hiddenFromLegend: true,
              hiddenFromTooltip: true,
              unit: primaryDatasets[0].unit
            },
            fill: false
          } as any,
          normalizedDatasets.length,
          response.labels?.length || 0
        ),
        normalizeDataset(
          {
            label: 'Baseline Band',
            data: band.lower,
            color: 'rgba(148, 163, 184, 0)',
            backgroundColor: theme.isDark.value
              ? 'rgba(148, 163, 184, 0.06)'
              : 'rgba(15, 23, 42, 0.05)',
            pointRadius: 0,
            overlayMeta: {
              hiddenFromLegend: true,
              hiddenFromTooltip: true,
              unit: primaryDatasets[0].unit
            },
            fill: '-1'
          } as any,
          normalizedDatasets.length + 1,
          response.labels?.length || 0
        )
      )
    }

    resolveOverlayTypeIds('rollingAverage').forEach((overlay, overlayIndex) => {
      const overlayTargets =
        primaryDatasets.length > 2 && props.config.scope?.target === 'athletes'
          ? primaryDatasets.slice(0, 1)
          : primaryDatasets

      overlayTargets.forEach((dataset, datasetIndex) => {
        const averaged = rollingAverage(normalizeNumericSeries(dataset.data), overlay.window || 7)
        extraDatasets.push(
          normalizeDataset(
            {
              label: `${dataset.label} · ${overlay.label}`,
              data: averaged,
              color: chartColors[(overlayIndex + datasetIndex + 4) % chartColors.length],
              type: 'line',
              pointRadius: 0,
              overlayMeta: { unit: dataset.unit }
            } as any,
            normalizedDatasets.length + extraDatasets.length,
            response.labels?.length || 0
          )
        )
      })
    })

    if (resolveOverlayTypeIds('previousPeriod').length && previousResponse?.datasets?.length) {
      previousResponse.datasets.forEach((dataset, index) => {
        extraDatasets.push(
          normalizeDataset(
            {
              ...dataset,
              label: `${dataset.label} · Prior`,
              type: 'line',
              pointRadius: 0,
              color: '#94a3b8',
              borderColor: '#94a3b8',
              borderDash: [6, 6],
              backgroundColor: 'transparent',
              overlayMeta: { unit: resolveDatasetUnit(index) }
            } as any,
            normalizedDatasets.length + extraDatasets.length + index,
            response.labels?.length || 0
          )
        )
      })
    }

    if (resolveOverlayTypeIds('squadAverage').length && props.config.scope?.target === 'athletes') {
      const eligibleDatasets = primaryDatasets.filter(
        (dataset) =>
          Array.isArray(dataset.data) &&
          dataset.data.some((value: any) => value !== null && value !== 0)
      )

      if (eligibleDatasets.length > 1) {
        const average = averageSeries(
          eligibleDatasets.map((dataset) => normalizeNumericSeries(dataset.data))
        )
        extraDatasets.push(
          normalizeDataset(
            {
              label: 'Squad Average',
              data: average,
              type: 'line',
              pointRadius: 0,
              color: '#f59e0b',
              borderColor: '#f59e0b',
              backgroundColor: 'transparent',
              overlayMeta: { unit: primaryDatasets[0]?.unit }
            } as any,
            normalizedDatasets.length + extraDatasets.length,
            response.labels?.length || 0
          )
        )
      }
    }

    if (settings.showDelta && primaryDatasets.length >= 2) {
      const delta = calculateDelta(
        normalizeNumericSeries(primaryDatasets[0].data),
        normalizeNumericSeries(primaryDatasets[1].data)
      )
      extraDatasets.push(
        normalizeDataset(
          {
            label: 'Difference (A-B)',
            data: delta,
            type: 'bar',
            backgroundColor: 'rgba(148, 163, 184, 0.4)',
            borderColor: '#94a3b8',
            borderWidth: 1,
            overlayMeta: { isDelta: true, unit: primaryDatasets[0]?.unit }
          } as any,
          normalizedDatasets.length + extraDatasets.length,
          response.labels?.length || 0
        )
      )
    }

    if (visualType.value === 'scatter') {
      const shouldShowRegression =
        settings.showRegression || resolveOverlayTypeIds('regressionLine').length > 0

      if (shouldShowRegression) {
        primaryDatasets.forEach((dataset) => {
          const regression = calculateRegression(
            (dataset.data || []).filter(
              (point: any) => point?.x !== undefined && point?.y !== undefined
            )
          )
          if (!regression.length) return

          extraDatasets.push(
            normalizeDataset(
              {
                label: `${dataset.label} Trendline`,
                data: regression,
                type: 'line',
                pointRadius: 0,
                showLine: true,
                color: dataset.borderColor || dataset.color || '#94a3b8',
                borderColor: dataset.borderColor || dataset.color || '#94a3b8',
                borderDash: [6, 6],
                backgroundColor: 'transparent',
                overlayMeta: { isRegression: true }
              } as any,
              normalizedDatasets.length + extraDatasets.length,
              response.labels?.length || 0
            )
          )
        })
      }
    } else if (settings.showRegression) {
      primaryDatasets.forEach((dataset) => {
        const points = normalizeNumericSeries(dataset.data)
          .map((y, x) => ({ x, y }))
          .filter((point): point is { x: number; y: number } => point.y !== null)
        const regression = calculateRegression(points)
        if (!regression.length) return

        extraDatasets.push(
          normalizeDataset(
            {
              label: `${dataset.label} Trend`,
              data: labelsFromRegression(response.labels || [], regression),
              type: 'line',
              pointRadius: 0,
              borderColor: dataset.borderColor,
              borderDash: [6, 6],
              backgroundColor: 'transparent',
              overlayMeta: { isRegression: true, unit: dataset.unit }
            } as any,
            normalizedDatasets.length + extraDatasets.length,
            response.labels?.length || 0
          )
        )
      })
    }

    return {
      datasets: [...normalizedDatasets, ...extraDatasets],
      annotations
    }
  }

  function labelsFromRegression(labels: string[], regression: Array<{ x: number; y: number }>) {
    return labels.map((_, index) => regression.find((point) => point.x === index)?.y ?? null)
  }

  async function fetchChartResponse(
    endpoint: string,
    requestConfig: Record<string, any>,
    timeRange: { startDate?: string; endDate?: string }
  ) {
    return await $fetch<ChartResponsePayload>(endpoint, {
      method: 'POST',
      body: {
        ...requestConfig,
        timeRange,
        overlaySettings: props.config.overlaySettings
      }
    })
  }

  async function fetchData() {
    const currentConfigStr = JSON.stringify({ ...props.config, instanceId: undefined })
    if (lastFetchedConfig.value === currentConfigStr) return

    const requestId = activeRequestId.value + 1
    activeRequestId.value = requestId
    loading.value = true
    error.value = null

    // Determine if this is a "refinement" of existing data (same workout & preset)
    const isRefinement =
      chartData.value &&
      lastFetchedConfig.value &&
      (() => {
        try {
          const prev = JSON.parse(lastFetchedConfig.value)
          return (
            prev.analysis?.workoutId === props.config.analysis?.workoutId &&
            prev.explorerPresetId === props.config.explorerPresetId &&
            prev.visualType === props.config.visualType
          )
        } catch {
          return false
        }
      })()

    // If not a refinement, clear existing data to prevent visual mismatch
    if (!isRefinement) {
      chartData.value = null
    }

    if (import.meta.dev) {
      console.debug('[Analytics/BaseWidget] fetch:start', {
        requestId,
        name: props.config?.name,
        endpoint: props.config?.endpoint || '/api/analytics/query',
        visualType: visualType.value,
        workoutId: props.config.analysis?.workoutId,
        presetId: props.config.explorerPresetId,
        isRefinement
      })
    }

    try {
      const endpoint = props.config.endpoint || '/api/analytics/query'
      const timeRange = resolveTimeRange()
      const { _meta, instanceId, ...requestConfig } = props.config
      const response = await fetchChartResponse(endpoint, requestConfig, timeRange)
      if (requestId !== activeRequestId.value) return

      const previousRange = resolveOverlayTypeIds('previousPeriod').length
        ? resolvePreviousTimeRange(timeRange)
        : null
      const previousResponse =
        previousRange && !isHeatmap.value
          ? await fetchChartResponse(endpoint, requestConfig, previousRange)
          : null
      if (requestId !== activeRequestId.value) return

      await fetchWellnessEventOverlays(timeRange)
      if (requestId !== activeRequestId.value) return

      if ((!response?.datasets || response.datasets.length === 0) && response?.unsupportedReason) {
        if (import.meta.dev) {
          console.warn('[Analytics/BaseWidget] fetch:unsupported', {
            requestId,
            name: props.config?.name,
            endpoint,
            reason: response.unsupportedReason,
            workoutId: props.config?.analysis?.workoutId,
            presetId: props.config?.explorerPresetId
          })
        }
        error.value = response.unsupportedReason
        chartData.value = null
        lastFetchedConfig.value = currentConfigStr
        return
      }

      if (response?.chartType === 'heatmap') {
        chartData.value = response as HeatmapPayload
        lastFetchedConfig.value = currentConfigStr
        if (import.meta.dev) {
          console.debug('[Analytics/BaseWidget] fetch:success', {
            requestId,
            name: props.config?.name,
            chartType: response.chartType,
            points: response.matrix?.length || 0
          })
        }
        return
      }

      const labels = response?.labels || []
      const datasets = (response?.datasets || []).map((ds: WidgetDataset, index: number) =>
        normalizeDataset(ds, index, labels.length)
      )

      const enhanced = enhanceDatasets(response, datasets, previousResponse)

      chartData.value = {
        labels,
        datasets: enhanced.datasets,
        annotations: enhanced.annotations
      }
      lastFetchedConfig.value = currentConfigStr
      if (import.meta.dev) {
        console.debug('[Analytics/BaseWidget] fetch:success', {
          requestId,
          name: props.config?.name,
          labels: labels.length,
          datasets: enhanced.datasets.length,
          visualType: visualType.value
        })
      }
    } catch (e: any) {
      if (requestId !== activeRequestId.value) return
      if (import.meta.dev) {
        console.error('[Analytics/BaseWidget] fetch:error', {
          requestId,
          name: props.config?.name,
          endpoint: props.config?.endpoint || '/api/analytics/query',
          message: e?.data?.statusMessage || e?.message || e
        })
      }
      error.value = e.data?.statusMessage || e.message || 'Failed to load chart data'
      wellnessEvents.value = []
    } finally {
      if (requestId === activeRequestId.value) {
        loading.value = false
      }
    }
  }

  watch(() => props.config, fetchData, { deep: true })
  onMounted(fetchData)
</script>

<template>
  <div class="base-widget relative h-full w-full min-h-[250px]">
    <div
      v-if="loading"
      class="absolute inset-0 z-[10] flex items-center justify-center rounded-2xl bg-default/10 backdrop-blur-[1px] transition-opacity duration-300"
      :class="chartData ? 'opacity-100' : 'opacity-100 bg-default/40'"
    >
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <div v-if="error" class="flex h-full flex-col items-center justify-center p-4 text-center">
      <UIcon name="i-heroicons-exclamation-triangle" class="mb-2 h-8 w-8 text-error-500" />
      <p class="text-sm font-bold text-error-600 dark:text-error-400">{{ error }}</p>
      <UButton color="neutral" variant="link" size="xs" @click="fetchData">Retry</UButton>
    </div>

    <template v-else-if="chartData">
      <HeatmapGrid v-if="isHeatmap" :data="chartData" :mode="config.presetOptions?.mode" />

      <DensityHeatmap v-else-if="isDensityHeatmap" :data="chartData" :config="config" />

      <MapRenderer v-else-if="isMap" :data="chartData" :config="config" />

      <ChartRenderer
        v-else
        :key="`${visualType}-${config.instanceId || config.explorerPresetId || config.name}`"
        :data="chartData"
        :config="config"
        :visual-type="visualType"
        :axis-units="axisUnits"
        :wellness-events="wellnessEvents"
      />
    </template>
  </div>
</template>
