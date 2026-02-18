<script setup lang="ts">
  import IssueFormModal from '~/components/issues/IssueFormModal.vue'

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
    } catch (error) {
      toast.add({ title: 'Failed to send message', color: 'error' })
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
              v-if="report && report.status !== 'CLOSED' && report.status !== 'RESOLVED'"
              icon="i-heroicons-pencil-square"
              color="neutral"
              variant="outline"
              size="sm"
              class="font-bold"
              @click="showEditModal = true"
            >
              Edit
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
                  class="text-2xl font-black tracking-tight text-gray-900 dark:text-white truncate"
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
            </div>
          </UCard>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <!-- 1. Main Content: Conversation & Description -->
            <div class="lg:col-span-2 space-y-6">
              <UCard>
                <template #header>
                  <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">
                    Initial Description
                  </h3>
                </template>
                <p
                  class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed"
                >
                  {{ report.description }}
                </p>
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
                      </div>
                      <div
                        class="px-4 py-2 rounded-2xl text-sm shadow-sm"
                        :class="
                          comment.isAdmin
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700'
                            : 'bg-primary-600 text-white rounded-tr-none'
                        "
                      >
                        {{ comment.content }}
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
                <p class="mt-2 text-[10px] text-gray-400 text-right">Press Cmd+Enter to send</p>
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
    </template>
  </UDashboardPanel>
</template>
