<script setup lang="ts">
  import { computed } from 'vue'
  import ChatMessageContent from '~/components/chat/ChatMessageContent.vue'
  import ChatWelcomeTips from '~/components/chat/ChatWelcomeTips.vue'

  const props = defineProps<{
    messages: any[]
    status: any
    loading: boolean
    canEditMessages?: boolean
    editingMessageId?: string | null
    editingContent?: string
    savingEditedMessage?: boolean
  }>()

  const emit = defineEmits([
    'tool-approval',
    'edit-message',
    'update:editing-content',
    'save-edit',
    'cancel-edit'
  ])
  const toast = useToast()

  // Filter out tool messages (responses) as they are internal state or handled via UI
  const filteredMessages = computed(() => {
    return props.messages.filter((m) => m.role !== 'tool')
  })

  const handleToolApproval = (response: any) => {
    emit('tool-approval', response)
  }

  const handleEditMessage = (message: any) => {
    emit('edit-message', message)
  }

  const updateEditingContent = (value: string) => {
    emit('update:editing-content', value)
  }

  const saveEdit = () => {
    emit('save-edit')
  }

  const cancelEdit = () => {
    emit('cancel-edit')
  }

  const isEditingMessage = (message: any) => props.editingMessageId === message?.id

  const editorRows = () => {
    const text = props.editingContent || ''
    const lines = text.split('\n').length
    return Math.min(10, Math.max(3, lines))
  }

  const copyMessage = async (message: any) => {
    if (!import.meta.client) return
    const text = typeof message?.content === 'string' ? message.content.trim() : ''
    if (!text) return

    await navigator.clipboard.writeText(text)
    toast.add({
      title: 'Copied',
      description: 'Message copied to clipboard.',
      color: 'success'
    })
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
        <UChatMessages
          :messages="filteredMessages"
          :status="status"
          :user="{
            side: 'right',
            variant: 'soft',
            ui: {
              content:
                'rounded-[1.75rem] rounded-tr-lg px-4 py-2 min-h-0 bg-gray-800/95 text-white dark:bg-gray-700/95 dark:text-gray-50',
              container:
                'relative w-fit flex items-center ltr:justify-end ms-auto max-w-[75%] gap-2 !pb-0',
              actions:
                'opacity-0 group-hover/message:opacity-100 absolute right-full mr-1 top-1/2 -translate-y-1/2 bottom-auto z-20 flex items-center gap-1 transition-opacity'
            }
          }"
          :assistant="{
            side: 'left',
            variant: 'naked',
            ui: {
              content: 'rounded-[1.2rem] px-4 py-3',
              container: 'relative flex items-start rtl:justify-end !pb-0'
            }
          }"
        >
          <template #content="{ message }">
            <div v-if="message.role === 'user' && isEditingMessage(message)" class="space-y-3">
              <UTextarea
                :model-value="editingContent || ''"
                :rows="editorRows()"
                autofocus
                autoresize
                class="w-[min(42rem,72vw)] max-w-full [&_textarea]:leading-7 [&_textarea]:text-pretty"
                placeholder="Edit your message..."
                @update:model-value="updateEditingContent($event)"
              />
              <div class="flex items-center justify-end gap-2">
                <UButton
                  label="Cancel"
                  color="neutral"
                  variant="ghost"
                  :disabled="savingEditedMessage"
                  @click="cancelEdit"
                />
                <UButton
                  label="Update"
                  color="neutral"
                  :loading="savingEditedMessage"
                  @click="saveEdit"
                />
              </div>
            </div>
            <ChatMessageContent
              v-else
              :message="message"
              :all-messages="messages"
              @tool-approval="handleToolApproval"
            />
          </template>
          <template #actions="{ message }">
            <template
              v-if="message.role === 'user' && canEditMessages && !isEditingMessage(message)"
            >
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                square
                aria-label="Copy message"
                icon="i-heroicons-clipboard-document"
                @click="copyMessage(message)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                square
                aria-label="Edit message"
                icon="i-heroicons-pencil-square"
                @click="handleEditMessage(message)"
              />
            </template>
          </template>
        </UChatMessages>
      </div>
    </UContainer>
  </div>
</template>
