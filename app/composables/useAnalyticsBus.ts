import { createEventHook } from '@vueuse/core'

/**
 * Global Event Bus for Analytics Interactions.
 * Enables synchronized scrubbing, zooming, and selection across widgets.
 */

// Event: Scrubbing (Hover)
// Payload: { x: number, lat?: number, lng?: number, workoutId: string, index: number }
const scrubHook = createEventHook<{
  x: number
  lat?: number
  lng?: number
  workoutId: string
  index: number
}>()

// Event: Range Selection
// Payload: { startX: number, endX: number, workoutId: string }
const selectionHook = createEventHook<{
  startX: number
  endX: number
  workoutId: string
}>()

// Event: Zoom
// Payload: { startX: number, endX: number, workoutId: string }
const zoomHook = createEventHook<{
  startX: number
  endX: number
  workoutId: string
}>()

export const useAnalyticsBus = () => {
  return {
    onScrub: scrubHook.on,
    triggerScrub: scrubHook.trigger,

    onSelection: selectionHook.on,
    triggerSelection: selectionHook.trigger,

    onZoom: zoomHook.on,
    triggerZoom: zoomHook.trigger
  }
}
