<template>
  <UTooltip :text="t('navbar_tasks_tooltip')" :popper="{ placement: 'bottom' }">
    <UButton
      color="neutral"
      variant="outline"
      size="sm"
      class="font-bold"
      icon="i-heroicons-cpu-chip"
      @click="toggle"
    >
      <span class="hidden md:inline">{{ t('navbar_tasks') }}</span>
      <template v-if="activeRunCount > 0" #trailing>
        <UBadge color="primary" size="xs" :ui="{ base: 'rounded-full' }" class="-ml-1">
          {{ activeRunCount }}
        </UBadge>
      </template>
    </UButton>
  </UTooltip>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('dashboard')
  const { activeRunCount } = useUserRunsState()
  const { toggle } = useTriggerMonitor()
</script>
