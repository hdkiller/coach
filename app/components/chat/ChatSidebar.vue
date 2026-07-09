<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue'
  import { useTranslate } from '@tolgee/vue'
  import ChatRoomList from './ChatRoomList.vue'

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

  const isOpen = ref(false)
  const shouldRenderList = ref(false)

  onMounted(() => {
    const mountList = () => {
      shouldRenderList.value = true
    }

    if (import.meta.client && 'requestIdleCallback' in window) {
      window.requestIdleCallback(mountList, { timeout: 2000 })
    } else {
      setTimeout(mountList, 250)
    }
  })

  watch(
    () => [props.loading, props.rooms.length] as const,
    ([loading, roomCount]) => {
      if (!loading && roomCount > 0) {
        shouldRenderList.value = true
      }
    },
    { immediate: true }
  )

  function open() {
    shouldRenderList.value = true
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function handleSelect(roomId: string) {
    close()
    emit('select', roomId)
  }

  defineExpose({
    open,
    close
  })
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="t('sidebar_header')"
    side="left"
    :description="t('sidebar_description')"
    :ui="{ content: 'max-w-sm' }"
  >
    <template #content>
      <ChatRoomList
        v-if="shouldRenderList"
        :rooms="rooms"
        :current-room-id="currentRoomId"
        :loading="loading"
        @select="handleSelect"
        @delete="emit('delete', $event)"
        @rename="(roomId, newName) => emit('rename', roomId, newName)"
      />
      <div v-else class="space-y-2 py-4 px-3">
        <div v-for="i in 5" :key="i" class="flex items-center gap-2 px-1 py-2">
          <USkeleton class="h-9 w-9 rounded-full" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-3 w-3/4" />
            <USkeleton class="h-2 w-1/2" />
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
