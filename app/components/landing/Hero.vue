<template>
  <div class="relative isolate overflow-hidden">
    <div
      class="relative z-10 mx-auto grid max-w-[88rem] grid-cols-1 items-center gap-x-16 px-6 pb-16 pt-12 sm:pb-20 sm:pt-14 lg:grid-cols-12 lg:px-8 lg:py-16"
    >
      <div class="mx-auto max-w-2xl lg:col-span-7 lg:mx-0 lg:max-w-3xl">
        <NuxtLink
          to="#architecture"
          class="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-gray-400 transition-colors hover:text-white"
        >
          <span
            class="rounded-sm bg-primary-500/10 px-2.5 py-1 text-primary-400 ring-1 ring-inset ring-primary-500/25"
            >{{ t('badge') }}</span
          >
          <span class="inline-flex items-center gap-1.5">
            {{ t('badge_link') }}
            <UIcon name="i-heroicons-chevron-right" class="h-4 w-4" />
          </span>
        </NuxtLink>

        <h1
          class="font-athletic mt-6 text-balance text-5xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-6xl xl:text-[5rem]"
        >
          {{ t('headline_1') }}
        </h1>
        <p class="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-gray-400 sm:text-xl">
          {{ t('description') }}
        </p>
        <div class="mt-10 flex flex-wrap items-center gap-5">
          <UButton
            to="/join"
            size="xl"
            color="primary"
            variant="solid"
            class="hero-cta h-14 rounded-xl px-8 text-[13px] font-bold uppercase tracking-[0.18em] transition-[background-color,transform] duration-200 hover:brightness-110 active:translate-y-px"
          >
            {{ t('cta_primary') }}
          </UButton>
          <UButton
            to="#how-it-works"
            size="xl"
            color="neutral"
            variant="link"
            trailing-icon="i-heroicons-arrow-right-20-solid"
            class="text-[13px] font-bold uppercase tracking-[0.12em] text-gray-400 transition-colors hover:text-white"
          >
            {{ t('cta_secondary') }}
          </UButton>
        </div>
      </div>

      <motion.div
        ref="dashboardRef"
        :initial="{ opacity: 0, x: 32 }"
        :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.08 }"
        class="mx-auto mt-12 w-full max-w-2xl sm:mt-14 lg:col-span-5 lg:mt-0 lg:max-w-none lg:justify-end"
      >
        <figure class="w-full max-w-3xl lg:max-w-[42rem]">
          <div
            class="relative overflow-hidden rounded-2xl border border-white/10 bg-[oklch(14%_0.02_155)] shadow-[0_24px_48px_-24px_oklch(0%_0_0_/_0.8)]"
          >
            <div class="aspect-[16/10] w-full overflow-hidden">
              <div class="flex h-12 items-center justify-between border-b border-white/8 px-5">
                <span class="text-xs font-bold uppercase tracking-[0.2em] text-gray-500"
                  >Coach Watts</span
                >
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary-400"
                >
                  <span class="live-dot h-1.5 w-1.5 rounded-full bg-primary-500" />
                  {{ t('card_live') }}
                </span>
              </div>

              <div class="grid h-full grid-cols-12 gap-6 p-6">
                <div class="col-span-1 flex flex-col items-center space-y-6 pt-4 text-gray-700">
                  <UIcon name="i-heroicons-home-solid" class="h-5 w-5 text-primary-500" />
                  <UIcon name="i-heroicons-chart-bar-solid" class="h-5 w-5" />
                  <UIcon name="i-heroicons-calendar-solid" class="h-5 w-5" />
                  <UIcon name="i-heroicons-user-solid" class="h-5 w-5" />
                </div>

                <div class="col-span-11 grid grid-cols-2 gap-5">
                  <div class="col-span-2 py-3 px-1">
                    <div class="mb-3 flex items-center gap-3">
                      <div
                        class="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-500/20 bg-primary-500/10 text-primary-400"
                      >
                        <UIcon name="i-heroicons-bolt-solid" class="h-5 w-5" />
                      </div>
                      <span class="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{{
                        t('card_insight')
                      }}</span>
                    </div>
                    <div class="min-h-[3rem] text-[15px] font-medium leading-relaxed text-gray-100">
                      <span>{{ typedInsight }}</span>
                      <span
                        v-if="isTyping"
                        class="ml-1 inline-block h-4 w-1 animate-pulse bg-primary-500"
                      />
                    </div>
                  </div>

                  <div class="rounded-xl border border-white/8 bg-black/30 p-5">
                    <div class="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      {{ t('card_fitness') }}
                    </div>
                    <div
                      class="font-athletic flex items-baseline gap-2 text-4xl font-bold leading-none text-white"
                    >
                      {{ activeScenario.fitness }}
                      <span class="mb-0.5 flex items-center text-xs font-bold text-primary-400">
                        <UIcon name="i-heroicons-arrow-trending-up" class="mr-0.5 h-3.5 w-3.5" />
                        {{ activeScenario.fitnessDelta }}
                      </span>
                    </div>
                    <div class="mt-5 flex h-10 items-end space-x-2">
                      <div
                        v-for="(bar, barIndex) in activeScenario.fitnessBars"
                        :key="`fitness-${barIndex}-${chartCycle}`"
                        class="relative flex h-full w-1/5 items-end"
                      >
                        <motion.div
                          :initial="{ scaleY: 0.1 }"
                          :animate="{ scaleY: isDashboardVisible ? 1 : 0.1 }"
                          :transition="{
                            duration: 0.35,
                            ease: [0.16, 1, 0.3, 1],
                            delay: 0.04 * barIndex
                          }"
                          class="w-full origin-bottom rounded-t-sm bg-white/10"
                          :class="{
                            'bg-primary-500': barIndex === activeScenario.fitnessBars.length - 1
                          }"
                          :style="{ height: `${bar}%` }"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="rounded-xl border border-white/8 bg-black/30 p-5">
                    <div class="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      {{ t('card_recovery') }}
                    </div>
                    <div
                      class="font-athletic flex items-baseline gap-2 text-4xl font-bold leading-none text-white"
                    >
                      {{ activeScenario.recovery
                      }}<span class="text-xs font-bold uppercase tracking-widest text-slate-500"
                        >%</span
                      >
                      <span
                        class="ml-auto rounded-sm border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-rose-400"
                        >{{ activeScenario.recoveryLabel }}</span
                      >
                    </div>
                    <div class="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/8">
                      <motion.div
                        :key="`recovery-${chartCycle}`"
                        :initial="{ width: '0%' }"
                        :animate="{
                          width: isDashboardVisible ? `${activeScenario.recovery}%` : '0%'
                        }"
                        :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }"
                        class="h-full rounded-full bg-rose-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <figcaption class="sr-only">{{ t('preview_aria') }}</figcaption>
        </figure>
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

  const activeScenario = computed<DashboardScenario>(() => ({
    insight: t.value('preview_insight'),
    fitness: 72,
    fitnessDelta: '+2.4',
    fitnessAvg: 68,
    fitnessBars: [36, 54, 47, 74, 100],
    fitnessTooltips: ['Mon: 62', 'Tue: 66', 'Wed: 65', 'Thu: 70', 'Today: 72'],
    recovery: 34,
    recoveryLabel: t.value('preview_recovery_low')
  }))

  const dashboardRef = ref<HTMLElement | { $el?: Element } | null>(null)
  const isDashboardVisible = ref(false)
  const typedInsight = ref('')
  const isTyping = ref(false)
  const chartCycle = ref(0)

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
  .live-dot {
    animation: livePulse 1.8s ease-out infinite;
  }

  @keyframes livePulse {
    0% {
      box-shadow: 0 0 0 0 oklch(72% 0.19 155 / 0.45);
    }
    70% {
      box-shadow: 0 0 0 8px oklch(72% 0.19 155 / 0);
    }
    100% {
      box-shadow: 0 0 0 0 oklch(72% 0.19 155 / 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .live-dot {
      animation: none;
    }
  }
</style>
