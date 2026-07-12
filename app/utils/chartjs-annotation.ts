import { Chart as ChartJS } from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'

let registered = false

/**
 * Register chartjs-plugin-annotation once and ensure every chart instance
 * has a safe default annotation config. Without this, charts that do not
 * explicitly set plugins.annotation crash when the plugin initializes.
 */
export function ensureChartJsAnnotationDefaults() {
  if (registered) return

  ChartJS.register(annotationPlugin)
  ChartJS.defaults.plugins = ChartJS.defaults.plugins || {}
  ChartJS.defaults.plugins.annotation = {
    annotations: {}
  }

  registered = true
}

export function safeChartUpdate(
  chart: { canvas?: HTMLCanvasElement; update?: (mode?: string) => void } | null | undefined,
  mode?: string
) {
  if (!chart?.canvas || typeof chart.update !== 'function') return

  try {
    chart.update(mode)
  } catch {
    // Chart was destroyed mid-update (common during route changes).
  }
}

export { annotationPlugin }
