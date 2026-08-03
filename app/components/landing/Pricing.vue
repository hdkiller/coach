<template>
  <div id="pricing" class="bg-[oklch(14%_0.018_155)] py-24 sm:py-32 overflow-hidden">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div
        ref="headerRef"
        class="mx-auto mb-16 max-w-2xl text-center transition-all duration-700 transform"
        :class="[isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12']"
      >
        <h2
          class="font-athletic text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl"
        >
          The Journey
        </h2>
        <p class="mt-4 text-lg leading-8 text-gray-400">
          From free community support to premium 1:1 individualized coaching.
        </p>
      </div>

      <div
        ref="cardsRef"
        class="mx-auto grid max-w-md grid-cols-1 gap-8 lg:max-w-7xl lg:grid-cols-3"
      >
        <!-- Tier 1 -->
        <UCard
          class="flex flex-col justify-between bg-gray-900 border-gray-800 h-full transition-all duration-700 transform"
          :class="[isCardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16']"
          :style="{ transitionDelay: '100ms' }"
        >
          <div>
            <div class="mb-4">
              <span class="text-primary-500 font-semibold text-sm uppercase tracking-wide"
                >The Tri Nerds Community</span
              >
              <div class="mt-4 flex items-baseline text-5xl font-extrabold text-white">$0</div>
              <p class="mt-2 text-sm text-gray-400">Free Intro</p>
            </div>
            <ul role="list" class="mt-8 space-y-4 text-sm leading-6 text-gray-300">
              <li class="flex gap-x-3">
                <UIcon name="i-heroicons-check" class="h-6 w-5 flex-none text-primary-500" />
                <span>Discord access, gear reviews, community calendar.</span>
              </li>
              <li class="flex gap-x-3">
                <UIcon name="i-heroicons-check" class="h-6 w-5 flex-none text-primary-500" />
                <span>Basic event tracking.</span>
              </li>
            </ul>
          </div>
          <div class="mt-8">
            <UButton to="/join" block color="neutral" variant="outline">Join the Community</UButton>
          </div>
        </UCard>

        <!-- Tier 2 -->
        <UCard
          class="flex flex-col justify-between bg-gray-900 border-gray-800 h-full transition-all duration-700 transform"
          :class="[isCardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16']"
          :style="{ transitionDelay: '200ms' }"
        >
          <div>
            <div class="mb-4">
              <span class="text-primary-500 font-semibold text-sm uppercase tracking-wide"
                >A-La-Carte Programs</span
              >
              <div class="mt-4 flex items-baseline text-5xl font-extrabold text-white">
                $200<span class="text-lg font-medium text-gray-400 ml-1">/month</span>
              </div>
              <p class="mt-2 text-sm text-gray-400">UNCOVER</p>
            </div>
            <ul role="list" class="mt-8 space-y-4 text-sm leading-6 text-gray-300">
              <li class="flex gap-x-3">
                <UIcon name="i-heroicons-check" class="h-6 w-5 flex-none text-primary-500" />
                <span>Pre-built training plans.</span>
              </li>
              <li class="flex gap-x-3">
                <UIcon name="i-heroicons-check" class="h-6 w-5 flex-none text-primary-500" />
                <span>Physiology baselines.</span>
              </li>
              <li class="flex gap-x-3">
                <UIcon name="i-heroicons-check" class="h-6 w-5 flex-none text-primary-500" />
                <span>Access to the Tri Nerds library.</span>
              </li>
            </ul>
          </div>
          <div class="mt-8">
            <UButton to="/join" block color="neutral" variant="outline"
              >Browse Training Plans</UButton
            >
          </div>
        </UCard>

        <!-- Tier 3 -->
        <UCard
          class="flex flex-col justify-between bg-gray-900 border-primary-500 ring-2 ring-primary-500 h-full relative overflow-hidden transition-all duration-700 transform"
          :class="[isCardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16']"
          :style="{ transitionDelay: '300ms' }"
        >
          <div
            class="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-primary-500 rounded-full opacity-10 blur-xl pointer-events-none"
          ></div>
          <div class="relative z-10">
            <div class="mb-4">
              <span
                class="text-primary-400 font-semibold text-sm uppercase tracking-wide flex items-center gap-2"
              >
                Journey Endurance Custom Coaching
                <UBadge color="primary" variant="subtle" size="xs">PREMIUM</UBadge>
              </span>
              <div class="mt-4 flex items-baseline text-5xl font-extrabold text-white">
                $350<span class="text-lg font-medium text-gray-400 ml-1">/month</span>
              </div>
              <p class="mt-2 text-sm text-gray-400">UNLOCK</p>
            </div>
            <ul role="list" class="mt-8 space-y-4 text-sm leading-6 text-gray-300">
              <li class="flex gap-x-3">
                <UIcon name="i-heroicons-check" class="h-6 w-5 flex-none text-primary-400" />
                <span>1:1 coaching.</span>
              </li>
              <li class="flex gap-x-3">
                <UIcon name="i-heroicons-check" class="h-6 w-5 flex-none text-primary-400" />
                <span>Daily Digital Twin AI feedback.</span>
              </li>
              <li class="flex gap-x-3">
                <UIcon name="i-heroicons-check" class="h-6 w-5 flex-none text-primary-400" />
                <span>Full Intervals.icu load tracking.</span>
              </li>
              <li class="flex gap-x-3">
                <UIcon name="i-heroicons-check" class="h-6 w-5 flex-none text-primary-400" />
                <span>Direct-to-Garmin pushes.</span>
              </li>
            </ul>
          </div>
          <div class="mt-8 relative z-10">
            <UButton to="/join" block color="primary" variant="solid"
              >Apply for 1:1 Coaching</UButton
            >
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useIntersectionObserver } from '@vueuse/core'

  const headerRef = ref(null)
  const isHeaderVisible = ref(false)

  const cardsRef = ref(null)
  const isCardsVisible = ref(false)

  useIntersectionObserver(
    headerRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting) isHeaderVisible.value = true
    },
    { threshold: 0.1 }
  )

  useIntersectionObserver(
    cardsRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting) isCardsVisible.value = true
    },
    { threshold: 0.1 }
  )
</script>
