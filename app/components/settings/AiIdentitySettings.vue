<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-identification" class="w-5 h-5 text-primary" />
        <div>
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            {{ t('identity_header') }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('identity_desc') }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <UFormField :label="t('identity_form_bio')" name="athleteBio" :help="t('identity_help_bio')">
        <UTextarea
          v-model="localSettings.athleteBio"
          :rows="6"
          placeholder="e.g. I am a marathon runner training for a sub-3 hour finish. I struggle with hydration in heat..."
          class="w-full"
        />
      </UFormField>
    </div>

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
