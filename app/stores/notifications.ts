import { defineStore } from 'pinia'

export interface UserNotification {
  id: string
  userId: string
  title: string
  message: string
  icon?: string
  link?: string
  read: boolean
  createdAt: string
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<UserNotification[]>([])
  const unreadCount = ref(0)
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchNotifications = async (page = 1, limit = 20) => {
    loading.value = true
    error.value = null
    try {
      const data = await ($fetch as any)('/api/notifications', {
        query: { page, limit }
      })
      notifications.value = data.notifications
      total.value = data.total
      unreadCount.value = data.unreadCount
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      error.value = 'Failed to load notifications'
    } finally {
      loading.value = false
    }
  }

  const markAsRead = async (id: string) => {
    const n = notifications.value.find((n) => n.id === id)
    const wasUnread = !!n && !n.read

    // Optimistically flip local/store state first so the badge count and
    // read styling update immediately, before the network round-trip
    // resolves. This also means callers that `await markAsRead(id)` before
    // navigating still see the optimistic UI update right away, while the
    // actual API call below is guaranteed to complete (or fail) before that
    // await resolves - it is never left dangling/cancelled by a route change.
    if (n && wasUnread) {
      n.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    try {
      await ($fetch as any)('/api/notifications/read', {
        method: 'PATCH',
        body: { id }
      })
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      // Roll back the optimistic update since the server never persisted it.
      if (n && wasUnread) {
        n.read = false
        unreadCount.value++
      }
    }
  }

  const markAllAsRead = async () => {
    try {
      await ($fetch as any)('/api/notifications/read', {
        method: 'PATCH',
        body: { all: true }
      })
      notifications.value.forEach((n) => (n.read = true))
      unreadCount.value = 0
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const addNotification = (notification: UserNotification) => {
    const existingIndex = notifications.value.findIndex((item) => item.id === notification.id)

    if (existingIndex !== -1) {
      notifications.value[existingIndex] = notification
      return false
    }

    notifications.value.unshift(notification)
    unreadCount.value++
    total.value++
    return true
  }

  return {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification
  }
})
