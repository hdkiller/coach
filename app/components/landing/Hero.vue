<template>
  <div class="relative isolate overflow-hidden">
    <div
      class="mx-auto max-w-[88rem] px-6 pb-20 pt-14 sm:pb-24 sm:pt-16 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16 lg:px-8 lg:py-20 relative z-10"
    >
      <div class="mx-auto max-w-2xl lg:col-span-7 lg:mx-0 lg:max-w-3xl lg:pt-0">
        <div class="mt-0">
          <NuxtLink to="#architecture" class="inline-flex items-center gap-4">
            <span
              class="rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-primary-500 ring-1 ring-inset ring-primary-500/30"
              >{{ t('badge') }}</span
            >
            <span
              class="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-gray-500"
            >
              <span>{{ t('badge_link') }}</span>
              <UIcon name="i-heroicons-chevron-right" class="h-4 w-4 text-gray-600" />
            </span>
          </NuxtLink>
        </div>
        <h1
          class="mt-7 text-balance text-6xl font-black uppercase tracking-tight text-white sm:text-7xl xl:text-[5.5rem] leading-[0.85] font-athletic italic"
        >
          {{ t('headline_1') }} <br />
          <span class="mt-3 block text-primary-500 tracking-[0.02em]">{{ t('headline_2') }}</span>
        </h1>
        <p class="mt-6 text-[11px] font-black uppercase tracking-[0.4em] text-primary-500/80">
          {{ t('tagline') }}
        </p>
        <p class="mt-8 max-w-2xl text-xl leading-relaxed text-gray-400 font-medium">
          {{ t('description') }}
        </p>
        <div class="mt-12 flex flex-wrap items-center gap-6">
          <UButton
            to="/join"
            size="xl"
            color="primary"
            variant="solid"
            class="hero-cta px-10 h-16 rounded-[1.25rem] text-[13px] font-black uppercase tracking-[0.25em] shadow-[0_20px_40px_-5px_rgba(34,197,94,0.3)] hover:scale-105 active:scale-95 transition-all"
          >
            {{ t('cta_primary') }}
          </UButton>
          <UButton
            to="#how-it-works"
            size="xl"
            color="neutral"
            variant="link"
            trailing-icon="i-heroicons-arrow-right-20-solid"
            class="text-[13px] font-black uppercase tracking-[0.15em] text-gray-500 hover:text-white transition-colors"
          >
            {{ t('cta_secondary') }}
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
            class="relative rounded-[2.5rem] bg-gray-900/10 p-2 ring-1 ring-inset ring-white/5 lg:p-3"
          >
            <!-- Intensive Focal Glimmer -->
            <div
              class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(0,220,130,0.12)_0%,transparent_50%)] blur-2xl"
            />

            <div
              class="relative overflow-hidden rounded-[2rem] floating-card-base grain-overlay shadow-2xl tilt-card group border-none"
              style="
                background: linear-gradient(
                  to bottom right,
                  rgba(255, 255, 255, 0.1),
                  rgba(0, 220, 130, 0.05)
                );
                box-shadow:
                  inset 0 1px 1px 0 rgba(255, 255, 255, 0.1),
                  0 25px 50px -12px rgba(0, 0, 0, 0.5);
              "
            >
              <!-- 1px Gradient Border Overlay -->
              <div class="absolute inset-0 rounded-[2rem] p-px pointer-events-none z-50">
                <div
                  class="w-full h-full rounded-[2rem] border border-white/10"
                  style="
                    border-image: linear-gradient(
                        to bottom right,
                        rgba(255, 255, 255, 0.1),
                        rgba(0, 220, 130, 0.3)
                      )
                      1;
                  "
                />
              </div>
              <div class="aspect-[16/10] w-full bg-[#0a0a0a]/95 relative overflow-hidden">
                <div
                  class="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-[12px]"
                >
                  <div class="flex items-center space-x-2.5">
                    <div class="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/10" />
                    <div
                      class="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/10"
                    />
                    <div
                      class="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/10"
                    />
                  </div>
                  <div class="flex items-center space-x-4">
                    <div class="h-2 w-24 bg-white/5 rounded-full" />
                    <div class="h-8 w-8 bg-white/5 rounded-full border border-white/5" />
                  </div>
                </div>

                <div class="p-8 grid grid-cols-12 gap-8 h-full">
                  <div class="col-span-1 flex flex-col items-center space-y-8 pt-6 text-gray-800">
                    <UIcon
                      name="i-heroicons-home-solid"
                      class="w-6 h-6 text-primary-500 filter drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                    />
                    <UIcon
                      name="i-heroicons-chart-bar-solid"
                      class="w-6 h-6 hover:text-gray-500 transition-colors"
                    />
                    <UIcon
                      name="i-heroicons-calendar-solid"
                      class="w-6 h-6 hover:text-gray-500 transition-colors"
                    />
                    <UIcon
                      name="i-heroicons-user-solid"
                      class="w-6 h-6 hover:text-gray-500 transition-colors"
                    />
                  </div>

                  <div class="col-span-11 grid grid-cols-2 gap-8">
                    <!-- AI Insight Card -->
                    <div
                      class="col-span-2 rounded-[1.5rem] bg-black/60 p-6 relative overflow-hidden transition-all duration-500 group/card border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                    >
                      <!-- 1px Gradient Border -->
                      <div class="absolute inset-0 rounded-[1.5rem] p-px pointer-events-none z-50">
                        <div
                          class="w-full h-full rounded-[1.5rem] border border-white/10"
                          style="box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset"
                        />
                      </div>
                      <div class="flex items-center gap-3 mb-4">
                        <div
                          class="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 shadow-sm"
                        >
                          <UIcon name="i-heroicons-sparkles-solid" class="w-6 h-6" />
                        </div>
                        <span
                          class="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]"
                          >{{ t('card_insight') }}</span
                        >
                        <span
                          class="ml-auto inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary-500"
                        >
                          <span class="live-dot h-1.5 w-1.5 rounded-full bg-primary-500" />
                          {{ t('card_live') }}
                        </span>
                      </div>

                      <div
                        class="text-[15px] text-gray-100 font-medium leading-relaxed min-h-[3rem]"
                      >
                        <span class="typing-text">{{ typedInsight }}</span>
                        <span
                          v-if="isTyping"
                          class="cursor inline-block w-1.5 h-4 bg-primary-500 ml-1 animate-pulse"
                        />
                      </div>
                    </div>

                    <!-- Metrics -->
                    <div
                      class="relative rounded-[1.5rem] bg-black/30 p-6 transition-all duration-500 group/fitness overflow-hidden border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                    >
                      <div class="absolute inset-0 rounded-[1.5rem] p-px pointer-events-none z-50">
                        <div
                          class="w-full h-full rounded-[1.5rem]"
                          style="box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset"
                        />
                      </div>
                      <div
                        class="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2"
                      >
                        {{ t('card_fitness') }}
                      </div>
                      <div
                        class="text-5xl font-black text-white italic font-athletic flex items-baseline gap-2 leading-none"
                      >
                        {{ activeScenario.fitness }}
                        <span
                          class="text-xs text-primary-500 mb-1 flex items-center font-bold tracking-tight"
                        >
                          <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5 mr-0.5" />
                          {{ activeScenario.fitnessDelta }}
                        </span>
                      </div>
                      <div class="mt-6 h-12 flex items-end space-x-2">
                        <div
                          v-for="(bar, barIndex) in activeScenario.fitnessBars"
                          :key="`fitness-${barIndex}-${chartCycle}`"
                          class="group/bar relative flex h-full w-1/5 items-end"
                        >
                          <motion.div
                            :initial="{ scaleY: 0.1 }"
                            :animate="{ scaleY: isDashboardVisible ? 1 : 0.1 }"
                            :transition="{
                              type: 'spring',
                              stiffness: 100,
                              damping: 15,
                              delay: 0.05 * barIndex
                            }"
                            class="h-full w-full origin-bottom rounded-t-md bg-white/5"
                            :class="{
                              'bg-primary-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]':
                                barIndex === activeScenario.fitnessBars.length - 1
                            }"
                            :style="{ height: `${bar}%` }"
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      class="rounded-[1.5rem] bg-black/30 p-6 transition-all duration-500 overflow-hidden border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                    >
                      <div class="absolute inset-0 rounded-[1.5rem] p-px pointer-events-none z-50">
                        <div
                          class="w-full h-full rounded-[1.5rem]"
                          style="box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset"
                        />
                      </div>
                      <div
                        class="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2"
                      >
                        {{ t('card_recovery') }}
                      </div>
                      <div
                        class="text-5xl font-black text-white italic font-athletic flex items-baseline gap-2 leading-none"
                      >
                        {{ activeScenario.recovery
                        }}<span class="text-xs text-slate-500 font-bold uppercase tracking-widest"
                          >%</span
                        >
                        <span
                          class="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em] ml-auto border border-rose-500/20 bg-rose-500/5 px-2 py-0.5 rounded-full"
                          >{{ activeScenario.recoveryLabel }}</span
                        >
                      </div>
                      <div
                        class="mt-8 w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5 shadow-inner p-0.5"
                      >
                        <motion.div
                          :key="`recovery-${chartCycle}`"
                          :initial="{ width: '0%' }"
                          :animate="{
                            width: isDashboardVisible ? `${activeScenario.recovery}%` : '0%'
                          }"
                          :transition="{ type: 'spring', stiffness: 100, damping: 20 }"
                          class="recovery-live h-full bg-rose-500 relative rounded-full"
                        >
                          <div class="absolute inset-0 bg-white/10 animate-[shimmer_2s_infinite]" />
                        </motion.div>
                      </div>
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
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('hero')

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
