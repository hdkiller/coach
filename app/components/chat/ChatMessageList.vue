<script setup lang="ts">
  import { computed } from 'vue'
  import ChatMessageContent from '~/components/chat/ChatMessageContent.vue'
  import ChatWelcomeTips from '~/components/chat/ChatWelcomeTips.vue'

  const props = defineProps<{
    messages: any[]
    status: any
    loading: boolean
  }>()

  const emit = defineEmits(['tool-approval'])

  // Filter out tool messages (responses) as they are internal state or handled via UI
  const filteredMessages = computed(() => {
    return props.messages.filter((m) => m.role !== 'tool')
  })

  const handleToolApproval = (response: any) => {
    emit('tool-approval', response)
  }
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <UContainer class="h-full">
      <div v-if="loading" class="space-y-6 py-8">
        <div v-for="i in 3" :key="i" class="flex flex-col space-y-4">
          <div class="flex items-start gap-3">
            <USkeleton class="h-8 w-8 rounded-full" />
            <USkeleton class="h-16 w-1/2 rounded-2xl" />
          </div>
          <div class="flex items-start justify-end gap-3">
            <USkeleton class="h-16 w-1/2 rounded-2xl" />
            <USkeleton class="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>

      <ChatWelcomeTips v-else-if="filteredMessages.length === 0" />

      <div v-else class="h-full flex flex-col">
        <UChatMessages :messages="filteredMessages" :status="status">
          <template #content="{ message }">
            <ChatMessageContent
              :message="message"
              :all-messages="messages"
              @tool-approval="handleToolApproval"
            />
          </template>
        </UChatMessages>
      </div>
    </UContainer>
  </div>
</template>
