import { prisma } from './db'
import { sendToUser } from '../api/websocket'

export interface NotificationData {
  title: string
  message: string
  icon?: string
  link?: string
}

/**
 * Creates a notification in the database and sends it via WebSocket if the user is connected.
 */
export async function createUserNotification(userId: string, data: NotificationData) {
  try {
    const notification = await prisma.userNotification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        icon: data.icon,
        link: data.link
      }
    })

    // Send real-time update via WebSocket
    sendToUser(userId, {
      type: 'notification_new',
      notification: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        icon: notification.icon,
        link: notification.link,
        createdAt: notification.createdAt,
        read: notification.read
      }
    })

    return notification
  } catch (error) {
    console.error(`Failed to create notification for user ${userId}:`, error)
    throw error
  }
}

/**
 * Marks all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(userId: string) {
  return await prisma.userNotification.updateMany({
    where: { userId, read: false },
    data: { read: true }
  })
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(userId: string, notificationId: string) {
  return await prisma.userNotification.update({
    where: { id: notificationId, userId },
    data: { read: true }
  })
}
