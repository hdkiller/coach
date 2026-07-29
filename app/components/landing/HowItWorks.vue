<template>
  <div
    id="how-it-works"
    ref="sectionRef"
    class="relative overflow-hidden bg-[oklch(11%_0.014_155)]"
    :style="{ '--flow-progress': `${Math.round(flowProgress * 100)}%` }"
  >
    <div class="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-left lg:mx-0">
        <p
          class="font-athletic text-4xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-5xl"
        >
          {{ t('headline') }}
        </p>
        <p class="mt-6 max-w-xl text-lg font-medium leading-relaxed text-gray-400">
          {{ t('description') }}
        </p>
      </div>

      <div class="relative mx-auto mt-16 max-w-2xl lg:max-w-none">
        <div
          class="absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-white/8 lg:block"
        />
        <div
          class="absolute left-1/2 top-0 hidden w-px -translate-x-1/2 bg-primary-500 transition-[height] duration-300 ease-out lg:block"
          :style="{ height: `${flowProgress * 100}%` }"
        />

        <div class="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-x-24 lg:gap-y-28">
          <div class="relative">
            <div
              class="absolute -right-12 top-1/2 z-20 hidden h-3 w-3 -translate-y-1/2 rounded-full border border-white/15 bg-[oklch(11%_0.014_155)] lg:block"
            />
            <article class="floating-card-base rounded-2xl p-8 sm:p-10">
              <div class="mb-6 flex items-center gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl border border-primary-500/20 bg-primary-500/10 text-primary-400"
                >
                  <UIcon name="i-heroicons-arrow-down-tray-solid" class="h-6 w-6" />
                </div>
                <span
                  class="font-athletic text-3xl font-bold uppercase tracking-tighter text-white/15"
                  >01</span
                >
              </div>
              <h3 class="font-athletic text-2xl font-bold uppercase leading-tight text-white">
                {{ t('step1_title') }}
              </h3>
              <p class="mt-3 text-base font-medium leading-relaxed text-gray-400">
                {{ t('step1_desc') }}
              </p>
            </article>
          </div>

          <div class="hidden lg:block" />
          <div class="hidden lg:block" />

          <div class="relative lg:-mt-12">
            <div
              class="absolute -left-12 top-1/2 z-20 hidden h-3 w-3 -translate-y-1/2 rounded-full border border-white/15 bg-[oklch(11%_0.014_155)] lg:block"
            />
            <article class="floating-card-base rounded-2xl p-8 sm:p-10">
              <div class="mb-6 flex items-center gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl border border-primary-500/20 bg-primary-500/10 text-primary-400"
                >
                  <UIcon name="i-heroicons-cpu-chip-solid" class="h-6 w-6" />
                </div>
                <span
                  class="font-athletic text-3xl font-bold uppercase tracking-tighter text-white/15"
                  >02</span
                >
              </div>
              <h3 class="font-athletic text-2xl font-bold uppercase leading-tight text-white">
                {{ t('step2_title') }}
              </h3>
              <p class="mt-3 text-base font-medium leading-relaxed text-gray-400">
                {{ t('step2_desc') }}
              </p>
              <div
                class="mt-6 inline-flex items-center gap-2 rounded-sm border border-primary-500/20 bg-primary-500/5 px-3 py-1.5"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-primary-500" />
                <span class="text-xs font-bold uppercase tracking-widest text-primary-400">{{
                  t('step2_status')
                }}</span>
              </div>
            </article>
          </div>

          <div class="relative">
            <div
              class="absolute -right-12 top-1/2 z-20 hidden h-3 w-3 -translate-y-1/2 rounded-full border border-white/15 bg-[oklch(11%_0.014_155)] lg:block"
            />
            <article class="floating-card-base rounded-2xl p-8 sm:p-10">
              <div class="mb-6 flex items-center gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl border border-primary-500/20 bg-primary-500/10 text-primary-400"
                >
                  <UIcon name="i-heroicons-user-circle-solid" class="h-6 w-6" />
                </div>
                <span
                  class="font-athletic text-3xl font-bold uppercase tracking-tighter text-white/15"
                  >03</span
                >
              </div>
              <h3 class="font-athletic text-2xl font-bold uppercase leading-tight text-white">
                {{ t('step3_title') }}
              </h3>
              <p class="mt-3 text-base font-medium leading-relaxed text-gray-400">
                {{ t('step3_desc') }}
              </p>
              <div class="mt-6 flex flex-wrap gap-2">
                <span
                  v-for="tag in [t('step3_status1'), t('step3_status2')]"
                  :key="tag"
                  class="rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-slate-400"
                >
                  {{ tag }}
                </span>
              </div>
            </article>
          </div>

          <div class="hidden lg:block" />
          <div class="hidden lg:block" />

          <div class="relative lg:-mt-12">
            <div
              class="absolute -left-12 top-1/2 z-20 hidden h-3 w-3 -translate-y-1/2 rounded-full border border-white/15 bg-[oklch(11%_0.014_155)] lg:block"
            />
            <article class="floating-card-base rounded-2xl p-8 sm:p-10">
              <div class="mb-6 flex items-center gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl border border-primary-500/20 bg-primary-500/10 text-primary-400"
                >
                  <UIcon name="i-heroicons-chat-bubble-bottom-center-text-solid" class="h-6 w-6" />
                </div>
                <span
                  class="font-athletic text-3xl font-bold uppercase tracking-tighter text-white/15"
                  >04</span
                >
              </div>
              <h3 class="font-athletic text-2xl font-bold uppercase leading-tight text-white">
                {{ t('step4_title') }}
              </h3>
              <p class="mt-3 text-base font-medium leading-relaxed text-gray-400">
                {{ t('step4_desc') }}
              </p>
              <div class="mt-6 rounded-xl border border-white/10 bg-black/40 p-4">
                <div class="mb-2 flex items-center gap-2">
                  <span class="h-1.5 w-1.5 rounded-full bg-primary-500" />
                  <span class="text-xs font-bold uppercase tracking-widest text-slate-500"
                    >Journey</span
                  >
                </div>
                <p class="text-sm font-medium leading-snug text-gray-200">
                  “{{ t('step4_quote') }}”
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('how-it-works')

  const sectionRef = ref<HTMLElement | null>(null)
  const flowProgress = ref(0)

  const updateFlowProgress = () => {
    if (!sectionRef.value || import.meta.server) return

    const rect = sectionRef.value.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const centerOfViewport = viewportHeight / 2
    const progress = (centerOfViewport - rect.top) / rect.height
    flowProgress.value = Math.min(1, Math.max(0, progress))
  }

  onMounted(() => {
    updateFlowProgress()
    window.addEventListener('scroll', updateFlowProgress, { passive: true })
    window.addEventListener('resize', updateFlowProgress, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', updateFlowProgress)
    window.removeEventListener('resize', updateFlowProgress)
  })
</script>
