<script setup lang="ts">
  import type { BugStatus } from '@prisma/client'
  import { useDebounce } from '@vueuse/core'

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const page = ref(1)
  const limit = ref(50)
  const filterStatus = ref<BugStatus[]>(['OPEN', 'IN_PROGRESS', 'NEED_MORE_INFO'])
  const searchQuery = ref('')
  const debouncedSearch = useDebounce(searchQuery, 500)
  const viewMode = useCookie<'table' | 'card'>('admin-issues-view-mode', { default: () => 'table' })
  const groupByUser = useCookie<boolean>('admin-issues-group-by-user', { default: () => false })

  // Reset page when filter changes
  watch([filterStatus, debouncedSearch], () => {
    page.value = 1
  })

  const {
    data: reports,
    pending,
    refresh
  } = await useFetch<{
    count: number
    reports: any[]
    page: number
    limit: number
    totalPages: number
    stats: {
      open: number
      needMoreInfo: number
      resolved: number
      total: number
    }
  }>('/api/admin/issues' as any, {
    query: {
      page,
      limit,
      status: computed(() => filterStatus.value.join(',')),
      search: debouncedSearch
    },
    watch: [page, filterStatus, debouncedSearch]
  })

  const groupedReports = computed(() => {
    if (!reports.value?.reports) return []

    const groups = new Map<string, any[]>()

    // Group by email (or user id)
    for (const report of reports.value.reports) {
      const key = report.user.email || report.user.id
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(report)
    }

    // Convert to array and sort groups by the newest ticket in each group
    const result = Array.from(groups.entries()).map(([key, groupReports]) => {
      // Sort within group (newest first)
      groupReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return {
        key,
        user: groupReports[0].user,
        reports: groupReports,
        newestDate: new Date(groupReports[0].createdAt).getTime()
      }
    })

    // Sort groups by newest ticket overall
    result.sort((a, b) => b.newestDate - a.newestDate)

    return result
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

  function getSubscriptionTierColor(tier: string) {
    switch (tier) {
      case 'PRO':
        return 'primary'
      case 'SUPPORTER':
        return 'info'
      default:
        return 'neutral'
    }
  }

  function getSubscriptionStatusColor(status: string) {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'CANCELED':
        return 'warning'
      case 'PAST_DUE':
        return 'error'
      default:
        return 'neutral'
    }
  }

  const statusOptions = ['OPEN', 'IN_PROGRESS', 'NEED_MORE_INFO', 'RESOLVED', 'CLOSED']
</script>

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
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search tickets..."
              size="sm"
              class="w-64"
            >
              <template v-if="searchQuery" #trailing>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  size="xs"
                  @click="searchQuery = ''"
                />
              </template>
            </UInput>
            <UButton
              icon="i-heroicons-arrow-path"
              color="neutral"
              variant="ghost"
              :loading="pending"
              @click="() => refresh()"
            />
            <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
              <UButton
                v-if="viewMode === 'card'"
                icon="i-heroicons-users"
                :color="groupByUser ? 'primary' : 'neutral'"
                :variant="groupByUser ? 'solid' : 'ghost'"
                size="xs"
                title="Group by User"
                @click="groupByUser = !groupByUser"
              />
              <div
                v-if="viewMode === 'card'"
                class="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"
              ></div>
              <UButton
                icon="i-heroicons-list-bullet"
                :color="viewMode === 'table' ? 'primary' : 'neutral'"
                :variant="viewMode === 'table' ? 'solid' : 'ghost'"
                size="xs"
                @click="viewMode = 'table'"
              />
              <UButton
                icon="i-heroicons-squares-2x2"
                :color="viewMode === 'card' ? 'primary' : 'neutral'"
                :variant="viewMode === 'card' ? 'solid' : 'ghost'"
                size="xs"
                @click="viewMode = 'card'"
              />
            </div>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 space-y-6">
        <div v-if="reports" class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <UCard :ui="{ body: 'p-4' }">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-error-50 dark:bg-error-900/20 rounded-lg">
                <UIcon name="i-heroicons-exclamation-circle" class="size-5 text-error-500" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Open</p>
                <p class="text-xl font-black">{{ reports.stats.open }}</p>
              </div>
            </div>
          </UCard>
          <UCard :ui="{ body: 'p-4' }">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                <UIcon name="i-heroicons-clock" class="size-5 text-warning-500" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Needs Info
                </p>
                <p class="text-xl font-black">{{ reports.stats.needMoreInfo }}</p>
              </div>
            </div>
          </UCard>
          <UCard :ui="{ body: 'p-4' }">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-success-50 dark:bg-success-900/20 rounded-lg">
                <UIcon name="i-heroicons-check-circle" class="size-5 text-success-500" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Resolved
                </p>
                <p class="text-xl font-black">{{ reports.stats.resolved }}</p>
              </div>
            </div>
          </UCard>
          <UCard :ui="{ body: 'p-4' }">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <UIcon name="i-heroicons-funnel" class="size-5 text-gray-500" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Filtered
                </p>
                <p class="text-xl font-black">{{ reports.count }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <div
          v-if="!reports?.reports?.length"
          class="bg-white dark:bg-gray-800 rounded-lg shadow ring-1 ring-gray-200 dark:ring-gray-800 p-12 text-center text-sm text-gray-500"
        >
          No issues found.
        </div>

        <template v-else>
          <div
            v-if="viewMode === 'table'"
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
                        class="hover:text-primary transition-colors block break-words"
                        :title="report.title"
                      >
                        {{ report.title }}
                      </NuxtLink>
                      <p
                        class="mt-1 text-[10px] font-mono text-gray-500 dark:text-gray-400 break-all"
                      >
                        {{ report.id }}
                      </p>
                    </td>
                    <td
                      class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                    >
                      <div class="flex flex-col">
                        <div class="flex items-center gap-1.5">
                          <span class="text-gray-900 dark:text-white">{{ report.user.name }}</span>
                          <UBadge
                            :color="getSubscriptionTierColor(report.user.subscriptionTier)"
                            size="xs"
                            class="scale-75 origin-left"
                          >
                            {{ report.user.subscriptionTier || 'FREE' }}
                          </UBadge>
                        </div>
                        <span class="text-xs">{{ report.user.email }}</span>
                      </div>
                    </td>
                    <td
                      class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                    >
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

            <!-- Pagination inside table mode if needed -->
            <div
              v-if="reports && reports.totalPages > 1"
              class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end"
            >
              <UPagination v-model:page="page" :items-per-page="limit" :total="reports.count" />
            </div>
          </div>

          <div v-else>
            <template v-if="groupByUser">
              <div class="space-y-8">
                <div v-for="group in groupedReports" :key="group.key" class="space-y-4">
                  <div
                    class="flex items-center gap-3 pb-2 border-b border-gray-100 dark:border-gray-800"
                  >
                    <UAvatar
                      :src="group.user.image || undefined"
                      :alt="group.user.name || 'User'"
                      size="sm"
                    />
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="text-sm font-bold text-gray-900 dark:text-white">
                          {{ group.user.name || 'Unknown User' }}
                        </h3>
                        <div class="flex items-center gap-1">
                          <UBadge
                            :color="getSubscriptionTierColor(group.user.subscriptionTier)"
                            size="xs"
                            class="scale-90 origin-left"
                          >
                            {{ group.user.subscriptionTier || 'FREE' }}
                          </UBadge>
                          <UBadge
                            v-if="
                              group.user.subscriptionTier &&
                              group.user.subscriptionTier !== 'FREE' &&
                              group.user.subscriptionStatus
                            "
                            :color="getSubscriptionStatusColor(group.user.subscriptionStatus)"
                            variant="subtle"
                            size="xs"
                            class="scale-90 origin-left"
                          >
                            {{ group.user.subscriptionStatus }}
                          </UBadge>
                        </div>
                      </div>
                      <p class="text-xs text-gray-500">{{ group.user.email }}</p>
                    </div>
                    <UBadge color="neutral" variant="subtle" size="xs" class="ml-auto">
                      {{ group.reports.length }} ticket{{ group.reports.length !== 1 ? 's' : '' }}
                    </UBadge>
                  </div>

                  <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <UCard
                      v-for="report in group.reports"
                      :key="report.id"
                      class="flex flex-col relative group"
                      :ui="{
                        body: 'flex-1 flex flex-col p-4 sm:p-5',
                        header: 'p-4 sm:p-5 pb-0 sm:pb-0'
                      }"
                    >
                      <template #header>
                        <div class="flex items-center justify-between mb-2">
                          <div class="flex items-center gap-2">
                            <UBadge
                              :color="getStatusColor(report.status)"
                              variant="subtle"
                              size="xs"
                              >{{ report.status }}</UBadge
                            >
                            <UBadge
                              :color="getPriorityColor(report.priority || 'MEDIUM')"
                              variant="outline"
                              size="xs"
                              >{{ report.priority || 'MEDIUM' }}</UBadge
                            >
                          </div>
                          <p class="text-[10px] text-gray-400 italic">
                            {{ formatRelativeTime(report.createdAt) }}
                          </p>
                        </div>
                        <NuxtLink
                          :to="`/admin/issues/${report.id}`"
                          class="text-base font-bold text-gray-900 dark:text-white hover:text-primary transition-colors line-clamp-2"
                          :title="report.title"
                        >
                          {{ report.title }}
                        </NuxtLink>
                        <p
                          class="mt-1 text-[10px] font-mono text-gray-500 dark:text-gray-400 break-all"
                        >
                          ID: {{ report.id }}
                        </p>
                      </template>

                      <div class="flex-1">
                        <p class="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                          {{ report.description }}
                        </p>
                      </div>

                      <div
                        class="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3"
                      >
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <UAvatar
                              :src="report.user.image || undefined"
                              :alt="report.user.name || 'User'"
                              size="xs"
                            />
                            <div class="flex flex-col">
                              <div class="flex items-center gap-1.5">
                                <span
                                  class="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[120px]"
                                  >{{ report.user.name }}</span
                                >
                                <UBadge
                                  :color="getSubscriptionTierColor(report.user.subscriptionTier)"
                                  size="xs"
                                  class="scale-75 origin-left"
                                >
                                  {{ report.user.subscriptionTier || 'FREE' }}
                                </UBadge>
                              </div>
                              <span class="text-[10px] text-gray-500 truncate max-w-[120px]">{{
                                report.user.email
                              }}</span>
                            </div>
                          </div>
                          <div class="text-right">
                            <template v-if="(report as any).comments?.length">
                              <UBadge
                                :color="(report as any).comments[0].isAdmin ? 'neutral' : 'primary'"
                                variant="soft"
                                size="xs"
                                class="flex items-center gap-1"
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
                              <p class="text-[10px] text-gray-400 mt-0.5 italic">
                                {{ formatRelativeTime((report as any).comments[0].createdAt) }}
                              </p>
                            </template>
                            <template v-else>
                              <span class="text-[10px] text-gray-400 italic block mt-1"
                                >No replies</span
                              >
                            </template>
                          </div>
                        </div>
                      </div>
                    </UCard>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <UCard
                  v-for="report in reports?.reports"
                  :key="report.id"
                  class="flex flex-col relative group"
                  :ui="{
                    body: 'flex-1 flex flex-col p-4 sm:p-5',
                    header: 'p-4 sm:p-5 pb-0 sm:pb-0'
                  }"
                >
                  <template #header>
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <UBadge :color="getStatusColor(report.status)" variant="subtle" size="xs">{{
                          report.status
                        }}</UBadge>
                        <UBadge
                          :color="getPriorityColor(report.priority || 'MEDIUM')"
                          variant="outline"
                          size="xs"
                          >{{ report.priority || 'MEDIUM' }}</UBadge
                        >
                      </div>
                      <p class="text-[10px] text-gray-400 italic">
                        {{ formatRelativeTime(report.createdAt) }}
                      </p>
                    </div>
                    <NuxtLink
                      :to="`/admin/issues/${report.id}`"
                      class="text-base font-bold text-gray-900 dark:text-white hover:text-primary transition-colors line-clamp-2"
                      :title="report.title"
                    >
                      {{ report.title }}
                    </NuxtLink>
                    <p
                      class="mt-1 text-[10px] font-mono text-gray-500 dark:text-gray-400 break-all"
                    >
                      ID: {{ report.id }}
                    </p>
                  </template>

                  <div class="flex-1">
                    <p class="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                      {{ report.description }}
                    </p>
                  </div>

                  <div class="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <UAvatar
                          :src="report.user.image || undefined"
                          :alt="report.user.name || 'User'"
                          size="xs"
                        />
                        <div class="flex flex-col">
                          <div class="flex items-center gap-1.5">
                            <span
                              class="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[120px]"
                              >{{ report.user.name }}</span
                            >
                            <UBadge
                              :color="getSubscriptionTierColor(report.user.subscriptionTier)"
                              size="xs"
                              class="scale-75 origin-left"
                            >
                              {{ report.user.subscriptionTier || 'FREE' }}
                            </UBadge>
                          </div>
                          <span class="text-[10px] text-gray-500 truncate max-w-[120px]">{{
                            report.user.email
                          }}</span>
                        </div>
                      </div>
                      <div class="text-right">
                        <template v-if="(report as any).comments?.length">
                          <UBadge
                            :color="(report as any).comments[0].isAdmin ? 'neutral' : 'primary'"
                            variant="soft"
                            size="xs"
                            class="flex items-center gap-1"
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
                          <p class="text-[10px] text-gray-400 mt-0.5 italic">
                            {{ formatRelativeTime((report as any).comments[0].createdAt) }}
                          </p>
                        </template>
                        <template v-else>
                          <span class="text-[10px] text-gray-400 italic block mt-1"
                            >No replies</span
                          >
                        </template>
                      </div>
                    </div>
                  </div>
                </UCard>
              </div>
            </template>

            <!-- Pagination inside card mode -->
            <div v-if="reports && reports.totalPages > 1" class="px-6 py-4 flex justify-end mt-4">
              <UPagination v-model:page="page" :items-per-page="limit" :total="reports.count" />
            </div>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
