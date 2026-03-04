<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-history" class="w-5 h-5 text-primary" />
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
          {{ t('usage_history_header') }}
        </h3>
      </div>
    </template>

    <UTable
      :rows="usage || []"
      :loading="loading"
      :columns="[
        { key: 'feature', label: t('usage_col_feature') },
        { key: 'model', label: t('usage_col_model') },
        { key: 'totalTokens', label: t('usage_col_tokens') },
        { key: 'createdAt', label: t('usage_col_date') }
      ]"
    >
      <template #empty-state>
        <div class="flex flex-col items-center justify-center py-6 gap-3">
          <span class="italic text-sm">{{ t('usage_history_empty') }}</span>
        </div>
      </template>

      <template #feature-data="{ row }">
        <span class="font-bold text-xs uppercase tracking-wider text-gray-500">{{
          row.feature
        }}</span>
      </template>

      <template #model-data="{ row }">
        <UBadge color="neutral" variant="subtle" size="xs">{{ row.model }}</UBadge>
      </template>

      <template #totalTokens-data="{ row }">
        <span class="font-mono text-xs">{{ row.totalTokens?.toLocaleString() }}</span>
      </template>

      <template #createdAt-data="{ row }">
        <span class="text-xs text-gray-500">{{ formatDate(row.createdAt) }}</span>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('settings')
  const { formatDate } = useFormat()
  const { data: usage, pending: loading } = await useFetch<any[]>('/api/settings/ai/usage')
</script>
