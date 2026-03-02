<template>
  <div class="bg-gray-950 py-24 sm:py-32 relative overflow-hidden">
    <div class="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
      <div class="mx-auto max-w-2xl text-center mb-20 lg:mx-0 lg:text-left lg:max-w-none">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-primary-500 mb-4 font-mono">
          {{ t('label') }}
        </h2>
        <p class="text-5xl font-black tracking-tight text-white sm:text-6xl font-athletic italic uppercase leading-[0.85]">
          {{ t('headline') }}
        </p>
      </div>

      <div class="mx-auto mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
        <!-- Testimonial 1 -->
        <div 
          class="rounded-[2.5rem] p-8 sm:p-10 floating-card-base grain-overlay hover:border-primary-500/40 transition-all duration-500 group border-white/10"
        >
          <div class="flex items-center gap-x-4 mb-8">
            <div class="relative">
              <div class="absolute inset-0 bg-primary-500/20 blur-xl rounded-full scale-110 group-hover:scale-150 transition-transform duration-500" />
              <UAvatar alt="Sarah J" class="relative h-14 w-14 rounded-2xl object-cover border border-white/10 grayscale group-hover:grayscale-0 transition-all duration-500" />
            </div>
            <div>
              <div class="text-lg font-black text-white italic font-athletic uppercase tracking-tight group-hover:text-primary-500 transition-colors">{{ t('t1_author') }}</div>
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{{ t('t1_role') }}</div>
            </div>
          </div>
          <div class="relative">
            <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="absolute -top-4 -left-2 w-10 h-10 text-white/5 -z-10" />
            <p class="text-lg text-gray-400 font-medium leading-relaxed italic">"{{ t('t1_quote') }}"</p>
          </div>
        </div>

        <!-- Testimonial 2 -->
        <div 
          class="rounded-[2.5rem] p-8 sm:p-10 floating-card-base grain-overlay hover:border-primary-500/40 transition-all duration-500 group border-white/10"
        >
          <div class="flex items-center gap-x-4 mb-8">
            <div class="relative">
              <div class="absolute inset-0 bg-primary-500/20 blur-xl rounded-full scale-110 group-hover:scale-150 transition-transform duration-500" />
              <UAvatar alt="Mike C" class="relative h-14 w-14 rounded-2xl object-cover border border-white/10 grayscale group-hover:grayscale-0 transition-all duration-500" />
            </div>
            <div>
              <div class="text-lg font-black text-white italic font-athletic uppercase tracking-tight group-hover:text-primary-500 transition-colors">{{ t('t2_author') }}</div>
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{{ t('t2_role') }}</div>
            </div>
          </div>
          <div class="relative">
            <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="absolute -top-4 -left-2 w-10 h-10 text-white/5 -z-10" />
            <p class="text-lg text-gray-400 font-medium leading-relaxed italic">"{{ t('t2_quote') }}"</p>
          </div>
        </div>

        <!-- Testimonial 3 -->
        <div 
          class="rounded-[2.5rem] p-8 sm:p-10 floating-card-base grain-overlay hover:border-primary-500/40 transition-all duration-500 group border-white/10"
        >
          <div class="flex items-center gap-x-4 mb-8">
            <div class="relative">
              <div class="absolute inset-0 bg-primary-500/20 blur-xl rounded-full scale-110 group-hover:scale-150 transition-transform duration-500" />
              <UAvatar alt="David R" class="relative h-14 w-14 rounded-2xl object-cover border border-white/10 grayscale group-hover:grayscale-0 transition-all duration-500" />
            </div>
            <div>
              <div class="text-lg font-black text-white italic font-athletic uppercase tracking-tight group-hover:text-primary-500 transition-colors">{{ t('t3_author') }}</div>
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{{ t('t3_role') }}</div>
            </div>
          </div>
          <div class="relative">
            <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="absolute -top-4 -left-2 w-10 h-10 text-white/5 -z-10" />
            <p class="text-lg text-gray-400 font-medium leading-relaxed italic">"{{ t('t3_quote') }}"</p>
          </div>
        </div>
      </div>

      <!-- Community CTA -->
      <div class="mt-20 flex justify-center">
        <UButton
          to="#"
          color="neutral"
          variant="link"
          size="xl"
          class="font-black uppercase tracking-[0.2em] group text-slate-500 hover:text-white"
        >
          {{ t('discord_cta') }} <span class="text-primary-500 ml-2">Discord</span>
          <UIcon name="i-heroicons-arrow-right" class="ml-2 w-5 h-5 transition-transform group-hover:translate-x-2" />
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  const { t } = useTranslate('community')
</script>
