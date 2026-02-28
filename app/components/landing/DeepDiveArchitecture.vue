<template>
  <div id="architecture" class="bg-gray-900 py-24 sm:py-32 border-t border-gray-800">
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
          <div class="rounded-xl bg-gray-800 border border-gray-700 p-8 shadow-2xl">
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
              <div class="p-4 bg-gray-900 border border-primary-500/30 rounded-lg text-center">
                <div class="text-primary-400 font-mono text-sm mb-1">{{ t('engine') }}</div>
                <div class="text-xs text-gray-500">{{ t('engine_sub') }}</div>
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
                class="p-6 bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-primary-500 rounded-xl text-center relative overflow-hidden"
              >
                <div class="absolute inset-0 bg-primary-500/5" />
                <div class="relative z-10">
                  <UIcon name="i-heroicons-user" class="w-12 h-12 text-primary-500 mx-auto mb-2" />
                  <div class="text-white font-bold text-lg">{{ t('twin_title') }}</div>
                  <div class="text-xs text-gray-400 mt-2 space-y-1">
                    <p>{{ t('twin_fitness') }}</p>
                    <p>{{ t('twin_fatigue') }}</p>
                    <p>{{ t('twin_trend') }}</p>
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
