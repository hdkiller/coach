<template>
  <div class="relative isolate overflow-hidden">
    <div
      class="mx-auto max-w-[88rem] px-6 pb-20 pt-14 sm:pb-24 sm:pt-16 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16 lg:px-8 lg:py-20"
    >
      <div class="mx-auto max-w-2xl lg:col-span-7 lg:mx-0 lg:max-w-3xl lg:pt-0">
        <div class="mt-0">
          <NuxtLink to="#architecture" class="inline-flex items-center gap-4">
            <span
              class="rounded-full bg-primary-500/10 px-3 py-1 text-sm font-semibold leading-6 text-primary-400 ring-1 ring-inset ring-primary-500/20"
              >Transparent Intelligence</span
            >
            <span
              class="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-300"
            >
              <span>View the Architecture</span>
              <UIcon name="i-heroicons-chevron-right" class="h-5 w-5 text-gray-500" />
            </span>
          </NuxtLink>
        </div>
        <h1
          class="mt-7 text-balance text-5xl font-bold tracking-tight text-white sm:text-6xl xl:text-[4rem] leading-[1.08]"
        >
          Unlock Your True Potential. <br />
          <span class="mt-2 block text-primary-500 leading-[1.14] tracking-[0.01em]"
            >Stop Guessing. Start Winning.</span
          >
        </h1>
        <p class="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Train by watts. Fuel by physiology.
        </p>
        <p class="mt-5 max-w-2xl text-xl leading-8 text-gray-300">
          The AI Endurance Coach that adapts training, recovery, and fueling every day. We turn your
          workouts and nutrition logs into clear performance decisions.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <UButton
            to="/join"
            size="xl"
            color="primary"
            variant="solid"
            class="hero-cta hero-cta-pulse px-8 py-3 text-base font-semibold shadow-[0_0_0_1px_rgba(0,220,130,0.4),0_18px_38px_-14px_rgba(0,220,130,0.45)] hover:bg-primary-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
          >
            Claim Your Digital Twin (Free)
          </UButton>
          <UButton
            to="#how-it-works"
            size="xl"
            color="neutral"
            variant="outline"
            trailing-icon="i-heroicons-arrow-right-20-solid"
            class="border-gray-500/70 text-white hover:border-primary-400 hover:text-primary-300"
          >
            See How It Works
          </UButton>
        </div>
      </div>

      <!-- Right Side Visual -->
      <motion.div
        ref="dashboardRef"
        :initial="{ opacity: 0, x: 48, scale: 0.98 }"
        :animate="{ opacity: 1, x: 0, scale: 1 }"
        :transition="{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }"
        class="mx-auto mt-12 flex w-full max-w-2xl sm:mt-14 lg:col-span-5 lg:mt-0 lg:max-w-none lg:justify-end"
      >
        <div class="w-full max-w-3xl flex-none lg:max-w-[42rem]">
          <div
            class="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:rounded-2xl lg:p-3"
          >
            <div
              class="pointer-events-none absolute -inset-8 -z-10 rounded-[2.25rem] bg-[radial-gradient(circle_at_center,rgba(0,220,130,0.3)_0%,rgba(0,220,130,0.14)_38%,rgba(0,220,130,0.02)_70%,transparent_84%)] blur-2xl"
            />
            <div
              class="pointer-events-none absolute -inset-5 rounded-[2rem] bg-gradient-to-r from-primary-500/20 via-cyan-400/15 to-emerald-400/20 blur-3xl"
            />
            <div
              class="relative overflow-hidden rounded-md border border-white/10 bg-gray-900/65 shadow-2xl ring-1 ring-primary-400/25 backdrop-blur-[12px] tilt-card group"
            >
              <div class="aspect-[16/10] w-full bg-gray-900/95 relative overflow-hidden">
                <div
                  class="h-12 border-b border-gray-700 flex items-center justify-between px-4 bg-gray-800/50 backdrop-blur"
                >
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 rounded-full bg-red-500/50" />
                    <div class="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div class="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div class="flex items-center space-x-3">
                    <div class="h-2 w-20 bg-gray-700 rounded-full" />
                    <div class="h-8 w-8 bg-gray-700 rounded-full" />
                  </div>
                </div>

                <div class="p-6 grid grid-cols-12 gap-6 h-full">
                  <div class="col-span-1 flex flex-col items-center space-y-6 pt-4 text-gray-600">
                    <UIcon name="i-heroicons-home" class="w-6 h-6 text-primary-500" />
                    <UIcon
                      name="i-heroicons-chart-bar"
                      class="w-6 h-6 hover:text-gray-400 transition-colors"
                    />
                    <UIcon
                      name="i-heroicons-calendar"
                      class="w-6 h-6 hover:text-gray-400 transition-colors"
                    />
                    <UIcon
                      name="i-heroicons-user"
                      class="w-6 h-6 hover:text-gray-400 transition-colors"
                    />
                  </div>

                  <div class="col-span-11 grid grid-cols-2 gap-6">
                    <div
                      class="col-span-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 relative overflow-hidden transition-colors group/card backdrop-blur-[12px]"
                    >
                      <div class="flex items-center gap-3 mb-3">
                        <div
                          class="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400"
                        >
                          <UIcon name="i-heroicons-sparkles" class="w-5 h-5" />
                        </div>
                        <span class="text-sm font-medium text-gray-200">Daily Insight</span>
                        <span class="ml-1 inline-flex items-center gap-1.5 text-xs text-[#00DC82]">
                          <span class="live-dot h-2.5 w-2.5 rounded-full bg-[#00DC82]" />
                          Live
                        </span>
                      </div>

                      <div
                        class="text-sm text-gray-300 font-mono leading-relaxed min-h-12 relative"
                      >
                        <span
                          class="inline-flex items-center rounded-md border border-primary-400/25 bg-primary-500/12 px-2 py-1 text-primary-100"
                        >
                          <span class="typing-text">{{ typedInsight }}</span>
                        </span>
                        <span
                          v-if="isTyping"
                          class="cursor inline-block w-2 h-4 bg-primary-500 ml-1 animate-pulse"
                        />
                      </div>
                    </div>

                    <div
                      class="relative rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-colors backdrop-blur-[12px] group/fitness"
                    >
                      <div class="text-xs text-gray-500 mb-1">FITNESS SCORE</div>
                      <div class="text-2xl font-bold text-white flex items-end gap-2">
                        {{ activeScenario.fitness }}
                        <span class="text-xs text-green-400 mb-1 flex items-center">
                          <UIcon name="i-heroicons-arrow-trending-up" class="w-3 h-3 mr-0.5" />
                          {{ activeScenario.fitnessDelta }}
                        </span>
                      </div>
                      <div class="mt-3 h-10 flex items-end space-x-1">
                        <div
                          v-for="(bar, barIndex) in activeScenario.fitnessBars"
                          :key="`fitness-${barIndex}-${chartCycle}`"
                          class="group/bar relative flex h-full w-1/5 items-end"
                        >
                          <motion.div
                            :initial="{ scaleY: 0.08 }"
                            :animate="{ scaleY: isDashboardVisible ? 1 : 0.08 }"
                            :transition="{
                              type: 'spring',
                              stiffness: 130,
                              damping: 17,
                              delay: 0.08 * barIndex
                            }"
                            class="h-full w-full origin-bottom rounded-t bg-gray-700"
                            :class="{
                              'bg-primary-500': barIndex === activeScenario.fitnessBars.length - 1
                            }"
                            :style="{ height: `${bar}%` }"
                          />
                          <span
                            class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-gray-950/95 px-2 py-1 text-[10px] text-gray-200 opacity-0 shadow-lg transition-opacity duration-200 group-hover/bar:opacity-100"
                          >
                            {{ activeScenario.fitnessTooltips[barIndex] }}
                          </span>
                        </div>
                      </div>
                      <span
                        class="pointer-events-none absolute -top-8 right-3 whitespace-nowrap rounded-md border border-white/10 bg-gray-950/95 px-2 py-1 text-[10px] text-gray-200 opacity-0 shadow-lg transition-opacity duration-200 group-hover/fitness:opacity-100"
                      >
                        7-day average: {{ activeScenario.fitnessAvg }}
                      </span>
                    </div>

                    <div
                      class="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-colors backdrop-blur-[12px]"
                    >
                      <div class="text-xs text-gray-500 mb-1">RECOVERY</div>
                      <div class="text-2xl font-bold text-white flex items-end gap-2">
                        {{ activeScenario.recovery }}%
                        <span class="text-xs text-rose-400 mb-1 font-semibold">{{
                          activeScenario.recoveryLabel
                        }}</span>
                      </div>
                      <div class="mt-4 w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <motion.div
                          :key="`recovery-${chartCycle}`"
                          :initial="{ width: '0%' }"
                          :animate="{
                            width: isDashboardVisible ? `${activeScenario.recovery}%` : '0%'
                          }"
                          :transition="{ type: 'spring', stiffness: 120, damping: 19, mass: 0.8 }"
                          class="recovery-live h-full bg-rose-500 relative"
                        >
                          <div class="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                        </motion.div>
                      </div>
                    </div>

                    <div
                      class="col-span-2 bg-gray-800/30 rounded-xl border border-gray-700/30 h-32 relative overflow-hidden group-hover:border-gray-700/50 transition-colors"
                    >
                      <div
                        class="absolute inset-0 opacity-10 bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm95MXY4Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0/U3qYN8S0j3bpK/giphy.gif')] bg-cover mix-blend-screen pointer-events-none"
                      />

                      <svg
                        class="absolute bottom-0 left-0 right-0 h-full w-full"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M0,80 C100,70 200,90 300,50 C400,10 500,60 600,40 L600,128 L0,128 Z"
                          fill="url(#gradient)"
                          opacity="0.2"
                        />
                        <motion.path
                          d="M0,80 C100,70 200,90 300,50 C400,10 500,60 600,40"
                          stroke="#10b981"
                          stroke-width="2"
                          fill="none"
                          class="drop-shadow-lg"
                          :initial="{ pathLength: 0, opacity: 0.45 }"
                          :animate="{ pathLength: isDashboardVisible ? 1 : 0, opacity: 1 }"
                          :transition="{ duration: 1, ease: 'easeOut', delay: 0.2 }"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#10b981" stop-opacity="0.5" />
                            <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { motion } from 'motion-v'

  interface DashboardScenario {
    insight: string
    fitness: number
    fitnessDelta: string
    fitnessAvg: number
    fitnessBars: number[]
    fitnessTooltips: string[]
    recovery: number
    recoveryLabel: string
  }

  const baseScenario: DashboardScenario = {
    insight: 'Recovery is low (34%). Switching intervals to Zone 2...',
    fitness: 72,
    fitnessDelta: '+2.4',
    fitnessAvg: 68,
    fitnessBars: [36, 54, 47, 74, 100],
    fitnessTooltips: ['Mon: 62', 'Tue: 66', 'Wed: 65', 'Thu: 70', 'Today: 72'],
    recovery: 34,
    recoveryLabel: 'Low'
  }

  const dashboardRef = ref<HTMLElement | { $el?: Element } | null>(null)
  const isDashboardVisible = ref(false)
  const typedInsight = ref('')
  const isTyping = ref(false)
  const chartCycle = ref(0)

  const activeScenario = computed(() => baseScenario)

  let typeTimer: ReturnType<typeof setInterval> | null = null
  let visibilityObserver: IntersectionObserver | null = null

  const getObservedElement = (): Element | null => {
    const candidate = dashboardRef.value
    if (!candidate) return null
    if (candidate instanceof Element) return candidate
    if (candidate.$el instanceof Element) return candidate.$el
    return null
  }

  const clearTypeTimer = () => {
    if (!typeTimer) return
    clearInterval(typeTimer)
    typeTimer = null
  }

  const startTypewriter = () => {
    const message = activeScenario.value.insight
    if (!message) return

    if (import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      typedInsight.value = message
      isTyping.value = false
      return
    }

    clearTypeTimer()
    typedInsight.value = ''
    isTyping.value = true

    let index = 0
    typeTimer = setInterval(() => {
      index += 1
      typedInsight.value = message.slice(0, index)
      if (index >= message.length) {
        clearTypeTimer()
        isTyping.value = false
      }
    }, 22)
  }

  onMounted(() => {
    const observedEl = getObservedElement()
    if (!observedEl) return

    visibilityObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          isDashboardVisible.value = true
          startTypewriter()
          visibilityObserver?.disconnect()
          visibilityObserver = null
        }
      },
      { threshold: 0.35 }
    )

    visibilityObserver.observe(observedEl)

    const rect = observedEl.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.9) {
      isDashboardVisible.value = true
      startTypewriter()
      visibilityObserver.disconnect()
      visibilityObserver = null
    }
  })

  onBeforeUnmount(() => {
    clearTypeTimer()
    visibilityObserver?.disconnect()
    visibilityObserver = null
  })
