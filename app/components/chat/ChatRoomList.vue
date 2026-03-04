<script setup lang="ts">
  import { computed } from 'vue'
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('chat')

  const props = defineProps<{
    rooms: any[]
    currentRoomId: string
    loading: boolean
  }>()

  const emit = defineEmits<{
    (e: 'select' | 'delete', roomId: string): void
    (e: 'rename', roomId: string, newName: string): void
  }>()

  const roomToDelete = ref<string | null>(null)
  const roomToRename = ref<any | null>(null)
  const isDeleteModalOpen = ref(false)
  const isRenameModalOpen = ref(false)
  const isReportModalOpen = ref(false)
  const reportRoomId = ref<string | null>(null)
  const newRoomName = ref('')

  // Share Modal State
  const isShareModalOpen = ref(false)
  const shareLink = ref('')
  const generatingShareLink = ref(false)
  const sharedRoomName = ref('')
  const toast = useToast()

  function confirmDelete(roomId: string) {
    roomToDelete.value = roomId
    isDeleteModalOpen.value = true
  }

  function confirmRename(room: any) {
    roomToRename.value = room
    newRoomName.value = room.roomName
    isRenameModalOpen.value = true
  }

  function confirmReport(roomId: string) {
    reportRoomId.value = roomId
    isReportModalOpen.value = true
  }

  function handleDelete() {
    if (roomToDelete.value) {
      emit('delete', roomToDelete.value)
      isDeleteModalOpen.value = false
      roomToDelete.value = null
    }
  }

  function handleRename() {
    if (roomToRename.value && newRoomName.value.trim()) {
      emit('rename', roomToRename.value.roomId, newRoomName.value.trim())
      isRenameModalOpen.value = false
      roomToRename.value = null
    }
  }

  async function createPublicChat(room: any) {
    sharedRoomName.value = room.roomName || 'Chat'
    isShareModalOpen.value = true
    generatingShareLink.value = true
    shareLink.value = ''

    try {
      const response = await $fetch<any>('/api/share/generate', {
        method: 'POST',
        body: {
          resourceType: 'CHAT_ROOM',
          resourceId: room.roomId
        }
      })
      shareLink.value = response.url
    } catch (error) {
      console.error('Failed to generate share link:', error)
      toast.add({
        title: t.value('common_error_title'), // Using common if available or fallback
        description: t.value('input_error_capture_failed'), // Reusing similar key or just 'Error'
        color: 'error'
      })
      isShareModalOpen.value = false
    } finally {
      generatingShareLink.value = false
    }
  }

  function copyToClipboard(text: string, title = 'Copied', description = 'Copied to clipboard.') {
    navigator.clipboard.writeText(text)
    toast.add({
      title,
      description,
      color: 'success'
    })
  }

  async function summarizeRoom(roomId: string) {
    try {
      toast.add({
        title: t.value('toast_summarizing_title'),
        description: t.value('toast_summarizing_desc'),
        icon: 'i-heroicons-arrow-path',
        color: 'neutral'
      })

      await $fetch(`/api/chat/rooms/${roomId}/summarize`, {
        method: 'POST'
      })

      toast.add({
        title: t.value('toast_summarization_started_title'),
        description: t.value('toast_summarization_started_desc'),
        icon: 'i-heroicons-check-circle',
        color: 'success'
      })
    } catch (error) {
      console.error('Failed to summarize room:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to trigger summarization.',
        color: 'error'
      })
    }
  }

  async function generateRoomNameAi(roomId: string) {
    try {
      toast.add({
        title: t.value('toast_generating_name_title'),
        description: t.value('toast_generating_name_desc'),
        icon: 'i-heroicons-sparkles',
        color: 'neutral'
      })

      await $fetch(`/api/chat/rooms/${roomId}/summarize`, {
        method: 'POST',
        body: { forceRename: true }
      })

      toast.add({
        title: t.value('toast_naming_started_title'),
        description: t.value('toast_naming_started_desc'),
        icon: 'i-heroicons-check-circle',
        color: 'success'
      })
    } catch (error) {
      console.error('Failed to trigger AI renaming:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to trigger AI renaming.',
        color: 'error'
      })
    }
  }

  const getDropdownItems = (room: any) => [
    [
      {
        label: t.value('sidebar_rename_chat'),
        icon: 'i-heroicons-pencil-square',
        onSelect: () => confirmRename(room)
      },
      {
        label: t.value('sidebar_generate_ai_name'),
        icon: 'i-heroicons-sparkles',
        onSelect: () => generateRoomNameAi(room.roomId)
      },
      {
        label: t.value('sidebar_summarize_optimize'),
        icon: 'i-heroicons-adjustments-horizontal',
        onSelect: () => summarizeRoom(room.roomId)
      },
      {
        label: t.value('sidebar_share_chat'),
        icon: 'i-heroicons-share',
        onSelect: () => createPublicChat(room)
      },
      {
        label: t.value('sidebar_copy_room_id'),
        icon: 'i-heroicons-clipboard',
        onSelect: () =>
          copyToClipboard(
            room.roomId,
            t.value('sidebar_room_id_copied'),
            t.value('sidebar_room_id_copied_desc')
          )
      }
    ],
    [
      {
        label: t.value('sidebar_report_issue'),
        icon: 'i-heroicons-flag',
        onSelect: () => confirmReport(room.roomId)
      },
      {
        label: t.value('sidebar_delete_room'),
        icon: 'i-heroicons-trash',
        color: 'error' as const,
        onSelect: () => confirmDelete(room.roomId)
      }
    ]
  ]

  const navigationItems = computed(() => {
    return props.rooms.map((room) => ({
      label: room.roomName,
      avatar: { src: room.avatar, size: 'md' as const },
      value: room.roomId,
      active: room.roomId === props.currentRoomId,
      description: room.lastMessage?.content
        ? room.lastMessage.content.substring(0, 50) +
          (room.lastMessage.content.length > 50 ? '...' : '')
        : undefined,
      onSelect: () => emit('select', room.roomId),
      dropdownItems: getDropdownItems(room)
    }))
  })
