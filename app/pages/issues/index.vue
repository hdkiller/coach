<script setup lang="ts">
  import { useDebounce } from '@vueuse/core'
  import IssueFormModal from '~/components/issues/IssueFormModal.vue'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'My Issues',
    meta: [
      {
        name: 'description',
        content: 'View and track your reported issues.'
      }
    ]
  })

  // State
  const page = ref(1)
  const limit = ref(10)
  const filterStatus = ref('ALL')
  const searchQuery = ref('')
  const debouncedSearch = useDebounce(searchQuery, 500)
  const showReportModal = ref(false)

  // Fetching
  const {
    data: reportsData,
    pending,
    refresh
  } = await useFetch('/api/issues' as any, {
    query: {
      page,
      limit,
      status: computed(() => (filterStatus.value === 'ALL' ? undefined : filterStatus.value)),
      search: debouncedSearch
    },
    watch: [page, filterStatus, debouncedSearch]
  })

  // Reset page on filter/search change
  watch([filterStatus, debouncedSearch], () => {
    page.value = 1
  })

  const statusOptions = [
    { label: 'All Status', value: 'ALL' },
    { label: 'Open', value: 'OPEN' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Need Info', value: 'NEED_MORE_INFO' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Closed', value: 'CLOSED' }
  ]

  const filteredReports = computed(() => reportsData.value?.items || [])

  // Summary stats from API
  const stats = computed(() => {
    return reportsData.value?.stats || { total: 0, active: 0, resolved: 0 }
  })

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

  const { formatDate } = useFormat()
</script>

<template>
  <UDashboardPanel id="user-issues">
    <template #header>
      <UDashboardNavbar title="Issues">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <ClientOnly>
            <DashboardTriggerMonitorButton />
            <NotificationDropdown />
          </ClientOnly>
          <UButton
            color="primary"
            variant="solid"
            icon="i-heroicons-plus"
            size="sm"
            class="font-bold"
            @click="showReportModal = true"
          >
            <span class="hidden sm:inline">New Issue</span>
            <span class="sm:hidden">Add</span>
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-6 max-w-4xl mx-auto pb-24">
        <!-- Branding Header -->
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Issues
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Bug Tracking & Resolution Integrity
          </p>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UCard :ui="{ body: 'p-4' }">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <UIcon name="i-heroicons-ticket" class="size-5 text-gray-500" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Total Issues
                </p>
                <p class="text-xl font-black">{{ stats.total }}</p>
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
                  Active Issues
                </p>
                <p class="text-xl font-black">{{ stats.active }}</p>
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
                <p class="text-xl font-black text-success-600 dark:text-success-400">
                  {{ stats.resolved }}
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Toolbar -->
        <UDashboardToolbar class="p-0 border-none">
          <template #left>
            <USelect
              v-model="filterStatus"
              :items="statusOptions"
              size="sm"
              class="w-40"
              color="neutral"
              variant="outline"
            />
          </template>
          <template #right>
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search issues..."
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
          </template>
        </UDashboardToolbar>

        <!-- Tickets Grid -->
        <div v-if="pending" class="flex flex-col gap-4">
          <USkeleton v-for="i in 3" :key="i" class="h-20 w-full rounded-xl" />
        </div>

        <div
          v-else-if="!filteredReports.length"
          class="py-24 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700"
        >
          <UIcon
            name="i-heroicons-ticket"
            class="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4"
          />
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">No issues found</h2>
          <p class="text-gray-500 mt-2">Adjust your filters or report a new issue.</p>
        </div>

        <div v-else class="space-y-4">
          <div class="grid grid-cols-1 gap-4">
            <UCard
              v-for="report in filteredReports"
              :key="report.id"
              class="hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group"
              @click="navigateTo(`/issues/${report.id}`)"
            >
              <div class="flex items-center justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3
                      class="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-primary-500 transition-colors"
                    >
                      {{ report.title }}
                    </h3>
                    <UBadge :color="getStatusColor(report.status)" variant="subtle" size="xs">
                      {{ report.status.replace('_', ' ') }}
                    </UBadge>
                  </div>
                  <p class="text-sm text-gray-500 line-clamp-1">
                    {{ report.description }}
                  </p>
                  <div
                    class="flex items-center gap-4 mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400"
                  >
                    <span class="flex items-center gap-1.5">
                      <UIcon name="i-heroicons-calendar" class="size-3.5" />
                      {{ formatDate(report.createdAt, 'MMM d, yyyy') }}
                    </span>
                    <span v-if="(report as any)._count?.comments" class="flex items-center gap-1.5">
                      <UIcon name="i-heroicons-chat-bubble-left-right" class="size-3.5" />
                      {{ (report as any)._count.comments }} Updates
                    </span>
                  </div>
                </div>
                <UIcon
                  name="i-heroicons-chevron-right"
                  class="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all"
                />
              </div>
            </UCard>
          </div>

          <!-- Pagination -->
          <div v-if="reportsData?.totalPages > 1" class="flex justify-center mt-8">
            <UPagination
              v-model="page"
              :page-count="limit"
              :total="reportsData.total"
              :ui="{
                wrapper: 'flex items-center gap-1',
                rounded: 'rounded-full'
              }"
            />
          </div>
        </div>
      </div>

      <IssueFormModal v-model:open="showReportModal" @success="refresh" />
    </template>
  </UDashboardPanel>
</template>
