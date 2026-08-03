<template>
  <div
    class="relative min-h-screen overflow-x-clip bg-[oklch(12%_0.015_155)] selection:bg-primary-500/30"
  >
    <div class="pointer-events-none fixed inset-0 z-10 opacity-[0.02] grain-overlay" />

    <div ref="heroSectionRef">
      <LandingHero class="mb-8 sm:mb-12" />
    </div>

    <div ref="bentoSectionRef">
      <LandingBentoGrid class="py-16 sm:py-20" />
    </div>

    <div ref="pricingSectionRef">
      <LandingPricing class="py-20 sm:py-24" />
    </div>

    <!-- Closing band (The Footer / Community Hook) -->
    <section
      ref="closingSectionRef"
      class="border-t border-white/8 bg-[oklch(14%_0.018_155)] px-6 py-24 sm:py-32 lg:px-8 transition-all duration-700 transform"
      :class="[isClosingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12']"
    >
      <div class="mx-auto flex max-w-[88rem] flex-col items-center text-center gap-8">
        <h2
          class="font-athletic text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl"
        >
          The Journey is the Destination.
        </h2>
        <p class="mt-4 max-w-2xl text-lg leading-8 text-gray-400">
          Whether you're training for your first sprint triathlon or trying to shave 5 minutes off
          your Ironman PR, do it with the data on your side and the community at your back.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-4">
          <UButton size="xl" to="/join" color="primary" class="whitespace-nowrap"
            >Join the Community</UButton
          >
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useIntersectionObserver } from '@vueuse/core'

  const { status } = useAuth()
  const headerCtaText = useState('headerCtaText')

  // Set default
  headerCtaText.value = 'Join the Community'

  // Section Refs
  const heroSectionRef = ref(null)
  const bentoSectionRef = ref(null)
  const pricingSectionRef = ref(null)
  const closingSectionRef = ref(null)
  const isClosingVisible = ref(false)

  // Observers for CTA changing
  useIntersectionObserver(
    bentoSectionRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting) headerCtaText.value = 'Unlock Your Digital Twin'
    },
    { threshold: 0.3 }
  )

  useIntersectionObserver(
    pricingSectionRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting) headerCtaText.value = 'Choose Your Tier'
    },
    { threshold: 0.3 }
  )

  useIntersectionObserver(
    heroSectionRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting) headerCtaText.value = 'Join the Community'
    },
    { threshold: 0.3 }
  )

  useIntersectionObserver(
    closingSectionRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting) isClosingVisible.value = true
    },
    { threshold: 0.2 }
  )

  definePageMeta({
    layout: 'home',
    auth: false
  })

  useSeoMeta({
    title: 'Tri Nerds Endurance Club',
    ogTitle: 'Tri Nerds Endurance Club',
    description: 'Level Up Your Endurance. Powered by the Journey Endurance AI.',
    ogDescription: 'Level Up Your Endurance. Powered by the Journey Endurance AI.'
  })

  const route = useRoute()

  watchEffect(() => {
    if (status.value === 'authenticated' && route.query.preview !== '1') {
      navigateTo('/dashboard')
    }
  })
</script>
