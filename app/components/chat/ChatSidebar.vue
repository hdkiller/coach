<script setup lang="ts">
  import ChatRoomList from './ChatRoomList.vue'

  defineProps<{
    rooms: any[]
    currentRoomId: string
    loading: boolean
    isOpen: boolean
  }>()

  const emit = defineEmits<{
    (e: 'select' | 'delete', roomId: string): void
    (e: 'update:isOpen', value: boolean): void
  }>()
</script>

<template>
  <!-- Mobile & Desktop Drawer (Always collapsed by default) -->
  <USlideover
    :open="isOpen"
    title="Chat History"
    side="left"
    @update:open="emit('update:isOpen', $event)"
  >
    <template #content>
      <ChatRoomList
        :rooms="rooms"
        :current-room-id="currentRoomId"
        :loading="loading"
        @select="emit('select', $event)"
        @delete="emit('delete', $event)"
      />
    </template>
  </USlideover>
</template>
