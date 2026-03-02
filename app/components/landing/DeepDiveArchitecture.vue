<template>
  <div
    id="architecture"
    class="bg-[#09090B] py-24 sm:py-32 border-t border-white/5 relative overflow-hidden"
  >
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,220,130,0.03)_0%,transparent_50%)] pointer-events-none"
    />
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <!-- Section Header -->
      <div class="mx-auto max-w-2xl text-center mb-16">
        <h2 class="text-base font-semibold leading-7 text-primary-400 font-mono">
          {{ t('label') }}
        </h2>
        <p class="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {{ t('headline') }}
        </p>
        <p class="mt-6 text-lg leading-8 text-gray-300">{{ t('description') }}</p>
      </div>

      <div class="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-8 items-start">
        <!-- Left: Text Explanation -->
        <div class="lg:pr-8 lg:pt-4">
          <div class="lg:max-w-lg">
            <h3 class="text-2xl font-bold tracking-tight text-white">{{ t('context_title') }}</h3>
            <p class="mt-4 text-base leading-7 text-gray-300">{{ t('context_desc') }}</p>
            <dl class="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-300 lg:max-w-none">
              <div class="relative pl-9">
                <dt class="inline font-semibold text-white">
                  <UIcon
                    name="i-heroicons-arrow-down-tray"
                    class="absolute left-1 top-1 h-5 w-5 text-primary-500"
                  />
                  {{ t('feat1_title') }}
                </dt>
                <dd class="inline">{{ t('feat1_desc') }}</dd>
              </div>

              <div class="relative pl-9">
                <dt class="inline font-semibold text-white">
                  <UIcon
                    name="i-heroicons-cpu-chip"
                    class="absolute left-1 top-1 h-5 w-5 text-primary-500"
                  />
                  {{ t('feat2_title') }}
                </dt>
                <dd class="inline">{{ t('feat2_desc') }}</dd>
              </div>

              <div class="relative pl-9">
                <dt class="inline font-semibold text-white">
                  <UIcon
                    name="i-heroicons-user-circle"
                    class="absolute left-1 top-1 h-5 w-5 text-primary-500"
                  />
                  {{ t('feat3_title') }}
                </dt>
                <dd class="inline">{{ t('feat3_desc') }}</dd>
              </div>

              <div class="relative pl-9">
                <dt class="inline font-semibold text-white">
                  <UIcon
                    name="i-heroicons-chat-bubble-bottom-center-text"
                    class="absolute left-1 top-1 h-5 w-5 text-primary-500"
                  />
                  {{ t('feat4_title') }}
                </dt>
                <dd class="inline">{{ t('feat4_desc') }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Right: Visualization -->
        <div class="relative pt-8">
          <div
            class="relative rounded-[2rem] bg-gray-900/60 p-10 shadow-2xl border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
          >
            <!-- 1px Gradient Border Overlay -->
            <div class="absolute inset-0 rounded-[2rem] p-px pointer-events-none z-50">
              <div
                class="w-full h-full rounded-[2rem] border border-white/10"
                style="
                  border-image: linear-gradient(
                      to bottom right,
                      rgba(255, 255, 255, 0.1),
                      rgba(0, 220, 130, 0.2)
                    )
                    1;
                "
              />
            </div>
            <!-- Schematic Visualization -->
            <div class="space-y-4">
              <!-- Input Layer -->
              <div class="flex gap-2 justify-center">
                <div
                  class="px-3 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-gray-400"
                >
                  {{ t('data_workouts') }}
                </div>
                <div
                  class="px-3 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-gray-400"
                >
                  {{ t('data_wellness') }}
                </div>
                <div
                  class="px-3 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-gray-400"
                >
                  {{ t('data_nutrition') }}
                </div>
              </div>

              <div class="h-8 flex justify-center">
                <div class="w-px bg-gray-600" />
              </div>

              <!-- Ingestion Engine -->
              <div
                class="relative p-6 bg-black/40 rounded-2xl text-center border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
              >
                <div class="absolute inset-0 rounded-2xl p-px pointer-events-none z-50">
                  <div
                    class="w-full h-full rounded-2xl border border-white/10"
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
                <div class="text-primary-400 font-mono text-sm mb-1 uppercase tracking-widest">
                  {{ t('engine') }}
                </div>
                <div class="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                  {{ t('engine_sub') }}
                </div>
              </div>

              <div class="h-8 flex justify-center">
                <div class="w-px bg-gray-600" />
              </div>

              <!-- Analysis Layer -->
              <div class="grid grid-cols-2 gap-4">
                <div class="p-3 bg-gray-900 border border-gray-700 rounded text-center">
                  <div class="text-gray-300 font-mono text-xs">{{ t('workout_analysis') }}</div>
                </div>
                <div class="p-3 bg-gray-900 border border-gray-700 rounded text-center">
                  <div class="text-gray-300 font-mono text-xs">{{ t('nutrition_analysis') }}</div>
                </div>
              </div>

              <div class="h-8 flex justify-center text-gray-600 text-xs">{{ t('updating') }}</div>

              <!-- The Digital Twin -->
              <div
                class="relative p-8 bg-gradient-to-b from-gray-900 to-black rounded-[2rem] text-center overflow-hidden border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_40px_-10px_rgba(0,0,0,0.5)]"
              >
                <div class="absolute inset-0 rounded-[2rem] p-px pointer-events-none z-50">
                  <div
                    class="w-full h-full rounded-[2rem] border border-white/10"
                    style="
                      border-image: linear-gradient(
                          to bottom right,
                          rgba(255, 255, 255, 0.2),
                          rgba(0, 220, 130, 0.5)
                        )
                        1;
                    "
                  />
                </div>
                <div class="absolute inset-0 bg-primary-500/5 blur-3xl animate-pulse" />
                <div class="relative z-10">
                  <UIcon
                    name="i-heroicons-user-solid"
                    class="w-16 h-16 text-primary-500 mx-auto mb-4 filter drop-shadow-[0_0_15px_rgba(0,220,130,0.3)]"
                  />
                  <div
                    class="text-white font-black italic font-athletic uppercase text-2xl tracking-tight"
                  >
                    {{ t('twin_title') }}
                  </div>
                  <div
                    class="text-[10px] text-gray-400 mt-4 space-y-2 font-black uppercase tracking-widest"
                  >
                    <p class="flex items-center justify-center gap-2">
                      <span class="w-1 h-1 rounded-full bg-primary-500" /> {{ t('twin_fitness') }}
                    </p>
                    <p class="flex items-center justify-center gap-2">
                      <span class="w-1 h-1 rounded-full bg-primary-500" /> {{ t('twin_fatigue') }}
                    </p>
                    <p class="flex items-center justify-center gap-2">
                      <span class="w-1 h-1 rounded-full bg-primary-500" /> {{ t('twin_trend') }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="h-8 flex justify-center">
                <div class="w-px bg-gray-600" />
              </div>

              <!-- Output -->
              <div class="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div class="flex gap-3">
                  <div
                    class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0"
                  >
                    <UIcon name="i-heroicons-chat-bubble-left" class="text-white w-5 h-5" />
                  </div>
                  <div class="text-sm text-gray-300">{{ t('coach_output') }}</div>
                </div>
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
  const { t } = useTranslate('architecture')
</script>
