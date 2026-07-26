<template>
  <div>
    <div class="mb-10 text-center">
      <div class="flex justify-center mb-8">
        <img
          src="/media/logo_with_text_cropped.webp"
          :alt="consentLogoAlt"
          class="w-full max-h-60 object-contain"
        />
      </div>

      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-3">
        {{ consentTitle }}
      </h1>
      <p class="text-gray-500 dark:text-gray-400 text-lg max-w-sm mx-auto">
        {{ consentSubtitle }}
      </p>
    </div>

    <form class="space-y-6" @submit.prevent="submitConsent">
      <div class="space-y-4">
        <div
          role="button"
          tabindex="0"
          class="rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          :class="
            acceptedTerms
              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
              : 'border-gray-200 dark:border-gray-700'
          "
          :aria-pressed="acceptedTerms"
          @click="acceptedTerms = !acceptedTerms"
          @keydown.enter.prevent="toggleAcceptedTerms"
          @keydown.space.prevent="acceptedTerms = !acceptedTerms"
        >
          <UCheckbox v-model="acceptedTerms" name="terms" aria-required="true" @click.stop>
            <template #label>
              <span class="font-medium text-gray-900 dark:text-white">{{ consentTermsLabel }}</span>
            </template>
          </UCheckbox>
          <p class="mt-3 pl-7 text-sm text-gray-500 dark:text-gray-400">
            {{ consentTermsAgree }}
            <a
              href="/terms"
              target="_blank"
              class="text-primary-600 hover:text-primary-500 font-semibold underline decoration-dotted decoration-primary-500/50 underline-offset-4"
              @click.stop
              @keydown.enter.stop
              @keydown.space.stop
              >{{ consentTermsLink }}</a
            >
            {{ consentTermsAnd }}
            <a
              href="/privacy"
              target="_blank"
              class="text-primary-600 hover:text-primary-500 font-semibold underline decoration-dotted decoration-primary-500/50 underline-offset-4"
              @click.stop
              @keydown.enter.stop
              @keydown.space.stop
              >{{ consentPrivacyLink }}</a
            >.
          </p>
        </div>

        <div
          role="button"
          tabindex="0"
          class="rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          :class="
            acceptedHealth
              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
              : 'border-gray-200 dark:border-gray-700'
          "
          :aria-pressed="acceptedHealth"
          @click="acceptedHealth = !acceptedHealth"
          @keydown.enter.prevent="acceptedHealth = !acceptedHealth"
          @keydown.space.prevent="acceptedHealth = !acceptedHealth"
        >
          <UCheckbox v-model="acceptedHealth" name="health" aria-required="true" @click.stop>
            <template #label>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ consentHealthLabel }}
              </span>
            </template>
          </UCheckbox>
          <p class="mt-3 pl-7 text-sm text-gray-500 dark:text-gray-400">
            {{ consentHealthHelp }}
          </p>
        </div>
      </div>

      <p v-if="!isValid" class="text-sm text-muted" role="status">
        {{ consentValidationHint }}
      </p>

      <UButton
        type="submit"
        block
        size="xl"
        :color="isValid ? 'primary' : 'neutral'"
        :variant="isValid ? 'solid' : 'soft'"
        :disabled="!isValid"
        :loading="loading"
        class="shadow-sm transition-all py-4 font-bold rounded-xl"
      >
        {{ isValid ? consentSubmitReady : consentSubmitDisabled }}
      </UButton>
    </form>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate, useTolgee } from '@tolgee/vue'
  import { PRIVACY_POLICY_VERSION, TERMS_OF_SERVICE_VERSION } from '#shared/policy-versions'
  import { sanitizeCallbackUrl } from '#shared/safe-callback-url'
  import { LOCALE_COOKIE_NAME, normalizeUiLocale } from '#shared/ui-locale'

  definePageMeta({
    layout: 'simple',
    middleware: 'auth'
  })

  const { t } = useTranslate('onboarding')
  const tolgee = useTolgee(['language'])
  const localeCookie = useCookie(LOCALE_COOKIE_NAME, { maxAge: 60 * 60 * 24 * 365 })
  const route = useRoute()
  const { refresh } = useAuth()
  const toast = useToast()
  const { trackConsentViewed, trackConsentCompleted } = useAnalytics()

  function resolveConsentUiLanguage() {
    return (
      normalizeUiLocale(tolgee.value.getLanguage()) ??
      normalizeUiLocale(localeCookie.value) ??
      undefined
    )
  }

  const acceptedTerms = ref(false)
  const acceptedHealth = ref(false)
  const loading = ref(false)
  const consentViewedAt = ref<number | null>(null)

  const isValid = computed(() => acceptedTerms.value && acceptedHealth.value)

  const postConsentDestination = computed(() => sanitizeCallbackUrl(route.query.redirect))

  function toggleAcceptedTerms(event: KeyboardEvent) {
    if (event.target instanceof HTMLAnchorElement) {
      return
    }

    acceptedTerms.value = !acceptedTerms.value
  }

  const translateOrFallback = (key: string, fallback: string) =>
    computed(() => {
      const translated = t.value(key)
      return translated === key ? fallback : translated
    })

  const consentLogoAlt = translateOrFallback('consent.logo_alt', 'Coach Watts Logo')
  const consentTitle = translateOrFallback('consent.title', 'Welcome to the Future of Training')
  const consentSubtitle = translateOrFallback(
    'consent.subtitle',
    "You're just a few clicks away from AI-powered coaching insights. Let's get your account set up for success."
  )
  const consentTermsLabel = translateOrFallback('consent.terms_label', 'Accept Legal Terms')
  const consentTermsAgree = translateOrFallback('consent.terms_agree', 'I agree to the')
  const consentTermsLink = translateOrFallback('consent.terms_link', 'Terms of Service')
  const consentTermsAnd = translateOrFallback('consent.terms_and', 'and')
  const consentPrivacyLink = translateOrFallback('consent.privacy_link', 'Privacy Policy')
  const consentHealthLabel = translateOrFallback(
    'consent.health_label',
    'Consent to health data processing (required)'
  )
  const consentHealthHelp = translateOrFallback(
    'consent.health_help',
    'I explicitly consent to the processing of my health and biometric data (HR, power, location) so Coach Watts can generate personalized AI coaching.'
  )
  const consentValidationHint = translateOrFallback(
    'consent.validation_hint',
    'Both required consent checkboxes must be selected before you can continue.'
  )
  const consentSubmitReady = translateOrFallback('consent.submit_ready', 'Accept and continue')
  const consentSubmitDisabled = translateOrFallback(
    'consent.submit_disabled',
    'Accept required consent to continue'
  )
  const consentErrorTitle = translateOrFallback('consent.error_title', 'Failed to save consent')
  const consentErrorDescription = translateOrFallback(
    'consent.error_description',
    'Please try again.'
  )

  useHead({
    title: computed(() => {
      const pageTitle = t.value('consent.page_title')
      return pageTitle === 'consent.page_title' ? 'Consent' : pageTitle
    }),
    meta: [{ name: 'robots', content: 'noindex' }]
  })

  onMounted(() => {
    consentViewedAt.value = Date.now()
    trackConsentViewed(TERMS_OF_SERVICE_VERSION, PRIVACY_POLICY_VERSION)
  })

  async function submitConsent() {
    if (!isValid.value) return

    loading.value = true
    try {
      const uiLanguage = resolveConsentUiLanguage()

      await $fetch('/api/user/consent', {
        method: 'POST',
        body: {
          termsVersion: TERMS_OF_SERVICE_VERSION,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
          healthConsentAccepted: true,
          ...(uiLanguage ? { uiLanguage } : {})
        }
      })

      if (uiLanguage && localeCookie.value !== uiLanguage) {
        localeCookie.value = uiLanguage
      }

      await refresh()

      const secondsSinceView =
        consentViewedAt.value === null
          ? undefined
          : Math.max(0, Math.round((Date.now() - consentViewedAt.value) / 1000))

      trackConsentCompleted(TERMS_OF_SERVICE_VERSION, PRIVACY_POLICY_VERSION, secondsSinceView)
      await navigateTo(postConsentDestination.value)
    } catch (error: unknown) {
      console.error('Failed to save consent:', error)
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined
      toast.add({
        title: consentErrorTitle.value,
        description: message || consentErrorDescription.value,
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }
</script>
