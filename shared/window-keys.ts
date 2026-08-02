/**
 * Canonical DAILY_BASE window-key derivation, shared between server and app code.
 *
 * Three copies of this slugifier used to exist (day-plan generator, metabolicService, and
 * WeeklyPlanDashboard) and they disagreed on edge punctuation — 'Lunch!' produced
 * 'DAILY_BASE:lunch-' in two of them and 'DAILY_BASE:lunch' in the generator, which silently
 * unlinked a locked meal from its window. Every layer must derive keys from this module only.
 */

/** A name with no usable characters at all still needs a key it can be found by. */
export const FALLBACK_SLOT_SLUG = 'slot'

export function slugifySlot(name: string) {
  const slug = (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || FALLBACK_SLOT_SLUG
}

/** Key for a DAILY_BASE window; windows with no slot at all keep the legacy bare key. */
export function dailyBaseWindowKey(slotName?: string | null) {
  const raw = (slotName || '').trim()
  return raw ? `DAILY_BASE:${slugifySlot(raw)}` : 'DAILY_BASE'
}

/**
 * Stable identity of a fueling window. Several windows of the same type can exist on one day
 * (two sessions ⇒ two PRE_WORKOUT windows), so the bare type is not an identity; windows
 * persisted before stable keys existed carry no ordinal and are treated as the first.
 */
export function resolveWindowKey(
  window:
    { windowKey?: unknown; type?: unknown; slotName?: unknown; label?: unknown } | null | undefined
) {
  if (!window) return ''
  if (window.windowKey) return String(window.windowKey)
  const type = String(window.type || '')
  if (!type) return ''
  if (type === 'DAILY_BASE') {
    return dailyBaseWindowKey(String(window.slotName || window.label || ''))
  }
  return `${type}#1`
}