</script>

<template>
  <div class="flex-1 overflow-y-auto py-2 px-1">
    <div v-if="loading" class="space-y-2 py-4 px-1">
      <div v-for="i in 5" :key="i" class="flex items-center gap-2 px-1 py-2">
        <USkeleton class="h-9 w-9 rounded-full" />
        <div class="flex-1 space-y-2">
          <USkeleton class="h-3 w-3/4" />
          <USkeleton class="h-2 w-1/2" />
        </div>
      </div>
    </div>

    <UNavigationMenu
      v-else-if="navigationItems.length > 0"
      orientation="vertical"
      :items="navigationItems"
      class="px-1"
      :ui="{ link: 'justify-start' }"
    >
      <template #item="{ item }">
        <div
          class="flex items-center gap-2 w-full group py-1.5 px-1.5 cursor-pointer relative text-left"
          @click="item.onSelect?.()"
        >
          <UAvatar v-if="item.avatar" v-bind="item.avatar" size="sm" />
          <div class="flex-1 min-w-0 text-left">
            <p
              class="text-sm font-medium truncate text-left"
              :class="item.active ? 'text-primary' : 'text-gray-900 dark:text-white'"
            >
              {{ item.label }}
            </p>
            <p
              v-if="item.description"
              class="text-xs text-gray-500 dark:text-gray-400 truncate text-left"
            >
              {{ item.description }}
            </p>
          </div>

          <UDropdownMenu :items="item.dropdownItems" :content="{ align: 'end' }">
            <UButton
              icon="i-heroicons-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              size="xs"
              class="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity -mr-1"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </template>
    </UNavigationMenu>

    <div v-else class="text-left py-8 text-sm text-gray-500 px-4">
      {{ t('sidebar_empty_history') }}
    </div>

    <!-- Rename Modal -->
    <UModal
      v-model:open="isRenameModalOpen"
      :title="t('modal_rename_title')"
      :description="t('modal_rename_desc')"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('sidebar_rename_chat')">
            <UInput
              v-model="newRoomName"
              :placeholder="t('modal_rename_placeholder')"
              autofocus
              @keyup.enter="handleRename"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="isRenameModalOpen = false">
            {{ t('banner_exit') }}
          </UButton>
          <UButton :disabled="!newRoomName.trim()" @click="handleRename">
            {{ t('modal_rename_save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Share Modal -->
    <UModal
      v-model:open="isShareModalOpen"
      :title="t('modal_share_title', { name: sharedRoomName })"
      :description="t('modal_share_desc')"
    >
      <template #body>
        <div v-if="generatingShareLink" class="flex items-center justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
        </div>
        <div v-else-if="shareLink" class="space-y-4">
          <div class="flex gap-2">
            <UInput v-model="shareLink" readonly class="flex-1" />
            <UButton
              icon="i-heroicons-clipboard"
              color="neutral"
              variant="outline"
              @click="copyToClipboard(shareLink)"
            >
              {{ t('modal_share_copy') }}
            </UButton>
          </div>
          <p class="text-xs text-gray-500">
            {{ t('modal_share_note') }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            :label="t('banner_exit')"
            color="neutral"
            variant="ghost"
            @click="isShareModalOpen = false"
          />
        </div>
      </template>
    </UModal>

    <!-- Report Issue Modal -->
    <UModal
      v-model:open="isReportModalOpen"
      :title="t('sidebar_report_issue')"
      :description="t('modal_rename_desc')"
    >
      <template #body>
        <AiFeedbackForm
          :room-id="reportRoomId || undefined"
          @cancel="isReportModalOpen = false"
          @submit="isReportModalOpen = false"
        />
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal
      v-model:open="isDeleteModalOpen"
      :title="t('modal_delete_title')"
      :description="t('modal_delete_desc')"
    >
      <template #body>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('modal_delete_confirm_text') }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">
            {{ t('banner_exit') }}
          </UButton>
          <UButton color="error" @click="handleDelete"> {{ t('sidebar_delete_room') }} </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
