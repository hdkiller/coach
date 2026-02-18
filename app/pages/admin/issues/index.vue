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
            <USelect
              v-model="filterStatus"
              placeholder="Filter by Status"
              :items="statusOptions"
              class="w-40"
              clearable
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
                    colspan="6"
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
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"
                  >
                    <NuxtLink
                      :to="`/admin/issues/${report.id}`"
                      class="hover:text-primary transition-colors"
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
                    {{ new Date(report.createdAt).toLocaleDateString() }}
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
            <UPagination v-model:page="page" :items-per-page="limit" :total="reports?.count || 0" />
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
  const limit = 10
  const filterStatus = ref<string | undefined>()

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
      status: filterStatus
    },
    watch: [page, filterStatus]
  })

  function getStatusColor(status: string) {
    switch (status) {
      case 'OPEN':
        return 'error'
      case 'IN_PROGRESS':
        return 'warning'
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

  const statusOptions = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
</script>
