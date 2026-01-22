<script setup lang="ts">
  import { computed } from 'vue'

  const props = defineProps<{
    rooms: any[]
    currentRoomId: string
    loading: boolean
  }>()

  const emit = defineEmits<{
    (e: 'select', roomId: string): void
  }>()

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
      onSelect: () => emit('select', room.roomId)
    }))
  })
</script>

<template>
  <div class="flex-1 overflow-y-auto py-2 px-2">
    <div v-if="loading" class="space-y-2 py-4 px-2">
      <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-2 py-2">
        <USkeleton class="h-10 w-10 rounded-full" />
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
      class="px-2"
    />

    <div v-else class="text-left py-8 text-sm text-gray-500 px-4">No chat history yet</div>
  </div>
</template>
