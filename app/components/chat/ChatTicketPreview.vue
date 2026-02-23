<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      toolName: string
      args?: Record<string, any> | null
      response?: Record<string, any> | null
      compact?: boolean
    }>(),
    {
      args: null,
      response: null,
      compact: false
    }
  )

  const title = computed(() => {
    if (typeof props.args?.title === 'string' && props.args.title.trim()) return props.args.title
    if (typeof props.response?.ticket?.title === 'string' && props.response.ticket.title.trim()) {
      return props.response.ticket.title
    }
    return 'Untitled ticket'
  })

  const description = computed(() => {
    if (typeof props.args?.description === 'string' && props.args.description.trim()) {
      return props.args.description
    }
    if (
      typeof props.response?.ticket?.description === 'string' &&
      props.response.ticket.description.trim()
    ) {
      return props.response.ticket.description
    }
    return ''
  })

  const ticketId = computed(() => {
    const id = props.response?.id || props.response?.ticket?.id || props.args?.ticket_id
    return typeof id === 'string' ? id : ''
  })

  const status = computed(() => {
    const value = props.response?.ticket?.status || props.args?.status
    return typeof value === 'string' ? value : ''
  })

  const isPersistedTicket = computed(() => {
    if (props.toolName === 'ticket_get') return true
    if (typeof props.response?.ticket?.id === 'string' && props.response.ticket.id.trim()) return true
    if (typeof props.response?.id === 'string' && props.response.id.trim()) return true
    return false
  })

  const ticketLabel = computed(() => {
    if (props.toolName === 'ticket_comment') return 'Ticket Comment'
    return isPersistedTicket.value ? 'Ticket' : 'Ticket Draft'
  })

  const descriptionMaxHeightClass = computed(() => (props.compact ? 'max-h-28' : 'max-h-40'))
</script>

<template>
  <div
    class="rounded-lg border border-primary-200 dark:border-primary-800/70 bg-primary-50/50 dark:bg-primary-950/20 p-3"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p
          class="text-[11px] uppercase tracking-wider font-semibold text-primary-700 dark:text-primary-300"
        >
          {{ ticketLabel }}
        </p>
        <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
          {{ title }}
        </h5>
      </div>
      <div class="flex items-center gap-2">
        <UBadge v-if="status" color="neutral" variant="soft" size="sm">
          {{ status }}
        </UBadge>
        <UBadge v-if="toolName === 'ticket_comment'" color="neutral" variant="outline" size="sm">
          Comment
        </UBadge>
      </div>
    </div>

    <p
      v-if="description"
      class="mt-2 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-y-auto pr-1"
      :class="descriptionMaxHeightClass"
    >
      {{ description }}
    </p>

    <div
      class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400"
    >
      <span v-if="ticketId" class="font-mono">ID: {{ ticketId }}</span>
      <span v-if="response?.success" class="text-green-600 dark:text-green-400"
        >Ready to publish</span
      >
    </div>
  </div>
</template>
