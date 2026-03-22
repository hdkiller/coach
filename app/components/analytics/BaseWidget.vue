<script setup lang="ts">
  import { Bar, Line, Scatter } from 'vue-chartjs'
  import annotationPlugin from 'chartjs-plugin-annotation'
  import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Title,
    Tooltip
  } from 'chart.js'
  import type { AnalyticsOverlayOption, AnalyticsOverlayType } from '~/utils/analytics-presets'
  import { wellnessOverlayPlugin, type WellnessOverlayEvent } from '~/utils/wellness-events'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    annotationPlugin
  )

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

  const theme = useTheme()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const chartData = ref<any>(null)
  const lastFetchedConfig = ref<string | null>(null)
  const wellnessEvents = ref<WellnessOverlayEvent[]>([])

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
  const chartPlugins = [wellnessOverlayPlugin]

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

  function resolveDatasetUnit(index: number) {
    if (props.config.units?.datasets?.[index]) return props.config.units.datasets[index]

    const metricField = props.config.metrics?.[index]?.field
    if (metricField) return metricUnits[metricField] || ''

    return ''
  }

  function formatUnitValue(rawValue: number | null | undefined, unit = '') {
    if (rawValue === null || rawValue === undefined || Number.isNaN(rawValue)) return '—'
    const value = Number(rawValue)

    if (unit === 'duration') {
      if (Math.abs(value) >= 7200) return `${(value / 3600).toFixed(1)} h`
      if (Math.abs(value) >= 3600) return `${(value / 3600).toFixed(1)} h`
      if (Math.abs(value) >= 60) return `${Math.round(value / 60)} min`
      return `${Math.round(value)} s`
    }

    if (unit === 'm') {
      if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)} km`
      return `${Math.round(value)} m`
    }

    if (unit === 'ml') {
      if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)} L`
      return `${Math.round(value)} ml`
    }

    if (unit === '%') return `${Math.round(value)}%`
    if (unit === 'tss') return `${roundValue(value)} TSS`
    if (unit === 'load') return roundValue(value)
    if (unit === 'sessions') return `${roundValue(value)} sessions`
    if (unit === 'score') return roundValue(value)
    if (!unit) return roundValue(value)

    return `${roundValue(value)} ${unit}`
  }

  function roundValue(value: number) {
    if (Math.abs(value) >= 100 || Number.isInteger(value)) return String(Math.round(value))
    return value.toFixed(1)
  }

  function formatAxisTick(value: number | string, unit = '') {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return String(value)

    if (unit === 'duration') {
      if (Math.abs(numeric) >= 3600) return `${roundValue(numeric / 3600)} h`
      if (Math.abs(numeric) >= 60) return `${Math.round(numeric / 60)}m`
      return `${Math.round(numeric)}s`
    }

    if (unit === 'm') {
      if (Math.abs(numeric) >= 1000) return `${roundValue(numeric / 1000)} km`
      return `${Math.round(numeric)} m`
    }

    if (unit === 'ml') {
      if (Math.abs(numeric) >= 1000) return `${roundValue(numeric / 1000)} L`
      return `${Math.round(numeric)} ml`
    }

    if (unit === '%') return `${Math.round(numeric)}%`
    if (unit === 'tss') return `${roundValue(numeric)}`
    if (unit === 'sessions') return `${roundValue(numeric)}`
    if (!unit || unit === 'load' || unit === 'score') return roundValue(numeric)

    return `${roundValue(numeric)} ${unit}`
  }

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

  function rollingAverage(values: Array<number | null>, window: number) {
    return values.map((_, index) => {
      const slice = values
        .slice(Math.max(0, index - window + 1), index + 1)
        .filter((value): value is number => value !== null && !Number.isNaN(value))

      if (slice.length === 0) return null
      return Number((slice.reduce((sum, value) => sum + value, 0) / slice.length).toFixed(2))
    })
  }

  function computeBand(values: Array<number | null>, window = 7) {
    const upper: Array<number | null> = []
    const lower: Array<number | null> = []

    values.forEach((_, index) => {
      const slice = values
        .slice(Math.max(0, index - window + 1), index + 1)
        .filter((value): value is number => value !== null && !Number.isNaN(value))

      if (slice.length < 2) {
        upper.push(null)
        lower.push(null)
        return
      }

      const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length
      const variance =
        slice.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / slice.length
      const stdDev = Math.sqrt(variance)
      upper.push(Number((mean + stdDev).toFixed(2)))
      lower.push(Number(Math.max(0, mean - stdDev).toFixed(2)))
    })

    return { upper, lower }
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

  function averageSeries(series: Array<Array<number | null>>) {
    if (series.length === 0) return []

    return series[0].map((_, index) => {
      const values = series
        .map((dataset) => dataset[index])
        .filter((value): value is number => value !== null && !Number.isNaN(value))
      if (values.length === 0) return null
      return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
    })
  }

  function calculateRegression(points: Array<{ x: number; y: number }>) {
    if (points.length < 2) return []

    const count = points.length
    const sumX = points.reduce((sum, point) => sum + point.x, 0)
    const sumY = points.reduce((sum, point) => sum + point.y, 0)
    const sumXY = points.reduce((sum, point) => sum + point.x * point.y, 0)
    const sumXX = points.reduce((sum, point) => sum + point.x * point.x, 0)
    const denominator = count * sumXX - sumX * sumX

    if (!denominator) return []

    const slope = (count * sumXY - sumX * sumY) / denominator
    const intercept = (sumY - slope * sumX) / count
    const sorted = [...points].sort((a, b) => a.x - b.x)

    return sorted.map((point) => ({
      x: point.x,
      y: Number((slope * point.x + intercept).toFixed(2))
    }))
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
        query: {
          days
        }
      })
    } catch {
      wellnessEvents.value = []
    }
  }

  function buildAnnotations(response: ChartResponsePayload) {
    const overlays = activeOverlays.value.filter(
      (overlay) => overlay.type === 'targetLine' || overlay.type === 'thresholdLine'
    )

    const annotationEntries: Record<string, any> = {}

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

  function enhanceDatasets(
    response: ChartResponsePayload,
    normalizedDatasets: any[],
    previousResponse?: ChartResponsePayload | null
  ) {
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
            overlayMeta: { hiddenFromLegend: true },
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
            overlayMeta: { hiddenFromLegend: true },
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
              overlayMeta: {}
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
              overlayMeta: {}
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
              overlayMeta: {}
            } as any,
            normalizedDatasets.length + extraDatasets.length,
            response.labels?.length || 0
          )
        )
      }
    }

    if (visualType.value === 'scatter' && resolveOverlayTypeIds('regressionLine').length) {
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
              overlayMeta: {}
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

  function normalizeDataset(ds: WidgetDataset, index: number, labelsLength: number) {
    const datasetType =
      ds.type ||
      props.config.styling?.datasetTypes?.[index] ||
      (visualType.value === 'combo' ? (index === 0 ? 'bar' : 'line') : props.config.type || 'line')
    const color = ds.color || ds.borderColor || chartColors[index % chartColors.length]
    const isBarDataset = datasetType === 'bar'

    return {
      ...ds,
      type: datasetType,
      borderColor: color,
      backgroundColor:
        ds.backgroundColor ||
        (isBarDataset ? `${color}80` : visualType.value === 'scatter' ? color : 'transparent'),
      borderWidth: 2,
      borderDash: ds.borderDash,
      tension: ds.tension ?? (datasetType === 'line' ? 0.35 : 0),
      fill: ds.fill ?? false,
      yAxisID: ds.yAxisID || (visualType.value === 'combo' && datasetType === 'line' ? 'y1' : 'y'),
      pointRadius:
        ds.pointRadius || (visualType.value === 'scatter' ? 4 : labelsLength > 50 ? 0 : 3),
      pointHoverRadius: visualType.value === 'scatter' ? 5 : 4,
      spanGaps: true,
      overlayMeta: ds.overlayMeta
    }
  }

  async function fetchData() {
    const currentConfigStr = JSON.stringify({ ...props.config, instanceId: undefined })
    if (lastFetchedConfig.value === currentConfigStr) return

    loading.value = true
    error.value = null

    try {
      const endpoint = props.config.endpoint || '/api/analytics/query'
      const timeRange = resolveTimeRange()
      const { _meta, instanceId, ...requestConfig } = props.config
      const response = await fetchChartResponse(endpoint, requestConfig, timeRange)

      const previousRange = resolveOverlayTypeIds('previousPeriod').length
        ? resolvePreviousTimeRange(timeRange)
        : null
      const previousResponse =
        previousRange && !isHeatmap.value
          ? await fetchChartResponse(endpoint, requestConfig, previousRange)
          : null

      await fetchWellnessEventOverlays(timeRange)

      if ((!response?.datasets || response.datasets.length === 0) && response?.unsupportedReason) {
        error.value = response.unsupportedReason
        chartData.value = null
        lastFetchedConfig.value = currentConfigStr
        return
      }

      if (response?.chartType === 'heatmap') {
        chartData.value = response as HeatmapPayload
        lastFetchedConfig.value = currentConfigStr
        return
      }

      const labels = response?.labels || []
      const datasets = (response?.datasets || []).map((ds: WidgetDataset, index: number) => ({
        ...normalizeDataset(ds, index, labels.length),
        unit: resolveDatasetUnit(index)
      }))

      const enhanced = enhanceDatasets(response, datasets, previousResponse)

      chartData.value = {
        labels,
        datasets: enhanced.datasets,
        annotations: enhanced.annotations
      }
      lastFetchedConfig.value = currentConfigStr
    } catch (e: any) {
      console.error('[BaseWidget] Data fetch failed:', e)
      error.value = e.data?.statusMessage || e.message || 'Failed to load chart data'
    } finally {
      loading.value = false
    }
  }

  const chartOptions = computed(() => {
    const stacked = visualType.value === 'stackedBar'
    const isHorizontal = visualType.value === 'horizontalBar'
    const isScatter = visualType.value === 'scatter'
    const isCombo = visualType.value === 'combo'

    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isHorizontal ? ('y' as const) : ('x' as const),
      plugins: {
        wellnessOverlays:
          resolveOverlayTypeIds('wellnessEvents').length &&
          !isHeatmap.value &&
          chartData.value?.labels
            ? {
                events: wellnessEvents.value,
                dateKeys: chartData.value.labels
              }
            : undefined,
        annotation: {
          annotations: chartData.value?.annotations || {}
        },
        legend: {
          display: props.config.styling?.showLegend !== false,
          position: 'bottom' as const,
          labels: {
            filter: (item: any, data: any) => {
              const dataset = data?.datasets?.[item.datasetIndex]
              return !dataset?.overlayMeta?.hiddenFromLegend
            },
            usePointStyle: true,
            boxWidth: 6,
            boxHeight: 6,
            font: { size: 10, weight: 'bold' as const },
            color: '#94a3b8'
          }
        },
        tooltip: {
          backgroundColor: theme.isDark.value ? '#111827' : '#ffffff',
          titleColor: theme.isDark.value ? '#f3f4f6' : '#111827',
          bodyColor: theme.isDark.value ? '#d1d5db' : '#374151',
          borderColor: theme.isDark.value ? '#374151' : '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          titleFont: { size: 12, weight: 'bold' as const },
          bodyFont: { size: 11 },
          displayColors: true,
          mode: isScatter ? ('nearest' as const) : ('index' as const),
          intersect: isScatter,
          callbacks: {
            label: (context: any) => {
              if (context.dataset?.overlayMeta?.hiddenFromTooltip) return ''
              const datasetUnit = context.dataset.unit || ''
              if (isScatter) {
                const xValue = context.raw?.x
                const yValue = context.raw?.y
                const pointLabel = context.raw?.label ? `${context.raw.label}: ` : ''
                return `${pointLabel}${formatUnitValue(xValue, axisUnits.value.x)} / ${formatUnitValue(yValue, axisUnits.value.y)}`
              }

              return `${context.dataset.label}: ${formatUnitValue(context.parsed?.y ?? context.parsed?.x, datasetUnit || axisUnits.value.y)}`
            }
          }
        }
      },
      scales: {
        x: {
          type: isScatter ? ('linear' as const) : ('category' as const),
          stacked,
          grid: {
            display: !isHorizontal,
            color: theme.isDark.value ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'
          },
          ticks: {
            color: '#94a3b8',
            font: { size: 10, weight: 'bold' as const },
            maxTicksLimit: isScatter ? 6 : 8,
            autoSkip: !isScatter,
            callback: (value: number | string) =>
              isScatter || isHorizontal ? formatAxisTick(value, axisUnits.value.x) : value
          },
          title: {
            display: Boolean(axisUnits.value.x) && (isScatter || isHorizontal),
            text: axisUnits.value.x
          },
          border: { display: false }
        },
        y: {
          position: 'right' as const,
          stacked,
          grid: {
            color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            drawTicks: false
          },
          ticks: {
            color: '#94a3b8',
            font: { size: 10, weight: 'bold' as const },
            maxTicksLimit: 6,
            callback: (value: number | string) =>
              !isHorizontal ? formatAxisTick(value, axisUnits.value.y) : value
          },
          title: {
            display: Boolean(axisUnits.value.y) && !isHorizontal,
            text: axisUnits.value.y
          },
          border: { display: false }
        },
        ...(isCombo
          ? {
              y1: {
                position: 'left' as const,
                grid: { display: false },
                ticks: {
                  color: '#94a3b8',
                  font: { size: 10, weight: 'bold' as const },
                  maxTicksLimit: 6,
                  callback: (value: number | string) =>
                    formatAxisTick(value, axisUnits.value.y1 || axisUnits.value.y)
                },
                title: {
                  display: Boolean(axisUnits.value.y1),
                  text: axisUnits.value.y1
                },
                border: { display: false }
              }
            }
          : {})
      },
      interaction: {
        mode: isScatter ? ('nearest' as const) : ('index' as const),
        axis: isScatter ? ('xy' as const) : ('x' as const),
        intersect: isScatter
      }
    }
  })

  const heatmapMatrix = computed(() => {
    if (!isHeatmap.value || !chartData.value) return new Map<string, number | null>()
    return new Map(
      (chartData.value.matrix as HeatmapPoint[]).map((point) => [
        `${point.y}::${point.x}`,
        point.value
      ])
    )
  })

  function heatmapColor(value: number | null) {
    if (value === null || Number.isNaN(value)) {
      return theme.isDark.value ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)'
    }

    const intensity = Math.max(0.12, Math.min(1, Math.abs(value) / 100))

    if (props.config.presetOptions?.mode === 'fatigue') {
      if (value >= 10) return `rgba(16, 185, 129, ${intensity})`
      if (value >= -10) return `rgba(245, 158, 11, ${intensity})`
      return `rgba(239, 68, 68, ${intensity})`
    }

    if (value >= 80) return `rgba(16, 185, 129, ${intensity})`
    if (value >= 60) return `rgba(59, 130, 246, ${intensity})`
    if (value >= 40) return `rgba(245, 158, 11, ${intensity})`
    return `rgba(239, 68, 68, ${intensity})`
  }

  watch(() => props.config, fetchData, { deep: true })
  onMounted(fetchData)
