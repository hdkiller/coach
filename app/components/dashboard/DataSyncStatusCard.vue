<template>
  <UCard :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow' }">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">{{ t('data_sync_header') }}</h3>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-path"
          :loading="integrationStore.syncingData"
          @click="handleSyncAll"
        >
          {{ t('data_sync_sync_all') }}
        </UButton>
      </div>
    </template>

    <div v-if="integrationStore.dataSyncStatus" class="space-y-3">
      <!-- Workouts -->
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-bolt" class="w-4 h-4 text-primary" />
            <span class="text-sm font-medium">{{ t('data_sync_workouts') }}</span>
          </div>
          <UBadge
            :color="integrationStore.dataSyncStatus.workouts ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{
              t('data_sync_synced_count', {
                count: integrationStore.dataSyncStatus.workoutCount || 0
              })
            }}
          </UBadge>
        </div>
        <div
          v-if="integrationStore.dataSyncStatus.workoutProviders?.length"
          class="flex items-center gap-2 mt-2 ml-6 overflow-x-auto no-scrollbar"
        >
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">{{
            t('data_sync_via')
          }}</span>
          <div class="flex items-center gap-3">
            <template
              v-for="provider in integrationStore.dataSyncStatus.workoutProviders"
              :key="provider"
            >
              <UiDataAttribution
                :provider="provider.toLowerCase().replace('.icu', '')"
                mode="minimal"
                class="opacity-80 grayscale hover:grayscale-0 transition-all shrink-0"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Nutrition -->
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-cake" class="w-4 h-4 text-primary" />
            <span class="text-sm font-medium">{{ t('data_sync_nutrition') }}</span>
          </div>
          <UBadge
            :color="integrationStore.dataSyncStatus.nutrition ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{
              t('data_sync_days_count', {
                count: integrationStore.dataSyncStatus.nutritionCount || 0
              })
            }}
          </UBadge>
        </div>
        <div
          v-if="integrationStore.dataSyncStatus.nutritionProviders?.length"
          class="flex items-center gap-2 mt-2 ml-6 overflow-x-auto no-scrollbar"
        >
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">{{
            t('data_sync_via')
          }}</span>
          <div class="flex items-center gap-3">
            <template
              v-for="provider in integrationStore.dataSyncStatus.nutritionProviders"
              :key="provider"
            >
              <UiDataAttribution
                :provider="provider.toLowerCase().replace('.icu', '')"
                mode="minimal"
                class="opacity-80 grayscale hover:grayscale-0 transition-all shrink-0"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Wellness -->
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-heart" class="w-4 h-4 text-primary" />
            <span class="text-sm font-medium">{{ t('data_sync_wellness') }}</span>
          </div>
          <UBadge
            :color="integrationStore.dataSyncStatus.wellness ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{
              t('data_sync_days_count', {
                count: integrationStore.dataSyncStatus.wellnessCount || 0
              })
            }}
          </UBadge>
        </div>
        <div
          v-if="integrationStore.dataSyncStatus.wellnessProviders?.length"
          class="flex items-center gap-2 mt-2 ml-6 overflow-x-auto no-scrollbar"
        >
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">{{
            t('data_sync_via')
          }}</span>
          <div class="flex items-center gap-3">
            <template
              v-for="provider in integrationStore.dataSyncStatus.wellnessProviders"
              :key="provider"
            >
              <UiDataAttribution
                :provider="provider.toLowerCase().replace('.icu', '')"
                mode="minimal"
                class="opacity-80 grayscale hover:grayscale-0 transition-all shrink-0"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Authorized Apps -->
      <div
        v-if="integrationStore.oauthAppCount > 0"
        class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-primary" />
            <span class="text-sm font-medium">{{ t('data_sync_authorized_apps') }}</span>
          </div>
          <UBadge color="success" variant="subtle" size="sm">
            {{ t('data_sync_active_count', { count: integrationStore.oauthAppCount }) }}
          </UBadge>
        </div>
        <div class="flex items-center gap-2 mt-2 ml-6 overflow-x-auto no-scrollbar">
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">{{
            t('data_sync_via')
          }}</span>
          <div class="flex items-center gap-3">
            <template
              v-for="provider in integrationStore.integrationStatus?.integrations
                ?.filter((i: any) => i.isOAuthApp)
                .map((i: any) => i.provider) || []"
              :key="provider"
            >
              <UiDataAttribution
                :provider="provider.toLowerCase()"
                mode="minimal"
                class="opacity-80 grayscale hover:grayscale-0 transition-all shrink-0"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Last Sync Info -->
      <div
        v-if="integrationStore.lastSyncTime"
        class="text-xs text-muted text-center pt-2 border-t"
      >
        {{
          t('data_sync_last_synced', { time: formatRelativeTime(integrationStore.lastSyncTime) })
        }}
      </div>
    </div>

    <template #footer>
      <UButton to="/settings" block variant="outline" size="sm">
        {{ t('data_sync_manage_connections') }}
      </UButton>
    </template>
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('dashboard')
  const integrationStore = useIntegrationStore()
  const { formatRelativeTime } = useFormat()
  const { trackManualSyncAll } = useAnalytics()

  const handleSyncAll = async () => {
    trackManualSyncAll()
    await integrationStore.syncAllData()
  }
</script>
