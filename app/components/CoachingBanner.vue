<template>
  <div
    v-if="coachingStore.isCoachingMode"
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-primary-600 text-white py-2 px-4 rounded-full shadow-xl flex items-center gap-4 border border-white/20 whitespace-nowrap"
  >
    <div class="flex items-center gap-2 text-sm font-medium">
      <UIcon name="i-heroicons-eye" class="w-5 h-5" />
      <span>
        {{ t('coaching_banner_active', { name: coachingStore.actingAsUserName }) }}
      </span>
    </div>
    <div class="flex items-center gap-4">
      <UButton
        color="neutral"
        variant="solid"
        size="xs"
        :label="t('banner_exit')"
        @click="coachingStore.stopActingAs"
      />
    </div>
  </div>
</template>

<script setup>
  import { useTranslate } from '@tolgee/vue'
  const { t } = useTranslate('common')
  const coachingStore = useCoachingStore()
</script>
