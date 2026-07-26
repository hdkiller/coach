<script setup lang="ts">
  import { useTranslate, useTolgee } from '@tolgee/vue'
  import { sanitizeCallbackUrl } from '#shared/safe-callback-url'

  definePageMeta({
    layout: 'home',
    auth: false
  })

  const { t } = useTranslate('partners')
  const tolgee = useTolgee(['language'])
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useAuth()
  const userStore = useUserStore()
  const {
    trackPartnerPageView,
    trackPartnerSignupStart,
    trackPartnerRedemption,
    trackPartnerEventJoinStart,
    trackPartnerEventJoinCompleted,
    trackPartnerEventJoinAlreadyExists,
    trackOfficialEventRegistrationClick
  } = useAnalytics()

  const slug = computed(() => String(route.params.slug || '').toLowerCase())
  const campaignData = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const redeeming = ref(false)
  const autoRedeeming = ref(false)
  const joiningSlug = ref<string | null>(null)
  const redemptionResult = ref<any>(null)
  const confirmEvent = ref<any>(null)
  const priority = ref<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH')
  const phase = ref('BUILD')

  const dateLocale = computed(() => {
    const lang = tolgee.value.getLanguage() || 'en'
    if (lang === 'hu') return 'hu-HU'
    if (lang === 'zh') return 'zh-CN'
    return lang
  })

  const priorityItems = computed(() => [
    { label: t.value('priority_high'), value: 'HIGH' },
    { label: t.value('priority_medium'), value: 'MEDIUM' },
    { label: t.value('priority_low'), value: 'LOW' }
  ])

  const phaseItems = computed(() => [
    { label: t.value('phase_build'), value: 'BUILD' },
    { label: t.value('phase_base'), value: 'BASE' },
    { label: t.value('phase_peak'), value: 'PEAK' },
    { label: t.value('phase_taper'), value: 'TAPER' }
  ])

  const callbackPath = computed(() =>
    sanitizeCallbackUrl(`/partners/${slug.value}?redeem=1`, '/dashboard')
  )
  const signupUrl = computed(() => `/join?callbackUrl=${encodeURIComponent(callbackPath.value)}`)
  const loginUrl = computed(() => `/login?callbackUrl=${encodeURIComponent(callbackPath.value)}`)

  const availability = computed(() => campaignData.value?.campaign?.availability || 'DISABLED')
  const campaign = computed(() => campaignData.value?.campaign)
  const userState = computed(() => campaignData.value?.userState)
  const events = computed(() => campaign.value?.events || [])
  const hasRedeemed = computed(
    () => Boolean(userState.value?.alreadyRedeemed) || Boolean(redemptionResult.value)
  )

  const headline = computed(() => {
    if (!campaign.value) return t.value('headline_fallback')
    return t.value('headline', {
      days: campaign.value.accessDurationDays,
      tier: campaign.value.grantedTier,
      partner: campaign.value.partnerName
    })
  })

  const benefitCopy = computed(() => {
    if (!campaign.value) return ''
    if (campaign.value.grantedTier === 'PRO') {
      return t.value('benefit_pro')
    }
    return t.value('benefit_supporter')
  })

  const statusMessage = computed(() => {
    if (loading.value) return null
    if (error.value) return error.value

    if (redemptionResult.value) {
      const endsAt = redemptionResult.value.redemption?.endsAt
      const tier = redemptionResult.value.redemption?.grantedTier || campaign.value?.grantedTier
      if (endsAt && tier) {
        return t.value('toast_access_until', {
          tier,
          date: new Date(endsAt).toLocaleDateString(dateLocale.value)
        })
      }
      if (redemptionResult.value.status === 'ALREADY_REDEEMED') {
        return t.value('status_already_redeemed')
      }
    }

    switch (availability.value) {
      case 'DISABLED':
        return t.value('status_disabled')
      case 'NOT_STARTED':
        return t.value('status_not_started')
      case 'EXPIRED':
        return t.value('status_expired')
      case 'CAPACITY_REACHED':
        return t.value('status_capacity', { max: campaign.value?.maxRedemptions || 0 })
      default:
        if (userState.value?.alreadyRedeemed) {
          return t.value('status_already_redeemed')
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

  const ctaLabel = computed(() => {
    if (!session.value) return t.value('cta_sign_up_redeem')
    if (canRedeem.value) return t.value('cta_redeem')
    if (userState.value?.alreadyRedeemed || redemptionResult.value) {
      return t.value('cta_redeemed')
    }
    return t.value('cta_unavailable')
  })

  function formatEventDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale.value)
  }

  function eventLocation(event: any) {
    if (event.isVirtual) return t.value('virtual')
    return (
      event.location || [event.city, event.country].filter(Boolean).join(', ') || t.value('tba')
    )
  }

  function redeemErrorDescription(err: any) {
    const reason = err.data?.reason || err.data?.data?.reason
    switch (reason) {
      case 'disabled':
        return t.value('status_disabled')
      case 'not_started':
        return t.value('status_not_started')
      case 'expired':
        return t.value('status_expired')
      case 'capacity_reached':
        return t.value('status_capacity', { max: campaign.value?.maxRedemptions || 0 })
      default:
        return t.value('toast_try_again')
    }
  }

  async function fetchCampaign() {
    loading.value = true
    error.value = null
    try {
      campaignData.value = await $fetch(`/api/partners/${slug.value}`)
      trackPartnerPageView(slug.value, campaignData.value.campaign.availability)
    } catch {
      error.value = t.value('error_offer_not_found')
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

      const endsAt = response.redemption?.endsAt
      const tier = response.redemption?.grantedTier
      toast.add({
        title:
          response.status === 'ALREADY_REDEEMED'
            ? t.value('toast_already_redeemed')
            : t.value('toast_offer_activated'),
        description:
          endsAt && tier
            ? t.value('toast_access_until', {
                tier,
                date: new Date(endsAt).toLocaleDateString(dateLocale.value)
              })
            : t.value('status_already_redeemed'),
        color: 'success'
      })

      if (events.value.length === 1 && !events.value[0]?.enrollment?.enrolled) {
        confirmEvent.value = events.value[0]
      }
    } catch (err: any) {
      const reason = err.data?.reason || err.data?.data?.reason || err.data?.message || 'unknown'
      trackPartnerRedemption(slug.value, 'rejected', reason)
      toast.add({
        title: t.value('toast_redeem_failed'),
        description: redeemErrorDescription(err),
        color: 'error'
      })
    } finally {
      redeeming.value = false
    }
  }

  async function joinEvent(event: any) {
    if (!session.value) {
      trackPartnerEventJoinStart(slug.value, event.slug)
      await navigateTo(signupUrl.value)
      return
    }

    joiningSlug.value = event.slug
    try {
      trackPartnerEventJoinStart(slug.value, event.slug)
      const response = await $fetch(`/api/public-events/${event.slug}/join`, {
        method: 'POST',
        body: { priority: priority.value, phase: phase.value }
      })
      if (response.status === 'ALREADY_JOINED') {
        trackPartnerEventJoinAlreadyExists(slug.value, event.slug)
      } else {
        trackPartnerEventJoinCompleted(slug.value, event.slug)
      }
      toast.add({
        title:
          response.status === 'ALREADY_JOINED'
            ? t.value('toast_already_added')
            : t.value('toast_goal_created'),
        description:
          response.status === 'ALREADY_JOINED'
            ? t.value('toast_already_in_goals_desc')
            : t.value('toast_goal_added_desc'),
        color: 'success'
      })
      confirmEvent.value = null
      await fetchCampaign()
    } catch {
      toast.add({
        title: t.value('toast_add_event_failed'),
        description: t.value('toast_try_again'),
        color: 'error'
      })
    } finally {
      joiningSlug.value = null
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
    description: () => benefitCopy.value || t.value('meta_partner_fallback'),
    robots: 'noindex, nofollow'
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
        <p class="text-neutral-500 font-medium">{{ t('loading_offer') }}</p>
      </div>

      <div v-else-if="error" class="p-10 text-center space-y-6">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-error-500 mx-auto" />
        <div class="space-y-2">
          <h1 class="text-2xl font-black uppercase tracking-tight">
            {{ t('offer_unavailable_title') }}
          </h1>
          <p class="text-neutral-500">{{ error }}</p>
        </div>
        <UButton
          to="/"
          color="neutral"
          variant="ghost"
          :label="t('back_to_home')"
          block
          size="lg"
        />
      </div>

      <div v-else-if="campaign" class="p-0">
        <div class="bg-primary-600 p-8 text-white space-y-3">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
            {{ t('partner_offer_label') }}
          </p>
          <h1
            class="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight break-words"
          >
            {{ headline }}
          </h1>
          <p class="text-sm text-primary-50/90">{{ campaign.campaignName }}</p>
        </div>

        <div class="p-8 space-y-6">
          <p class="text-neutral-600 dark:text-neutral-300">{{ benefitCopy }}</p>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">
                {{ t('payment_label') }}
              </p>
              <p class="mt-1 font-semibold">{{ t('payment_value') }}</p>
            </div>
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">
                {{ t('billing_label') }}
              </p>
              <p class="mt-1 font-semibold">{{ t('billing_value') }}</p>
            </div>
          </div>

          <p class="text-sm text-neutral-500">
            {{ t('after_days', { days: campaign.accessDurationDays }) }}
          </p>

          <p v-if="campaign.maxRedemptions" class="text-xs text-neutral-500">
            {{
              t('capacity', {
                max: campaign.maxRedemptions,
                count: campaign.redemptionCount
              })
            }}
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
              :disabled="Boolean(session) && !canRedeem && !hasRedeemed"
              @click="redeemOffer"
            >
              {{ ctaLabel }}
            </UButton>

            <UButton
              v-if="!session"
              :to="loginUrl"
              color="neutral"
              variant="ghost"
              :label="t('already_have_account')"
              block
            />
          </div>

          <div
            v-if="events.length"
            class="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-800"
          >
            <div>
              <h2 class="text-lg font-black uppercase tracking-tight">
                {{ hasRedeemed ? t('next_step_add_event') : t('associated_events') }}
              </h2>
              <p class="text-sm text-neutral-500 mt-1">
                {{ t('event_goal_disclaimer') }}
              </p>
            </div>

            <div
              v-for="event in events"
              :key="event.slug"
              class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3"
              :class="event.isPrimary ? 'ring-1 ring-primary-500/40' : ''"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-bold text-lg">{{ event.title }}</p>
                  <p class="text-sm text-neutral-500">{{ event.organizerName }}</p>
                </div>
                <UBadge v-if="event.isPrimary" color="primary" variant="subtle">
                  {{ t('primary_badge') }}
                </UBadge>
              </div>

              <div class="text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                <p>{{ formatEventDate(event.date) }} · {{ eventLocation(event) }}</p>
                <p v-if="event.distance || event.elevation">
                  <span v-if="event.distance">{{
                    t('course_distance', { distance: event.distance })
                  }}</span>
                  <span v-if="event.distance && event.elevation"> · </span>
                  <span v-if="event.elevation">{{
                    t('course_elevation', { elevation: event.elevation })
                  }}</span>
                </p>
              </div>

              <div class="flex flex-col sm:flex-row gap-2">
                <UButton
                  v-if="event.registrationUrl"
                  :to="event.registrationUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  @click="trackOfficialEventRegistrationClick(slug, event.slug)"
                >
                  {{ t('official_registration') }}
                </UButton>

                <UButton
                  v-if="event.enrollment?.enrolled"
                  to="/profile/goals"
                  color="primary"
                  variant="soft"
                  size="sm"
                >
                  {{ t('already_in_goals') }}
                </UButton>

                <UButton
                  v-else
                  color="primary"
                  size="sm"
                  :loading="joiningSlug === event.slug"
                  @click="
                    () => {
                      if (session) {
                        confirmEvent = event
                        return
                      }
                      void navigateTo(loginUrl)
                    }
                  "
                >
                  {{ session ? t('add_to_goals') : t('log_in_to_add_goal') }}
                </UButton>

                <UButton
                  :to="`/events/${event.slug}?campaign=${slug}`"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                >
                  {{ t('event_details') }}
                </UButton>
              </div>
            </div>
          </div>

          <UButton
            v-if="session && hasRedeemed"
            to="/dashboard"
            color="neutral"
            variant="soft"
            :label="t('go_to_dashboard')"
            block
          />
        </div>
      </div>
    </UCard>

    <UModal :open="Boolean(confirmEvent)" @update:open="(open) => !open && (confirmEvent = null)">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-bold text-lg">{{ t('confirm_goal_title') }}</h3>
          </template>
          <p class="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            {{ t('confirm_goal_body', { title: confirmEvent?.title }) }}
          </p>
          <div class="grid gap-3 sm:grid-cols-2 mb-6">
            <UFormField :label="t('priority_label')">
              <USelect
                v-model="priority"
                :items="priorityItems"
                class="w-full"
                :ui="{ content: 'min-w-fit' }"
              />
            </UFormField>
            <UFormField :label="t('phase_label')">
              <USelect
                v-model="phase"
                :items="phaseItems"
                class="w-full"
                :ui="{ content: 'min-w-fit' }"
              />
            </UFormField>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton
              color="neutral"
              variant="ghost"
              @click="
                () => {
                  confirmEvent = null
                }
              "
            >
              {{ t('cancel') }}
            </UButton>
            <UButton
              color="primary"
              :loading="Boolean(joiningSlug)"
              @click="
                () => {
                  if (confirmEvent) void joinEvent(confirmEvent)
                }
              "
            >
              {{ t('confirm_and_add') }}
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
