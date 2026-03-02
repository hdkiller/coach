<template>
  <section id="features" class="py-24 sm:py-32 relative overflow-hidden">
    <UContainer>
      <div class="mx-auto max-w-2xl text-center mb-20 lg:mx-0 lg:text-left lg:max-w-none">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-primary-500 mb-4 font-mono">
          {{ t('label') }}
        </h2>
        <p class="text-5xl font-black tracking-tight text-white sm:text-6xl font-athletic italic uppercase leading-[0.85]">
          {{ t('headline') }}
        </p>
      </div>

      <div class="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-6 lg:grid-rows-2">
        <!-- Feature 1: The Big Card (Daily Plans) -->
        <div 
          class="relative lg:col-span-3 lg:row-span-2 overflow-hidden rounded-[2.5rem] floating-card-base grain-overlay p-8 sm:p-12 hover:border-primary-500/40 transition-all duration-500 group min-h-[500px] border-white/10"
        >
          <div class="relative z-10 flex flex-col h-full">
            <div class="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 mb-8 transition-transform group-hover:scale-110">
              <UIcon name="i-heroicons-calendar-days-solid" class="w-8 h-8" />
            </div>
            <h3 class="text-3xl font-black text-white italic font-athletic uppercase leading-tight mb-4 group-hover:text-primary-500 transition-colors">
              {{ t('feat1_title') }}
            </h3>
            <p class="text-lg text-gray-400 font-medium leading-relaxed max-w-md">
              {{ t('feat1_desc') }}
            </p>
            
            <div class="mt-12 overflow-hidden rounded-2xl bg-black/60 border border-white/10 shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 backdrop-blur-sm">
              <!-- Mock UI: Daily Plan -->
              <div class="p-6 space-y-4">
                <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 border-b border-white/5 pb-3">
                  <span>{{ t('today_plan') }}</span>
                  <span class="text-primary-500 animate-pulse">{{ t('adapted') }}</span>
                </div>
                <div class="p-4 bg-primary-500/5 rounded-xl border-l-[3px] border-primary-500 transition-all duration-300">
                  <div class="text-white font-black uppercase tracking-tight text-sm">{{ t('session1_title') }}</div>
                  <div class="text-[11px] text-slate-500 font-black uppercase tracking-widest mt-1">{{ t('session1_detail') }}</div>
                </div>
                <div class="p-4 bg-white/5 rounded-xl border-l-[3px] border-gray-800 opacity-40">
                  <div class="text-gray-500 font-black uppercase tracking-tight text-sm line-through decoration-red-500/30">
                    {{ t('session2_title') }}
                  </div>
                  <div class="text-[11px] text-gray-600 font-medium">{{ t('session2_cancelled') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature 2: Readiness-Aware Coaching -->
        <div 
          class="relative lg:col-span-3 overflow-hidden rounded-[2.5rem] floating-card-base grain-overlay p-8 sm:p-12 hover:border-primary-500/40 transition-all duration-500 group border-white/10"
        >
          <div class="relative z-10 flex flex-col h-full">
            <div class="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 mb-8 transition-transform group-hover:scale-110">
              <UIcon name="i-heroicons-adjustments-horizontal-solid" class="w-8 h-8" />
            </div>
            <div class="lg:flex lg:items-start lg:gap-12">
              <div class="lg:flex-1">
                <h3 class="text-3xl font-black text-white italic font-athletic uppercase leading-tight mb-4 group-hover:text-primary-500 transition-colors">
                  {{ t('feat2_title') }}
                </h3>
                <p class="text-lg text-gray-400 font-medium leading-relaxed">
                  {{ t('feat2_desc') }}
                </p>
              </div>
              <div class="mt-8 lg:mt-0 lg:flex-none flex items-center justify-center relative">
                <div class="absolute inset-0 bg-primary-500/10 blur-3xl rounded-full scale-150 group-hover:bg-primary-500/30 transition-all" />
                <UIcon name="i-heroicons-check-badge-solid" class="w-24 h-24 text-primary-500 relative z-10 filter drop-shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <!-- Feature 3: Nutrition -->
        <div 
          class="relative lg:col-span-2 overflow-hidden rounded-[2.5rem] floating-card-base grain-overlay p-8 hover:border-primary-500/40 transition-all duration-500 group border-white/10"
        >
          <div class="relative z-10 flex flex-col h-full">
            <div class="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 mb-6 transition-transform group-hover:scale-110">
              <UIcon name="i-heroicons-battery-100-solid" class="w-7 h-7" />
            </div>
            <h3 class="text-2xl font-black text-white italic font-athletic uppercase leading-tight mb-4 group-hover:text-primary-500 transition-colors">
              {{ t('feat3_title') }}
            </h3>
            <p class="text-base text-gray-400 font-medium leading-relaxed">
              {{ t('feat3_desc') }}
            </p>
          </div>
        </div>

        <!-- Feature 4: Chat -->
        <div 
          class="relative lg:col-span-1 overflow-hidden rounded-[2.5rem] floating-card-base grain-overlay p-8 lg:p-5 hover:border-primary-500/40 transition-all duration-500 group border-white/10"
        >
          <div class="relative z-10 flex flex-col h-full">
            <div class="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 mb-6 transition-transform group-hover:scale-110">
              <UIcon name="i-heroicons-chat-bubble-left-right-solid" class="w-7 h-7" />
            </div>
            <h3 class="text-2xl lg:text-[1rem] xl:text-[1.3rem] font-black text-white italic font-athletic uppercase leading-[1.1] mb-4 group-hover:text-primary-500 transition-colors tracking-tighter">
              {{ t('feat4_title') }}
            </h3>
            <div class="mt-auto flex justify-center py-2">
              <div class="relative">
                <div class="absolute -inset-4 bg-primary-500/10 blur-xl rounded-full animate-ping" />
                <div class="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  const { t } = useTranslate('bento')
</script>

<style scoped>
  /* Custom styles if needed for specific bento visuals */
</style>
