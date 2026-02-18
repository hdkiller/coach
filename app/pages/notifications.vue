<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  const notificationStore = useNotificationStore()
  const { notifications, loading, total, unreadCount } = storeToRefs(notificationStore)

  const page = ref(1)
  const limit = 20

  onMounted(() => {
    notificationStore.fetchNotifications(page.value, limit)
  })

  watch(page, () => {
    notificationStore.fetchNotifications(page.value, limit)
  })

  async function handleMarkRead(id: string) {
    await notificationStore.markAsRead(id)
  }

  async function handleMarkAllRead() {
    await notificationStore.markAllAsRead()
  }

  function handleNotificationClick(n: any) {
    handleMarkRead(n.id)
    if (n.link) {
      navigateTo(n.link)
    }
  }

  const { formatDate } = useFormat()
</script>

<template>
  <UDashboardPanel id="notifications">
    <template #header>
      <UDashboardNavbar title="Notifications">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-3">
            <UButton
              v-if="unreadCount > 0"
              label="Mark all as read"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-check-circle"
              @click="handleMarkAllRead"
            />
            <UButton
              icon="i-heroicons-arrow-path"
              color="neutral"
              variant="ghost"
              :loading="loading"
              @click="notificationStore.fetchNotifications(page, limit)"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <div v-if="loading && notifications.length === 0" class="flex flex-col gap-4">
          <USkeleton v-for="i in 5" :key="i" class="h-24 w-full rounded-xl" />
        </div>

        <div v-else-if="notifications.length === 0" class="py-24 text-center">
          <UIcon
            name="i-heroicons-bell-slash"
            class="w-16 h-16 text-gray-200 dark:text-gray-800 mx-auto mb-4"
          />
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">All caught up!</h2>
          <p class="text-gray-500 mt-2">You don't have any notifications right now.</p>
        </div>

        <div v-else class="space-y-3">
          <UCard
            v-for="notification in notifications"
            :key="notification.id"
            :ui="{ body: 'p-4 sm:p-5' }"
            class="transition-all cursor-pointer hover:ring-2 hover:ring-primary-500/50"
            :class="{
              'bg-primary-50/20 dark:bg-primary-900/5 ring-1 ring-primary-100 dark:ring-primary-900/50':
                !notification.read
            }"
            @click="handleNotificationClick(notification)"
          >
            <div class="flex gap-4 items-start">
              <div
                class="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                :class="
                  notification.read
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    : 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                "
              >
                <UIcon :name="notification.icon || 'i-heroicons-bell'" class="w-5 h-5" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <h3 class="text-base font-bold text-gray-900 dark:text-white truncate">
                    {{ notification.title }}
                  </h3>
                  <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    {{ formatDate(notification.createdAt, 'PPPP p') }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {{ notification.message }}
                </p>

                <div class="mt-3 flex items-center gap-4">
                  <UButton
                    v-if="notification.link"
                    label="View Details"
                    variant="link"
                    size="xs"
                    :padded="false"
                    class="font-bold"
                  />
                  <UButton
                    v-if="!notification.read"
                    label="Mark as read"
                    variant="link"
                    color="neutral"
                    size="xs"
                    :padded="false"
                    @click.stop="handleMarkRead(notification.id)"
                  />
                </div>
              </div>

              <div v-if="!notification.read" class="shrink-0 pt-1">
                <div class="w-3 h-3 bg-primary-500 rounded-full shadow-sm animate-pulse" />
              </div>
            </div>
          </UCard>

          <div v-if="total > limit" class="flex justify-center pt-8">
            <UPagination v-model:page="page" :total="total" :items-per-page="limit" />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
