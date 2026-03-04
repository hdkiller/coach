<template>
  <div class="space-y-6 animate-fade-in">
    <UCard>
      <template #header>
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
          {{ t('settings_tabs_measurements') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ t('basic_body_metrics_description') }}
        </p>
      </template>

      <div
        class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400"
      >
        <p>
          Historical measurements tracking is coming soon. Currently, you can manage your active
          body metrics in the
          <UButton variant="link" color="primary" :padded="false" @click="emit('navigate', 'basic')"
            >Basic Settings</UButton
          >
          tab.
        </p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('profile')
  const emit = defineEmits(['navigate'])
</script>
