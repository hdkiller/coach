import type { RecoveryContextItem } from '~/types/recovery-context'

export type WellnessOverlayEvent = RecoveryContextItem

function toDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 10)
}

function getVisibleRangeIndices(
  dateKeys: string[],
  event: RecoveryContextItem
): { start: number; end: number } | null {
  const eventStart = toDateKey(event.startAt)
  const eventEnd = toDateKey(event.endAt)

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

function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
  event: RecoveryContextItem
) {
  const markerTop = top + 10
  const markerBottom = bottom - 8

  ctx.strokeStyle = event.color || 'rgba(20, 184, 166, 0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, markerTop)
  ctx.lineTo(x, markerBottom)
  ctx.stroke()

  ctx.fillStyle = event.color || 'rgba(20, 184, 166, 0.85)'
  ctx.beginPath()
  ctx.arc(x, markerTop + 6, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(15, 23, 42, 0.86)'
  ctx.font = '600 10px sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillText(event.label, x + 6, markerTop)
}

export const wellnessOverlayPlugin = {
  id: 'wellnessOverlays',
  beforeDatasetsDraw(chart: any, _args: unknown, pluginOptions: any) {
    const { chartArea, ctx, scales } = chart
    const events = (pluginOptions?.events || []) as RecoveryContextItem[]
    const dateKeys = (pluginOptions?.dateKeys || []) as string[]

    if (!chartArea || !ctx || !scales?.x || !events.length || !dateKeys.length) return

    const xScale = scales.x

    ctx.save()

    for (const event of events) {
      const visibleRange = getVisibleRangeIndices(dateKeys, event)
      if (!visibleRange) continue

      if (event.overlayStyle === 'marker' || !event.isRange) {
        const markerX = getCenter(xScale, visibleRange.start)
        drawMarker(ctx, markerX, chartArea.top, chartArea.bottom, event)
        continue
      }

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
  events: RecoveryContextItem[],
  value: string | Date | null | undefined
) {
  if (!value) return []

  const dateKey = toDateKey(value)
  return events.filter((event) => {
    const start = toDateKey(event.startAt)
    const end = toDateKey(event.endAt)
    return start <= dateKey && end >= dateKey
  })
}
