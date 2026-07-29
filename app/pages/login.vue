<template>
  <div
    class="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-x-clip bg-[oklch(12%_0.015_155)] px-4 py-10 sm:px-6 lg:py-16"
  >
    <UContainer class="relative z-10 w-full max-w-6xl">
      <div
        class="grid overflow-hidden rounded-2xl border border-white/10 bg-[oklch(14%_0.018_155)] lg:grid-cols-12"
      >
        <aside
          class="relative hidden flex-col justify-center border-r border-white/8 p-10 lg:col-span-5 lg:flex lg:p-12"
        >
          <p class="text-xs font-bold uppercase tracking-widest text-primary-400">
            Journey Endurance Coaching
          </p>
          <h2
            class="font-athletic mt-6 text-3xl font-bold uppercase leading-[0.95] tracking-tight text-white"
          >
            {{ t('login.marketing_title') }}
            <span class="text-primary-400">{{ t('login.marketing_title_accent') }}</span>
          </h2>
          <p class="mt-4 text-sm font-medium leading-relaxed text-gray-400">
            {{ t('login.marketing_description') }}
          </p>
          <ul class="mt-8 space-y-3 text-sm text-gray-400">
            <li class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle-solid" class="h-4 w-4 text-primary-400" />
              {{ t('login.benefit_readiness') }}
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle-solid" class="h-4 w-4 text-primary-400" />
              {{ t('login.benefit_connected') }}
            </li>
          </ul>
        </aside>

        <div class="relative flex flex-col justify-center p-8 sm:p-12 lg:col-span-7 lg:p-16">
          <div class="relative z-10 mx-auto w-full max-w-md">
            <h1
              class="font-athletic text-4xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-5xl"
            >
              {{ t('login.heading') }}
              <span class="text-primary-400">{{ t('login.heading_accent') }}</span>
            </h1>
            <p class="mt-4 text-base font-medium text-gray-400 sm:text-lg">
              {{ t('login.form_subtitle') }}
            </p>

            <div class="mt-8 space-y-3">
              <UButton
                v-if="appleSignInEnabled"
                block
                size="xl"
                icon="i-simple-icons-apple"
                color="neutral"
                variant="solid"
                class="h-14 min-w-full rounded-xl bg-black text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-neutral-900"
                :loading="loadingApple || isInitializing"
                @click="
                  () => {
                    void handleAppleLogin()
                  }
                "
              >
                {{ isInitializing ? t('login.connecting') : t('login.apple') }}
              </UButton>

              <UButton
                block
                size="xl"
                icon="i-simple-icons-google"
                color="primary"
                variant="solid"
                class="h-14 min-w-full rounded-xl text-xs font-bold uppercase tracking-[0.15em]"
                :loading="loading || isInitializing"
                @click="
                  () => {
                    void handleGoogleLogin()
                  }
                "
              >
                {{ isInitializing ? t('login.connecting') : t('login.google') }}
              </UButton>

              <UButton
                block
                size="xl"
                color="neutral"
                variant="outline"
                class="h-14 min-w-full rounded-xl border-white/10 text-xs font-bold uppercase tracking-[0.12em]"
                :loading="loadingStrava || isInitializing"
                @click="
                  () => {
                    void handleStravaLogin()
                  }
                "
              >
                <template #leading>
                  <UIcon name="i-simple-icons-strava" class="h-5 w-5 text-[#FC4C02]" />
                </template>
                {{ isInitializing ? t('login.connecting') : t('login.strava') }}
              </UButton>

              <UButton
                block
                size="xl"
                color="neutral"
                variant="outline"
                class="h-14 min-w-full rounded-xl border-white/10 text-xs font-bold uppercase tracking-[0.12em]"
                :loading="loadingIntervals || isInitializing"
                @click="
                  () => {
                    void handleIntervalsLogin()
                  }
                "
              >
                <template #leading>
                  <img src="/images/logos/intervals.png" alt="" class="h-5 w-5" />
                </template>
                {{ isInitializing ? t('login.connecting') : t('login.intervals') }}
              </UButton>
            </div>

            <p class="mt-8 text-sm text-gray-400">
              {{ t('login.new_athlete') }}
              <NuxtLink
                :to="
                  callbackUrl === '/dashboard'
                    ? '/join'
                    : `/join?callbackUrl=${encodeURIComponent(callbackUrl)}`
                "
                class="ml-1 font-bold uppercase tracking-widest text-primary-400 transition-colors hover:text-primary-300"
                >{{ t('login.create_account') }}</NuxtLink
              >
            </p>

            <p class="mt-4 max-w-sm text-xs leading-relaxed text-gray-400">
              {{ t('login.terms_agree') }}
              <NuxtLink to="/terms" class="underline underline-offset-2 hover:text-white">{{
                t('login.terms')
              }}</NuxtLink>
              {{ t('login.and') }}
              <NuxtLink to="/privacy" class="underline underline-offset-2 hover:text-white">{{
                t('login.privacy')
              }}</NuxtLink
              >.
            </p>
          </div>

          <div
            v-if="isInitializing"
            class="absolute inset-0 z-50 flex items-center justify-center bg-[oklch(12%_0.015_155)]/90"
          >
            <div class="text-center">
              <UIcon
                name="i-heroicons-arrow-path"
                class="mx-auto h-8 w-8 animate-spin text-primary-400"
              />
              <p class="font-athletic mt-4 text-lg font-bold uppercase tracking-wide text-white">
                {{ t('login.signing_in') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('auth')
  const { signIn } = useAuth()
  const route = useRoute()
  const toast = useToast()
  const { trackLogin } = useAnalytics()
  const runtimeConfig = useRuntimeConfig()
  const appleSignInEnabled = computed(() => Boolean(runtimeConfig.public.appleSignInEnabled))

  definePageMeta({
    layout: 'home',
    middleware: ['guest'],
    auth: false
  })

  const callbackUrl = (route.query.callbackUrl as string) || '/dashboard'

  useSeoMeta({
    title: () => t.value('login.seo_title'),
    ogTitle: () => t.value('login.seo_og_title'),
    description: () => t.value('login.seo_description'),
    ogDescription: () => t.value('login.seo_description'),
    ogImage: '/images/og-image.png',
    twitterCard: 'summary_large_image',
    twitterTitle: () => t.value('login.seo_og_title'),
    twitterDescription: () => t.value('login.seo_description'),
    twitterImage: '/images/og-image.png'
  })

  const loading = ref(false)
  const loadingApple = ref(false)
  const loadingStrava = ref(false)
  const loadingIntervals = ref(false)
  const isInitializing = ref(false)

  async function handleAppleLogin() {
    trackLogin('apple')
    isInitializing.value = true
    loadingApple.value = true
    try {
      await signIn('apple', { callbackUrl })
    } catch (error: any) {
      toast.add({
        title: t.value('login.error_title'),
        description: error.message || t.value('login.error_apple'),
        color: 'error'
      })
      isInitializing.value = false
      loadingApple.value = false
    }
  }

  async function handleGoogleLogin() {
    trackLogin('google')
    isInitializing.value = true
    loading.value = true
    try {
      await signIn('google', { callbackUrl })
    } catch (error: any) {
      toast.add({
        title: t.value('login.error_title'),
        description: error.message || t.value('login.error_google'),
        color: 'error'
      })
      isInitializing.value = false
      loading.value = false
    }
  }

  async function handleStravaLogin() {
    trackLogin('strava')
    isInitializing.value = true
    loadingStrava.value = true
    try {
      await signIn('strava', { callbackUrl })
    } catch (error: any) {
      toast.add({
        title: t.value('login.error_title'),
        description: error.message || t.value('login.error_strava'),
        color: 'error'
      })
      isInitializing.value = false
      loadingStrava.value = false
    }
  }

  async function handleIntervalsLogin() {
    trackLogin('intervals')
    isInitializing.value = true
    loadingIntervals.value = true
    try {
      await signIn('intervals', { callbackUrl })
    } catch (error: any) {
      toast.add({
        title: t.value('login.error_title'),
        description: error.message || t.value('login.error_intervals'),
        color: 'error'
      })
      isInitializing.value = false
      loadingIntervals.value = false
    }
  }
</script>
