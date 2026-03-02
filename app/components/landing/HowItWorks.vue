<template>
  <div
    id="how-it-works"
    ref="sectionRef"
    class="py-24 sm:py-32 bg-gray-950 relative overflow-hidden"
    :style="{ '--flow-progress': `${Math.round(flowProgress * 100)}%` }"
  >
    <div class="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
      <div class="mx-auto max-w-2xl text-center mb-20">
        <h2
          class="text-[10px] font-black uppercase tracking-[0.4em] text-primary-500 mb-4 font-mono"
        >
          {{ t('label') }}
        </h2>
        <p
          class="text-5xl font-black tracking-tight text-white sm:text-6xl font-athletic italic uppercase leading-[0.85]"
        >
          {{ t('headline') }}
        </p>
        <p class="mt-8 text-xl leading-relaxed text-gray-400 font-medium">
          {{ t('description') }}
        </p>
      </div>

      <div class="mx-auto mt-16 max-w-2xl lg:max-w-none relative">
        <!-- Connecting Line -->
        <div
          class="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 hidden lg:block -translate-x-1/2"
        />
        <div
          class="absolute left-1/2 top-0 w-px bg-primary-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] hidden lg:block -translate-x-1/2 transition-all duration-300 ease-out"
          :style="{ height: `${flowProgress * 100}%` }"
        />

        <div class="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-x-24 lg:gap-y-32">
          <!-- Step 1: Ingest -->
          <div class="relative group">
            <div
              class="lg:absolute lg:-right-12 lg:top-1/2 lg:-translate-y-1/2 z-20 hidden lg:flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-gray-950 group-hover:border-primary-500/50 transition-colors"
            >
              <div
                class="w-3 h-3 rounded-full bg-gray-800 group-hover:bg-primary-500 transition-colors"
              />
            </div>

            <div
              class="relative rounded-[2.5rem] floating-card-base grain-overlay p-10 transition-all duration-500 border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            >
              <!-- 1px Gradient Border Overlay -->
              <div class="absolute inset-0 rounded-[2.5rem] p-px pointer-events-none z-50">
                <div
                  class="w-full h-full rounded-[2.5rem] border border-white/10"
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
              <div class="flex items-center gap-4 mb-8">
                <div
                  class="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 group-hover:scale-110 transition-transform"
                >
                  <UIcon name="i-heroicons-arrow-down-tray-solid" class="w-8 h-8" />
                </div>
                <div
                  class="font-athletic italic text-4xl font-black text-white/5 uppercase tracking-tighter"
                >
                  01
                </div>
              </div>

              <h3
                class="text-2xl font-black text-white italic font-athletic uppercase leading-tight mb-4 group-hover:text-primary-500 transition-colors"
              >
                {{ t('step1_title') }}
              </h3>
              <p class="text-lg text-gray-400 font-medium leading-relaxed mb-8">
                {{ t('step1_desc') }}
              </p>

              <div class="flex -space-x-3 overflow-hidden">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-[8px] group-hover:border-primary-500/30 transition-colors"
                >
                  <div class="w-5 h-5 rounded-md bg-gray-800" />
                </div>
              </div>
            </div>
          </div>

          <!-- Spacer for Grid (Step 2 is on the right/other column in flex) -->
          <div class="hidden lg:block"></div>
          <div class="hidden lg:block"></div>

          <!-- Step 2: Analyze -->
          <div class="relative group lg:-mt-16">
            <div
              class="lg:absolute lg:-left-12 lg:top-1/2 lg:-translate-y-1/2 z-20 hidden lg:flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-gray-950 group-hover:border-primary-500/50 transition-colors"
            >
              <div
                class="w-3 h-3 rounded-full bg-gray-800 group-hover:bg-primary-500 transition-colors"
              />
            </div>

            <div
              class="relative rounded-[2.5rem] floating-card-base grain-overlay p-10 transition-all duration-500 border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            >
              <!-- 1px Gradient Border Overlay -->
              <div class="absolute inset-0 rounded-[2.5rem] p-px pointer-events-none z-50">
                <div
                  class="w-full h-full rounded-[2.5rem] border border-white/10"
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
              <div class="flex items-center gap-4 mb-8">
                <div
                  class="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 group-hover:scale-110 transition-transform"
                >
                  <UIcon name="i-heroicons-cpu-chip-solid" class="w-8 h-8" />
                </div>
                <div
                  class="font-athletic italic text-4xl font-black text-white/5 uppercase tracking-tighter"
                >
                  02
                </div>
              </div>

              <h3
                class="text-2xl font-black text-white italic font-athletic uppercase leading-tight mb-4 group-hover:text-primary-500 transition-colors"
              >
                {{ t('step2_title') }}
              </h3>
              <p class="text-lg text-gray-400 font-medium leading-relaxed mb-8">
                {{ t('step2_desc') }}
              </p>

              <div
                class="flex items-center gap-3 px-4 py-2 rounded-full bg-primary-500/5 border border-primary-500/20 w-fit"
              >
                <span class="relative flex h-2 w-2">
                  <span
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"
                  ></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                </span>
                <span class="text-[10px] font-black uppercase tracking-widest text-primary-500">{{
                  t('step2_status')
                }}</span>
              </div>
            </div>
          </div>

          <!-- Step 3: Profile -->
          <div class="relative group">
            <div
              class="lg:absolute lg:-right-12 lg:top-1/2 lg:-translate-y-1/2 z-20 hidden lg:flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-gray-950 group-hover:border-primary-500/50 transition-colors"
            >
              <div
                class="w-3 h-3 rounded-full bg-gray-800 group-hover:bg-primary-500 transition-colors"
              />
            </div>

            <div
              class="relative rounded-[2.5rem] floating-card-base grain-overlay p-10 transition-all duration-500 border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            >
              <!-- 1px Gradient Border Overlay -->
              <div class="absolute inset-0 rounded-[2.5rem] p-px pointer-events-none z-50">
                <div
                  class="w-full h-full rounded-[2.5rem] border border-white/10"
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
              <div class="flex items-center gap-4 mb-8">
                <div
                  class="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 group-hover:scale-110 transition-transform"
                >
                  <UIcon name="i-heroicons-user-circle-solid" class="w-8 h-8" />
                </div>
                <div
                  class="font-athletic italic text-4xl font-black text-white/5 uppercase tracking-tighter"
                >
                  03
                </div>
              </div>

              <h3
                class="text-2xl font-black text-white italic font-athletic uppercase leading-tight mb-4 group-hover:text-primary-500 transition-colors"
              >
                {{ t('step3_title') }}
              </h3>
              <p class="text-lg text-gray-400 font-medium leading-relaxed mb-8">
                {{ t('step3_desc') }}
              </p>

              <div class="flex flex-wrap gap-2">
                <div
                  v-for="tag in [t('step3_status1'), t('step3_status2')]"
                  :key="tag"
                  class="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500"
                >
                  {{ tag }}
                </div>
              </div>
            </div>
          </div>

          <div class="hidden lg:block"></div>
          <div class="hidden lg:block"></div>

          <!-- Step 4: Coach -->
          <div class="relative group lg:-mt-16">
            <div
              class="lg:absolute lg:-left-12 lg:top-1/2 lg:-translate-y-1/2 z-20 hidden lg:flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-gray-950 group-hover:border-primary-500/50 transition-colors"
            >
              <div
                class="w-3 h-3 rounded-full bg-gray-800 group-hover:bg-primary-500 transition-colors"
              />
            </div>

            <div
              class="relative rounded-[2.5rem] floating-card-base grain-overlay p-10 transition-all duration-500 border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            >
              <!-- 1px Gradient Border Overlay -->
              <div class="absolute inset-0 rounded-[2.5rem] p-px pointer-events-none z-50">
                <div
                  class="w-full h-full rounded-[2.5rem] border border-white/10"
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
              <div class="flex items-center gap-4 mb-8">
                <div
                  class="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 group-hover:scale-110 transition-transform"
                >
                  <UIcon name="i-heroicons-chat-bubble-bottom-center-text-solid" class="w-8 h-8" />
                </div>
                <div
                  class="font-athletic italic text-4xl font-black text-white/5 uppercase tracking-tighter"
                >
                  04
                </div>
              </div>

              <h3
                class="text-2xl font-black text-white italic font-athletic uppercase leading-tight mb-4 group-hover:text-primary-500 transition-colors"
              >
                {{ t('step4_title') }}
              </h3>
              <p class="text-lg text-gray-400 font-medium leading-relaxed mb-8">
                {{ t('step4_desc') }}
              </p>

              <div
                class="rounded-2xl bg-black/60 p-5 border border-primary-500/20 relative group-hover:shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all"
              >
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  <span class="text-[9px] font-black uppercase tracking-widest text-slate-500"
                    >Coach Watts</span
                  >
                </div>
                <p class="text-sm font-medium italic text-gray-200 leading-snug">
                  "{{ t('step4_quote') }}"
                </p>
              </div>
            </div>
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

    // Calculate progress based on how much of the section has passed the center of the viewport
    const centerOfViewport = viewportHeight / 2
    const sectionTop = rect.top
    const sectionHeight = rect.height

    const progress = (centerOfViewport - sectionTop) / sectionHeight
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

<style scoped></style>
