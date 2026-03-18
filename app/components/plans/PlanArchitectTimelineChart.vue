<template>
  <div class="h-[320px] w-full">
    <Chart type="bar" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
  import annotationPlugin from 'chartjs-plugin-annotation'
  import { Chart } from 'vue-chartjs'
  import {
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip
  } from 'chart.js'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    BarController,
    LineController,
    Tooltip,
    Legend,
    annotationPlugin
  )

  type ChartMetric = 'tss' | 'minutes'

  const props = defineProps<{
    metric: ChartMetric
    selectedWeekId?: string | null
    weeks: Array<{
      weekId: string
      weekNumber: number
      displayWeekNumber?: number
      weekFocus: string
      blockName: string
      blockType: string
      targetMinutes: number
      scheduledMinutes: number
      targetTss: number
      scheduledTss: number
      workoutCount: number
      typeBreakdown?: Array<{
        label: string
        count: number
        minutes: number
        tss: number
      }>
    }>
    blockRanges: Array<{
      blockId: string
      blockName: string
      blockType: string
      startIndex: number
      endIndex: number
    }>
  }>()

  const emit = defineEmits<{
    selectWeek: [weekId: string]
  }>()

  function blockTint(blockType: string, index: number) {
    const type = String(blockType || '').toUpperCase()
    const even = index % 2 === 0

    if (type.includes('BUILD')) {
      return even ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)'
    }

    if (type.includes('PEAK')) {
      return even ? 'rgba(14, 165, 233, 0.08)' : 'rgba(14, 165, 233, 0.06)'
    }

    if (type.includes('RECOVERY') || type.includes('DELOAD') || type.includes('TAPER')) {
      return even ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)'
    }

    if (type.includes('BASE')) {
      return even ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.06)'
    }

    return even ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.035)'
  }

  function blockBorder(blockType: string) {
    const type = String(blockType || '').toUpperCase()

    if (type.includes('BUILD')) return 'rgba(16, 185, 129, 0.22)'
    if (type.includes('PEAK')) return 'rgba(14, 165, 233, 0.22)'
    if (type.includes('RECOVERY') || type.includes('DELOAD') || type.includes('TAPER')) {
      return 'rgba(245, 158, 11, 0.22)'
    }
    if (type.includes('BASE')) return 'rgba(34, 197, 94, 0.22)'

    return 'rgba(148, 163, 184, 0.16)'
  }

  function activityColor(label: string) {
    if (label === 'Run') return 'rgba(16, 185, 129, 0.22)'
    if (label === 'Ride') return 'rgba(14, 165, 233, 0.22)'
    if (label === 'Gym') return 'rgba(217, 70, 239, 0.22)'
    if (label === 'Rest/Recovery') return 'rgba(245, 158, 11, 0.22)'
    return 'rgba(148, 163, 184, 0.22)'
  }

  function activityBorder(label: string) {
    if (label === 'Run') return 'rgba(16, 185, 129, 0.5)'
    if (label === 'Ride') return 'rgba(14, 165, 233, 0.5)'
    if (label === 'Gym') return 'rgba(217, 70, 239, 0.5)'
    if (label === 'Rest/Recovery') return 'rgba(245, 158, 11, 0.5)'
    return 'rgba(148, 163, 184, 0.45)'
  }

  const chartData = computed(() => {
    const labels = props.weeks.map((week, index) => `W${week.displayWeekNumber ?? index + 1}`)
    const targetData = props.weeks.map((week) =>
      props.metric === 'tss' ? week.targetTss : week.targetMinutes
    )
    const activityLabels = ['Run', 'Ride', 'Gym', 'Rest/Recovery', 'Other']
    const stackedDatasets = activityLabels.map((label) => ({
      type: 'bar' as const,
      label,
      stack: 'scheduled',
      data: props.weeks.map((week) => {
        const bucket = week.typeBreakdown?.find((entry) => entry.label === label)
        if (!bucket) return 0

        return props.metric === 'tss' ? bucket.tss : bucket.minutes
      }),
      backgroundColor: activityColor(label),
      borderColor: props.weeks.map((week) =>
        props.selectedWeekId === week.weekId ? '#6366f1' : activityBorder(label)
      ),
      borderWidth: props.weeks.map((week) => (props.selectedWeekId === week.weekId ? 1 : 0)),
      borderSkipped: false,
      borderRadius: 0,
      barPercentage: 0.78,
      categoryPercentage: 0.88
    }))

    return {
      labels,
      datasets: [
        ...stackedDatasets,
        {
          type: 'line' as const,
          label: props.metric === 'tss' ? 'Target TSS' : 'Target minutes',
          data: targetData,
          borderColor: '#cbd5e1',
          backgroundColor: 'rgba(203, 213, 225, 0.18)',
          pointBackgroundColor: props.weeks.map((week) =>
            props.selectedWeekId === week.weekId ? '#6366f1' : '#cbd5e1'
          ),
          pointBorderColor: '#0f172a',
          pointBorderWidth: 1.5,
          pointRadius: props.weeks.map((week) => (props.selectedWeekId === week.weekId ? 5 : 3)),
          pointHoverRadius: 6,
          tension: 0.28,
          fill: false
        }
      ]
    }
  })

  const chartOptions = computed(() => {
    const isDark =
      typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    const axisColor = isDark ? '#94a3b8' : '#64748b'
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.12)'
    const tooltipBg = isDark ? '#111827' : '#ffffff'
    const tooltipText = isDark ? '#e5e7eb' : '#0f172a'
    const tooltipMuted = isDark ? '#cbd5e1' : '#334155'

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false
      },
      onClick: (_event: unknown, elements: Array<{ index: number }>) => {
        const index = elements[0]?.index
        if (index == null) return

        const week = props.weeks[index]
        if (week) {
          emit('selectWeek', week.weekId)
        }
      },
      plugins: {
        legend: {
          position: 'top' as const,
          align: 'start' as const,
          labels: {
            color: axisColor,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            boxHeight: 8,
            font: {
              size: 10,
              weight: 'bold' as const
            }
          }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipText,
          bodyColor: tooltipMuted,
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            title: (items: any[]) => {
              const week = props.weeks[items[0]?.dataIndex]
              return week
                ? `${week.blockName} • Week ${week.displayWeekNumber ?? week.weekNumber}`
                : ''
            },
            beforeBody: (items: any[]) => {
              const week = props.weeks[items[0]?.dataIndex]
              return week ? [week.weekFocus] : []
            },
            afterBody: (items: any[]) => {
              const week = props.weeks[items[0]?.dataIndex]
              if (!week) return []

              const breakdownLines = ['Run', 'Ride', 'Gym', 'Rest/Recovery', 'Other']
                .map((label) => {
                  const bucket = week.typeBreakdown?.find((entry) => entry.label === label)
                  const value = props.metric === 'tss' ? bucket?.tss || 0 : bucket?.minutes || 0
                  if (!value) return null

                  return `${label}: ${value}${props.metric === 'tss' ? ' TSS' : ' min'}`
                })
                .filter(Boolean)

              return [
                `Target minutes: ${week.targetMinutes}`,
                `Scheduled minutes: ${week.scheduledMinutes}`,
                `Target TSS: ${week.targetTss}`,
                `Scheduled TSS: ${week.scheduledTss}`,
                `Workouts: ${week.workoutCount}`,
                ...breakdownLines
              ]
            }
          }
        },
        annotation: {
          annotations: props.blockRanges.reduce((acc: Record<string, any>, block, index) => {
            acc[`block-${block.blockId}`] = {
              type: 'box',
              xMin: block.startIndex - 0.5,
              xMax: block.endIndex + 0.5,
              yMin: 0,
              yScaleID: 'y',
              backgroundColor: blockTint(block.blockType, index),
              borderColor: blockBorder(block.blockType),
              borderWidth: 1,
              drawTime: 'beforeDatasetsDraw'
            }
            acc[`block-label-${block.blockId}`] = {
              type: 'label',
              xValue: (block.startIndex + block.endIndex) / 2,
              yValue: 0,
              yAdjust: -16,
              content: [
                block.blockName,
                `${props.weeks[block.startIndex]?.weekNumber ?? ''}-${props.weeks[block.endIndex]?.weekNumber ?? ''}`
              ],
              color: axisColor,
              font: {
                size: 9,
                weight: 'bold'
              },
              backgroundColor: 'rgba(15, 23, 42, 0)',
              textStrokeColor: 'rgba(15, 23, 42, 0)',
              padding: 0,
              textAlign: 'center',
              drawTime: 'beforeDatasetsDraw'
            }
            if (props.selectedWeekId) {
              const selectedIndex = props.weeks.findIndex(
                (week) => week.weekId === props.selectedWeekId
              )
              if (selectedIndex >= 0) {
                acc.selectedWeek = {
                  type: 'box',
                  xMin: selectedIndex - 0.5,
                  xMax: selectedIndex + 0.5,
                  yMin: 0,
                  yScaleID: 'y',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  borderColor: 'rgba(99, 102, 241, 0.35)',
                  borderWidth: 1,
                  drawTime: 'beforeDatasetsDraw'
                }
              }
            }
            return acc
          }, {})
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false
          },
          ticks: {
            color: axisColor,
            font: {
              size: 10,
              weight: 'bold' as const
            }
          },
          border: {
            display: false
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: {
            color: gridColor,
            drawTicks: false
          },
          ticks: {
            color: axisColor,
            font: {
              size: 10,
              weight: 'bold' as const
            },
            callback: (value: number) =>
              props.metric === 'tss' ? `${Math.round(value)}` : `${Math.round(value)}m`
          },
          border: {
            display: false
          }
        }
      }
    }
  })
</script>
