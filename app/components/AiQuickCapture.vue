<template>
  <div
    class="fixed left-1/2 -translate-x-1/2 z-40 transition-[width,opacity,transform,bottom,border-radius] ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col items-center max-w-2xl"
    :class="[
      !isVisible ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0',
      shouldBeWide
        ? 'w-[calc(100%-2rem)] sm:w-full duration-700 delay-0'
        : 'w-40 duration-700 delay-300',
      isMobile && (isExpanded || isFocused) ? 'bottom-0 w-full max-w-full px-0' : 'bottom-6'
    ]"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- Chat Overlay -->
    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="transform scale-95 opacity-0 translate-y-8"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 translate-y-8"
    >
      <div
        v-if="isExpanded"
        class="w-full mb-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col ring-1 ring-black/5 dark:ring-white/10 origin-bottom transition-[max-height,border-radius] duration-500"
        :class="[isMobile ? 'mb-0 rounded-t-2xl border-b-0' : 'rounded-2xl']"
        :style="{ maxHeight: chatMaxHeight }"
      >
        <!-- Header -->
        <div
          class="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-950/50 shrink-0"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-primary-500" />
            <span class="text-xs font-black uppercase tracking-widest text-gray-500"
              >Coach Preview</span
            >
          </div>
          <div class="flex items-center gap-1">
            <UButton
              to="/chat"
              label="Full Chat"
              icon="i-heroicons-arrows-pointing-out"
              color="neutral"
              variant="ghost"
              size="xs"
              class="font-bold"
            />
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="closeChat"
            />
          </div>
        </div>

        <!-- Message List -->
        <div ref="scrollContainer" class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          <div v-if="loadingMessages" class="flex justify-center py-12">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-primary-500" />
          </div>

          <template v-else>
            <div
              v-for="message in chatMessages"
              :key="message.id"
              :class="[
                'flex flex-col gap-1',
                message.role === 'user' ? 'items-end' : 'items-start'
              ]"
            >
              <!-- Parts Rendering (Text & Tools) -->
              <template v-if="message.parts && message.parts.length">
                <template v-for="(part, idx) in message.parts" :key="idx">
                  <!-- Text Part -->
                  <div
                    v-if="part.type === 'text'"
                    :class="[
                      'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                      message.role === 'user'
                        ? 'bg-primary-500 text-white font-medium shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                    ]"
                  >
                    <MDC :value="part.text || ''" />
                  </div>

                  <!-- Tool Invocation -->
                  <div
                    v-else-if="
                      (part.type === 'tool-invocation' || part.type.startsWith('tool-')) &&
                      part.type !== 'tool-approval-response'
                    "
                    class="w-full mt-1"
                  >
                    <ChatToolCall
                      :tool-call="{
                        name:
                          (part as any).toolName ||
                          (part.type.startsWith('tool-') ? part.type.replace('tool-', '') : ''),
                        args: (part as any).args || (part as any).input,
                        response: (part as any).result || (part as any).output,
                        status:
                          (part as any).state === 'result' ||
                          (part as any).state === 'output-available'
                            ? 'success'
                            : (part as any).state === 'error' ||
                                (part as any).state === 'output-error' ||
                                (part as any).state === 'output-denied'
                              ? 'error'
                              : 'loading',
                        timestamp:
                          (message as any).createdAt &&
                          !isNaN(new Date((message as any).createdAt).getTime())
                            ? new Date((message as any).createdAt).toISOString()
                            : new Date().toISOString()
                      }"
                    />
                  </div>
                </template>
              </template>

              <!-- Legacy/Fallback Content Rendering -->
              <div
                v-else-if="message.content"
                :class="[
                  'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                  message.role === 'user'
                    ? 'bg-primary-500 text-white font-medium shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                ]"
              >
                <MDC :value="message.content" />
              </div>
            </div>

            <!-- Typing Indicator -->
            <div
              v-if="chatStatus === 'streaming'"
              class="flex items-center gap-2 text-xs text-gray-400 font-medium px-2 italic"
            >
              <UIcon name="i-heroicons-ellipsis-horizontal" class="w-4 h-4 animate-pulse" />
              Coach is thinking...
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <!-- Animated Pill / Input Container -->
    <div
      class="w-full bg-white/90 dark:bg-gray-950/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] ring-1 ring-black/5 dark:ring-white/10 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] relative group overflow-hidden h-12"
      :class="[
        shouldBeWide ? '' : 'cursor-pointer hover:bg-white dark:hover:bg-gray-900',
        isMobile && (isExpanded || isFocused) ? 'rounded-none border-x-0 border-b-0' : 'rounded-2xl'
      ]"
    >
      <!-- Expanded Input View -->
      <div
        class="absolute inset-0 px-1 transition-opacity flex items-center"
        :class="
          shouldBeWide
            ? 'opacity-100 pointer-events-auto duration-500 delay-300'
            : 'opacity-0 pointer-events-none duration-200 delay-0'
        "
      >
        <UInput
          v-model="input"
          :placeholder="isExpanded ? 'Type a reply...' : 'Ask anything or log data...'"
          size="lg"
          variant="none"
          class="w-full"
          :loading="chatStatus === 'streaming'"
          :ui="{
            leading:
              chatMessages.length > 0
                ? 'cursor-pointer hover:text-primary-500 transition-colors'
                : ''
          }"
          @keyup.enter="handleSubmit"
          @focus="isFocused = true"
          @blur="isFocused = false"
        >
          <template #leading>
            <UIcon
              name="i-heroicons-sparkles"
              class="w-5 h-5 transition-colors"
              :class="[
                shouldBeWide ? 'animate-pulse text-primary-500' : 'text-gray-400 dark:text-gray-500'
              ]"
              @click="toggleExpand"
            />
          </template>
          <template #trailing>
            <div class="flex items-center gap-2 mr-1">
              <kbd
                v-if="!input && !isExpanded"
                class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-800 text-[10px] font-medium text-gray-400"
              >
                Ask Coach
              </kbd>
              <UButton
                v-else
                :icon="isExpanded ? 'i-heroicons-paper-airplane' : 'i-heroicons-arrow-up-right'"
                color="primary"
                variant="solid"
                size="sm"
                class="rounded-xl px-4 font-bold"
                :loading="chatStatus === 'streaming'"
                @click="handleSubmit"
              />
            </div>
          </template>
        </UInput>
      </div>

      <!-- Minimized Pill View -->
      <div
        class="absolute inset-0 flex items-center justify-center gap-2 px-4 transition-opacity"
        :class="
          shouldBeWide
            ? 'opacity-0 pointer-events-none duration-200 delay-0'
            : 'opacity-100 duration-500 delay-300'
        "
      >
        <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary-500" />
        <span class="text-xs font-black uppercase tracking-widest text-gray-500 truncate"
          >Ask Coach</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Chat } from '@ai-sdk/vue'
  import { DefaultChatTransport } from 'ai'
  import { useBreakpoints, breakpointsTailwind, useEventListener } from '@vueuse/core'

  const breakpoints = useBreakpoints(breakpointsTailwind)
  const isMobile = breakpoints.smaller('sm')

  const viewportHeight = ref(
    typeof window !== 'undefined' ? window.visualViewport?.height || window.innerHeight : 0
  )

  if (import.meta.client && typeof window !== 'undefined' && window.visualViewport) {
    useEventListener(window.visualViewport, 'resize', () => {
      viewportHeight.value = window.visualViewport?.height || window.innerHeight
    })
  }

  const chatMaxHeight = computed(() => {
    if (!isMobile.value) return '60vh'
    // On mobile, leave some space for the input and status bar
    const height = (viewportHeight.value || (import.meta.client ? window.innerHeight : 800)) - 100
    return `${height}px`
  })

  const input = ref('')
  const isVisible = ref(false)
  const isExpanded = ref(false)
  const isHovered = ref(false)
  const isFocused = ref(false)
  const currentRoomId = ref('')
  const loadingMessages = ref(false)
  const scrollContainer = ref<HTMLElement | null>(null)

  const route = useRoute()
  const toast = useToast()
  const { refresh: refreshRuns } = useUserRuns()

  // Sticky Hover Logic
  let hoverTimeout: any = null
  function onMouseEnter() {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    isHovered.value = true
  }
  function onMouseLeave() {
    hoverTimeout = setTimeout(() => {
      isHovered.value = false
    }, 3000) // Keep it expanded for 3s after mouse leaves
  }

  // Initialize Chat class (shallowRef to avoid interfering with internal SDK reactivity)
  const chatInstance = shallowRef<any>(null)
  const chatMessages = computed(() => chatInstance.value?.messages || [])
  const chatStatus = computed(() => chatInstance.value?.status || 'idle')

  // Logic to determine if we should be in full-width mode
  const shouldBeWide = computed(() => {
    return (
      isHovered.value ||
      isFocused.value ||
      isExpanded.value ||
      chatStatus.value === 'streaming' ||
      !!input.value.trim()
    )
  })

  // Only show on specific pages
  const enabledPages = [
    '/dashboard',
    '/activities',
    '/nutrition',
    '/performance',
    '/fitness',
    '/plan'
  ]

  watch(
    () => route.path,
    (path) => {
      isVisible.value =
        enabledPages.some((p) => path === p || path.startsWith(p + '/')) && path !== '/chat'
    },
    { immediate: true }
  )

  // Auto-scroll logic
  watch(
    () => chatMessages.value,
    () => {
      nextTick(() => {
        if (scrollContainer.value) {
          scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
        }
      })
    },
    { deep: true }
  )

  async function closeChat() {
    isExpanded.value = false
    // Reset state so the next interaction starts a fresh room
    setTimeout(() => {
      currentRoomId.value = ''
      chatInstance.value = null
    }, 500) // Wait for transition to finish
  }

  function toggleExpand() {
    if (chatMessages.value.length > 0) {
      isExpanded.value = !isExpanded.value
    }
  }

  async function handleSubmit() {
    if (!input.value.trim() || chatStatus.value === 'streaming') return

    const text = input.value
    input.value = ''

    if (!isExpanded.value) {
      isExpanded.value = true
    }

    try {
      // 1. Create a room if we don't have one for this "session"
      if (!currentRoomId.value) {
        loadingMessages.value = true
        const room = await $fetch<any>('/api/chat/rooms', {
          method: 'POST'
        })
        currentRoomId.value = room.roomId

        // 2. Initialize Chat SDK
        chatInstance.value = new Chat({
          transport: new DefaultChatTransport({
            api: '/api/chat/messages',
            body: () => ({
              roomId: currentRoomId.value
            })
          }),
          onFinish: () => {
            refreshRuns()
          },
          onError: (err) => {
            console.error('[QuickCapture] Chat Error:', err)
          }
        })
        loadingMessages.value = false
      }

      // 3. Send message
      chatInstance.value.sendMessage({
        text
      })
    } catch (e: any) {
      console.error('[QuickCapture] Error:', e)
      toast.add({
        title: 'Error',
        description: 'Could not connect to coach. Please try again.',
        color: 'error'
      })
      isExpanded.value = false
    }
  }
</script>
