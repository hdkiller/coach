<script setup lang="ts">
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

  const handleDeny = async () => {
    submitting.value = true
    emit('deny', { approvalId: props.approvalId, result: 'User denied action.' })
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
          <pre
            class="text-[10px] text-gray-600 dark:text-gray-400 overflow-x-auto"
          ><code>{{ formatJson(toolCall.args) }}</code></pre>
        </div>

        <!-- Result State -->
        <div v-if="result" class="flex items-center gap-2">
          <UIcon
            :name="
              result.includes('confirmed') || result.includes('Approved')
                ? 'i-heroicons-check-circle'
                : 'i-heroicons-x-circle'
            "
            :class="
              result.includes('confirmed') || result.includes('Approved')
                ? 'text-green-500'
                : 'text-red-500'
            "
            class="w-5 h-5"
          />
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
            {{ result.includes('confirmed') ? 'Approved' : result }}
          </span>
        </div>

        <!-- Action Buttons -->
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
            color="error"
            variant="ghost"
            icon="i-heroicons-x-mark"
            :loading="submitting"
            @click="handleDeny"
          >
            Deny
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
