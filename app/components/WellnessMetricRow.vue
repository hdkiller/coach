<template>
  <div
    class="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 group"
  >
    <span
      class="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors"
    >
      {{ label }}
    </span>
    <div class="text-right">
      <div
        class="text-sm font-black text-gray-900 dark:text-white tracking-tight"
        :class="valueClass"
      >
        {{ value }}
      </div>
      <div
        v-if="subLabel"
        class="text-[9px] font-bold uppercase tracking-tighter text-gray-400 mt-0.5"
      >
        {{ subLabel }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    label: string
    value: string | number
    subLabel?: string
    valueClass?: string
  }>()
</script>
