<template>
  <UCard
    :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-5' }"
    class="overflow-hidden border border-rose-100/80 bg-gradient-to-br from-white via-rose-50/60 to-amber-50/60 dark:border-rose-950/40 dark:from-gray-950 dark:via-rose-950/10 dark:to-amber-950/10"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="max-w-2xl">
        <div class="flex items-center gap-2">
          <div
            class="flex size-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300"
          >
            <UIcon name="i-lucide-heart-handshake" class="size-4.5" />
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-rose-500/80">
            Recovery Context
          </p>
        </div>
        <h3 class="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
          What is shaping this period
        </h3>
        <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Imported wellness, manual events, and check-ins that can explain unusual recovery, sleep,
          HRV, RHR, or training response.
        </p>
      </div>
      <div class="shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <div
      class="mt-4 rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-gray-800/80 dark:bg-gray-900/70"
    >
      <div v-if="items.length" class="flex flex-wrap gap-2">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="group inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition"
          :class="chipClass(item.sourceType)"
          @click="$emit('select', item)"
        >
          <div
            class="flex size-6 items-center justify-center rounded-full"
            :style="{ backgroundColor: item.color }"
          >
            <UIcon :name="item.icon" class="size-3.5 text-gray-900/80 dark:text-white/90" />
          </div>
          <span>{{ item.label }}</span>
          <span class="text-[11px] font-medium text-gray-400">{{
            sourceLabel(item.sourceType)
          }}</span>
        </button>
      </div>

      <div
        v-else
        class="rounded-xl border border-dashed border-rose-200/80 bg-rose-50/70 px-4 py-5 text-sm text-gray-600 dark:border-rose-950/40 dark:bg-rose-950/10 dark:text-gray-300"
      >
        <div class="flex items-start gap-3">
          <div
            class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-rose-500 dark:bg-gray-900 dark:text-rose-300"
          >
            <UIcon name="i-lucide-notebook-pen" class="size-4" />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">No recovery context active yet</p>
            <p class="mt-1 leading-relaxed">
              Add a manual event or complete today’s check-in before generating insights so Coach
              Watts can interpret unusual signals with the right context.
            </p>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import type { RecoveryContextItem, RecoveryContextSourceType } from '~/types/recovery-context'

  defineProps<{
    items: RecoveryContextItem[]
  }>()

  defineEmits<{
    select: [item: RecoveryContextItem]
  }>()

  function sourceLabel(sourceType: RecoveryContextSourceType) {
    if (sourceType === 'imported') return 'Imported'
    if (sourceType === 'manual_event') return 'Manual'
    return 'Check-in'
  }

  function chipClass(sourceType: RecoveryContextSourceType) {
    if (sourceType === 'imported') {
      return 'border-sky-200 bg-white text-sky-900 hover:border-sky-300 hover:text-sky-700 dark:border-sky-950/60 dark:bg-gray-900 dark:text-sky-100'
    }
    if (sourceType === 'manual_event') {
      return 'border-amber-200 bg-white text-amber-900 hover:border-amber-300 hover:text-amber-700 dark:border-amber-950/60 dark:bg-gray-900 dark:text-amber-100'
    }
    return 'border-teal-200 bg-white text-teal-900 hover:border-teal-300 hover:text-teal-700 dark:border-teal-950/60 dark:bg-gray-900 dark:text-teal-100'
  }
</script>
