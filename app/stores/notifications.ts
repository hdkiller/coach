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

  const fetchNotifications = async (page = 1, limit = 20) => {
    loading.value = true
    try {
      const data = await $fetch<any>('/api/notifications', {
        query: { page, limit }
      })
      notifications.value = data.notifications
      total.value = data.total
      unreadCount.value = data.unreadCount
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      loading.value = false
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await $fetch('/api/notifications/read', {
        method: 'PATCH',
        body: { id }
      })
      const n = notifications.value.find((n) => n.id === id)
      if (n && !n.read) {
        n.read = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await $fetch('/api/notifications/read', {
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
    notifications.value.unshift(notification)
    unreadCount.value++
    total.value++
  }

  return {
    notifications,
    unreadCount,
    total,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification
  }
})
