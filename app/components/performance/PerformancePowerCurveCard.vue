<template>
  <UCard
    :ui="{
      root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
      body: 'p-4 sm:p-6'
    }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="group text-left"
          aria-label="Explain Power Duration Curve"
          @click="showExplanation = true"
        >
          <h2
            class="text-base font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-500 transition-colors"
          >
            Power Duration Curve
          </h2>
          <div class="mt-1 flex items-center gap-1.5">
            <span
              class="h-1 w-1 rounded-full bg-gray-400/80 group-hover:bg-gray-500 transition-colors"
            />
            <span
              class="h-1 w-1 rounded-full bg-gray-400/80 group-hover:bg-gray-500 transition-colors"
            />
            <span
              class="h-1 w-1 rounded-full bg-gray-400/80 group-hover:bg-gray-500 transition-colors"
            />
          </div>
        </button>
        <div class="flex gap-2">
          <USelect
            v-model="sport"
            :items="sportOptions"
            class="w-32 sm:w-36"
            size="xs"
            color="neutral"
            variant="outline"
          />
          <USelect
            v-model="period"
            :items="periodOptions"
            class="w-32 sm:w-36"
            size="xs"
            color="neutral"
            variant="outline"
          />
          <UButton
            icon="i-heroicons-cog-6-tooth"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="$emit('settings')"
          />
        </div>
      </div>
    </template>
    <PowerCurveChart :days="period" :sport="sport" :settings="settings" />

    <UModal
      v-model:open="showExplanation"
      :ui="{ content: 'sm:max-w-lg' }"
      title="Dialog"
      description="Dialog content and actions."
    >
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <UIcon name="i-heroicons-bolt" class="size-5 text-blue-500" />
            </div>
            <div>
              <h3
                class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white"
              >
                Power Duration Curve
              </h3>
              <p class="text-[10px] text-gray-500 font-bold uppercase italic">
                What this chart means
              </p>
            </div>
          </div>

          <div
            class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800"
          >
            <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
              This chart shows your best sustainable power at different durations, from short
              sprints to long efforts. The solid line is your selected period and the dashed line is
              your all-time best.
            </p>
          </div>

          <div
            class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800"
          >
            <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
              Freshness indicates how recently each duration was validated by a near-best effort:
              <span class="font-bold text-blue-500"> Fresh</span> (0-30d),
              <span class="font-bold text-amber-500"> Aging</span> (31-90d),
              <span class="font-bold text-red-500"> Stale</span> (90d+).
            </p>
          </div>

          <div
            class="p-4 bg-primary-50/50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-900/30"
          >
            <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic">
              Tip: If key durations are stale, add short validation efforts (for example strides,
              1-5min hard efforts, or sustained threshold work) to keep this curve representative.
            </p>
          </div>

          <div class="flex justify-end pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              class="font-bold uppercase text-xs"
              @click="showExplanation = false"
            >
              Close
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
  import PowerCurveChart from '~/components/PowerCurveChart.vue'

  defineProps<{
    settings: any
    sportOptions: any[]
    periodOptions: any[]
  }>()

  const sport = defineModel<string>('sport')
  const period = defineModel<number | string>('period')
  const showExplanation = ref(false)

  defineEmits(['settings'])
</script>
