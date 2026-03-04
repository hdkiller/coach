<template>
  <div v-if="message">
    <UAlert
      :title="undefined"
      :color="isAdvert ? 'gray' : color"
      :variant="variant"
      :icon="icon"
      :close="{
        icon: 'i-heroicons-x-mark-20-solid',
        color: 'neutral',
        variant: 'link',
        onClick: (e: Event) => e.stopPropagation()
      }"
      class="mb-6 w-full shadow-sm transition-all duration-200"
      :class="[
        { 'cursor-pointer': isShare || !!message.targetUrl },
        isAdvert
          ? '!bg-amber-50/40 lg:!bg-amber-50/20 dark:!bg-[#1c1a17] ring-1 !ring-amber-400/40 dark:!ring-amber-500/40'
          : isShare
            ? '!bg-sky-50/60 lg:!bg-sky-50/40 dark:!bg-sky-950/20 ring-1 !ring-sky-400/40 dark:!ring-sky-500/40'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      ]"
      :ui="{
        root: 'rounded-none sm:rounded-lg',
        icon: isAdvert
          ? 'text-amber-500 dark:text-amber-500'
          : isShare
            ? 'text-sky-600 dark:text-sky-400'
            : undefined,
        close: isAdvert
          ? 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors'
          : isShare
            ? 'text-sky-400 dark:text-sky-500 hover:text-sky-700 dark:hover:text-sky-200 transition-colors'
            : undefined,
        description: 'w-full'
      }"
      @click="handleClick"
      @update:open="dismiss"
    >
      <template #description>
        <div
          class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-8 relative z-10"
        >
          <div class="flex flex-col gap-2 lg:gap-1 flex-1 min-w-0">
            <h3
              v-if="message.title"
              class="text-sm font-medium"
              :class="
                isAdvert
                  ? 'text-gray-900 dark:text-gray-100 font-bold lg:text-base'
                  : isShare
                    ? 'text-sky-950 dark:text-sky-100 font-bold lg:text-base'
                    : 'text-gray-900 dark:text-white'
              "
            >
              {{ message.title }}
            </h3>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              class="prose dark:prose-invert max-w-none text-sm leading-relaxed"
              :class="{
                'prose-strong:text-amber-600 dark:prose-strong:text-amber-400 prose-strong:font-bold':
                  isAdvert,
                'prose-strong:text-sky-700 dark:prose-strong:text-sky-300 prose-strong:font-bold':
                  isShare
              }"
              v-html="parsedContent"
            ></div>
          </div>

          <div
            v-if="message.actionLabel"
            class="mt-1 lg:mt-0 flex flex-col gap-2 items-start lg:items-end shrink-0"
          >
            <UButton
              :label="message.actionLabel"
              size="xs"
              :color="isAdvert ? 'warning' : isShare ? 'primary' : color"
              variant="solid"
              class="font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 lg:brightness-105 lg:px-6 lg:py-2"
              :class="
                isAdvert
                  ? 'shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35'
                  : isShare
                    ? 'shadow-lg shadow-sky-500/20 hover:shadow-sky-500/35'
                    : ''
              "
              @click.stop="handleAction"
            />
            <span
              v-if="isAdvert"
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium ml-1 mt-0.5 whitespace-nowrap"
            >
              {{ t('system_message_no_commitment') }}
            </span>
            <span
              v-else-if="isShare"
              class="text-[10px] text-sky-700/80 dark:text-sky-300/80 font-medium ml-1 mt-0.5 whitespace-nowrap"
            >
              {{ t('system_message_reward') }}
            </span>
          </div>
        </div>
      </template>
    </UAlert>

    <DashboardShareCoachWattsModal
      v-model:open="isShareModalOpen"
      :reward-enabled="true"
      :message-id="message.id"
      @claimed="handleRewardClaimed"
    />
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import { marked } from 'marked'

  const { t } = useTranslate('dashboard')

  interface DashboardSystemMessage {
    id: string
    title?: string | null
    content?: string | null
    type?: string | null
    targetUrl?: string | null
    actionLabel?: string | null
  }

  const message = ref<DashboardSystemMessage | null>(null)
  const isShareModalOpen = ref(false)
  const { trackSharePromptView } = useAnalytics()

  const parsedContent = computed(() => {
    if (!message.value?.content) return ''
    return marked.parse(message.value.content) as string
  })

  const typeConfig: Record<string, { color: string; icon: string }> = {
    INFO: { color: 'info', icon: 'i-heroicons-information-circle' },
    WARNING: { color: 'warning', icon: 'i-heroicons-exclamation-triangle' },
    ERROR: { color: 'error', icon: 'i-heroicons-exclamation-circle' },
    SUCCESS: { color: 'success', icon: 'i-heroicons-check-circle' },
    ADVERT: { color: 'warning', icon: 'i-heroicons-sparkles' },
    SHARE: { color: 'primary', icon: 'i-heroicons-share' }
  }

  const color = computed(() => (typeConfig[message.value?.type || '']?.color || 'primary') as any)
  const icon = computed(
    () => typeConfig[message.value?.type || '']?.icon || 'i-heroicons-information-circle'
  )
  const isAdvert = computed(() => message.value?.type === 'ADVERT')
  const isShare = computed(() => message.value?.type === 'SHARE')
  const variant = 'subtle'

  async function fetchMessage() {
    try {
      const { message: msg } = await $fetch<{ message: DashboardSystemMessage | null }>(
        '/api/system-messages/latest'
      )
      message.value = msg
      if (msg?.type === 'SHARE') {
        trackSharePromptView('SHARE')
      }
    } catch (e) {
      console.error('Failed to fetch system message', e)
    }
  }

  function openShareModal() {
    isShareModalOpen.value = true
  }

  function handleClick() {
    if (isShare.value) {
      openShareModal()
      return
    }

    if (message.value?.targetUrl) {
      navigateTo(message.value.targetUrl, { external: true })
    }
  }

  function handleAction() {
    if (isShare.value) {
      openShareModal()
      return
    }

    if (message.value?.targetUrl) {
      navigateTo(message.value.targetUrl, { external: true })
    }
  }

  function handleRewardClaimed() {
    message.value = null
  }

  async function dismiss() {
    if (!message.value) return

    const id = message.value.id
    message.value = null

    try {
      await $fetch('/api/system-messages/dismiss', {
        method: 'POST',
        body: { messageId: id }
      })
    } catch (e) {
      console.error('Failed to dismiss message', e)
    }
  }

  onMounted(fetchMessage)
</script>
