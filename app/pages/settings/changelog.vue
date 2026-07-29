<template>
  <UCard :ui="profileSettingsCardUi">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold uppercase tracking-tight">
            {{ t('dev_section_version_title') }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('changelog_current_version', { version: buildVersionDisplay }) }}
          </p>
        </div>
      </div>
    </template>

    <div v-if="pending" class="py-8 text-center text-gray-500">{{ t('changelog_loading') }}</div>

    <div v-else-if="error" class="py-8 text-center text-red-500">
      {{ t('changelog_load_failed') }}
    </div>

    <div v-else class="prose dark:prose-invert max-w-none">
      <MDC :value="data?.content || ''" :components="{}" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import { profileSettingsCardUi } from '~/utils/mobile-surface-ui'

  const { t } = useTranslate('settings')
  const config = useRuntimeConfig()
  const buildVersionDisplay = computed(
    () =>
      (config.public.buildVersion as string) ||
      `v${config.public.version}+${config.public.buildDate}.${config.public.commitHash}.${config.public.buildCodename}`
  )
  const { data, pending, error } = useFetch('/api/changelog')

  useHead({
    title: 'Changelog',
    meta: [
      {
        name: 'description',
        content: 'Journey Endurance Coaching version history and new features.'
      }
    ]
  })
</script>
