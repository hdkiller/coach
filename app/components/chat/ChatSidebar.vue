<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import ChatRoomList from './ChatRoomList.vue'

  const { t } = useTranslate('chat')

  defineProps<{
    rooms: any[]
    currentRoomId: string
    loading: boolean
    isOpen: boolean
  }>()

  const emit = defineEmits<{
    (e: 'select' | 'delete', roomId: string): void
    (e: 'rename', roomId: string, newName: string): void
    (e: 'update:isOpen', value: boolean): void
  }>()
</script>

<template>
  <!-- Mobile & Desktop Drawer (Always collapsed by default) -->
  <USlideover
    :open="isOpen"
    :title="t('sidebar_header')"
    side="left"
    :description="t('sidebar_description')"
    @update:open="emit('update:isOpen', $event)"
  >
    <template #content>
      <ChatRoomList
        :rooms="rooms"
        :current-room-id="currentRoomId"
        :loading="loading"
        @select="emit('select', $event)"
        @delete="emit('delete', $event)"
        @rename="(roomId, newName) => emit('rename', roomId, newName)"
      />
    </template>
  </USlideover>
</template>
