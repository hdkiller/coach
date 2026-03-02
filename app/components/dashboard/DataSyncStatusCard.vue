<template>
  <UCard :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow' }">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Data Sync</h3>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-path"
          :loading="integrationStore.syncingData"
          @click="handleSyncAll"
        >
          Sync All
        </UButton>
      </div>
    </template>

    <div v-if="integrationStore.dataSyncStatus" class="space-y-3">
      <!-- Workouts -->
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-bolt" class="w-4 h-4 text-primary" />
            <span class="text-sm font-medium">Workouts</span>
          </div>
          <UBadge
            :color="integrationStore.dataSyncStatus.workouts ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ integrationStore.dataSyncStatus.workoutCount || 0 }} synced
          </UBadge>
        </div>
        <div
          v-if="integrationStore.dataSyncStatus.workoutProviders?.length"
          class="flex items-center gap-2 mt-2 ml-6 overflow-x-auto no-scrollbar"
        >
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">via</span>
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
            <span class="text-sm font-medium">Nutrition</span>
          </div>
          <UBadge
            :color="integrationStore.dataSyncStatus.nutrition ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ integrationStore.dataSyncStatus.nutritionCount || 0 }} days
          </UBadge>
        </div>
        <div
          v-if="integrationStore.dataSyncStatus.nutritionProviders?.length"
          class="flex items-center gap-2 mt-2 ml-6 overflow-x-auto no-scrollbar"
        >
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">via</span>
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
            <span class="text-sm font-medium">Wellness</span>
          </div>
          <UBadge
            :color="integrationStore.dataSyncStatus.wellness ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ integrationStore.dataSyncStatus.wellnessCount || 0 }} days
          </UBadge>
        </div>
        <div
          v-if="integrationStore.dataSyncStatus.wellnessProviders?.length"
          class="flex items-center gap-2 mt-2 ml-6 overflow-x-auto no-scrollbar"
        >
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">via</span>
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
            <span class="text-sm font-medium">Authorized Apps</span>
          </div>
          <UBadge color="success" variant="subtle" size="sm">
            {{ integrationStore.oauthAppCount }} active
          </UBadge>
        </div>
        <div class="flex items-center gap-2 mt-2 ml-6 overflow-x-auto no-scrollbar">
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">via</span>
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
        Last synced {{ formatRelativeTime(integrationStore.lastSyncTime) }}
      </div>
    </div>

    <template #footer>
      <UButton to="/settings" block variant="outline" size="sm"> Manage Connections </UButton>
    </template>
  </UCard>
</template>

<script setup lang="ts">
  const integrationStore = useIntegrationStore()
  const { formatRelativeTime } = useFormat()
  const { trackManualSyncAll } = useAnalytics()

  const handleSyncAll = async () => {
    trackManualSyncAll()
    await integrationStore.syncAllData()
  }
</script>
