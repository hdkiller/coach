<template>
  <div class="h-[300px] w-full relative">
    <Line :data="chartData" :options="chartOptions" :plugins="plugins" />
  </div>
</template>

<script setup lang="ts">
  import { Line } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  } from 'chart.js'
  import annotationPlugin from 'chartjs-plugin-annotation'
  import type { AthleteJourneyEvent } from '~/types/nutrition'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    annotationPlugin
  )

  const props = defineProps<{
    points: any[]
    journeyEvents?: AthleteJourneyEvent[]
    workouts?: any[]
    highlightedDate?: string | null
    settings?: any
    plugins?: any[]
  }>()

  const chartSettings = computed(() => ({
    smooth: true,
    showMarkers: true,
    showNowLine: true,
    showProjected: true,
    showWorkoutBars: true,
    opacity: 0.1,
    yScale: 'fixed', // Default to fixed 0-100 for glycogen
    ...props.settings
  }))

  const categoryIcons: Record<string, string> = {
    GI_DISTRESS: '🤢',
    MUSCLE_PAIN: '🦵',
    FATIGUE: '😴',
    SLEEP: '🌙',
    MOOD: '🎭',
    CRAMPING: '⚡',
    DIZZINESS: '💫',
    HUNGER: '🍴'
  }

  const categoryColors: Record<string, string> = {
    GI_DISTRESS: '#f97316',
    MUSCLE_PAIN: '#ef4444',
    FATIGUE: '#8b5cf6',
    CRAMPING: '#ef4444',
    DIZZINESS: '#eab308',
    HUNGER: '#3b82f6'
  }

  const chartData = computed(() => {
    return {
      labels: props.points.map((p) => {
        // Only show time for every 4th point or so to avoid crowding, or use day labels
        return p.time
      }),
      datasets: [
        {
          label: 'Energy availability',
          data: props.points.map((p) => p.level),
          borderColor: '#3b82f6',
          borderWidth: 2,
          fill: true,
          tension: chartSettings.value.smooth ? 0.4 : 0,
          segment: {
            borderDash: (ctx: any) => {
              const point = props.points[ctx.p1DataIndex]
              return chartSettings.value.showProjected && point?.dataType === 'future'
                ? [5, 5]
                : undefined
            },
            borderColor: (ctx: any) => {
              const point = props.points[ctx.p1DataIndex]
              return point?.dataType === 'future' ? 'rgba(59, 130, 246, 0.5)' : '#3b82f6'
            }
          },
          backgroundColor: (context: any) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) return null
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
            const op = chartSettings.value.opacity ?? 0.1
            gradient.addColorStop(0, `rgba(239, 68, 68, ${op * 0.5})`)
            gradient.addColorStop(0.3, `rgba(59, 130, 246, ${op})`)
            return gradient
          },
          pointRadius: (ctx: any) => {
            if (!chartSettings.value.showMarkers) return 0
            const p = props.points[ctx.dataIndex]
            return p?.eventType ? 6 : 0
          },
          pointHoverRadius: 8,
          pointBackgroundColor: (ctx: any) => {
            const p = props.points[ctx.dataIndex]
            if (!p?.eventType || !chartSettings.value.showMarkers) return 'transparent'
            if (p.eventIcon === 'i-tabler-layers-intersect') return '#8b5cf6'
            if (p.event && (p.event.includes('Synthetic') || p.event.includes('Probable')))
              return '#a855f7'
            return p.eventType === 'workout' ? '#ef4444' : '#10b981'
          },
          pointStyle: (ctx: any) => {
            const p = props.points[ctx.dataIndex]
            if (!chartSettings.value.showMarkers) return 'circle'
            if (p?.eventIcon === 'i-tabler-layers-intersect') return 'triangle'
            if (p?.eventType === 'workout') return 'rectRot'
            if (p?.eventType === 'meal') return 'circle'
            return 'circle'
          }
        },
        {
          label: 'Symptoms',
          data: props.points.map((p) => {
            if (!p || !chartSettings.value.showMarkers) return null
            const event = props.journeyEvents?.find((e) => {
              const eTime = new Date(e.timestamp)
              const pTime = p.timestamp
              return Math.abs(eTime.getTime() - pTime) < (15 * 60000) / 2
            })
            return event ? p.level : null
          }),
          borderColor: 'transparent',
          pointRadius: (ctx: any) => (chartSettings.value.showMarkers ? 10 : 0),
          pointHoverRadius: (ctx: any) => (chartSettings.value.showMarkers ? 12 : 0),
          pointBackgroundColor: (ctx: any) => {
            const val = ctx.dataset.data[ctx.dataIndex]
            if (val === null || !chartSettings.value.showMarkers) return 'transparent'

            const p = props.points[ctx.dataIndex]
            if (!p) return 'transparent'
            const event = props.journeyEvents?.find((e) => {
              const eTime = new Date(e.timestamp)
              const pTime = p.timestamp
              return Math.abs(eTime.getTime() - pTime) < (15 * 60000) / 2
            })
            return event ? categoryColors[event.category] || '#f97316' : 'transparent'
          },
          pointStyle: 'rectRounded',
          showLine: false
        }
      ]
    }
  })

  const chartOptions = computed(() => {
    const dayBoundaries: number[] = []
    let lastDay = ''
    props.points.forEach((p, idx) => {
      if (p.dateKey !== lastDay) {
        if (lastDay !== '') dayBoundaries.push(idx)
        lastDay = p.dateKey
      }
    })

    const nowIdx = props.points.findIndex((p) => p.dataType === 'current' && p.isFuture)
    const annotations: any = {
      nowLine: {
        type: 'line' as const,
        xMin: nowIdx >= 0 ? nowIdx : undefined,
        xMax: nowIdx >= 0 ? nowIdx : undefined,
        display: nowIdx >= 0 && chartSettings.value.showNowLine,
        borderColor: 'rgba(156, 163, 175, 0.8)',
        borderWidth: 1.5,
        label: {
          content: 'NOW',
          display: true,
          position: 'start' as const,
          backgroundColor: 'rgba(0,0,0,0.5)',
          font: { size: 9, weight: 'bold' as const }
        }
      }
    }

    // Add Workout Intensity Bars (Heatmap)
    if (chartSettings.value.showWorkoutBars && props.workouts?.length) {
      console.log('[Heatmap] Processing workouts:', props.workouts.length)
      console.log('[Heatmap] Points count:', props.points.length)
      if (props.points.length > 0) {
        console.log(
          '[Heatmap] Points TS Range:',
          props.points[0].timestamp,
          'to',
          props.points[props.points.length - 1].timestamp
        )
      }

      props.workouts.forEach((w, i) => {
        const startTs = new Date(w.startTime).getTime()
        const duration = Number(w.durationSec) || 3600
        const endTs = startTs + duration * 1000

        // Find closest point indices
        const startIdx = props.points.findIndex((p) => p.timestamp >= startTs)
        let endIdx = props.points.findIndex((p) => p.timestamp >= endTs)

        // If workout ends after our points, cap it
        if (endIdx === -1) endIdx = props.points.length - 1

        console.log(`[Heatmap] Workout ${i}: ${w.title}`, {
          startTs,
          endTs,
          startIdx,
          endIdx,
          intensity: w.intensity,
          startTimeStr: w.startTime
        })

        // If workout starts before our points but ends within, or is fully within
        if (endIdx >= 0) {
          const effectiveStartIdx = startIdx === -1 ? 0 : startIdx
          if (effectiveStartIdx <= endIdx) {
            const intensity = w.intensity || 0.6
            // Map intensity (0.4 - 1.0) to red opacity (0.2 - 0.7)
            const opacity = Math.min(0.8, Math.max(0.1, (intensity - 0.3) * 1.2))

            annotations[`workoutBar${i}`] = {
              type: 'box' as const,
              xMin: effectiveStartIdx,
              xMax: endIdx,
              yMin: 0,
              yMax: 100, // Full height to avoid clipping issues
              backgroundColor: `rgba(239, 68, 68, ${opacity * 0.4})`, // Slightly lower opacity for full height
              borderColor: 'transparent',
              borderWidth: 0,
              drawTime: 'beforeDatasetsDraw', // Background style
              label: {
                display: false
              }
            }
          }
        }
      })
    } else if (chartSettings.value.showWorkoutBars) {
      console.log('[Heatmap] No workouts to show in heatmap')
    }

    // Add Highlighted Day Box
    if (props.highlightedDate) {
      const startIdx = props.points.findIndex((p) => p.dateKey === props.highlightedDate)
      const endIdx = props.points.findLastIndex((p) => p.dateKey === props.highlightedDate)

      if (startIdx >= 0 && endIdx >= 0) {
        annotations.highlightBox = {
          type: 'box' as const,
          xMin: startIdx,
          xMax: endIdx,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'transparent',
          borderWidth: 0,
          drawTime: 'beforeDatasetsDraw'
        }
      }
    }

    // Add day boundary lines
    dayBoundaries.forEach((idx, i) => {
      annotations[`dayLine${i}`] = {
        type: 'line' as const,
        xMin: idx,
        xMax: idx,
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        borderDash: [2, 2]
      }
    })

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          interaction: { mode: 'index', intersect: false },
          callbacks: {
            title: (context: any) => {
              const p = props.points[context[0].dataIndex]
              if (!p) return ''
              return `${p.dateKey} ${p.time}`
            },
            label: (context: any) => {
              return `Glycogen: ${context.raw}%`
            },
            afterBody: (context: any) => {
              const p = props.points[context[0].dataIndex]
              if (!p) return ''

              // 1. Check for Symptom Events
              const event = props.journeyEvents?.find((e) => {
                const eTime = new Date(e.timestamp)
                const pTime = p?.timestamp
                if (pTime === undefined) return false
                return Math.abs(eTime.getTime() - pTime) < (15 * 60000) / 2
              })

              if (event) {
                const lines = []
                lines.push(
                  `${categoryIcons[event.category] || '⚠️'} ${event.category.replace(/_/g, ' ')}`
                )
                lines.push(`Severity: ${event.severity}/10`)
                if (event.description) lines.push(`"${event.description}"`)
                return lines
              }

              const lines = []
              if (p.eventType === 'workout') {
                lines.push(`Workout: ${p.event || 'Planned Activity'}`)
              } else if (p.eventType === 'meal') {
                lines.push(`Event: ${p.event || 'Food Logged'}`)
                if (p.eventCarbs) lines.push(`Carbs: ${p.eventCarbs}g`)
              }

              if (p.eventFluid > 0) {
                lines.push(`Fluid Intake: ${p.eventFluid}ml`)
              } else if (p.fluidDeficit > 0) {
                lines.push(`Fluid Debt: ${Math.round(p.fluidDeficit)}ml`)
              }

              return lines
            }
          }
        },
        annotation: { annotations }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 12,
            callback: function (value: any, index: number) {
              const p = props.points[index]
              if (p.time === '00:00') return p.dateKey
              return p.time
            }
          }
        },
        y: {
          min: chartSettings.value.yScale === 'fixed' ? 0 : undefined,
          max: chartSettings.value.yScale === 'fixed' ? 100 : undefined,
          suggestedMin: chartSettings.value.yScale === 'dynamic' ? 20 : undefined,
          suggestedMax: chartSettings.value.yScale === 'dynamic' ? 90 : undefined,
          ticks: { callback: (val: any) => `${val}%` }
        }
      }
    }
  })
</script>
