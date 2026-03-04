<template>
  <UCard :ui="{ body: 'space-y-6' }">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-primary" />
        <div>
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            {{ t('automation_header') }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('automation_desc') }}
          </p>
        </div>
      </div>
    </template>

    <UFormField :label="t('automation_form_auto_analysis')" name="autoAnalyzeActivities">
      <div class="flex items-center justify-between gap-4">
        <p class="text-xs text-gray-500 leading-tight">
          {{ t('automation_desc_auto_analysis') }}
        </p>
        <USwitch v-model="localSettings.autoAnalyzeActivities" />
      </div>
    </UFormField>

    <UFormField :label="t('automation_form_daily_brief')" name="enableDailyBriefings">
      <div class="flex items-center justify-between gap-4">
        <p class="text-xs text-gray-500 leading-tight">
          {{ t('automation_desc_daily_brief') }}
        </p>
        <USwitch v-model="localSettings.enableDailyBriefings" />
      </div>
    </UFormField>

    <UFormField :label="t('automation_form_weekly_reports')" name="enableWeeklyReports">
      <div class="flex items-center justify-between gap-4">
        <p class="text-xs text-gray-500 leading-tight">
          {{ t('automation_desc_weekly_reports') }}
        </p>
        <USwitch v-model="localSettings.enableWeeklyReports" />
      </div>
    </UFormField>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          :label="t('basic_save_button')"
          color="primary"
          :loading="saving"
          @click="handleSave"
        />
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('settings')

  const props = defineProps<{
    settings: any
    forceUnlocked?: boolean
  }>()

  const emit = defineEmits(['save'])

  const localSettings = ref({ ...props.settings })
  const saving = ref(false)

  watch(
    () => props.settings,
    (newVal) => {
      localSettings.value = { ...newVal }
    },
    { deep: true }
  )

  const handleSave = async () => {
    saving.value = true
    emit('save', localSettings.value)
    setTimeout(() => {
      saving.value = false
    }, 500)
  }
</script>
