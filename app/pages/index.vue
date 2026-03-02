<template>
  <div class="relative bg-[#09090B] min-h-screen overflow-x-hidden selection:bg-primary-500/30">
    <!-- Global Grain Overlay (2%) -->
    <div class="fixed inset-0 pointer-events-none z-[100] opacity-[0.02] grain-overlay" />
    <LandingHero class="mb-32" />
    <LandingNutritionExplainer class="py-32" />
    <LandingHowItWorks class="py-32" />
    <LandingIntegrations class="py-32" />
    <LandingDeepDiveArchitecture class="py-32" />
    <LandingFeatureBento class="py-32" />
    <LandingFeatureGoals class="py-32" />
    <LandingCommunity class="py-32" />
    <LandingPricing class="py-32" />

    <!-- CTA Final -->
    <div class="relative isolate overflow-hidden bg-gray-900 px-6 py-24 sm:py-32 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {{ t('cta.headline') }}
        </h2>
        <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
          {{ t('cta.description') }}
        </p>
        <div class="mt-10 flex items-center justify-center gap-x-6">
          <UButton size="xl" to="/join" color="primary">{{ t('cta.primary') }}</UButton>
          <UButton size="xl" to="/stories" color="neutral" variant="ghost"
            >{{ t('cta.secondary') }} <span aria-hidden="true">→</span></UButton
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('common')
  const { status } = useAuth()

  definePageMeta({
    layout: 'home',
    auth: false
  })

  useSeoMeta({
    title: 'AI Endurance Coaching',
    ogTitle: 'Coach Watts - AI Endurance Coaching',
    description:
      'Coach Watts is your AI-powered endurance coach. Optimize training, recovery, and glycogen-aware fueling with personalized daily guidance.',
    ogDescription:
      'Coach Watts is your AI-powered endurance coach. Optimize training, recovery, and glycogen-aware fueling with personalized daily guidance.',
    ogImage: '/images/og-image.png',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Coach Watts - AI Endurance Coaching',
    twitterDescription:
      'Coach Watts is your AI-powered endurance coach. Optimize training, recovery, and glycogen-aware fueling with personalized daily guidance.',
    twitterImage: '/images/og-image.png'
  })

  // Only redirect if authenticated, otherwise stay on landing page
  watchEffect(() => {
    if (status.value === 'authenticated') {
      navigateTo('/dashboard')
    }
  })
</script>
