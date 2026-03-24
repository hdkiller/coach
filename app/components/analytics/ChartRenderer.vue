<script setup lang="ts">
  import { Bar, Line, Scatter, Radar } from 'vue-chartjs'
  import annotationPlugin from 'chartjs-plugin-annotation'
  import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LineElement,
    LinearScale,
    RadialLinearScale,
    PointElement,
    Title,
    Tooltip,
    type ChartArea,
    type ScriptableContext
  } from 'chart.js'
  import { wellnessOverlayPlugin } from '~/utils/wellness-events'
  import { useAnalyticsBus } from '~/composables/useAnalyticsBus'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    RadialLinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    annotationPlugin
  )

  const props = defineProps<{
    data: any
    config: any
    axisUnits: { x: string; y: string; y1: string }
    visualType: string
    wellnessEvents?: any[]
  }>()

  const theme = useTheme()
  const isZoomLoaded = ref(false)

  onMounted(async () => {
    try {
      const zoomPlugin = (await import('chartjs-plugin-zoom')).default
      ChartJS.register(zoomPlugin)
      isZoomLoaded.value = true
    } catch (e) {
      console.error('[ChartRenderer] Failed to load zoom plugin:', e)
    }
  })

  /**
   * Helper to create linear gradients for area fills.
   */
  function createGradient(ctx: CanvasRenderingContext2D, area: ChartArea, color: string) {
    const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top)
    gradient.addColorStop(0, `${color}00`) // Transparent at bottom
    gradient.addColorStop(1, `${color}40`) // Faint at top
    return gradient
  }

  function formatUnitValue(rawValue: number | null | undefined, unit = '') {
    if (rawValue === null || rawValue === undefined || Number.isNaN(rawValue)) return '—'
    const value = Number(rawValue)

    if (unit === 'duration') {
      if (Math.abs(value) >= 3600) return `${(value / 3600).toFixed(1)}h`
      if (Math.abs(value) >= 60) return `${Math.round(value / 60)}m`
      return `${Math.round(value)}s`
    }

    if (unit === 'm') {
      if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}km`
      return `${Math.round(value)}m`
    }

    if (unit === 'ml') {
      if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}L`
      return `${Math.round(value)}ml`
    }

    if (unit === '%') return `${Math.round(value)}%`
    return `${roundValue(value)}${unit ? ' ' + unit : ''}`
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

  const chartOptions = computed(() => {
    const visualType = props.visualType
    const stacked = visualType === 'stackedBar'
    const isHorizontal = visualType === 'horizontalBar'
    const isScatter = visualType === 'scatter'
    const isCombo = visualType === 'combo'
    const settings = props.config.settings || {}
    const { triggerScrub, triggerZoom } = useAnalyticsBus()

    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isHorizontal ? ('y' as const) : ('x' as const),
      onHover: (event: any, elements: any[]) => {
        if (elements.length > 0) {
          const index = elements[0].index
          const datasetIndex = elements[0].datasetIndex
          const point = props.data.datasets[datasetIndex].data[index]
          if (point) {
            triggerScrub({
              x: point.x,
              lat: point.lat,
              lng: point.lng,
              workoutId: props.config.analysis?.workoutId,
              index
            })
          }
        }
      },
      plugins: {
        wellnessOverlays:
          props.wellnessEvents?.length && props.data?.labels
            ? {
                events: props.wellnessEvents,
                dateKeys: props.data.labels
              }
            : undefined,
        annotation: {
          annotations: props.data?.annotations || {}
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
                return `${pointLabel}${formatUnitValue(xValue, props.axisUnits.x)} / ${formatUnitValue(yValue, props.axisUnits.y)}`
              }

              return `${context.dataset.label}: ${formatUnitValue(context.parsed?.y ?? context.parsed?.x, datasetUnit || props.axisUnits.y)}`
            }
          }
        },
        zoom: isZoomLoaded.value
          ? {
              pan: {
                enabled: true,
                mode: 'x' as const,
                threshold: 10
              },
              zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: 'x' as const,
                onZoomComplete: ({ chart }: any) => {
                  const x = chart.scales.x
                  triggerZoom({
                    startX: x.min,
                    endX: x.max,
                    workoutId: props.config.analysis?.workoutId
                  })
                }
              }
            }
          : undefined
      },
      scales:
        props.visualType === 'radar'
          ? {
              r: {
                angleLines: {
                  color: theme.isDark.value ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                },
                grid: {
                  color: theme.isDark.value ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                },
                pointLabels: { color: '#94a3b8', font: { size: 10, weight: 'bold' } },
                ticks: { display: false }
              }
            }
          : {
              x: {
                type: isScatter
                  ? ('linear' as const)
                  : props.config.scales?.x?.type || ('category' as const),
                stacked,
                grid: {
                  display: !isHorizontal,
                  color: theme.isDark.value ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'
                },
                ticks: {
                  color: '#94a3b8',
                  font: { size: 10, weight: '600' as const },
                  maxTicksLimit: isScatter ? 6 : 8,
                  autoSkip: !isScatter,
                  callback: (value: number | string) =>
                    isScatter || isHorizontal || props.config.scales?.x?.type === 'logarithmic'
                      ? formatAxisTick(value, props.axisUnits.x)
                      : value
                },
                title: {
                  display: Boolean(props.axisUnits.x) && (isScatter || isHorizontal),
                  text: props.axisUnits.x
                },
                border: { display: false }
              },
              y: {
                type: props.config.scales?.y?.type || ('linear' as const),
                position: 'right' as const,
                stacked,
                min: settings.yScale === 'fixed' ? settings.yMin || 0 : undefined,
                grid: {
                  color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                  drawTicks: false
                },
                ticks: {
                  color: '#94a3b8',
                  font: { size: 10, weight: '600' as const },
                  maxTicksLimit: 6,
                  callback: (value: number | string) =>
                    !isHorizontal ? formatAxisTick(value, props.axisUnits.y) : value
                },
                title: {
                  display: Boolean(props.axisUnits.y) && !isHorizontal,
                  text: props.axisUnits.y
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
                        font: { size: 10, weight: '600' as const },
                        maxTicksLimit: 6,
                        callback: (value: number | string) =>
                          formatAxisTick(value, props.axisUnits.y1 || props.axisUnits.y)
                      },
                      title: {
                        display: Boolean(props.axisUnits.y1),
                        text: props.axisUnits.y1
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
    } as any
  })

  // Apply gradients to datasets if they are line/area charts
  const processedData = computed(() => {
    if (!props.data || !props.data.datasets) return props.data

    const datasets = props.data.datasets.map((ds: any) => {
      // If it's a line chart with fill, use a gradient
      if (ds.type === 'line' && ds.fill) {
        return {
          ...ds,
          backgroundColor: (context: ScriptableContext<'line'>) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) return ds.backgroundColor
            return createGradient(ctx, chartArea, ds.borderColor)
          }
        }
      }
      return ds
    })

    return {
      ...props.data,
      datasets
    }
  })
</script>

<template>
  <div class="relative h-full w-full p-2">
    <Line
      v-if="visualType === 'line'"
      :data="processedData"
      :options="chartOptions"
      :plugins="[wellnessOverlayPlugin]"
    />
    <Bar
      v-else-if="
        visualType === 'bar' ||
        visualType === 'combo' ||
        visualType === 'stackedBar' ||
        visualType === 'horizontalBar'
      "
      :data="processedData"
      :options="chartOptions"
      :plugins="[wellnessOverlayPlugin]"
    />
    <Scatter
      v-else-if="visualType === 'scatter'"
      :data="processedData"
      :options="chartOptions"
      :plugins="[wellnessOverlayPlugin]"
    />
    <Radar v-else-if="visualType === 'radar'" :data="processedData" :options="chartOptions" />
    <div v-else class="flex h-full items-center justify-center text-xs italic text-neutral-400">
      Unsupported chart type: {{ visualType }}
    </div>
  </div>
</template>
