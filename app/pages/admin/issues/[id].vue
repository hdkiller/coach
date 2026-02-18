<script setup lang="ts">
  import type { BugStatus } from '@prisma/client'
  import AdminUserIssuesCard from '~/components/admin/AdminUserIssuesCard.vue'

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const route = useRoute()
  const id = route.params.id as string
  const toast = useToast()

  const { data: report, refresh: refreshReport } = await useFetch(`/api/admin/issues/${id}`)
  const { data: comments, refresh: refreshComments } = await useFetch(
    `/api/admin/issues/${id}/comments`
  )

  const statusOptions = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
  const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

  const dropdownItems = computed(() => [
    statusOptions.map((s) => ({
      label: s,
      onSelect: () => updateStatus(s)
    }))
  ])

  async function updateStatus(newStatus: string) {
    try {
      await $fetch(`/api/admin/issues/${id}`, {
        method: 'PUT',
        body: { status: newStatus }
      })
      toast.add({ title: 'Status updated', color: 'success' })
      refreshReport()
    } catch (error) {
      toast.add({ title: 'Failed to update status', color: 'error' })
    }
  }

  async function updatePriority(newPriority: string) {
    try {
      await $fetch(`/api/admin/issues/${id}`, {
        method: 'PUT',
        body: { priority: newPriority }
      })
      toast.add({ title: 'Priority updated', color: 'success' })
      refreshReport()
    } catch (error) {
      toast.add({ title: 'Failed to update priority', color: 'error' })
    }
  }

  const newComment = ref('')
  const sendingComment = ref(false)

  async function addComment() {
    if (!newComment.value.trim()) return
    sendingComment.value = true
    try {
      await $fetch(`/api/admin/issues/${id}/comments`, {
        method: 'POST',
        body: { content: newComment.value }
      })
      newComment.value = ''
      await refreshComments()
      toast.add({ title: 'Comment added', color: 'success' })
    } catch (error) {
      toast.add({ title: 'Failed to add comment', color: 'error' })
    } finally {
      sendingComment.value = false
    }
  }

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

  const copyLogs = () => {
    if (report.value?.logs) {
      navigator.clipboard.writeText(report.value.logs)
      toast.add({ title: 'Logs copied to clipboard', color: 'success' })
    }
  }
</script>

