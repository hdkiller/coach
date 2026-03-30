<script setup lang="ts">
  import IssueFormModal from '~/components/issues/IssueFormModal.vue'
  import {
    ISSUE_COMMENT_MAX_LENGTH,
    ISSUE_COMMENT_MAX_LENGTH_LABEL,
    ISSUE_COMMENT_WARNING_LENGTH
  } from '~/utils/issue-constants'

  definePageMeta({
    middleware: 'auth'
  })

  const route = useRoute()
  const id = route.params.id as string
  const toast = useToast()

  const {
    data: report,
    refresh: refreshReport,
    pending: loading
  } = await useFetch(`/api/issues/${id}`)

  const newComment = ref('')
  const sendingComment = ref(false)
  const showEditModal = ref(false)
  const deletingIssue = ref(false)
  const showDeleteIssueModal = ref(false)
  const editingCommentId = ref<string | null>(null)
  const editingCommentContent = ref('')
  const savingComment = ref(false)
  const deletingCommentId = ref<string | null>(null)
  const newCommentLength = computed(() => newComment.value.length)
  const editingCommentLength = computed(() => editingCommentContent.value.length)
  const isEditCommentModalOpen = computed({
    get: () => !!editingCommentId.value,
    set: (open: boolean) => {
      if (!open) closeEditCommentModal()
    }
  })

  function getApiErrorMessage(error: any, fallback: string) {
    return (
      error?.data?.statusMessage ||
      error?.data?.message ||
      error?.statusMessage ||
      error?.message ||
      fallback
    )
  }

  function copyText(value: string, label: string) {
    if (!value?.trim()) return
    navigator.clipboard.writeText(value)
    toast.add({ title: `${label} copied`, color: 'success' })
  }

  function copyIssueId() {
    if (!report.value?.id) return
    copyText(report.value.id, 'Ticket ID')
  }

  async function addComment() {
    if (!newComment.value.trim()) return
    sendingComment.value = true
    try {
      await $fetch(`/api/issues/${id}/comments`, {
        method: 'POST',
        body: { content: newComment.value }
      })
      newComment.value = ''
      await refreshReport()
      toast.add({ title: 'Message sent', color: 'success' })
    } catch (error: any) {
      toast.add({
        title: 'Failed to send message',
        description: getApiErrorMessage(error, 'Something went wrong.'),
        color: 'error'
      })
    } finally {
      sendingComment.value = false
    }
  }

  function openEditCommentModal(comment: any) {
    if (comment.isAdmin) return
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
      await $fetch(`/api/issues/${id}/comments/${editingCommentId.value}`, {
        method: 'PATCH',
        body: { content: editingCommentContent.value }
      })
      toast.add({ title: 'Comment updated', color: 'success' })
      closeEditCommentModal()
      await refreshReport()
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
      await $fetch(`/api/issues/${id}/comments/${commentId}`, {
        method: 'DELETE'
      })
      toast.add({ title: 'Comment deleted', color: 'success' })
      await refreshReport()
    } catch {
      toast.add({ title: 'Failed to delete comment', color: 'error' })
    } finally {
      deletingCommentId.value = null
    }
  }

  async function deleteIssue() {
    deletingIssue.value = true
    try {
      await $fetch(`/api/issues/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Issue deleted', color: 'success' })
      await navigateTo('/issues')
    } catch {
      toast.add({ title: 'Failed to delete issue', color: 'error' })
    } finally {
      deletingIssue.value = false
      showDeleteIssueModal.value = false
    }
  }

  const acknowledgingCommentId = ref<string | null>(null)
  async function acknowledgeComment(commentId: string) {
    acknowledgingCommentId.value = commentId
    try {
      const updatedComment = await ($fetch as any)(
        `/api/issues/${id}/comments/${commentId}/acknowledge`,
        {
          method: 'POST'
        }
      )
      if (report.value) {
        const index = report.value.comments.findIndex((c: any) => c.id === commentId)
        if (index !== -1) {
          report.value.comments[index] = updatedComment
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
      await ($fetch as any)(`/api/issues/${id}/reaction`, {
        method: 'POST',
        body: { emoji }
      })
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
      await ($fetch as any)(`/api/issues/${id}/comments/${commentId}/reaction`, {
        method: 'POST',
        body: { emoji }
      })
      await refreshReport()
    } catch {
      toast.add({ title: 'Failed to update reaction', color: 'error' })
    } finally {
      reactingCommentId.value = null
    }
  }

  const commonEmojis = ['👍', '❤️', '👀', '🚀']
  const userId = computed(() => (useAuth() as any).data.value?.user?.id)

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
  <UDashboardPanel id="user-bug-report">
    <template #header>
      <UDashboardNavbar :title="report?.title || 'Issue Details'">
        <template #leading>
          <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" to="/issues" />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              v-if="report"
              icon="i-heroicons-pencil-square"
              color="neutral"
              variant="outline"
              size="sm"
              class="font-bold"
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
            <ClientOnly>
              <DashboardTriggerMonitorButton />
              <NotificationDropdown />
            </ClientOnly>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-4xl mx-auto w-full p-0 sm:p-6 pb-24">
        <div v-if="loading" class="flex items-center justify-center py-24">
          <div class="text-center">
            <UIcon
              name="i-heroicons-arrow-path"
              class="size-8 animate-spin text-primary-500 mx-auto"
            />
            <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
              Loading Issue...
            </p>
          </div>
        </div>

        <div v-else-if="report" class="space-y-6">
          <!-- 0. Hero Header Card -->
          <UCard class="border-primary-100 dark:border-primary-900 shadow-sm overflow-hidden">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h1
                  class="text-2xl font-black tracking-tight text-gray-900 dark:text-white break-words"
                >
                  {{ report.title }}
                </h1>
                <UBadge :color="getStatusColor(report.status)" variant="subtle" size="sm">
                  {{ report.status.replace('_', ' ') }}
                </UBadge>
              </div>
              <p class="text-xs text-gray-500 font-bold uppercase tracking-widest">
                Reported on {{ formatDate(report.createdAt, 'PPPP') }}
              </p>
              <div class="flex items-center gap-1">
                <span class="text-[11px] font-mono text-gray-500 dark:text-gray-400 break-all">
                  {{ report.id }}
                </span>
                <UButton
                  icon="i-heroicons-clipboard-document"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="copyIssueId"
                />
              </div>
            </div>
          </UCard>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <!-- 1. Main Content: Conversation & Description -->
            <div class="lg:col-span-2 space-y-6">
              <UCard>
                <template #header>
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">
                      Initial Description
                    </h3>
                    <UButton
                      icon="i-heroicons-clipboard-document"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      @click="copyText(report.description, 'Initial description')"
                    />
                  </div>
                </template>
                <p
                  class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed"
                >
                  {{ report.description }}
                </p>
                <!-- Issue Reactions -->
                <div
                  class="mt-4 flex items-center gap-1 border-t border-gray-100 dark:border-gray-800 pt-3"
                >
                  <template v-if="report.reactions">
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

              <!-- Communication Thread -->
              <div class="space-y-4">
                <h3
                  class="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"
                >
                  <UIcon name="i-heroicons-chat-bubble-left-right" />
                  Activity History
                </h3>

                <div
                  class="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800"
                >
                  <!-- Auto-generated: Reported Event -->
                  <div class="flex gap-4 relative">
                    <div
                      class="size-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0 ring-4 ring-white dark:ring-gray-950 z-10"
                    >
                      <UIcon
                        name="i-heroicons-flag"
                        class="size-4 text-primary-600 dark:text-primary-400"
                      />
                    </div>
                    <div class="pt-1">
                      <p class="text-xs font-bold">Issue Reported</p>
                      <p class="text-[10px] text-gray-500 uppercase">
                        {{ formatDate(report.createdAt, 'MMM d, HH:mm') }}
                      </p>
                    </div>
                  </div>

                  <div
                    v-if="report.comments.length === 0"
                    class="pl-12 py-4 italic text-sm text-gray-500"
                  >
                    No team updates yet.
                  </div>

                  <div
                    v-for="comment in report.comments"
                    :key="comment.id"
                    class="flex gap-4 relative"
                    :class="{ 'flex-row-reverse': !comment.isAdmin }"
                  >
                    <UAvatar
                      :src="comment.user.image || undefined"
                      :alt="comment.user.name || 'User'"
                      size="sm"
                      class="shrink-0 ring-4 ring-white dark:ring-gray-950 z-10"
                    />
                    <div
                      class="flex flex-col max-w-[85%]"
                      :class="{ 'items-end': !comment.isAdmin }"
                    >
                      <div class="flex items-center gap-2 mb-1">
                        <span
                          class="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white"
                        >
                          {{ comment.isAdmin ? 'Coach Watts Team' : 'You' }}
                        </span>
                        <span class="text-[10px] text-gray-500">
                          {{ formatDate(comment.createdAt, 'MMM d, HH:mm') }}
                        </span>
                        <UButton
                          icon="i-heroicons-clipboard-document"
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          @click="copyText(comment.content, 'Comment')"
                        />
                        <UButton
                          v-if="!comment.isAdmin"
                          icon="i-heroicons-pencil-square"
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          @click="openEditCommentModal(comment)"
                        />
                        <UButton
                          v-if="!comment.isAdmin"
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
                        :class="
                          comment.isAdmin
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700'
                            : 'bg-primary-600 text-white rounded-tr-none'
                        "
                      >
                        <MDC
                          :value="comment.content"
                          class="prose prose-sm max-w-none"
                          :class="!comment.isAdmin ? 'prose-invert' : 'dark:prose-invert'"
                        />
                      </div>
                      <div class="mt-1 flex items-center justify-between">
                        <div v-if="comment.isAdmin">
                          <div v-if="comment.acknowledgedAt" class="flex items-center gap-1">
                            <UIcon name="i-heroicons-check-circle" class="size-3 text-success" />
                            <span class="text-[9px] text-gray-500 italic">
                              Viewed {{ formatDate(comment.acknowledgedAt, 'MMM d, HH:mm') }}
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
              </div>

              <!-- Reply Area -->
              <UCard
                v-if="report.status !== 'CLOSED'"
                class="bg-primary-50/20 dark:bg-primary-950/10 border-primary-100 dark:border-primary-900/50"
              >
                <div class="flex gap-3">
                  <UTextarea
                    v-model="newComment"
                    placeholder="Add more details or reply to the team..."
                    autoresize
                    :rows="2"
                    :maxlength="ISSUE_COMMENT_MAX_LENGTH"
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
                      Reply
                    </UButton>
                  </div>
                </div>
                <div class="mt-2 flex items-center justify-between gap-3">
                  <p class="text-[10px] text-gray-400">Press Cmd+Enter to send</p>
                  <p
                    class="text-[10px] text-right"
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
              </UCard>
            </div>

            <!-- 2. Sidebar -->
            <div class="space-y-6">
              <UCard>
                <template #header>
                  <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">
                    Resolution Status
                  </h3>
                </template>
                <div class="space-y-4">
                  <div>
                    <p class="text-[10px] font-black uppercase text-gray-400 tracking-tighter mb-1">
                      Current Status
                    </p>
                    <UBadge
                      :color="getStatusColor(report.status)"
                      variant="soft"
                      size="md"
                      class="w-full justify-center font-bold"
                    >
                      {{ report.status.replace('_', ' ') }}
                    </UBadge>
                  </div>
                  <div v-if="report.chatRoom">
                    <p class="text-[10px] font-black uppercase text-gray-400 tracking-tighter mb-1">
                      Related Chat
                    </p>
                    <UButton
                      :to="`/chat?room=${report.chatRoom.id}`"
                      variant="outline"
                      color="neutral"
                      size="xs"
                      block
                      icon="i-heroicons-chat-bubble-bottom-center-text"
                    >
                      View Original Chat
                    </UButton>
                  </div>
                </div>
              </UCard>

              <UCard v-if="report.context" class="bg-gray-50/50 dark:bg-gray-900/40">
                <template #header>
                  <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">
                    System Context
                  </h3>
                </template>
                <div class="space-y-2 text-[10px] font-medium font-mono text-gray-500">
                  <div v-if="(report.context as any).userAgent" class="break-all">
                    <span class="text-gray-400">UA:</span> {{ (report.context as any).userAgent }}
                  </div>
                  <div v-if="(report.context as any).viewport">
                    <span class="text-gray-400">Viewport:</span>
                    {{ (report.context as any).viewport }}
                  </div>
                  <div v-if="(report.context as any).url">
                    <span class="text-gray-400">Origin:</span> {{ (report.context as any).url }}
                  </div>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </div>

      <IssueFormModal
        v-if="report"
        v-model:open="showEditModal"
        :issue="report"
        @success="refreshReport"
      />

      <UModal
        v-model:open="showDeleteIssueModal"
        title="Delete issue"
        description="This will permanently remove the issue and all comments."
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
        title="Edit comment"
        description="Update your message."
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
