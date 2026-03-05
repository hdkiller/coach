<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-primary" />
        <h2 class="text-xl font-semibold">{{ t('identity_header') }}</h2>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Nickname -->
      <div>
        <label class="block text-sm font-medium mb-2">{{ t('identity_nickname_label') }}</label>
        <p class="text-sm text-muted mb-3">{{ t('identity_nickname_desc') }}</p>
        <UInput
          v-model="localSettings.nickname"
          :placeholder="t('identity_nickname_placeholder')"
          @update:model-value="handleChange"
        />
      </div>

      <!-- AI Context / About Me -->
      <div>
        <label class="block text-sm font-medium mb-2">{{ t('identity_context_label') }}</label>
        <p class="text-sm text-muted mb-3">{{ t('identity_context_desc') }}</p>
        <UTextarea
          v-model="localSettings.aiContext"
          :rows="8"
          class="w-full"
          :placeholder="t('identity_context_placeholder')"
          @update:model-value="handleChange"
        />
      </div>

      <!-- Save Button -->
      <div class="flex justify-end">
        <UButton :loading="saving" @click="saveSettings"> {{ t('settings_save_changes') }} </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('settings')

  const props = defineProps<{
    settings: {
      nickname?: string | null
      aiContext?: string | null
    }
  }>()

  const emit = defineEmits<{
    save: [settings: any]
  }>()

  const localSettings = ref({ ...props.settings })
  const saving = ref(false)

  function handleChange() {
    // Auto-save logic if needed
  }

  async function saveSettings() {
    saving.value = true
    try {
      emit('save', { ...localSettings.value })
    } finally {
      saving.value = false
    }
  }

  watch(
    () => props.settings,
    (newSettings) => {
      localSettings.value = { ...localSettings.value, ...newSettings }
    },
    { deep: true }
  )
</script>
