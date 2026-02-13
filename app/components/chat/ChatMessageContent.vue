<script setup lang="ts">
  import { computed } from 'vue'
  import ChatToolCall from '~/components/ChatToolCall.vue'
  import ChatChart from '~/components/ChatChart.vue'
  import ChatToolApproval from '~/components/chat/ChatToolApproval.vue'

  const props = withDefaults(
    defineProps<{
      message: any
      allMessages?: any[]
      showTools?: boolean
      showCharts?: boolean
      showApprovals?: boolean
    }>(),
    {
      allMessages: () => [],
      showTools: true,
      showCharts: true,
      showApprovals: true
    }
  )

  const emit = defineEmits(['tool-approval'])

  // Ensure parts always exists for unified rendering
  const normalizedParts = computed(() => {
    if (props.message.parts && props.message.parts.length) {
      return props.message.parts
    }
    if (props.message.content) {
      return [{ type: 'text', text: props.message.content }]
    }
    return []
  })

  // Check if an approval request has been answered in subsequent messages
  const getApprovalResult = (approvalId: string) => {
    if (!props.allMessages) return null
    for (const msg of props.allMessages) {
      if (msg.role === 'tool') {
        const parts = msg.parts || (Array.isArray(msg.content) ? msg.content : [])
        const part = parts.find(
          (p: any) =>
            (p.type === 'tool-result' || p.type === 'tool-approval-response') &&
            (p.toolCallId === approvalId || p.approvalId === approvalId)
        )
        if (part) {
          return part.result || (part.approved ? 'Approved' : 'Denied')
        }
      }
    }
    return null
  }

  // Extract charts from both metadata (persisted) and tool parts (immediate)
  const charts = computed(() => {
    if (!props.showCharts) return []
    const list = []

    // 1. From Metadata (Persisted)
    if (props.message.metadata?.charts?.length) {
      list.push(...props.message.metadata.charts)
    }

    // 2. From Tool Invocations (Immediate)
    if (props.message.parts && props.message.parts.length) {
      props.message.parts.forEach((part: any) => {
        if (
          (part.type === 'tool-invocation' || part.type.startsWith('tool-')) &&
          (part.toolName === 'create_chart' ||
            (part.type.startsWith('tool-') && part.type.includes('create_chart')))
        ) {
          const result = part.result || part.output
          if (!props.message.metadata?.charts?.length && result && result.success) {
            list.push({
              id: `temp-${part.toolCallId}`,
              ...result
            })
          }
        }
      })
    }

    return list
  })
</script>

<template>
  <div class="space-y-4">
    <!-- Message Parts -->
    <div
      v-for="(part, index) in normalizedParts"
      :key="`${message.id}-part-${index}`"
      class="message-part"
    >
      <!-- Text Part -->
      <div v-if="part.type === 'text'" class="prose prose-sm dark:prose-invert max-w-none">
        <MDC :value="part.text" :cache-key="`${message.id}-${index}`" />
      </div>

      <!-- Tool Approval Request -->
      <ChatToolApproval
        v-else-if="
          showApprovals &&
          (part.type === 'tool-approval-request' ||
            (part.type.startsWith('tool-') && (part as any).state === 'approval-requested'))
        "
        :approval-id="
          (part as any).approvalId || (part as any).approval?.id || (part as any).toolCallId
        "
        :tool-call="{
          toolName:
            (part as any).toolCall?.toolName ||
            (part as any).toolName ||
            part.type.replace('tool-', ''),
          args: (part as any).toolCall?.args || (part as any).args || (part as any).input
        }"
        :result="
          getApprovalResult(
            (part as any).approvalId || (part as any).approval?.id || (part as any).toolCallId
          )
        "
        @approve="(e) => emit('tool-approval', { ...e, approved: true })"
        @deny="(e) => emit('tool-approval', { ...e, approved: false })"
      />

      <!-- Tool Invocation Part -->
      <ChatToolCall
        v-else-if="
          showTools &&
          (part.type === 'tool-invocation' || part.type.startsWith('tool-')) &&
          part.type !== 'tool-approval-response'
        "
        :tool-call="{
          name:
            (part as any).toolName ||
            (part.type.startsWith('tool-') ? part.type.replace('tool-', '') : ''),
          args: (part as any).args || (part as any).input,
          response: (part as any).result || (part as any).output,
          error: (part as any).errorText || (part as any).error,
          timestamp:
            (message as any).createdAt && !isNaN(new Date((message as any).createdAt).getTime())
              ? new Date((message as any).createdAt).toISOString()
              : new Date().toISOString(),
          status:
            (part as any).state === 'result' || (part as any).state === 'output-available'
              ? 'success'
              : (part as any).state === 'error' ||
                  (part as any).state === 'output-error' ||
                  (part as any).state === 'output-denied'
                ? 'error'
                : 'loading'
        }"
      />

      <!-- Hidden Parts (Internal) -->
      <div v-else-if="part.type === 'tool-approval-response'" class="hidden"></div>

      <!-- Fallback Debug (ignore step-start) -->
      <div
        v-else-if="part.type !== 'step-start'"
        class="text-[10px] text-red-500 border border-red-200 p-1 my-1 rounded bg-red-50 font-mono overflow-auto max-h-40"
      >
        <div>Unknown part type: {{ part.type }}</div>
        <pre>{{ JSON.stringify(part, null, 2) }}</pre>
      </div>
    </div>

    <!-- Charts -->
    <div v-if="showCharts && charts.length" class="mt-4 space-y-4">
      <ChatChart v-for="chart in charts" :key="chart.id" :chart-data="chart" />
    </div>
  </div>
</template>
