<template>
  <UModal
    v-model:open="open"
    :title="rewardEnabled ? t('share_modal_title_reward') : t('share_modal_title_default')"
    :ui="{
      content: 'overflow-hidden sm:max-w-md'
    }"
    :transition="true"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Hero Section: QR Code -->
        <div class="relative group">
          <div
            class="floating-card-base grain-overlay rounded-[32px] p-4 sm:p-8 flex flex-col items-center gap-4 sm:gap-6 !bg-white dark:!bg-[#111111] !border-gray-200 dark:!border-white/5"
          >
            <div
              class="relative flex items-center justify-center rounded-2xl bg-white p-2 sm:p-4 shadow-inner ring-1 ring-gray-900/5 dark:bg-white"
            >
              <img
                v-if="qrCodeDataUrl"
                :src="qrCodeDataUrl"
                :alt="t('share_modal_qr_alt', { link: shareLink })"
                class="h-[72vw] w-[72vw] max-h-72 max-w-72 rounded-lg sm:h-48 sm:w-48"
              />
              <USkeleton
                v-else
                class="h-[72vw] w-[72vw] max-h-72 max-w-72 rounded-lg sm:h-48 sm:w-48"
              />

              <!-- Decorative Corner Accents -->
              <div
                class="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary-500 rounded-tl-sm opacity-40"
              />
              <div
                class="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-primary-500 rounded-tr-sm opacity-40"
              />
              <div
                class="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-primary-500 rounded-bl-sm opacity-40"
              />
              <div
                class="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary-500 rounded-br-sm opacity-40"
              />
            </div>

            <div class="text-center space-y-1">
              <p
                class="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight italic"
              >
                {{ t('share_modal_hero_title') }}
              </p>
              <p
                class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]"
              >
                {{ t('share_modal_hero_subtitle') }}
              </p>
            </div>
          </div>
        </div>

        <div class="w-full border-b border-dashed border-gray-200 dark:border-gray-800" />

        <div
          v-if="rewardEnabled"
          class="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900 dark:border-primary-900/60 dark:bg-primary-950/30 dark:text-primary-100"
        >
          {{ t('share_modal_reward_desc') }}
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
          class="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/60 border border-gray-100 dark:border-white/5"
        >
          <p
            class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-relaxed"
          >
            {{ hasShareIntent ? t('share_modal_intent_detected') : t('share_modal_intent_prompt') }}
          </p>
          <UButton
            :label="t('share_modal_claim_button')"
            color="primary"
            variant="solid"
            class="font-black uppercase tracking-widest rounded-xl"
            :disabled="!hasShareIntent || claimingReward"
            :loading="claimingReward"
            @click="claimReward"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import QRCode from 'qrcode'

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
  const qrCodeDataUrl = ref('')
  const { t } = useTranslate('dashboard')
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
  const shareTitle = computed(() => t.value('share_modal_share_title'))

  async function generateQrCode() {
    try {
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, shareLink.value, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 640, // High res for better quality
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })

      const ctx = canvas.getContext('2d')
      if (ctx) {
        const logo = new Image()
        logo.src = '/media/logo_square.png'
        await new Promise((resolve) => {
          logo.onload = resolve
          logo.onerror = resolve // Continue even if logo fails
        })

        if (logo.complete && logo.naturalWidth !== 0) {
          const size = canvas.width
          const logoSize = size * 0.2
          const x = (size - logoSize) / 2
          const y = (size - logoSize) / 2

          // Clear background for logo with slight padding
          const padding = size * 0.05
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          const radius = size * 0.04
          const bx = x - padding / 2
          const by = y - padding / 2
          const bw = logoSize + padding
          const bh = logoSize + padding

          ctx.moveTo(bx + radius, by)
          ctx.arcTo(bx + bw, by, bx + bw, by + bh, radius)
          ctx.arcTo(bx + bw, by + bh, bx, by + bh, radius)
          ctx.arcTo(bx, by + bh, bx, by, radius)
          ctx.arcTo(bx, by, bx + bw, by, radius)
          ctx.closePath()
          ctx.fill()

          ctx.drawImage(logo, x, y, logoSize, logoSize)
        }
      }

      qrCodeDataUrl.value = canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Failed to generate share QR code:', error)
      toast.add({
        title: t.value('share_modal_qr_unavailable_title'),
        description: t.value('share_modal_qr_unavailable_desc'),
        color: 'error'
      })
    }
  }

  async function handleShareCopy() {
    try {
      await navigator.clipboard.writeText(shareLink.value)
      hasShareIntent.value = true
      trackShareLinkCopy()
      toast.add({
        title: t.value('share_modal_copied_title'),
        description: t.value('share_modal_copied_desc'),
        color: 'success'
      })
    } catch (error) {
      console.error('Failed to copy share link:', error)
      toast.add({
        title: t.value('share_modal_copy_failed_title'),
        description: t.value('share_modal_copy_failed_desc'),
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
      const response = (await $fetch('/api/system-messages/share-reward/claim', {
        method: 'POST',
        body: { messageId: messageId || undefined }
      } as any)) as {
        trialEndsAt: string
        daysGranted: number
        alreadyClaimed: boolean
      }

      trackShareRewardClaim(response.daysGranted)
      await userStore.fetchUser(true)
      toast.add({
        title: t.value('share_modal_reward_claimed_title'),
        description: t.value('share_modal_reward_claimed_desc', { days: response.daysGranted }),
        color: 'success'
      })
      open.value = false
      emit('claimed')
    } catch (error: any) {
      const statusCode = error?.statusCode || error?.data?.statusCode
      const description =
        error?.data?.statusMessage ||
        error?.statusMessage ||
        t.value('share_modal_reward_claim_failed_fallback')
      trackShareRewardClaimRejected(String(statusCode || 'unknown'))
      toast.add({
        title:
          statusCode === 409
            ? t.value('share_modal_reward_already_claimed')
            : t.value('share_modal_reward_claim_failed_title'),
        description,
        color: 'error'
      })
    } finally {
      claimingReward.value = false
    }
  }

  watch(
    () => open.value,
    async (isOpen) => {
      if (isOpen) {
        hasShareIntent.value = false
        if (!qrCodeDataUrl.value) {
          await generateQrCode()
        }
        trackShareModalOpen()
      } else {
        hasShareIntent.value = false
      }
    }
  )
</script>