<template>
  <UDashboardPanel id="bug-report-detail">
    <template #header>
      <UDashboardNavbar :title="report?.title || 'Issue Details'">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            to="/admin/issues"
          />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UBadge
              :color="getPriorityColor(report?.priority || 'MEDIUM')"
              variant="outline"
              class="mr-2"
            >
              {{ report?.priority || 'MEDIUM' }}
            </UBadge>
            <UBadge :color="getStatusColor(report?.status || '')" variant="subtle">
              {{ report?.status }}
            </UBadge>
            <UDropdownMenu :items="dropdownItems">
              <UButton icon="i-heroicons-chevron-down" color="neutral" variant="ghost" size="sm" />
            </UDropdownMenu>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <!-- Main Content (2/3) -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Issue Title Section -->
            <UCard class="border-primary-100 dark:border-primary-900 shadow-sm overflow-hidden">
              <div class="flex flex-col gap-1">
                <h1
                  class="text-2xl font-black tracking-tight text-gray-900 dark:text-white truncate"
                >
                  {{ report?.title }}
                </h1>
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest">
                  Reported on {{ new Date(report?.createdAt || '').toLocaleString() }}
                </p>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">
                    Description
                  </h3>
                </div>
              </template>
              <p
                class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed"
              >
                {{ report?.description }}
              </p>
            </UCard>

            <!-- Comments Section -->
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-chat-bubble-left-right" class="text-primary" />
                  <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">
                    Developer & User Communications
                  </h3>
                </div>
              </template>

              <div class="space-y-6">
                <div
                  v-if="comments?.length === 0"
                  class="text-center py-8 text-gray-500 italic text-sm"
                >
                  No messages in this thread yet.
                </div>

                <div
                  v-for="comment in comments"
                  :key="comment.id"
                  class="flex gap-4"
                  :class="{ 'flex-row-reverse': comment.isAdmin }"
                >
                  <UAvatar
                    :src="comment.user.image || undefined"
                    :alt="comment.user.name || comment.user.email || ''"
                    size="sm"
                    class="shrink-0 ring-2 ring-white dark:ring-gray-900"
                  />
                  <div class="flex flex-col max-w-[85%]" :class="{ 'items-end': comment.isAdmin }">
                    <div class="flex items-center gap-2 mb-1">
                      <span
                        class="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white"
                      >
                        {{ comment.user.name || comment.user.email }}
                      </span>
                      <UBadge v-if="comment.isAdmin" color="primary" variant="subtle" size="xs"
                        >Admin</UBadge
                      >
                      <span class="text-[10px] text-gray-500">
                        {{ new Date(comment.createdAt).toLocaleString() }}
                      </span>
                    </div>
                    <div
                      class="px-4 py-2 rounded-2xl text-sm shadow-sm"
                      :class="
                        comment.isAdmin
                          ? 'bg-primary-600 text-white rounded-tr-none'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700'
                      "
                    >
                      {{ comment.content }}
                    </div>
                  </div>
                </div>
              </div>

              <template #footer>
                <div class="flex gap-3">
                  <UTextarea
                    v-model="newComment"
                    placeholder="Reply to user..."
                    autoresize
                    :rows="2"
                    class="flex-1"
                    @keydown.meta.enter="addComment"
                  />
                  <div class="flex flex-col justify-end">
                    <UButton
                      icon="i-heroicons-paper-airplane"
                      color="primary"
                      :loading="sendingComment"
                      :disabled="!newComment.trim()"
                      @click="addComment"
                    >
                      Send
                    </UButton>
                  </div>
                </div>
                <p class="mt-2 text-[10px] text-gray-400 text-right">Press Cmd+Enter to send</p>
              </template>
            </UCard>

            <UCard v-if="report?.context">
              <template #header>
                <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">Context</h3>
              </template>
              <div
                class="bg-gray-50 dark:bg-gray-900 rounded p-4 overflow-x-auto border border-gray-200 dark:border-gray-800"
              >
                <pre class="text-xs font-mono text-gray-800 dark:text-gray-200">{{
                  JSON.stringify(report.context, null, 2)
                }}</pre>
              </div>
            </UCard>

            <UCard v-if="report?.logs">
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">Logs</h3>
                  <UButton
                    icon="i-heroicons-clipboard-document"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="copyLogs"
                  >
                    Copy
                  </UButton>
                </div>
              </template>
              <div
                class="bg-gray-50 dark:bg-gray-900 rounded p-4 overflow-x-auto border border-gray-200 dark:border-gray-800 max-h-96"
              >
                <pre class="text-xs font-mono text-gray-800 dark:text-gray-200">{{
                  report.logs
                }}</pre>
              </div>
            </UCard>
          </div>

          <!-- Sidebar (1/3) -->
          <div class="space-y-6">
            <UCard>
              <template #header>
                <h3 class="text-sm font-semibold">Triage & Management</h3>
              </template>
              <div class="space-y-4">
                <div>
                  <label
                    class="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1"
                    >Status</label
                  >
                  <USelect
                    v-if="report"
                    :model-value="report.status"
                    :items="statusOptions"
                    size="sm"
                    class="w-full"
                    @update:model-value="updateStatus"
                  />
                </div>
                <div>
                  <label
                    class="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1"
                    >Priority</label
                  >
                  <USelect
                    v-if="report"
                    :model-value="report.priority || 'MEDIUM'"
                    :items="priorityOptions"
                    size="sm"
                    class="w-full"
                    @update:model-value="updatePriority"
                  />
                </div>
              </div>
            </UCard>

            <UCard v-if="report?.metadata && Object.keys(report.metadata as any).length > 0">
              <template #header>
                <h3 class="text-sm font-semibold">AI Triage Data</h3>
              </template>
              <div class="space-y-3">
                <div v-for="(val, key) in report.metadata as any" :key="key">
                  <p class="text-[10px] font-black uppercase text-gray-400 tracking-tighter">
                    {{ String(key).replace('_', ' ') }}
                  </p>
                  <p class="text-xs font-mono break-all">{{ val }}</p>
                </div>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <h3 class="text-sm font-semibold">User Info</h3>
              </template>
              <div class="flex items-center gap-3">
                <UAvatar
                  :src="report?.user.image || undefined"
                  :alt="report?.user.name || 'User'"
                  size="lg"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {{ report?.user.name }}
                  </p>
                  <p class="text-xs text-gray-500 truncate">{{ report?.user.email }}</p>
                </div>
              </div>
              <div class="mt-4">
                <UButton
                  variant="outline"
                  color="neutral"
                  size="xs"
                  class="w-full justify-center"
                  :to="`/admin/users?q=${report?.user.email}`"
                >
                  View User Profile
                </UButton>
              </div>
            </UCard>

            <AdminUserIssuesCard
              v-if="report"
              :user-id="report.userId"
              :current-issue-id="report.id"
            />

            <UCard>
              <template #header>
                <h3 class="text-sm font-semibold">Internal Metadata</h3>
              </template>
              <div class="space-y-2">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500">Issue ID</span>
                  <span class="font-mono">{{ report?.id.substring(0, 8) }}...</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500">Last Updated</span>
                  <span>{{ new Date(report?.updatedAt || '').toLocaleDateString() }}</span>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
