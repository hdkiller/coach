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
    LogarithmicScale,
    RadialLinearScale,
    PointElement,
    Title,
    Tooltip,
    type ChartArea,
    type ScriptableContext
  } from 'chart.js'
  import { wellnessOverlayPlugin } from '~/utils/wellness-events'
  import { useAnalyticsBus } from '~/composables/useAnalyticsBus'
  import { useBreakpoints } from '@vueuse/core'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    LogarithmicScale,
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

  /**
   * Crosshair plugin — draws a synchronized vertical cursor line across all charts.
   * The line follows the hovered position and responds to scrub events from the bus.
   */
  const crosshairPlugin = {
    id: 'crosshairLine',
    afterDraw(chart: any) {
      const xVal = chart._crosshairX
      if (xVal === undefined || xVal === null) return
      const xScale = chart.scales?.x
      if (!xScale) return

      const pixelX = xScale.getPixelForValue(xVal)
      const { top, bottom } = chart.chartArea
      if (pixelX < xScale.left || pixelX > xScale.right) return

      const { ctx } = chart
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(pixelX, top)
      ctx.lineTo(pixelX, bottom)
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'
      ctx.setLineDash([4, 3])
      ctx.stroke()
      ctx.restore()
    },
    beforeEvent(chart: any, args: any) {
      const { event } = args
      if (event.type === 'mousemove') {
        const xScale = chart.scales?.x
        if (!xScale) return
        chart._crosshairX = xScale.getValueForPixel(event.x)
        args.changed = true
      } else if (event.type === 'mouseout') {
        chart._crosshairX = undefined
        args.changed = true
      }
    }
  }

  const props = defineProps<{
    data: any
    config: any
    axisUnits: { x: string; y: string; y1: string }
    visualType: string
    wellnessEvents?: any[]
  }>()

  const theme = useTheme()
  const isZoomLoaded = ref(false)
  const chartRef = ref<any>(null)

  const breakpoints = useBreakpoints({
    mobile: 0,
    sm: 640
  })
  const isMobile = breakpoints.smaller('sm')

  const { onScrub } = useAnalyticsBus()

  // Sync crosshair across pinned charts via the scrub bus
  const stopScrub = onScrub((event) => {
    if (event.workoutId !== props.config.analysis?.workoutId) return
    const chart = chartRef.value?.chart
    if (!chart) return
    chart._crosshairX = event.x
    chart.draw()
  })

  onUnmounted(() => {
    stopScrub.off()
  })

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
   * Safely appends hex opacity to a color string.
   * If the color is already rgba/hsla, it returns it as is (ignoring the requested opacity for simplicity,
   * or we could implement a more complex parser if needed).
   */
  function withOpacity(color: string, opacityHex: string) {
    if (!color) return 'transparent'
    if (color.startsWith('#')) return `${color}${opacityHex}`
    return color
  }

  /**
   * Helper to create linear gradients for area fills.
   */
  function createGradient(ctx: CanvasRenderingContext2D, area: ChartArea, color: string) {
    const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top)
    gradient.addColorStop(0, withOpacity(color, '08')) // Nearly transparent at bottom
    gradient.addColorStop(0.4, withOpacity(color, '30')) // Mid transition
    gradient.addColorStop(1, withOpacity(color, '65')) // Richer at top
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
      layout: {
        padding: isMobile.value
          ? { left: 0, right: 0, top: 0, bottom: 0 }
          : { left: 8, right: 8, top: 8, bottom: 8 }
      },
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
                  ? props.config.scales?.x?.type || ('linear' as const)
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
                  callback: function (value: number | string, index: number, ticks: any[]) {
                    // On mobile, hide the first and last labels to save space and maintain edge-to-edge feel
                    if (isMobile.value && (index === 0 || index === ticks.length - 1)) {
                      return ''
                    }

                    const xType = props.config.scales?.x?.type
                    if (
                      isScatter ||
                      isHorizontal ||
                      xType === 'logarithmic' ||
                      xType === 'linear'
                    ) {
                      return formatAxisTick(value, props.axisUnits.x)
                    }

                    if (typeof value === 'number' && Array.isArray(props.data?.labels)) {
                      return props.data.labels[value] ?? value
                    }

                    return value
                  }
                },
                title: {
                  display:
                    Boolean(props.axisUnits.x) &&
                    (isScatter || isHorizontal || props.config.scales?.x?.type === 'linear'),
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

  // Reset visual zoom when data changes to ensure the chart shows the new (possibly filtered) range
  watch(
    () => props.data,
    () => {
      const chart = chartRef.value?.chart
      if (chart && typeof chart.resetZoom === 'function') {
        chart.resetZoom('none')
      }
    },
    { deep: false }
  )

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
  <div class="relative h-full w-full p-0 sm:p-2">
    <Line
      v-if="visualType === 'line'"
      ref="chartRef"
      :data="processedData"
      :options="chartOptions"
      :plugins="[wellnessOverlayPlugin, crosshairPlugin]"
    />
    <Bar
      v-else-if="
        visualType === 'bar' ||
        visualType === 'combo' ||
        visualType === 'stackedBar' ||
        visualType === 'horizontalBar'
      "
      ref="chartRef"
      :data="processedData"
      :options="chartOptions"
      :plugins="[wellnessOverlayPlugin, crosshairPlugin]"
    />
    <Scatter
      v-else-if="visualType === 'scatter'"
      ref="chartRef"
      :data="processedData"
      :options="chartOptions"
      :plugins="[wellnessOverlayPlugin, crosshairPlugin]"
    />
    <Radar v-else-if="visualType === 'radar'" :data="processedData" :options="chartOptions" />
    <div v-else class="flex h-full items-center justify-center text-xs italic text-neutral-400">
      Unsupported chart type: {{ visualType }}
    </div>
  </div>
</template>
