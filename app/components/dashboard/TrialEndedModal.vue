<template>
  <UModal
    v-model:open="isOpen"
    :title="t('trial_ended_title')"
    :description="t('trial_ended_description')"
    :dismissible="true"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          {{ t('trial_ended_body') }}
        </p>

        <div
          v-if="summary?.usage?.length"
          class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4"
        >
          <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
            {{ t('trial_ended_usage_header') }}
          </p>
          <ul class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li v-for="item in displayUsage" :key="item.label">
              {{ item.label }} — {{ item.count }}
            </li>
          </ul>
        </div>

        <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc pl-5">
          <li>{{ t('trial_ended_change_checkins') }}</li>
          <li>{{ t('trial_ended_change_analysis') }}</li>
          <li>{{ t('trial_ended_change_chat') }}</li>
        </ul>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full gap-3">
        <UButton color="neutral" variant="ghost" @click="dismiss">{{
          t('trial_ended_dismiss')
        }}</UButton>
        <UButton color="primary" to="/settings/billing" @click="dismiss">
          {{ t('trial_ended_upgrade') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('dashboard')
  const userStore = useUserStore()
  const { trackModalOpen } = useAnalytics()

  const isOpen = ref(false)
  const summary = ref<{
    usage: Array<{ operation: string; count: number }>
  } | null>(null)

  function translateOperation(operation: string) {
    switch (operation) {
      case 'generate structured workout':
        return t.value('trial_ended_usage_generate_structured_workout')
      case 'chat skill router':
        return t.value('trial_ended_usage_chat_skill_router')
      case 'chat turn start':
        return t.value('trial_ended_usage_chat_turn_start')
      case 'chat':
        return t.value('trial_ended_usage_chat')
      case 'chat attempt':
        return t.value('trial_ended_usage_chat_attempt')
      case 'summarize-chat-memory':
      case 'summarize chat memory':
        return t.value('trial_ended_usage_summarize_chat_memory')
      default:
        return operation
    }
  }

  const displayUsage = computed(() => {
    const usage = summary.value?.usage ?? []
    let chatTotal = 0
    const other: Array<{ label: string; count: number }> = []

    for (const item of usage) {
      const op = item.operation.toLowerCase()
      if (op.includes('chat') || op.includes('summarize')) {
        chatTotal += item.count
      } else {
        other.push({ label: translateOperation(item.operation), count: item.count })
      }
    }

    const result: Array<{ label: string; count: number }> = []
    if (chatTotal > 0) {
      result.push({ label: t.value('trial_ended_usage_chat'), count: chatTotal })
    }
    return [...result, ...other]
  })

  function dismissalKey() {
    const userId = userStore.user?.id
    return userId ? `trial-ended-dismissed:${userId}` : null
  }

  function wasDismissed() {
    const key = dismissalKey()
    if (!key || !import.meta.client) return false
    return localStorage.getItem(key) === '1'
  }

  function dismiss() {
    const key = dismissalKey()
    if (key && import.meta.client) {
      localStorage.setItem(key, '1')
    }
    isOpen.value = false
  }

  async function maybeShow() {
    await userStore.fetchUser()
    const user = userStore.user
    if (!user?.trialEndsAt || user.subscriptionTier !== 'FREE') return
    if (userStore.isTrialActive) return
    if (wasDismissed()) return

    const trialEnd = new Date(user.trialEndsAt)
    if (trialEnd > new Date()) return

    try {
      summary.value = (await ($fetch as any)('/api/profile/trial-summary')) as {
        usage: Array<{ operation: string; count: number }>
      }
    } catch {
      summary.value = null
    }

    isOpen.value = true
    trackModalOpen('trial_ended', 'Trial Ended')
  }

  onMounted(() => {
    void maybeShow()
  })
</script>
