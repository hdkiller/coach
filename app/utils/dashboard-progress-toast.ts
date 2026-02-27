type ToastInstance = ReturnType<typeof useToast>
type ToastPayload = Parameters<ToastInstance['add']>[0]

export const DASHBOARD_PROGRESS_TOAST_ID = 'dashboard-progress'

export function showDashboardProgressToast(
  toast: ToastInstance,
  payload: ToastPayload,
  source = 'unknown'
) {
  const hasExisting = toast.toasts.value.some((t) => t.id === DASHBOARD_PROGRESS_TOAST_ID)
  const duration = payload.duration ?? 2_500

  if (import.meta.client) {
    const now = new Date().toISOString()
    console.info('[dashboard-toast-debug] update:start', {
      at: now,
      source,
      id: DASHBOARD_PROGRESS_TOAST_ID,
      title: payload.title,
      color: payload.color,
      duration,
      mode: hasExisting ? 'update' : 'add'
    })
  }

  if (hasExisting) {
    toast.update(DASHBOARD_PROGRESS_TOAST_ID, {
      ...payload,
      duration
    })
  } else {
    toast.add({
      ...payload,
      id: DASHBOARD_PROGRESS_TOAST_ID,
      duration
    })
  }

  if (import.meta.client) {
    console.info('[dashboard-toast-debug] update:applied', {
      source,
      id: DASHBOARD_PROGRESS_TOAST_ID,
      title: payload.title,
      duration,
      mode: hasExisting ? 'update' : 'add'
    })
  }
}
