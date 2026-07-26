<script setup lang="ts">
  import { useTranslate, useTolgee } from '@tolgee/vue'
  import { sanitizeCallbackUrl } from '#shared/safe-callback-url'

  const props = defineProps<{
    slug: string
    campaignSlug?: string | null
  }>()

  const { t } = useTranslate('partners')
  const tolgee = useTolgee(['language'])
  const route = useRoute()
  const toast = useToast()
  const { data: session } = useAuth()
  const {
    trackPartnerEventView,
    trackPartnerEventJoinStart,
    trackPartnerEventJoinCompleted,
    trackPartnerEventJoinAlreadyExists,
    trackOfficialEventRegistrationClick
  } = useAnalytics()

  const joining = ref(false)
  const showConfirm = ref(false)
  const priority = ref<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH')
  const phase = ref('BUILD')

  const dateLocale = computed(() => {
    const lang = tolgee.value.getLanguage() || 'en'
    if (lang === 'hu') return 'hu-HU'
    if (lang === 'zh') return 'zh-CN'
    return lang
  })

  const {
    data: payload,
    pending: loading,
    error: fetchError,
    refresh: refreshEvent
  } = await useFetch(() => `/api/public-events/${props.slug}`)
  const error = computed(() => (fetchError.value ? t.value('error_event_not_found') : null))

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

  const event = computed(() => payload.value?.event)
  const enrollment = computed(() => payload.value?.enrollment)

  const locationLabel = computed(() => {
    if (!event.value) return null
    if (event.value.isVirtual) return t.value('virtual')
    return (
      event.value.location ||
      [event.value.city, event.value.country].filter(Boolean).join(', ') ||
      null
    )
  })

  const runtimeConfig = useRuntimeConfig()
  const requestUrl = useRequestURL()

  const seoTitle = computed(() =>
    event.value ? `${event.value.title} | Coach Watts` : t.value('public_event_label')
  )
  const seoDescription = computed(() => {
    if (!event.value) return t.value('directory_events_meta_description')
    if (event.value.description) return event.value.description
    const place = locationLabel.value
    const dateLabel = new Date(event.value.date).toLocaleDateString(dateLocale.value)
    const parts = [event.value.organizerName, dateLabel, place].filter(Boolean)
    return parts.join(' · ')
  })
  const canonicalUrl = computed(() => {
    const base = runtimeConfig.public.siteUrl || requestUrl.origin
    return `${base}/events/${props.slug}`
  })
  const ogImage = computed(() => event.value?.imageUrl || undefined)

  useSeoMeta({
    title: () => seoTitle.value,
    description: () => seoDescription.value,
    ogTitle: () => seoTitle.value,
    ogDescription: () => seoDescription.value,
    ogUrl: () => canonicalUrl.value,
    ogImage: () => ogImage.value,
    twitterCard: 'summary_large_image',
    twitterTitle: () => seoTitle.value,
    twitterDescription: () => seoDescription.value,
    twitterImage: () => ogImage.value
  })

  useHead(() => ({
    link: [{ rel: 'canonical', href: canonicalUrl.value }]
  }))

  const callbackPath = computed(() =>
    sanitizeCallbackUrl(
      `/events/${props.slug}?join=1${props.campaignSlug ? `&campaign=${props.campaignSlug}` : ''}`,
      '/dashboard'
    )
  )
  const signupUrl = computed(() => `/join?callbackUrl=${encodeURIComponent(callbackPath.value)}`)
  const loginUrl = computed(() => `/login?callbackUrl=${encodeURIComponent(callbackPath.value)}`)

  async function fetchEvent() {
    await refreshEvent()
  }

  async function joinEvent() {
    if (!session.value) {
      trackPartnerEventJoinStart(props.campaignSlug || null, props.slug)
      await navigateTo(signupUrl.value)
      return
    }

    joining.value = true
    try {
      trackPartnerEventJoinStart(props.campaignSlug || null, props.slug)
      const response = await $fetch(`/api/public-events/${props.slug}/join`, {
        method: 'POST',
        body: { priority: priority.value, phase: phase.value }
      })
      if (response.status === 'ALREADY_JOINED') {
        trackPartnerEventJoinAlreadyExists(props.campaignSlug || null, props.slug)
      } else {
        trackPartnerEventJoinCompleted(props.campaignSlug || null, props.slug)
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
      showConfirm.value = false
      await fetchEvent()
    } catch {
      toast.add({
        title: t.value('toast_add_event_failed'),
        description: t.value('toast_try_again'),
        color: 'error'
      })
    } finally {
      joining.value = false
    }
  }

  function onOfficialRegistrationClick() {
    trackOfficialEventRegistrationClick(props.campaignSlug || null, props.slug)
  }

  onMounted(() => {
    if (event.value) {
      trackPartnerEventView(props.campaignSlug || null, props.slug)
    }
  })

  watch(event, (nextEvent, previousEvent) => {
    if (import.meta.client && nextEvent?.slug && nextEvent.slug !== previousEvent?.slug) {
      trackPartnerEventView(props.campaignSlug || null, props.slug)
    }
  })

  watchEffect(() => {
    if (
      import.meta.client &&
      session.value &&
      payload.value &&
      !loading.value &&
      route.query.join === '1' &&
      !enrollment.value?.enrolled &&
      !joining.value &&
      !showConfirm.value
    ) {
      showConfirm.value = true
    }
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
        <p class="text-neutral-500 font-medium">{{ t('loading_event') }}</p>
      </div>

      <div v-else-if="error" class="p-10 text-center space-y-6">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-error-500 mx-auto" />
        <div class="space-y-2">
          <h1 class="text-2xl font-black uppercase tracking-tight">
            {{ t('event_unavailable_title') }}
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

      <div v-else-if="event" class="p-0">
        <div class="bg-primary-600 p-8 text-white space-y-3">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
            {{ t('public_event_label') }}
          </p>
          <h1
            class="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight break-words"
          >
            {{ event.title }}
          </h1>
          <p class="text-sm text-primary-50/90">{{ event.organizerName }}</p>
        </div>

        <div class="p-8 space-y-6">
          <p v-if="event.description" class="text-neutral-600 dark:text-neutral-300">
            {{ event.description }}
          </p>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">
                {{ t('date_label') }}
              </p>
              <p class="mt-1 font-semibold">
                {{ new Date(event.date).toLocaleDateString(dateLocale) }}
                <span v-if="event.startTime" class="text-neutral-500">
                  · {{ event.startTime }}</span
                >
              </p>
              <p class="text-xs text-neutral-500 mt-1">{{ event.timezone }}</p>
            </div>
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">
                {{ t('location_label') }}
              </p>
              <p class="mt-1 font-semibold">{{ locationLabel || t('tba') }}</p>
            </div>
            <div
              v-if="event.distance || event.elevation"
              class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">
                {{ t('course_label') }}
              </p>
              <p class="mt-1 font-semibold">
                <span v-if="event.distance">{{
                  t('course_distance', { distance: event.distance })
                }}</span>
                <span v-if="event.distance && event.elevation"> · </span>
                <span v-if="event.elevation">{{
                  t('course_elevation', { elevation: event.elevation })
                }}</span>
              </p>
            </div>
            <div
              v-if="event.type || event.subType"
              class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">
                {{ t('sport_label') }}
              </p>
              <p class="mt-1 font-semibold">
                {{ [event.type, event.subType].filter(Boolean).join(' · ') }}
              </p>
            </div>
          </div>

          <UAlert
            color="neutral"
            variant="subtle"
            :title="t('training_goal_alert_title')"
            :description="t('training_goal_alert_desc')"
          />

          <div class="grid gap-3 sm:grid-cols-2">
            <UButton
              v-if="event.registrationUrl"
              :to="event.registrationUrl"
              target="_blank"
              rel="noopener noreferrer"
              color="neutral"
              variant="soft"
              block
              @click="onOfficialRegistrationClick"
            >
              {{ t('official_race_registration') }}
            </UButton>

            <UButton
              v-if="enrollment?.enrolled && enrollment.goalId"
              to="/profile/goals"
              color="primary"
              variant="soft"
              block
              :class="event.registrationUrl ? '' : 'sm:col-span-2'"
            >
              {{ t('already_in_goals') }}
            </UButton>

            <UButton
              v-else
              color="primary"
              size="xl"
              block
              class="font-black uppercase tracking-wide"
              :class="event.registrationUrl ? '' : 'sm:col-span-2'"
              :loading="joining"
              @click="
                () => {
                  if (session) {
                    showConfirm = true
                    return
                  }
                  void joinEvent()
                }
              "
            >
              {{ session ? t('add_as_training_goal') : t('sign_up_to_add_goal') }}
            </UButton>
          </div>

          <UButton
            v-if="!session"
            :to="loginUrl"
            color="neutral"
            variant="ghost"
            :label="t('already_have_account')"
            block
          />
        </div>
      </div>
    </UCard>

    <UModal v-model:open="showConfirm">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-bold text-lg">{{ t('confirm_goal_title') }}</h3>
          </template>
          <p class="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            {{ t('confirm_goal_body', { title: event?.title }) }}
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
                  showConfirm = false
                }
              "
            >
              {{ t('cancel') }}
            </UButton>
            <UButton color="primary" :loading="joining" @click="joinEvent">
              {{ t('confirm_and_add') }}
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
