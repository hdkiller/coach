<script setup lang="ts">
  import ChatTicketPreview from '~/components/chat/ChatTicketPreview.vue'

  interface Props {
    approvalId: string
    toolCall: {
      toolName: string
      args: any
    }
    result?: string | null
  }

  const props = defineProps<Props>()
  const emit = defineEmits(['approve', 'deny'])

  const submitting = ref(false)
  const showDenyEditor = ref(false)
  const denyReason = ref('')
  const supportToolNames = new Set([
    'ticket_create',
    'report_bug',
    'ticket_update',
    'ticket_comment'
  ])
  const isSupportTicketTool = computed(() => supportToolNames.has(props.toolCall.toolName))

  // Format tool name for display
  const formatToolName = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Format JSON for display
  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2)
  }

  const handleApprove = async () => {
    submitting.value = true
    emit('approve', { approvalId: props.approvalId, result: 'User confirmed action.' })
  }

  const openDenyEditor = () => {
    showDenyEditor.value = true
  }

  const closeDenyEditor = () => {
    showDenyEditor.value = false
    denyReason.value = ''
  }

  const handleDeny = async () => {
    submitting.value = true
    const trimmedReason = denyReason.value.trim()
    const result = isSupportTicketTool.value
      ? trimmedReason
        ? `User cancelled this ticket draft for refinement. Requested changes: ${trimmedReason}`
        : 'User cancelled this ticket draft for now. Ask what should be changed, or confirm if they want to cancel.'
      : trimmedReason
        ? `User cancelled action. Reason: ${trimmedReason}`
        : 'User cancelled action.'

    emit('deny', {
      approvalId: props.approvalId,
      result
    })
  }

  const handleDenyClick = () => {
    if (isSupportTicketTool.value) {
      openDenyEditor()
      return
    }
    handleDeny()
  }
</script>

<template>
  <div
    class="my-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 overflow-hidden"
  >
    <div class="px-4 py-3 flex items-start gap-3">
      <UIcon
        name="i-heroicons-shield-check"
        class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
      />
      <div class="flex-1 min-w-0">
        <h4 class="font-medium text-sm text-amber-900 dark:text-amber-100 mb-1">
          Permission Request
        </h4>
        <p class="text-xs text-amber-700 dark:text-amber-300 mb-3">
          The AI wants to run <strong>{{ formatToolName(toolCall.toolName) }}</strong
          >. Do you want to proceed?
        </p>

        <!-- Arguments Preview -->
        <div
          v-if="toolCall.args && Object.keys(toolCall.args).length > 0"
          class="bg-white dark:bg-black/20 rounded border border-amber-200 dark:border-amber-800/50 p-2 mb-3"
        >
          <ChatTicketPreview
            v-if="isSupportTicketTool"
            :tool-name="toolCall.toolName"
            :args="toolCall.args"
            compact
            class="mb-2"
          />
          <pre
            v-if="!isSupportTicketTool"
            class="text-[10px] text-gray-600 dark:text-gray-400 overflow-x-auto"
          ><code>{{ formatJson(toolCall.args) }}</code></pre>
        </div>

        <!-- Result State -->
        <div v-if="result" class="flex items-center gap-2">
          <UIcon
            :name="
              result.toLowerCase().includes('confirmed') ||
              result.toLowerCase().includes('approved')
                ? 'i-heroicons-check-circle'
                : 'i-heroicons-minus-circle'
            "
            :class="
              result.toLowerCase().includes('confirmed') ||
              result.toLowerCase().includes('approved')
                ? 'text-green-500'
                : 'text-amber-500'
            "
            class="w-5 h-5"
          />
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
            {{ result.toLowerCase().includes('confirmed') ? 'Approved' : result }}
          </span>
        </div>

        <!-- Action Buttons -->
        <div v-else-if="showDenyEditor" class="space-y-2">
          <UTextarea
            v-model="denyReason"
            size="xs"
            :rows="3"
            :placeholder="
              isSupportTicketTool
                ? 'Tell the AI what to change in this ticket draft...'
                : 'Optional reason for cancelling this action...'
            "
            class="w-full"
          />
          <div class="flex gap-2">
            <UButton
              size="xs"
              color="neutral"
              variant="solid"
              icon="i-heroicons-paper-airplane"
              :loading="submitting"
              @click="handleDeny"
            >
              Cancel Action
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="submitting"
              @click="closeDenyEditor"
            >
              Back
            </UButton>
          </div>
        </div>

        <div v-else class="flex gap-2">
          <UButton
            size="xs"
            color="primary"
            variant="solid"
            icon="i-heroicons-check"
            :loading="submitting"
            @click="handleApprove"
          >
            Approve
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            :loading="submitting"
            @click="handleDenyClick"
          >
            Cancel
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
