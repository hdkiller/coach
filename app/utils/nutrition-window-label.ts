/**
 * The heading shown for a fueling window.
 *
 * A window carries two names. `slotName` is what the athlete called the slot in their meal pattern.
 * `label` is a display string derived when the plan was generated, and it can disagree: stored
 * plans exist where a 15:00 slot named "Snack" carries `label: "Lunch"`, because the generator fell
 * back to a time-of-day band (`getMealSlotName` treats 11:00-16:00 as lunch) on a window whose slot
 * name it had not looked at. Rendering `label` first put two "Lunch" headings on the same day.
 *
 * For a baseline window the configured name wins - it is the athlete's own word for that meal, and
 * it is what the window key is built from. Workout windows have no slot name and carry the richer
 * derived label ("Pre-Workout Breakfast"), so there `label` still leads.
 */
export function normalizeWindowLabel(window: {
  type?: string | null
  label?: string | null
  slotName?: string | null
}): string {
  const preferred =
    window?.type === 'DAILY_BASE'
      ? window?.slotName || window?.label
      : window?.label || window?.slotName

  const raw = String(preferred || window?.type || 'Window')
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
}
