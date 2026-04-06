<script setup lang="ts">
  import AdminUserIssuesCard from '~/components/admin/AdminUserIssuesCard.vue'
  import IssueFormModal from '~/components/issues/IssueFormModal.vue'
  import {
    ISSUE_COMMENT_MAX_LENGTH,
    ISSUE_COMMENT_MAX_LENGTH_LABEL,
    ISSUE_COMMENT_WARNING_LENGTH
  } from '~/utils/issue-constants'

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
  const showEditModal = ref(false)
  const deletingIssue = ref(false)
  const showDeleteIssueModal = ref(false)
  const editingCommentId = ref<string | null>(null)
  const editingCommentContent = ref('')
  const savingComment = ref(false)
  const deletingCommentId = ref<string | null>(null)
  const isEditCommentModalOpen = computed({
    get: () => !!editingCommentId.value,
    set: (open: boolean) => {
      if (!open) closeEditCommentModal()
    }
  })

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
  const newCommentLength = computed(() => newComment.value.length)
  const editingCommentLength = computed(() => editingCommentContent.value.length)

  function getApiErrorMessage(error: any, fallback: string) {
    return (
      error?.data?.statusMessage ||
      error?.data?.message ||
      error?.statusMessage ||
      error?.message ||
      fallback
    )
  }

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
    } catch (error: any) {
      toast.add({
        title: 'Failed to add comment',
        description: getApiErrorMessage(error, 'Something went wrong.'),
        color: 'error'
      })
    } finally {
      sendingComment.value = false
    }
  }

  function openEditCommentModal(comment: any) {
    editingCommentId.value = comment.id
    editingCommentContent.value = comment.content
  }

  function closeEditCommentModal() {
    editingCommentId.value = null
    editingCommentContent.value = ''
  }

  async function saveCommentEdit() {
    if (!editingCommentId.value || !editingCommentContent.value.trim()) return
    savingComment.value = true
    try {
      await $fetch(`/api/admin/issues/${id}/comments/${editingCommentId.value}`, {
        method: 'PATCH',
        body: { content: editingCommentContent.value }
      })
      toast.add({ title: 'Comment updated', color: 'success' })
      closeEditCommentModal()
      await refreshComments()
    } catch (error: any) {
      toast.add({
        title: 'Failed to update comment',
        description: getApiErrorMessage(error, 'Something went wrong.'),
        color: 'error'
      })
    } finally {
      savingComment.value = false
    }
  }

  async function deleteComment(commentId: string) {
    deletingCommentId.value = commentId
    try {
      await $fetch(`/api/admin/issues/${id}/comments/${commentId}`, {
        method: 'DELETE'
      })
      toast.add({ title: 'Comment deleted', color: 'success' })
      await refreshComments()
    } catch {
      toast.add({ title: 'Failed to delete comment', color: 'error' })
    } finally {
      deletingCommentId.value = null
    }
  }

  const acknowledgingCommentId = ref<string | null>(null)
  async function acknowledgeComment(commentId: string) {
    acknowledgingCommentId.value = commentId
    try {
      const updatedComment = await ($fetch as any)(
        `/api/admin/issues/${id}/comments/${commentId}/acknowledge`,
        {
          method: 'POST'
        }
      )
      if (comments.value) {
        const index = comments.value.findIndex((c: any) => c.id === commentId)
        if (index !== -1) {
          comments.value[index] = updatedComment
        }
      }
      toast.add({ title: 'Comment acknowledged', color: 'success' })
    } catch {
      toast.add({ title: 'Failed to acknowledge comment', color: 'error' })
    } finally {
      acknowledgingCommentId.value = null
    }
  }

  const isIssueReactionPopoverOpen = ref(false)
  const reactingIssueId = ref(false)
  async function toggleIssueReaction(emoji: string) {
    reactingIssueId.value = true
    isIssueReactionPopoverOpen.value = false
    try {
      await ($fetch as any)(`/api/admin/issues/${id}/reaction`, {
        method: 'POST',
        body: { emoji }
      } as any)
      await refreshReport()
    } catch {
      toast.add({ title: 'Failed to update reaction', color: 'error' })
    } finally {
      reactingIssueId.value = false
    }
  }

  const reactingCommentId = ref<string | null>(null)
  const openReactionCommentId = ref<string | null>(null)
  async function toggleReaction(commentId: string, emoji: string) {
    reactingCommentId.value = commentId
    openReactionCommentId.value = null
    try {
      await ($fetch as any)(`/api/admin/issues/${id}/comments/${commentId}/reaction`, {
        method: 'POST',
        body: { emoji }
      } as any)
      await refreshComments()
    } catch {
      toast.add({ title: 'Failed to update reaction', color: 'error' })
    } finally {
      reactingCommentId.value = null
    }
  }

  const commonEmojis = ['👍', '❤️', '👀', '🚀']
  const session = useAuth() as any
  const userId = computed(() => session.data.value?.user?.id)

  async function deleteIssue() {
    deletingIssue.value = true
    try {
      await $fetch(`/api/admin/issues/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Issue deleted', color: 'success' })
      await navigateTo('/admin/issues')
    } catch {
      toast.add({ title: 'Failed to delete issue', color: 'error' })
    } finally {
      deletingIssue.value = false
      showDeleteIssueModal.value = false
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
      copyToClipboard(report.value.logs, 'Logs copied to clipboard', 'Failed to copy logs')
    }
  }

  const copyUserId = () => {
    if (report.value?.user.id) {
      copyToClipboard(report.value.user.id, 'User ID copied to clipboard', 'Failed to copy user ID')
    }
  }

  const copyIssueId = () => {
    if (report.value?.id) {
      copyToClipboard(report.value.id, 'Ticket ID copied to clipboard', 'Failed to copy ticket ID')
    }
  }

  async function copyToClipboard(text: string, successTitle: string, errorTitle: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: successTitle, color: 'success' })
    } catch {
      toast.add({ title: errorTitle, color: 'error' })
    }
  }

  function formatJsonBlock(value: unknown) {
    if (value == null) return 'None'
    return JSON.stringify(value, null, 2)
  }

  function buildTicketClipboardText() {
    if (!report.value) return ''

    const formattedComments = (comments.value || []).map((comment: any, index: number) => {
      const author = comment.user?.name || comment.user?.email || 'Unknown'
      const userLine = comment.userId ? `User ID: ${comment.userId}` : null
      const acknowledgedLine = comment.acknowledgedAt
        ? `Acknowledged At: ${new Date(comment.acknowledgedAt).toLocaleString()}`
        : null

      return [
        `Comment ${index + 1}`,
        `ID: ${comment.id}`,
        `Type: ${comment.type}`,
        `Author: ${author}`,
        userLine,
        `Is Admin: ${comment.isAdmin ? 'Yes' : 'No'}`,
        `Created At: ${new Date(comment.createdAt).toLocaleString()}`,
        acknowledgedLine,
        'Content:',
        comment.content
      ]
        .filter(Boolean)
        .join('\n')
    })

    return [
      'Ticket',
      `Title: ${report.value.title}`,
      `Ticket ID: ${report.value.id}`,
      `User ID: ${report.value.userId}`,
      `Status: ${report.value.status}`,
      `Priority: ${report.value.priority || 'MEDIUM'}`,
      `Created At: ${new Date(report.value.createdAt).toLocaleString()}`,
      `Updated At: ${new Date(report.value.updatedAt).toLocaleString()}`,
      '',
      'Description',
      report.value.description,
      '',
      'Context',
      formatJsonBlock(report.value.context),
      '',
      'Logs',
      report.value.logs || 'None',
      '',
      'Comments',
      formattedComments.length > 0 ? formattedComments.join('\n\n') : 'None'
    ].join('\n')
  }

  async function copyFullTicket() {
    if (!report.value) return

    await copyToClipboard(
      buildTicketClipboardText(),
      'Full ticket copied to clipboard',
      'Failed to copy full ticket'
    )
  }

  function buildCopyPromptText() {
    if (!report.value) return ''

    return [
      buildTicketClipboardText(),
      '',
      'Task',
      'Investigate this ticket, write both an internal resolution note and a user-facing reply with the Coach Watts CLI, then resolve the ticket.',
      '',
      'Required support workflow',
      `1. Inspect the ticket with: pnpm cw:cli support tickets get ${report.value.id} --prod`,
      '2. Validate the issue and implement the fix in the app or data pipeline as needed.',
      `3. Add an internal note with: pnpm cw:cli support tickets comment ${report.value.id} "<internal resolution note>" --type NOTE --prod`,
      `4. Add a user-facing message with: pnpm cw:cli support tickets comment ${report.value.id} "<user-facing reply>" --type MESSAGE --prod`,
      `5. Resolve the ticket with: pnpm cw:cli support tickets update-status ${report.value.id} RESOLVED --prod`,
      '',
      'Message guidance',
      '- Do the investigation, code changes, and internal note in English even if the ticket was written in another language.',
      '- Write the user-facing reply in the same language the user used when they posted the ticket.',
      '- The NOTE should summarize root cause, what changed, and whether a resync/backfill is needed.',
      '- The MESSAGE should be short, clear, non-technical, and tell the user what to expect next.',
      '- Prefer the exact pnpm cw:cli commands above instead of ad-hoc DB edits for ticket updates.',
      '',
      'Definition of done',
      '- Code or data fix applied',
      '- Internal note posted',
      '- User-facing message posted',
      '- Ticket moved to RESOLVED'
    ].join('\n')
  }

  async function copyTicketPrompt() {
    if (!report.value) return

    await copyToClipboard(
      buildCopyPromptText(),
      'Ticket prompt copied to clipboard',
      'Failed to copy ticket prompt'
    )
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
            <UButton
              v-if="report"
              icon="i-heroicons-pencil-square"
              color="neutral"
              variant="outline"
              size="sm"
              @click="showEditModal = true"
            >
              Edit
            </UButton>
            <UButton
              v-if="report"
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="sm"
              :loading="deletingIssue"
              @click="showDeleteIssueModal = true"
            >
              Delete
            </UButton>
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
                  class="text-2xl font-black tracking-tight text-gray-900 dark:text-white break-words"
                >
                  {{ report?.title }}
                </h1>
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-xs text-gray-500 font-bold uppercase tracking-widest">
                    Reported on {{ new Date(report?.createdAt || '').toLocaleString() }}
                  </p>
                  <span class="text-gray-300 dark:text-gray-700">•</span>
                  <span class="text-[11px] font-mono text-gray-500 dark:text-gray-400 break-all">
                    ID: {{ report?.id }}
                  </span>
                  <UButton
                    icon="i-heroicons-clipboard-document"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="copyIssueId"
                  />
                </div>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">
                    Description
                  </h3>
                  <UButton
                    icon="i-heroicons-clipboard-document"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="copyFullTicket"
                  >
                    Copy ticket
                  </UButton>
                  <UButton
                    icon="i-lucide-terminal-square"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="copyTicketPrompt"
                  >
                    Copy prompt
                  </UButton>
                </div>
              </template>
              <p
                class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed"
              >
                {{ report?.description }}
              </p>
              <!-- Issue Reactions -->
              <div
                class="mt-4 flex items-center gap-1 border-t border-gray-100 dark:border-gray-800 pt-3"
              >
                <template v-if="report?.reactions">
                  <UButton
                    v-for="(uids, emoji) in report.reactions as any"
                    :key="emoji"
                    variant="subtle"
                    :color="uids.includes(userId) ? 'primary' : 'neutral'"
                    size="xs"
                    class="px-1.5 py-0.5 h-6 min-w-8 rounded-full text-[10px]"
                    @click="toggleIssueReaction(String(emoji))"
                  >
                    {{ emoji }} {{ uids.length }}
                  </UButton>
                </template>
                <UPopover v-model:open="isIssueReactionPopoverOpen">
                  <template #default>
                    <UButton
                      icon="i-heroicons-face-smile-20-solid"
                      variant="ghost"
                      color="neutral"
                      size="xs"
                      class="rounded-full p-1 opacity-70 hover:opacity-100"
                      :loading="reactingIssueId"
                    />
                  </template>
                  <template #content>
                    <div class="p-1 flex gap-1">
                      <UButton
                        v-for="emoji in commonEmojis"
                        :key="emoji"
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        @click="toggleIssueReaction(emoji)"
                      >
                        {{ emoji }}
                      </UButton>
                    </div>
                  </template>
                </UPopover>
              </div>
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
                      <UButton
                        icon="i-heroicons-pencil-square"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click="openEditCommentModal(comment)"
                      />
                      <UButton
                        icon="i-heroicons-trash"
                        color="error"
                        variant="ghost"
                        size="xs"
                        :loading="deletingCommentId === comment.id"
                        @click="deleteComment(comment.id)"
                      />
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
                    <div class="mt-1 flex items-center justify-between">
                      <div v-if="!comment.isAdmin">
                        <div v-if="comment.acknowledgedAt" class="flex items-center gap-1">
                          <UIcon name="i-heroicons-check-circle" class="size-3 text-success" />
                          <span class="text-[9px] text-gray-500 italic">
                            Viewed {{ new Date(comment.acknowledgedAt).toLocaleString() }}
                          </span>
                        </div>
                        <UButton
                          v-else
                          label="Mark as Viewed"
                          variant="ghost"
                          color="neutral"
                          size="xs"
                          :loading="acknowledgingCommentId === comment.id"
                          class="text-[9px] px-1 h-auto font-black uppercase tracking-tighter"
                          @click="acknowledgeComment(comment.id)"
                        />
                      </div>
                      <div v-else />

                      <!-- Reactions -->
                      <div class="flex items-center gap-1">
                        <template v-if="comment.reactions">
                          <UButton
                            v-for="(uids, emoji) in comment.reactions as any"
                            :key="emoji"
                            variant="subtle"
                            :color="uids.includes(userId) ? 'primary' : 'neutral'"
                            size="xs"
                            class="px-1.5 py-0.5 h-6 min-w-8 rounded-full text-[10px]"
                            @click="toggleReaction(comment.id, String(emoji))"
                          >
                            {{ emoji }} {{ uids.length }}
                          </UButton>
                        </template>
                        <UPopover
                          :open="openReactionCommentId === comment.id"
                          @update:open="
                            (val) =>
                              val
                                ? (openReactionCommentId = comment.id)
                                : (openReactionCommentId = null)
                          "
                        >
                          <template #default>
                            <UButton
                              icon="i-heroicons-face-smile-20-solid"
                              variant="ghost"
                              color="neutral"
                              size="xs"
                              class="rounded-full p-1 opacity-70 hover:opacity-100"
                              :loading="reactingCommentId === comment.id"
                            />
                          </template>
                          <template #content>
                            <div class="p-1 flex gap-1">
                              <UButton
                                v-for="emoji in commonEmojis"
                                :key="emoji"
                                variant="ghost"
                                color="neutral"
                                size="sm"
                                @click="toggleReaction(comment.id, emoji)"
                              >
                                {{ emoji }}
                              </UButton>
                            </div>
                          </template>
                        </UPopover>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <template #footer>
                <div class="flex flex-col gap-4">
                  <UTextarea
                    v-model="newComment"
                    :placeholder="
                      newCommentType === 'NOTE' ? 'Add an internal note...' : 'Reply to user...'
                    "
                    autoresize
                    :rows="3"
                    :maxlength="ISSUE_COMMENT_MAX_LENGTH"
                    class="w-full"
                    :class="{ 'bg-amber-50/50 dark:bg-amber-900/10': newCommentType === 'NOTE' }"
                    @keydown.meta.enter="addComment"
                  />
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
                  <div class="flex justify-between items-center gap-4">
                    <div class="flex items-center justify-between gap-4 w-full">
                      <p class="text-[10px] text-gray-400 hidden sm:block">
                        Press Cmd+Enter to send
                      </p>
                      <p
                        class="text-[10px] ml-auto"
                        :class="
                          newCommentLength >= ISSUE_COMMENT_WARNING_LENGTH
                            ? 'font-semibold text-error-500'
                            : 'text-gray-400'
                        "
                      >
                        {{ newCommentLength.toLocaleString() }}/{{ ISSUE_COMMENT_MAX_LENGTH_LABEL }}
                        characters
                      </p>
                    </div>
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
                  <div class="flex items-center gap-1">
                    <span class="font-mono text-[11px] break-all">{{ report?.id }}</span>
                    <UButton
                      icon="i-heroicons-clipboard-document"
                      variant="ghost"
                      color="neutral"
                      size="xs"
                      @click="copyIssueId"
                    />
                  </div>
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
        title="Internal Metadata"
        description="Update internal tracking metadata for this issue, such as associated GitHub issue URLs."
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

      <IssueFormModal
        v-if="report"
        v-model:open="showEditModal"
        :issue="report"
        api-base="/api/admin/issues"
        update-method="PUT"
        @success="
          () => {
            refreshReport()
            refreshComments()
          }
        "
      />

      <UModal
        v-model:open="showDeleteIssueModal"
        title="Delete Issue"
        description="This will permanently remove the issue and all associated comments."
      >
        <template #body>
          <div class="space-y-3">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to delete <strong>{{ report?.title }}</strong
              >?
            </p>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" @click="showDeleteIssueModal = false">
                Cancel
              </UButton>
              <UButton color="error" :loading="deletingIssue" @click="deleteIssue">
                Delete
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isEditCommentModalOpen"
        title="Edit Comment"
        description="Modify the content of your existing comment."
      >
        <template #body>
          <div class="space-y-3">
            <UTextarea
              v-model="editingCommentContent"
              :rows="4"
              :maxlength="ISSUE_COMMENT_MAX_LENGTH"
              autoresize
            />
            <p
              class="text-[10px] text-right"
              :class="
                editingCommentLength >= ISSUE_COMMENT_WARNING_LENGTH
                  ? 'font-semibold text-error-500'
                  : 'text-gray-400'
              "
            >
              {{ editingCommentLength.toLocaleString() }}/{{ ISSUE_COMMENT_MAX_LENGTH_LABEL }}
              characters
            </p>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" @click="closeEditCommentModal">
                Cancel
              </UButton>
              <UButton
                color="primary"
                :loading="savingComment"
                :disabled="!editingCommentContent.trim()"
                @click="saveCommentEdit"
              >
                Save
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
