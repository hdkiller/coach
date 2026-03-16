export interface WellnessOverlayEvent {
  id: string
  label: string
  kind: string
  source: 'wellness_tag' | 'calendar_note'
  startDate: string
  endDate: string
  color: string
  description?: string | null
}

function toDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 10)
}

function getVisibleRangeIndices(
  dateKeys: string[],
  event: WellnessOverlayEvent
): { start: number; end: number } | null {
  const eventStart = toDateKey(event.startDate)
  const eventEnd = toDateKey(event.endDate)

  let start = -1
  let end = -1

  for (let index = 0; index < dateKeys.length; index++) {
    const dateKey = dateKeys[index]
    if (!dateKey) continue
    if (dateKey >= eventStart && dateKey <= eventEnd) {
      if (start === -1) start = index
      end = index
    }
  }

  if (start === -1 || end === -1) return null
  return { start, end }
}

function getCenter(xScale: any, index: number) {
  return xScale.getPixelForValue(index)
}

function getBoxBounds(xScale: any, index: number, count: number) {
  const center = getCenter(xScale, index)
  const previousCenter =
    index > 0
      ? getCenter(xScale, index - 1)
      : center - (count > 1 ? getCenter(xScale, 1) - center : xScale.width)
  const nextCenter =
    index < count - 1
      ? getCenter(xScale, index + 1)
      : center + (count > 1 ? center - getCenter(xScale, index - 1) : xScale.width)

  return {
    left: (previousCenter + center) / 2,
    right: (center + nextCenter) / 2
  }
}

export const wellnessOverlayPlugin = {
  id: 'wellnessOverlays',
  beforeDatasetsDraw(chart: any, _args: unknown, pluginOptions: any) {
    const { chartArea, ctx, scales } = chart
    const events = (pluginOptions?.events || []) as WellnessOverlayEvent[]
    const dateKeys = (pluginOptions?.dateKeys || []) as string[]

    if (!chartArea || !ctx || !scales?.x || !events.length || !dateKeys.length) return

    const xScale = scales.x

    ctx.save()

    for (const event of events) {
      const visibleRange = getVisibleRangeIndices(dateKeys, event)
      if (!visibleRange) continue

      const startBounds = getBoxBounds(xScale, visibleRange.start, dateKeys.length)
      const endBounds = getBoxBounds(xScale, visibleRange.end, dateKeys.length)

      ctx.fillStyle = event.color || 'rgba(148, 163, 184, 0.12)'
      ctx.fillRect(
        startBounds.left,
        chartArea.top,
        endBounds.right - startBounds.left,
        chartArea.bottom - chartArea.top
      )

      if (visibleRange.start === visibleRange.end) continue
      if (endBounds.right - startBounds.left < 44) continue

      ctx.fillStyle = 'rgba(100, 116, 139, 0.9)'
      ctx.font = '600 10px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(event.label, startBounds.left + 6, chartArea.top + 6)
    }

    ctx.restore()
  }
}

export function getWellnessEventsForDate(
  events: WellnessOverlayEvent[],
  value: string | Date | null | undefined
) {
  if (!value) return []

  const dateKey = toDateKey(value)
  return events.filter((event) => {
    const start = toDateKey(event.startDate)
    const end = toDateKey(event.endDate)
    return start <= dateKey && end >= dateKey
  })
}
