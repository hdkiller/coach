<template>
  <div class="space-y-6">
    <UCard :ui="{ body: 'hidden' }">
      <template #header>
        <h2 class="text-xl font-bold uppercase tracking-tight">{{ t('ai_coach_header') }}</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('ai_coach_description') }}
        </p>
      </template>
    </UCard>

    <UCard
      v-if="showUpgradeBanner && !hasSuccessBypass && !userStore.hasMinimumTier('SUPPORTER')"
      class="mb-6"
    >
      <div class="flex items-start gap-4">
        <UIcon name="i-heroicons-sparkles" class="w-10 h-10 text-primary shrink-0 mt-1" />
        <div class="flex-1 flex justify-between items-start">
          <div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              {{ t('upgrade_banner_title') }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium">
              {{ t('upgrade_banner_desc') }}
            </p>
            <div class="mt-3">
              <UButton
                to="/settings/billing"
                color="primary"
                size="sm"
                :label="t('upgrade_banner_button')"
                icon="i-heroicons-arrow-right"
                trailing
              />
            </div>
          </div>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="showUpgradeBanner = false"
          />
        </div>
      </div>
    </UCard>

    <!-- Three-column layout for settings, analytics, and charts -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SettingsAiCoachSettings
        v-if="aiSettings"
        :settings="aiSettings as any"
        :force-unlocked="hasSuccessBypass"
        @save="saveAiSettings"
      />

      <div class="flex flex-col gap-6">
        <SettingsAiAutomationSettings
          v-if="aiSettings"
          :settings="aiSettings as any"
          :force-unlocked="hasSuccessBypass"
          @save="saveAiSettings"
        />
        <ClientOnly>
          <SettingsAiUsageCharts />
        </ClientOnly>
      </div>

      <ClientOnly>
        <SettingsAiQuotas />
      </ClientOnly>
    </div>

    <!-- Identity & Context -->
    <SettingsAiIdentitySettings v-if="aiSettings" :settings="aiSettings" @save="saveAiSettings" />

    <!-- Full-width history table below -->
    <ClientOnly>
      <SettingsAiUsageHistory />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
  import { useLocalStorage } from '@vueuse/core'
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('settings')
  const toast = useToast()
  const route = useRoute()

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'AI Coach Settings',
    meta: [
      {
        name: 'description',
        content: 'Configure your AI coach preferences, personality, and data access.'
      }
    ]
  })

  const userStore = useUserStore()
  const showUpgradeBanner = useLocalStorage('ai-settings-upgrade-banner', true)
  const hasSuccessBypass = computed(() => route.query.success === 'true')

  // Fetch AI settings
  const { data: aiSettings, refresh: refreshSettings } = await useFetch('/api/settings/ai', {
    lazy: true,
    server: false
  })

  async function saveAiSettings(settings: any) {
    try {
      await $fetch('/api/settings/ai', {
        method: 'POST',
        body: settings
      })

      toast.add({
        title: t.value('toast_settings_saved_title'),
        description: t.value('toast_settings_saved_desc'),
        color: 'success'
      })

      // Refresh settings to ensure they're in sync
      await refreshSettings()
    } catch (error: any) {
      toast.add({
        title: t.value('toast_save_failed_title'),
        description: error.data?.message || 'Failed to save AI settings',
        color: 'error'
      })
    }
  }
</script>