</script>

<template>
  <div class="base-widget h-full w-full min-h-[250px]">
    <div v-if="loading" class="flex h-full min-h-[250px] items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <div
      v-else-if="error"
      class="flex h-full min-h-[250px] flex-col items-center justify-center p-4 text-center"
    >
      <UIcon name="i-heroicons-exclamation-triangle" class="mb-2 h-8 w-8 text-error-500" />
      <p class="line-clamp-3 text-sm font-bold text-error-600 dark:text-error-400">
        {{ error }}
      </p>
      <UButton color="neutral" variant="link" size="xs" class="mt-2" @click="fetchData">
        Retry
      </UButton>
    </div>

    <div
      v-else-if="isHeatmap && chartData"
      class="h-full overflow-auto rounded-2xl border border-default/60 bg-default/70 p-4"
    >
      <div class="min-w-max space-y-2">
        <div
          class="grid gap-2"
          :style="{
            gridTemplateColumns: `180px repeat(${chartData.xLabels.length}, minmax(48px, 1fr))`
          }"
        >
          <div />
          <div
            v-for="label in chartData.xLabels"
            :key="label"
            class="text-center text-[10px] font-black uppercase tracking-[0.18em] text-muted"
          >
            {{ label.slice(5) }}
          </div>
        </div>

        <div
          v-for="athlete in chartData.yLabels"
          :key="athlete"
          class="grid items-center gap-2"
          :style="{
            gridTemplateColumns: `180px repeat(${chartData.xLabels.length}, minmax(48px, 1fr))`
          }"
        >
          <div class="truncate pr-3 text-sm font-bold text-highlighted">
            {{ athlete }}
          </div>
          <div
            v-for="label in chartData.xLabels"
            :key="`${athlete}-${label}`"
            class="flex h-12 items-center justify-center rounded-xl border border-default/50 text-xs font-bold text-highlighted"
            :style="{
              backgroundColor: heatmapColor(heatmapMatrix.get(`${athlete}::${label}`) ?? null)
            }"
          >
            {{ heatmapMatrix.get(`${athlete}::${label}`) ?? '—' }}
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="chartData" class="relative h-full p-2">
      <Line
        v-if="visualType === 'line'"
        :data="chartData"
        :options="chartOptions"
        :plugins="chartPlugins"
      />
      <Bar
        v-else-if="
          visualType === 'bar' ||
          visualType === 'combo' ||
          visualType === 'stackedBar' ||
          visualType === 'horizontalBar'
        "
        :data="chartData"
        :options="chartOptions"
        :plugins="chartPlugins"
      />
      <Scatter
        v-else-if="visualType === 'scatter'"
        :data="chartData"
        :options="chartOptions"
        :plugins="chartPlugins"
      />
      <div v-else class="flex h-full items-center justify-center text-xs italic text-neutral-400">
        Unsupported chart type: {{ visualType }}
      </div>
    </div>
  </div>
</template>
