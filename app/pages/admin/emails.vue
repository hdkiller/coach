<script setup lang="ts">
  import { format } from 'date-fns'

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const page = ref(1)
  const limit = ref(20)
  const { data, refresh, status } = await useFetch('/api/admin/emails', {
    query: { page, limit },
    watch: [page]
  })

  const columns = [
    { key: 'createdAt', label: 'Queued At' },
    { key: 'toEmail', label: 'Recipient' },
    { key: 'subject', label: 'Subject' },
    { key: 'templateKey', label: 'Template' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '' }
  ]

  const selectedEmail = ref<any>(null)
  const isPreviewOpen = ref(false)

  const openPreview = (email: any) => {
    selectedEmail.value = email
    isPreviewOpen.value = true
  }

  const isSending = ref(false)
  const sendingIds = ref<string[]>([])
  const toast = useToast()

  const isSendable = (row: any) => row.status === 'QUEUED' || row.status === 'FAILED'
  const isRowSending = (id: string) => sendingIds.value.includes(id)

  const sendEmailById = async (row: any, options?: { closeModal?: boolean }) => {
    if (!row?.id || !isSendable(row)) return

    if (!sendingIds.value.includes(row.id)) {
      sendingIds.value.push(row.id)
    }
    if (selectedEmail.value?.id === row.id) {
      isSending.value = true
    }

    try {
      await $fetch(`/api/admin/emails/${row.id}/send`, {
        method: 'POST'
      })

      toast.add({
        title: 'Success',
        description: 'Email sent successfully via Resend',
        color: 'success'
      })
      if (options?.closeModal && selectedEmail.value?.id === row.id) {
        isPreviewOpen.value = false
      }
      await refresh()
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err.message || 'Failed to send email',
        color: 'error'
      })
    } finally {
      sendingIds.value = sendingIds.value.filter((id) => id !== row.id)
      if (selectedEmail.value?.id === row.id) {
        isSending.value = false
      }
    }
  }

  const sendSelectedEmail = async () => {
    if (!selectedEmail.value) return
    await sendEmailById(selectedEmail.value, { closeModal: true })
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 'neutral'
      case 'SENDING':
        return 'warning'
      case 'SENT':
        return 'primary'
      case 'DELIVERED':
        return 'success'
      case 'OPENED':
        return 'success'
      case 'CLICKED':
        return 'success'
      case 'BOUNCED':
        return 'error'
      case 'FAILED':
        return 'error'
      case 'COMPLAINED':
        return 'error'
      default:
        return 'neutral'
    }
  }

  useHead({
    title: 'Email Deliveries',
    meta: [{ name: 'description', content: 'Manage and review outbound email deliveries.' }]
  })
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Email Deliveries" :badge="data?.total">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-heroicons-arrow-path"
            color="neutral"
            variant="ghost"
            :loading="status === 'pending'"
            @click="refresh"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden"
        >
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    v-for="col in columns"
                    :key="col.key"
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody
                class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
              >
                <tr v-if="!data?.deliveries?.length">
                  <td
                    colspan="6"
                    class="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No email deliveries found.
                  </td>
                </tr>
                <tr
                  v-for="row in data?.deliveries"
                  :key="row.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ format(new Date(row.createdAt), 'MMM d, h:mm a') }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium"
                  >
                    {{ row.toEmail }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                    {{ row.subject }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ row.templateKey }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <UBadge :color="statusColor(row.status)" variant="subtle" size="sm">
                      {{ row.status }}
                    </UBadge>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end gap-1">
                      <UButton
                        v-if="isSendable(row)"
                        color="primary"
                        variant="ghost"
                        icon="i-heroicons-paper-airplane"
                        size="sm"
                        :loading="isRowSending(row.id)"
                        @click="sendEmailById(row)"
                      />
                      <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-heroicons-eye"
                        size="sm"
                        @click="openPreview(row)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="data?.totalPages && data.totalPages > 1"
            class="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700"
          >
            <p class="text-sm text-gray-500">Page {{ page }} of {{ data.totalPages }}</p>
            <UPagination v-model:page="page" :total="data.total" :items-per-page="limit" />
          </div>
        </div>
      </div>

      <!-- Email Preview Modal -->
      <UModal v-model:open="isPreviewOpen" :ui="{ width: 'sm:max-w-4xl' }" title="Email Preview">
        <template v-if="selectedEmail" #body>
          <div class="flex flex-col space-y-4">
            <div
              class="text-sm text-gray-500 space-y-1 pb-4 border-b border-gray-200 dark:border-gray-800"
            >
              <div><strong>To:</strong> {{ selectedEmail.toEmail }}</div>
              <div><strong>Subject:</strong> {{ selectedEmail.subject }}</div>
              <div><strong>Template:</strong> {{ selectedEmail.templateKey }}</div>
              <div v-if="selectedEmail.errorMessage" class="text-error-500 font-medium">
                <strong>Error:</strong> {{ selectedEmail.errorMessage }}
              </div>
            </div>

            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <!-- Render the HTML safely using v-html -->
              <div class="bg-white dark:bg-black p-4 h-[500px] overflow-y-auto">
                <div class="w-full" v-html="selectedEmail.htmlBody"></div>
              </div>
            </div>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-between items-center w-full">
            <div class="text-sm text-gray-500">
              Status:
              <UBadge :color="statusColor(selectedEmail?.status)" variant="subtle" size="sm">{{
                selectedEmail?.status
              }}</UBadge>
            </div>
            <div class="flex gap-3">
              <UButton color="neutral" variant="ghost" @click="isPreviewOpen = false"
                >Close</UButton
              >
              <UButton
                v-if="
                  selectedEmail &&
                  (selectedEmail.status === 'QUEUED' || selectedEmail.status === 'FAILED')
                "
                color="primary"
                icon="i-heroicons-paper-airplane"
                :loading="isSending"
                @click="sendSelectedEmail"
              >
                Send Now
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
