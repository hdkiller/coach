<script setup lang="ts">
  import ChatRoomList from './ChatRoomList.vue'

  defineProps<{
    rooms: any[]
    currentRoomId: string
    loading: boolean
    isOpen: boolean
  }>()

  const emit = defineEmits<{
    (e: 'select', roomId: string): void
    (e: 'update:isOpen', value: boolean): void
  }>()
</script>

<template>
  <!-- Desktop Sidebar -->
  <div
    class="hidden lg:flex w-64 border-r border-gray-200 dark:border-gray-800 flex-col bg-gray-50 dark:bg-gray-900/40"
  >
    <div class="p-4 border-b border-gray-200 dark:border-gray-800">
      <h2 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        Chat History
      </h2>
    </div>

    <ChatRoomList
      :rooms="rooms"
      :current-room-id="currentRoomId"
      :loading="loading"
      @select="emit('select', $event)"
    />
  </div>

  <!-- Mobile Drawer -->
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
      />
    </template>
  </USlideover>
</template>
