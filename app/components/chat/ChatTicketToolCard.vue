<script setup lang="ts">
  import ChatTicketPreview from '~/components/chat/ChatTicketPreview.vue'

  const props = defineProps<{
    toolName: string
    args?: Record<string, any>
    response?: Record<string, any>
    status?: 'loading' | 'success' | 'error'
  }>()

  const formatToolName = (name: string) =>
    name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

  const hasError = computed(
    () =>
      props.status === 'error' ||
      !!props.response?.error ||
      !!props.response?.message?.toLowerCase?.().includes('failed')
  )

  const hasPreviewData = computed(() => {
    if (typeof props.args?.title === 'string' && props.args.title.trim()) return true
    if (typeof props.args?.description === 'string' && props.args.description.trim()) return true
    if (typeof props.args?.ticket_id === 'string' && props.args.ticket_id.trim()) return true
    if (typeof props.response?.id === 'string' && props.response.id.trim()) return true
    if (props.response?.ticket && typeof props.response.ticket === 'object') return true
    return false
  })

  const listSummary = computed(() => {
    if (typeof props.response?.count === 'number')
      return `${props.response.count} ticket(s) matched.`
    if (typeof props.response?.total === 'number') return `${props.response.total} ticket(s) total.`
    return ''
  })

  const summaryText = computed(() => {
    if (props.status === 'loading') return 'Preparing ticket action...'
    if (hasError.value) return props.response?.error || 'Ticket action failed'
    if (typeof props.response?.message === 'string' && props.response.message.trim()) {
      return props.response.message
    }
    if (props.response?.success) return 'Ticket action prepared successfully.'
    return 'Ticket action ready.'
  })
</script>

<template>
  <div
    class="my-3 rounded-lg border overflow-hidden"
    :class="
      hasError
        ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20'
        : 'border-primary-200 dark:border-primary-800 bg-primary-50/40 dark:bg-primary-950/20'
    "
  >
    <div class="px-4 py-3 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <UIcon
            :name="hasError ? 'i-heroicons-exclamation-circle' : 'i-heroicons-ticket'"
            class="size-5 shrink-0"
            :class="hasError ? 'text-red-500' : 'text-primary-500'"
          />
          <p
            class="text-sm font-semibold truncate"
            :class="
              hasError ? 'text-red-800 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'
            "
          >
            {{ formatToolName(toolName) }}
          </p>
        </div>
        <UBadge
          v-if="status"
          :color="hasError ? 'error' : status === 'success' ? 'success' : 'neutral'"
          variant="soft"
          size="sm"
        >
          {{ status }}
        </UBadge>
      </div>

      <ChatTicketPreview
        v-if="hasPreviewData"
        :tool-name="toolName"
        :args="args"
        :response="response"
      />
      <p v-else-if="listSummary" class="text-xs text-gray-700 dark:text-gray-300">
        {{ listSummary }}
      </p>

      <p
        class="text-xs whitespace-pre-wrap break-words"
        :class="hasError ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'"
      >
        {{ summaryText }}
      </p>
    </div>
  </div>
</template>
