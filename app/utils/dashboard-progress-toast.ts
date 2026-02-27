type ToastInstance = ReturnType<typeof useToast>
type ToastPayload = Parameters<ToastInstance['add']>[0]

export const DASHBOARD_PROGRESS_TOAST_ID = 'dashboard-progress'

export function showDashboardProgressToast(toast: ToastInstance, payload: ToastPayload) {
  toast.remove(DASHBOARD_PROGRESS_TOAST_ID)
  toast.add({
    ...payload,
    id: DASHBOARD_PROGRESS_TOAST_ID
  })
}
