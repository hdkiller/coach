<script setup lang="ts">
  import { sanitizeCallbackUrl } from '~/utils/safe-callback-url'

  definePageMeta({
    layout: 'home',
    auth: false
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useAuth()
  const userStore = useUserStore()
  const { trackPartnerPageView, trackPartnerSignupStart, trackPartnerRedemption } = useAnalytics()

  const slug = computed(() => String(route.params.slug || '').toLowerCase())
  const campaignData = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const redeeming = ref(false)
  const autoRedeeming = ref(false)
  const redemptionResult = ref<any>(null)

  const callbackPath = computed(() =>
    sanitizeCallbackUrl(`/partners/${slug.value}?redeem=1`, '/dashboard')
  )
  const signupUrl = computed(() => `/join?callbackUrl=${encodeURIComponent(callbackPath.value)}`)
  const loginUrl = computed(() => `/login?callbackUrl=${encodeURIComponent(callbackPath.value)}`)

  const availability = computed(() => campaignData.value?.campaign?.availability || 'DISABLED')
  const campaign = computed(() => campaignData.value?.campaign)
  const userState = computed(() => campaignData.value?.userState)

  const headline = computed(() => {
    if (!campaign.value) return 'Partner offer'
    return `${campaign.value.accessDurationDays} days of Coach Watts ${campaign.value.grantedTier} for ${campaign.value.partnerName}`
  })

  const benefitCopy = computed(() => {
    if (!campaign.value) return ''
    if (campaign.value.grantedTier === 'PRO') {
      return 'Full PRO access: automatic sync and analysis, deep-reasoning AI, priority processing, and proactive coaching insights.'
    }
    return 'Supporter access: automatic sync and analysis with priority processing.'
  })

  const statusMessage = computed(() => {
    if (loading.value) return null
    if (error.value) return error.value
    if (redemptionResult.value?.message) return redemptionResult.value.message

    switch (availability.value) {
      case 'DISABLED':
        return 'This partner offer is currently unavailable.'
      case 'NOT_STARTED':
        return 'This partner offer is not open yet.'
      case 'EXPIRED':
        return 'This partner offer has ended.'
      case 'CAPACITY_REACHED':
        return 'This pilot offer has reached its 50-member capacity.'
      default:
        if (userState.value?.alreadyRedeemed) {
          return 'You have already redeemed this offer.'
        }
        return null
    }
  })

  const canRedeem = computed(() => {
    return (
      availability.value === 'AVAILABLE' &&
      session.value &&
      !userState.value?.alreadyRedeemed &&
      !redemptionResult.value
    )
  })

  async function fetchCampaign() {
    loading.value = true
    error.value = null
    try {
      campaignData.value = await $fetch(`/api/partners/${slug.value}`)
      trackPartnerPageView(slug.value, campaignData.value.campaign.availability)
    } catch (err: any) {
      error.value = err.data?.message || 'Partner offer not found.'
    } finally {
      loading.value = false
    }
  }

  async function redeemOffer() {
    if (!session.value) {
      trackPartnerSignupStart(slug.value)
      await navigateTo(signupUrl.value)
      return
    }

    redeeming.value = true
    try {
      const response = await $fetch(`/api/partners/${slug.value}/redeem`, {
        method: 'POST'
      })
      redemptionResult.value = response
      trackPartnerRedemption(
        slug.value,
        response.status === 'ALREADY_REDEEMED' ? 'already_redeemed' : 'completed'
      )
      await userStore.fetchUser(true)
      await fetchCampaign()
      toast.add({
        title: response.status === 'ALREADY_REDEEMED' ? 'Already redeemed' : 'Offer activated',
        description: response.message,
        color: 'success'
      })
    } catch (err: any) {
      const reason = err.data?.reason || err.data?.message || 'unknown'
      trackPartnerRedemption(slug.value, 'rejected', reason)
      toast.add({
        title: 'Could not redeem offer',
        description: err.data?.message || 'Please try again later.',
        color: 'error'
      })
    } finally {
      redeeming.value = false
    }
  }

  onMounted(fetchCampaign)

  watchEffect(() => {
    if (
      import.meta.client &&
      session.value &&
      campaignData.value &&
      !loading.value &&
      route.query.redeem === '1' &&
      canRedeem.value &&
      !redeeming.value &&
      !autoRedeeming.value
    ) {
      autoRedeeming.value = true
      redeemOffer().finally(() => {
        autoRedeeming.value = false
        router.replace({ path: route.path, query: {} })
      })
    }
  })

  useSeoMeta({
    title: () => `${headline.value} | Coach Watts`,
    description: () =>
      benefitCopy.value ||
      'Redeem a time-limited partner offer for Coach Watts. No payment card required.'
  })
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
    <UCard class="w-full max-w-2xl overflow-hidden">
      <div v-if="loading" class="p-10 text-center space-y-4">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-12 h-12 text-primary-500 animate-spin mx-auto"
        />
        <p class="text-neutral-500 font-medium">Loading partner offer...</p>
      </div>

      <div v-else-if="error" class="p-10 text-center space-y-6">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-error-500 mx-auto" />
        <div class="space-y-2">
          <h1 class="text-2xl font-black uppercase tracking-tight">Offer unavailable</h1>
          <p class="text-neutral-500">{{ error }}</p>
        </div>
        <UButton to="/" color="neutral" variant="ghost" label="Back to home" block size="lg" />
      </div>

      <div v-else-if="campaign" class="p-0">
        <div class="bg-primary-600 p-8 text-white space-y-3">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Partner offer</p>
          <h1 class="text-3xl font-black uppercase tracking-tight leading-tight">{{ headline }}</h1>
          <p class="text-sm text-primary-50/90">{{ campaign.campaignName }}</p>
        </div>

        <div class="p-8 space-y-6">
          <p class="text-neutral-600 dark:text-neutral-300">{{ benefitCopy }}</p>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Payment</p>
              <p class="mt-1 font-semibold">No payment card required</p>
            </div>
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Billing</p>
              <p class="mt-1 font-semibold">No automatic charge</p>
            </div>
          </div>

          <p class="text-sm text-neutral-500">
            After {{ campaign.accessDurationDays }} days, your account continues on the permanent
            FREE tier unless you choose to upgrade.
          </p>

          <p v-if="campaign.maxRedemptions" class="text-xs text-neutral-500">
            This pilot offer is limited to {{ campaign.maxRedemptions }} members ({{
              campaign.redemptionCount
            }}
            redeemed so far).
          </p>

          <UAlert
            v-if="statusMessage"
            :color="
              availability === 'AVAILABLE' && !userState?.alreadyRedeemed ? 'primary' : 'neutral'
            "
            variant="subtle"
            :title="statusMessage"
          />

          <div class="space-y-3">
            <UButton
              color="primary"
              size="xl"
              block
              class="font-black uppercase tracking-wide"
              :loading="redeeming || autoRedeeming"
              @click="redeemOffer"
            >
              {{
                session
                  ? canRedeem
                    ? 'Redeem offer'
                    : userState?.alreadyRedeemed
                      ? 'Already redeemed'
                      : 'Offer unavailable'
                  : 'Sign up to redeem'
              }}
            </UButton>

            <UButton
              v-if="!session"
              :to="loginUrl"
              color="neutral"
              variant="ghost"
              label="Already have an account? Log in"
              block
            />

            <UButton
              v-if="session && redemptionResult"
              to="/dashboard"
              color="neutral"
              variant="soft"
              label="Go to dashboard"
              block
            />
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
