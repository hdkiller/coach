import { describe, expect, it } from 'vitest'
import { Chart as ChartJS } from 'chart.js'
import {
  ensureChartJsAnnotationDefaults,
  safeChartUpdate
} from '../../app/utils/chartjs-annotation'

describe('chartjs-annotation', () => {
  it('sets default annotation config on Chart.js', () => {
    ensureChartJsAnnotationDefaults()
    expect(ChartJS.defaults.plugins?.annotation).toEqual({ annotations: {} })
  })

  it('safeChartUpdate no-ops for destroyed charts', () => {
    expect(() => safeChartUpdate(null)).not.toThrow()
    expect(() => safeChartUpdate({})).not.toThrow()
    expect(() =>
      safeChartUpdate({
        canvas: document.createElement('canvas'),
        update: () => {
          throw new Error('destroyed')
        }
      })
    ).not.toThrow()
  })
})
