<template>
  <div id="why-us" class="relative isolate overflow-hidden bg-[oklch(12%_0.015_155)]">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center mb-16">
        <h2
          class="font-athletic text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl"
        >
          Tech & Info Rich
        </h2>
        <p class="mt-4 text-lg leading-8 text-gray-400">
          Why settle for generic static plans? Our tech stack keeps you accountable with real-time
          objective data and intelligent periodization.
        </p>
      </div>

      <div
        ref="bentoRef"
        class="mx-auto grid max-w-2xl grid-cols-1 gap-6 sm:gap-8 lg:max-w-none lg:grid-cols-3"
      >
        <!-- Card 1: Master of Kinesiology AI -->
        <UCard
          class="flex flex-col bg-gray-900 border-white/10 lg:col-span-2 relative overflow-hidden transition-all duration-700 transform"
          :class="[isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12']"
          :style="{ transitionDelay: '100ms' }"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent pointer-events-none"
          ></div>
          <div class="p-4 sm:p-8 relative z-10 h-full flex flex-col justify-center">
            <UIcon name="i-heroicons-cpu-chip" class="h-10 w-10 text-primary-500 mb-6" />
            <h3
              class="text-2xl font-bold tracking-tight text-white sm:text-3xl mb-4 font-athletic uppercase"
            >
              Master of Kinesiology AI
            </h3>
            <p class="text-gray-400 text-lg leading-relaxed max-w-xl">
              Subjective wellness meets objective stress. Our Gemini-powered engine analyzes your
              biomechanical fatigue markers and enforces structured periodization. It's your elite
              Digital Coaching Twin, adjusting your volume before you overtrain.
            </p>
          </div>
        </UCard>

        <!-- Card 2: Intervals.icu Native -->
        <UCard
          class="flex flex-col bg-gray-900 border-white/10 transition-all duration-700 transform"
          :class="[isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12']"
          :style="{ transitionDelay: '200ms' }"
        >
          <div class="p-4 sm:p-6 h-full flex flex-col">
            <UIcon
              name="i-heroicons-arrow-path-rounded-square"
              class="h-8 w-8 text-emerald-400 mb-4"
            />
            <h3 class="text-xl font-bold tracking-tight text-white mb-3">Intervals.icu Native</h3>
            <p class="text-gray-400 text-sm leading-relaxed">
              Direct integration pulling your CTL, ATL, and TSB. We know exactly what zone you were
              in on yesterday's brick session.
            </p>
            <div class="mt-auto pt-6 flex justify-between items-end border-t border-white/5">
              <div>
                <div class="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                  CTL (Fitness)
                </div>
                <div class="text-2xl font-bold text-white font-athletic">84.2</div>
              </div>
              <div class="text-emerald-400 flex items-center gap-1 text-sm font-bold">
                <UIcon name="i-heroicons-arrow-trending-up" class="h-4 w-4" />
                +2.4
              </div>
            </div>
          </div>
        </UCard>

        <!-- Card 3: Plant-Based Optimization -->
        <UCard
          class="flex flex-col bg-gray-900 border-white/10 lg:col-span-3 transition-all duration-700 transform"
          :class="[isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12']"
          :style="{ transitionDelay: '300ms' }"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 p-4 sm:p-8 items-center">
            <div>
              <UIcon name="i-heroicons-leaf" class="h-10 w-10 text-green-500 mb-6" />
              <h3
                class="text-2xl font-bold tracking-tight text-white sm:text-3xl mb-4 font-athletic uppercase"
              >
                Plant-Based Optimization
              </h3>
              <p class="text-gray-400 text-lg leading-relaxed">
                High-carbohydrate availability and optimal plant-protein timing built directly into
                your recovery feedback. Train harder, recover faster, fuel smarter.
              </p>
            </div>
            <div
              class="h-48 rounded-xl bg-black/50 border border-white/5 flex items-center justify-center p-6"
            >
              <div class="flex gap-4 w-full h-full items-end justify-center">
                <div
                  class="w-1/4 bg-green-500/20 rounded-t-md h-[40%] border-t border-green-500/50"
                ></div>
                <div
                  class="w-1/4 bg-green-500/40 rounded-t-md h-[60%] border-t border-green-500/50"
                ></div>
                <div
                  class="w-1/4 bg-green-500/60 rounded-t-md h-[80%] border-t border-green-500/50"
                ></div>
                <div
                  class="w-1/4 bg-green-500/80 rounded-t-md h-[100%] border-t border-green-500"
                ></div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useIntersectionObserver } from '@vueuse/core'

  const bentoRef = ref(null)
  const isVisible = ref(false)

  useIntersectionObserver(
    bentoRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting) {
        isVisible.value = true
      }
    },
    { threshold: 0.1 }
  )
</script>
