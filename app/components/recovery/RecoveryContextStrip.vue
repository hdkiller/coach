<template>
  <UCard :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4' }">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">
          Recovery Context
        </p>
        <h3 class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
          What is shaping this period
        </h3>
      </div>
      <slot name="actions" />
    </div>

    <div v-if="items.length" class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-primary-300 hover:text-primary-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
        @click="$emit('select', item)"
      >
        <UIcon :name="item.icon" class="size-3.5" />
        <span>{{ item.label }}</span>
        <span class="text-gray-400">{{ item.origin }}</span>
      </button>
    </div>

    <div
      v-else
      class="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
    >
      No recovery context items are active in this range yet.
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import type { RecoveryContextItem } from '~/types/recovery-context'

  defineProps<{
    items: RecoveryContextItem[]
  }>()

  defineEmits<{
    select: [item: RecoveryContextItem]
  }>()
</script>