</script>

<style scoped>
  .tilt-card {
    transform: perspective(1000px) rotateY(-5deg) rotateX(2deg);
    transition: transform 0.5s ease;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .tilt-card:hover {
    transform: perspective(1000px) rotateY(-2deg) rotateX(1deg);
  }

  .hero-cta {
    position: relative;
  }

  .hero-cta-pulse {
    animation: ctaPulse 2.4s ease-out 1;
  }

  .live-dot {
    animation: livePulse 1.8s ease-out infinite;
    box-shadow: 0 0 0 rgba(0, 220, 130, 0.6);
  }

  .recovery-live {
    animation: recoveryBreath 2.4s ease-in-out infinite;
    box-shadow: 0 0 12px rgba(244, 63, 94, 0.42);
  }

  @keyframes ctaPulse {
    0% {
      box-shadow:
        0 0 0 0 rgba(0, 220, 130, 0.45),
        0 18px 38px -14px rgba(0, 220, 130, 0.45);
    }
    60% {
      box-shadow:
        0 0 0 12px rgba(0, 220, 130, 0),
        0 24px 42px -14px rgba(0, 220, 130, 0.55);
    }
    100% {
      box-shadow:
        0 0 0 0 rgba(0, 220, 130, 0),
        0 18px 38px -14px rgba(0, 220, 130, 0.45);
    }
  }

  @keyframes livePulse {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 220, 130, 0.55);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(0, 220, 130, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 220, 130, 0);
    }
  }

  @keyframes recoveryBreath {
    0%,
    100% {
      box-shadow: 0 0 10px rgba(244, 63, 94, 0.25);
    }
    50% {
      box-shadow: 0 0 20px rgba(244, 63, 94, 0.46);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-cta-pulse {
      animation: none;
    }

    .live-dot,
    .recovery-live {
      animation: none;
    }
  }
</style>
