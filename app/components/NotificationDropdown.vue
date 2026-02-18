<script setup lang="ts">
  const notificationStore = useNotificationStore()
  const { notifications, unreadCount, loading } = storeToRefs(notificationStore)

  const isOpen = ref(false)

  onMounted(() => {
    notificationStore.fetchNotifications()
  })

  function handleNotificationClick(notification: any) {
    notificationStore.markAsRead(notification.id)
    if (notification.link) {
      navigateTo(notification.link)
      isOpen.value = false
    }
  }

  const { formatDate } = useFormat()
</script>

<template>
  <UPopover v-model:open="isOpen" :content="{ align: 'end', side: 'bottom', sideOffset: 8 }">
    <UButton
      icon="i-heroicons-bell"
      color="neutral"
      variant="outline"
      size="sm"
      class="font-bold"
      aria-label="Notifications"
    >
      <span class="hidden md:inline">Notifications</span>
      <template v-if="unreadCount > 0" #trailing>
        <UBadge color="error" size="xs" :ui="{ base: 'rounded-full' }" class="-ml-1">
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </UBadge>
      </template>
    </UButton>

    <template #content>
      <div class="flex flex-col w-80 sm:w-96 max-h-[32rem]">
        <div
          class="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10 rounded-t-lg"
        >
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
          <UButton
            v-if="unreadCount > 0"
            variant="link"
            size="xs"
            color="primary"
            :padded="false"
            @click="notificationStore.markAllAsRead"
          >
            Mark all as read
          </UButton>
        </div>

        <div class="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
          <div v-if="loading && notifications.length === 0" class="p-8 flex justify-center">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
          </div>

          <div v-else-if="notifications.length === 0" class="p-12 text-center">
            <UIcon
              name="i-heroicons-bell-slash"
              class="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-3"
            />
            <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">No notifications yet</p>
          </div>

          <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="relative p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 flex gap-3 items-start"
              :class="{ 'bg-primary-50/30 dark:bg-primary-900/10': !notification.read }"
              @click="handleNotificationClick(notification)"
            >
              <div
                class="mt-1 flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                :class="
                  notification.read
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    : 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                "
              >
                <UIcon :name="notification.icon || 'i-heroicons-bell'" class="w-4 h-4" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {{ notification.title }}
                  </p>
                  <span class="text-[10px] text-gray-500 dark:text-gray-400 shrink-0">
                    {{ formatDate(notification.createdAt, 'MMM d, HH:mm') }}
                  </span>
                </div>
                <p
                  class="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed"
                >
                  {{ notification.message }}
                </p>
              </div>

              <div v-if="!notification.read" class="absolute top-4 right-2">
                <div class="w-2 h-2 bg-primary-500 rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        <div
          class="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-center rounded-b-lg"
        >
          <UButton
            to="/notifications"
            variant="ghost"
            color="neutral"
            size="xs"
            class="w-full justify-center"
            @click="isOpen = false"
          >
            View all notifications
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
