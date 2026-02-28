<template>
  <UModal
    v-model:open="open"
    :title="rewardEnabled ? 'Share Coach Watts' : 'Help Coach Watts Grow'"
    :description="
      rewardEnabled
        ? 'Share Coach Watts on social and unlock 3 extra trial days. One-time reward for free users.'
        : 'Share Coach Watts with a friend or your audience.'
    "
  >
    <template #body>
      <div class="space-y-4">
        <div
          class="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100"
        >
          {{
            rewardEnabled
              ? 'Help us grow by sharing Coach Watts with a friend or your audience. After you copy the link or use one of the share buttons below, you can claim your bonus trial time.'
              : 'If Coach Watts has been useful, sharing it helps more athletes discover it.'
          }}
        </div>

        <ShareAccessPanel
          mode="static"
          :link="shareLink"
          :loading="false"
          expiry-value="never"
          resource-label="site"
          :share-title="shareTitle"
          @copy="handleShareCopy"
          @network-click="handleNetworkClick"
        />

        <div
          v-if="rewardEnabled"
          class="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-900/60"
        >
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {{
              hasShareIntent
                ? 'Share intent detected. You can claim your reward now.'
                : 'Copy the link or click a share target to enable the reward claim.'
            }}
          </p>
          <UButton
            label="Claim 3 extra trial days"
            color="primary"
            :disabled="!hasShareIntent || claimingReward"
            :loading="claimingReward"
            @click="claimReward"
          />
        </div>
      </div>
    </template>
    <template #footer>
      <UButton label="Close" color="neutral" variant="ghost" @click="open = false" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
  const open = defineModel<boolean>('open', { default: false })

  const { rewardEnabled = false, messageId = null } = defineProps<{
    rewardEnabled?: boolean
    messageId?: string | null
  }>()

  const emit = defineEmits<{
    claimed: []
  }>()

  const hasShareIntent = ref(false)
  const claimingReward = ref(false)
  const userStore = useUserStore()
  const toast = useToast()
  const runtimeConfig = useRuntimeConfig()
  const {
    trackShareModalOpen,
    trackShareLinkCopy,
    trackShareNetworkClick,
    trackShareRewardClaim,
    trackShareRewardClaimRejected
  } = useAnalytics()

  const shareLink = computed(() => {
    const baseUrl = runtimeConfig.public.siteUrl || 'https://coachwatts.com'
    const url = new URL(baseUrl)
    url.searchParams.set('utm_source', 'in_app_share')
    url.searchParams.set(
      'utm_medium',
      rewardEnabled ? 'dashboard_system_message' : 'dashboard_footer'
    )
    url.searchParams.set('utm_campaign', 'share_coach_watts')
    return url.toString()
  })
  const shareTitle = 'Coach Watts - AI Endurance Coaching'

  async function handleShareCopy() {
    try {
      await navigator.clipboard.writeText(shareLink.value)
      hasShareIntent.value = true
      trackShareLinkCopy()
      toast.add({
        title: 'Copied',
        description: 'Share link copied to clipboard.',
        color: 'success'
      })
    } catch (error) {
      console.error('Failed to copy share link:', error)
      toast.add({
        title: 'Copy failed',
        description: 'Could not copy the share link. Please try again.',
        color: 'error'
      })
    }
  }

  function handleNetworkClick(network: string) {
    hasShareIntent.value = true
    trackShareNetworkClick(network)
  }

  async function claimReward() {
    if (!rewardEnabled || !hasShareIntent.value || claimingReward.value) return

    claimingReward.value = true
    try {
      const response = await $fetch<{
        trialEndsAt: string
        daysGranted: number
        alreadyClaimed: boolean
      }>('/api/system-messages/share-reward/claim', {
        method: 'POST',
        body: { messageId }
      })

      trackShareRewardClaim(response.daysGranted)
      await userStore.fetchUser(true)
      toast.add({
        title: 'Reward claimed',
        description: `Your trial was extended by ${response.daysGranted} days.`,
        color: 'success'
      })
      open.value = false
      emit('claimed')
    } catch (error: any) {
      const statusCode = error?.statusCode || error?.data?.statusCode
      const description =
        error?.data?.statusMessage || error?.statusMessage || 'Failed to claim your reward.'
      trackShareRewardClaimRejected(String(statusCode || 'unknown'))
      toast.add({
        title: statusCode === 409 ? 'Reward already claimed' : 'Could not claim reward',
        description,
        color: 'error'
      })
    } finally {
      claimingReward.value = false
    }
  }

  watch(
    () => open.value,
    (isOpen) => {
      if (isOpen) {
        hasShareIntent.value = false
        trackShareModalOpen()
      } else {
        hasShareIntent.value = false
      }
    }
  )
</script>
