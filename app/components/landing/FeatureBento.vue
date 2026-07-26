<template>
  <section id="features" class="relative overflow-hidden">
    <UContainer>
      <div class="mx-auto max-w-2xl text-left lg:mx-0 lg:max-w-none">
        <p
          class="font-athletic text-4xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-5xl"
        >
          {{ t('headline') }}
        </p>
      </div>

      <div class="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-6 lg:grid-rows-2">
        <div
          class="floating-card-base group relative min-h-[420px] overflow-hidden rounded-2xl p-8 sm:p-10 lg:col-span-4 lg:row-span-2"
        >
          <div class="relative z-10 flex h-full flex-col">
            <UIcon name="i-heroicons-calendar-days-solid" class="mb-6 h-7 w-7 text-primary-400" />
            <h3 class="font-athletic text-3xl font-bold uppercase leading-tight text-white">
              {{ t('feat1_title') }}
            </h3>
            <p class="mt-3 max-w-md text-base font-medium leading-relaxed text-gray-400">
              {{ t('feat1_desc') }}
            </p>

            <div class="mt-10 overflow-hidden rounded-xl border border-white/10 bg-black/50">
              <div class="space-y-3 p-5">
                <div
                  class="flex items-center justify-between border-b border-white/8 pb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
                >
                  <span>{{ t('today_plan') }}</span>
                  <span class="text-primary-400">{{ t('adapted') }}</span>
                </div>
                <div class="rounded-lg border border-white/8 bg-primary-500/5 p-3">
                  <div class="text-sm font-bold uppercase tracking-tight text-white">
                    {{ t('session1_title') }}
                  </div>
                  <div class="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                    {{ t('session1_detail') }}
                  </div>
                </div>
                <div class="rounded-lg border border-white/8 bg-white/5 p-3 opacity-50">
                  <div
                    class="text-sm font-bold uppercase tracking-tight text-gray-500 line-through decoration-red-500/30"
                  >
                    {{ t('session2_title') }}
                  </div>
                  <div class="text-xs font-medium text-gray-600">
                    {{ t('session2_cancelled') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="floating-card-base relative overflow-hidden rounded-2xl p-8 sm:p-10 lg:col-span-2"
        >
          <div class="relative z-10 flex h-full flex-col">
            <UIcon
              name="i-heroicons-adjustments-horizontal-solid"
              class="mb-6 h-7 w-7 text-primary-400"
            />
            <div class="lg:flex lg:items-start lg:gap-10">
              <div class="lg:flex-1">
                <h3 class="font-athletic text-3xl font-bold uppercase leading-tight text-white">
                  {{ t('feat2_title') }}
                </h3>
                <p class="mt-3 text-base font-medium leading-relaxed text-gray-400">
                  {{ t('feat2_desc') }}
                </p>
              </div>
              <div class="mt-6 flex items-center justify-start lg:mt-0 lg:justify-center">
                <UIcon name="i-heroicons-check-badge-solid" class="h-16 w-16 text-primary-400" />
              </div>
            </div>
          </div>
        </div>

        <div class="floating-card-base relative overflow-hidden rounded-2xl p-7 lg:col-span-2">
          <div class="relative z-10 flex h-full flex-col">
            <UIcon name="i-heroicons-battery-100-solid" class="mb-5 h-6 w-6 text-primary-400" />
            <h3 class="font-athletic text-2xl font-bold uppercase leading-tight text-white">
              {{ t('feat3_title') }}
            </h3>
            <p class="mt-3 text-sm font-medium leading-relaxed text-gray-400">
              {{ t('feat3_desc') }}
            </p>
          </div>
        </div>

        <div class="floating-card-base relative overflow-hidden rounded-2xl p-7 lg:col-span-1">
          <div class="relative z-10 flex h-full flex-col">
            <UIcon
              name="i-heroicons-chat-bubble-left-right-solid"
              class="mb-5 h-6 w-6 text-primary-400"
            />
            <h3
              class="font-athletic text-xl font-bold uppercase leading-[1.1] tracking-tight text-white lg:text-[1.05rem]"
            >
              {{ t('feat4_title') }}
            </h3>
            <div class="mt-auto flex justify-start pt-4">
              <span class="h-2 w-2 rounded-full bg-primary-500" />
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
