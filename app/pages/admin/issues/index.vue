<template>
  <UDashboardPanel id="bug-reports">
    <template #header>
      <UDashboardNavbar title="Tickets">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-3">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
              <NotificationDropdown />
            </ClientOnly>
            <USelectMenu
              v-model="filterStatus"
              placeholder="Filter by Status"
              :items="statusOptions"
              multiple
              class="w-48"
            />
            <UButton
              icon="i-heroicons-arrow-path"
              color="neutral"
              variant="ghost"
              :loading="pending"
              @click="() => refresh()"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 space-y-6">
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden"
        >
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Priority
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Last Reply
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    User
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th scope="col" class="relative px-6 py-3">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody
                class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
              >
                <tr v-if="!reports?.reports?.length">
                  <td
                    colspan="7"
                    class="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No issues found.
                  </td>
                </tr>
                <tr
                  v-for="report in reports?.reports"
                  :key="report.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <UBadge :color="getStatusColor(report.status)" variant="subtle">{{
                      report.status
                    }}</UBadge>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <UBadge
                      :color="getPriorityColor(report.priority || 'MEDIUM')"
                      variant="outline"
                      >{{ report.priority || 'MEDIUM' }}</UBadge
                    >
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <template v-if="(report as any).comments?.length">
                      <UBadge
                        :color="(report as any).comments[0].isAdmin ? 'neutral' : 'primary'"
                        variant="soft"
                        size="xs"
                        class="flex items-center gap-1 w-fit"
                      >
                        <UIcon
                          :name="
                            (report as any).comments[0].isAdmin
                              ? 'i-heroicons-user-circle'
                              : 'i-heroicons-chat-bubble-left'
                          "
                        />
                        {{ (report as any).comments[0].isAdmin ? 'Support' : 'User' }}
                      </UBadge>
                      <p class="text-[10px] text-gray-400 mt-1 italic">
                        {{ formatRelativeTime((report as any).comments[0].createdAt) }}
                      </p>
                    </template>
                    <template v-else>
                      <span class="text-[10px] text-gray-400 italic">No replies</span>
                    </template>
                  </td>
                  <td
                    class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white max-w-[200px] sm:max-w-[400px]"
                  >
                    <NuxtLink
                      :to="`/admin/issues/${report.id}`"
                      class="hover:text-primary transition-colors truncate block"
                      :title="report.title"
                    >
                      {{ report.title }}
                    </NuxtLink>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div class="flex flex-col">
                      <span class="text-gray-900 dark:text-white">{{ report.user.name }}</span>
                      <span class="text-xs">{{ report.user.email }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <p>{{ formatDateTime(report.createdAt) }}</p>
                    <p class="text-[10px] italic mt-0.5">
                      {{ formatRelativeTime(report.createdAt) }}
                    </p>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-eye-20-solid"
                      :to="`/admin/issues/${report.id}`"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination -->
          <div
            v-if="(reports?.totalPages ?? 0) > 1"
            class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end"
          >
            <UPagination v-model="page" :page-count="limit" :total="reports?.count || 0" />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import type { BugStatus } from '@prisma/client'

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const page = ref(1)
  const limit = 25
  const filterStatus = ref<BugStatus[]>(['OPEN', 'IN_PROGRESS', 'NEED_MORE_INFO'])

  // Reset page when filter changes
  watch(filterStatus, () => {
    page.value = 1
  })

  const {
    data: reports,
    pending,
    refresh
  } = await useFetch('/api/admin/issues', {
    query: {
      page,
      limit,
      status: computed(() => filterStatus.value.join(','))
    },
    watch: [page, filterStatus]
  })

  const { formatDateTime, formatRelativeTime } = useFormat()

  function getStatusColor(status: string) {
    switch (status) {
      case 'OPEN':
        return 'error'
      case 'IN_PROGRESS':
        return 'warning'
      case 'NEED_MORE_INFO':
        return 'info'
      case 'RESOLVED':
        return 'success'
      case 'CLOSED':
        return 'neutral'
      default:
        return 'neutral'
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'URGENT':
        return 'error'
      case 'HIGH':
        return 'warning'
      case 'MEDIUM':
        return 'primary'
      case 'LOW':
        return 'neutral'
      default:
        return 'neutral'
    }
  }

  const statusOptions = ['OPEN', 'IN_PROGRESS', 'NEED_MORE_INFO', 'RESOLVED', 'CLOSED']
</script>
