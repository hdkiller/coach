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

  const statusOptions = ['OPEN', 'IN_PROGRESS', 'NEED_MORE_INFO', 'RESOLVED', 'CLOSED']
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

  const isMetadataModalOpen = ref(false)
  const metadataForm = ref({
    github_issue_url: ''
  })

  function openMetadataModal() {
    metadataForm.value.github_issue_url = (report.value?.metadata as any)?.github_issue_url || ''
    isMetadataModalOpen.value = true
  }

  async function saveMetadata() {
    try {
      const currentMetadata = (report.value?.metadata as any) || {}
      await $fetch(`/api/admin/issues/${id}`, {
        method: 'PUT',
        body: {
          metadata: {
            ...currentMetadata,
            github_issue_url: metadataForm.value.github_issue_url
          }
        }
      })
      toast.add({ title: 'Metadata updated', color: 'success' })
      isMetadataModalOpen.value = false
      refreshReport()
    } catch (error) {
      toast.add({ title: 'Failed to update metadata', color: 'error' })
    }
  }

  const newComment = ref('')
  const newCommentType = ref<'NOTE' | 'MESSAGE'>('MESSAGE')
  const sendingComment = ref(false)

  async function addComment() {
    if (!newComment.value.trim()) return
    sendingComment.value = true
    try {
      await $fetch(`/api/admin/issues/${id}/comments`, {
        method: 'POST',
        body: { content: newComment.value, type: newCommentType.value }
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

  const { formatDateTime, calculateAge } = useFormat()

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

  const copyLogs = () => {
    if (report.value?.logs) {
      navigator.clipboard.writeText(report.value.logs)
      toast.add({ title: 'Logs copied to clipboard', color: 'success' })
    }
  }

  const copyUserId = () => {
    if (report.value?.user.id) {
      navigator.clipboard.writeText(report.value.user.id)
      toast.add({ title: 'User ID copied to clipboard', color: 'success' })
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
                      <UBadge
                        v-if="comment.type === 'NOTE'"
                        color="warning"
                        variant="subtle"
                        size="xs"
                        >Internal Note</UBadge
                      >
                      <span class="text-[10px] text-gray-500">
                        {{ new Date(comment.createdAt).toLocaleString() }}
                      </span>
                    </div>
                    <div
                      class="px-4 py-2 rounded-2xl text-sm shadow-sm"
                      :class="[
                        comment.isAdmin
                          ? 'rounded-tr-none'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700',
                        comment.isAdmin && comment.type === 'MESSAGE'
                          ? 'bg-primary-600 text-white'
                          : '',
                        comment.isAdmin && comment.type === 'NOTE'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800'
                          : ''
                      ]"
                    >
                      <MDC
                        :value="comment.content"
                        class="prose prose-sm max-w-none"
                        :class="
                          comment.isAdmin && comment.type === 'MESSAGE'
                            ? 'prose-invert'
                            : 'dark:prose-invert'
                        "
                      />
                    </div>
                  </div>
                </div>
              </div>

              <template #footer>
                <div class="flex flex-col gap-3">
                  <UTextarea
                    v-model="newComment"
                    :placeholder="
                      newCommentType === 'NOTE' ? 'Add an internal note...' : 'Reply to user...'
                    "
                    autoresize
                    :rows="3"
                    class="w-full"
                    :class="{ 'bg-amber-50/50 dark:bg-amber-900/10': newCommentType === 'NOTE' }"
                    @keydown.meta.enter="addComment"
                  />
                  <div class="flex justify-between items-center gap-4">
                    <URadioGroup
                      v-model="newCommentType"
                      :items="[
                        { value: 'MESSAGE', label: 'Message to User' },
                        { value: 'NOTE', label: 'Internal Note' }
                      ]"
                      color="primary"
                      class="flex flex-row gap-4"
                      :ui="{ fieldset: 'flex flex-row gap-4' }"
                    />
                    <div class="flex items-center gap-4">
                      <p class="text-[10px] text-gray-400 hidden sm:block">
                        Press Cmd+Enter to send
                      </p>
                      <UButton
                        icon="i-heroicons-paper-airplane"
                        :color="newCommentType === 'NOTE' ? 'warning' : 'primary'"
                        :loading="sendingComment"
                        :disabled="!newComment.trim()"
                        @click="addComment"
                      >
                        {{ newCommentType === 'NOTE' ? 'Add Note' : 'Send Message' }}
                      </UButton>
                    </div>
                  </div>
                </div>
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
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold">User Info</h3>
                  <UBadge
                    v-if="report?.user.subscriptionTier"
                    :color="report.user.subscriptionTier === 'PRO' ? 'primary' : 'neutral'"
                    variant="soft"
                    size="xs"
                  >
                    {{ report.user.subscriptionTier }}
                  </UBadge>
                </div>
              </template>
              <div class="space-y-4">
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

                <div class="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-500">User ID</span>
                    <div class="flex items-center gap-1">
                      <span class="font-mono text-[10px] text-gray-400"
                        >{{ report?.user.id.substring(0, 8) }}...</span
                      >
                      <UButton
                        icon="i-heroicons-clipboard-document"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        @click="copyUserId"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span class="text-gray-400 uppercase font-black tracking-tighter block"
                        >Country</span
                      >
                      <span class="font-bold">{{ report?.user.country || 'Unknown' }}</span>
                    </div>
                    <div>
                      <span class="text-gray-400 uppercase font-black tracking-tighter block"
                        >Age</span
                      >
                      <span class="font-bold">{{
                        report?.user.dob ? calculateAge(report.user.dob) : 'N/A'
                      }}</span>
                    </div>
                    <div>
                      <span class="text-gray-400 uppercase font-black tracking-tighter block"
                        >Timezone</span
                      >
                      <span class="font-bold truncate block">{{
                        report?.user.timezone || 'UTC'
                      }}</span>
                    </div>
                    <div>
                      <span class="text-gray-400 uppercase font-black tracking-tighter block"
                        >Status</span
                      >
                      <span class="font-bold">{{ report?.user.subscriptionStatus || 'NONE' }}</span>
                    </div>
                  </div>
                </div>

                <div
                  class="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800"
                >
                  <div class="text-center p-1.5 bg-gray-50 dark:bg-gray-900 rounded">
                    <p class="text-[9px] font-black text-gray-400 uppercase">Workouts</p>
                    <p class="text-xs font-bold">
                      {{ (report?.user as any)._count?.workouts || 0 }}
                    </p>
                  </div>
                  <div class="text-center p-1.5 bg-gray-50 dark:bg-gray-900 rounded">
                    <p class="text-[9px] font-black text-gray-400 uppercase">Planned</p>
                    <p class="text-xs font-bold">
                      {{ (report?.user as any)._count?.plannedWorkouts || 0 }}
                    </p>
                  </div>
                  <div class="text-center p-1.5 bg-gray-50 dark:bg-gray-900 rounded">
                    <p class="text-[9px] font-black text-gray-400 uppercase">Wellness</p>
                    <p class="text-xs font-bold">
                      {{ (report?.user as any)._count?.wellness || 0 }}
                    </p>
                  </div>
                </div>

                <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div
                    class="flex justify-between items-center bg-primary-50 dark:bg-primary-950/30 p-2 rounded"
                  >
                    <span
                      class="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase"
                      >Total LLM Cost</span
                    >
                    <span class="text-sm font-black text-primary-700 dark:text-primary-300">
                      ${{ (report?.user as any).totalLlmCost?.toFixed(4) || '0.0000' }}
                    </span>
                  </div>
                </div>

                <div class="pt-2">
                  <UButton
                    variant="outline"
                    color="neutral"
                    size="xs"
                    class="w-full justify-center"
                    :to="`/admin/users/${report?.userId}`"
                  >
                    View Full Admin Profile
                  </UButton>
                </div>
              </div>
            </UCard>

            <AdminUserIssuesCard
              v-if="report"
              :user-id="report.userId"
              :current-issue-id="report.id"
            />

            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold">Internal Metadata</h3>
                  <UButton
                    icon="i-heroicons-pencil-square"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="openMetadataModal"
                  />
                </div>
              </template>
              <div class="space-y-2">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500">Issue ID</span>
                  <span class="font-mono">{{ report?.id.substring(0, 8) }}...</span>
                </div>
                <div v-if="(report?.metadata as any)?.github_issue_url" class="flex flex-col gap-1">
                  <span class="text-xs text-gray-500">GitHub Issue</span>
                  <UButton
                    :href="(report?.metadata as any).github_issue_url"
                    target="_blank"
                    icon="i-simple-icons-github"
                    variant="link"
                    color="primary"
                    size="xs"
                    class="p-0 h-auto justify-start truncate"
                  >
                    View on GitHub
                  </UButton>
                </div>
                <div
                  class="flex justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-800"
                >
                  <span class="text-gray-500">Last Updated</span>
                  <span>{{ new Date(report?.updatedAt || '').toLocaleDateString() }}</span>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </div>

      <!-- Metadata Editing Modal -->
      <UModal
        v-model:open="isMetadataModalOpen"
        title="Dialog"
        description="Dialog content and actions."
      >
        <template #content>
          <UCard :ui="{ body: 'p-6' }">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-semibold leading-6">Edit Internal Metadata</h3>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  class="-my-1"
                  @click="isMetadataModalOpen = false"
                />
              </div>
            </template>

            <div class="space-y-4">
              <UFormField label="GitHub Issue URL" help="Link to the tracking issue on GitHub">
                <UInput
                  v-model="metadataForm.github_issue_url"
                  placeholder="https://github.com/org/repo/issues/123"
                  class="w-full"
                />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end gap-3">
                <UButton color="neutral" variant="ghost" @click="isMetadataModalOpen = false">
                  Cancel
                </UButton>
                <UButton color="primary" @click="saveMetadata"> Save Changes </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
