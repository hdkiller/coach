<template>
  <UCard :ui="{ body: 'space-y-6' }">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-primary" />
        <div>
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            {{ t('coach_section_personality') }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('coach_section_personality_desc') }}
          </p>
        </div>
      </div>
    </template>

    <UFormField :label="t('coach_form_name')" name="coachName" :help="t('coach_help_name')">
      <UInput v-model="localSettings.coachName" placeholder="e.g. Coach Watts" class="w-full" />
    </UFormField>

    <UFormField :label="t('coach_form_tone')" name="coachTone" :help="t('coach_help_tone')">
      <USelectMenu
        v-model="localSettings.coachTone"
        :items="toneOptions"
        value-key="value"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('coach_form_voice')" name="voicePersona" :help="t('coach_help_voice')">
      <div class="flex items-center gap-3">
        <UBadge color="neutral" variant="soft" class="font-mono">
          {{ localSettings.voicePersona || 'Default' }}
        </UBadge>
        <UButton
          size="xs"
          variant="soft"
          color="primary"
          icon="i-heroicons-speaker-wave"
          @click="showVoiceModal = true"
        >
          {{ t('coach_voice_button') }}
        </UButton>
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

    <SettingsAiVoiceSettingsModal
      v-model:open="showVoiceModal"
      v-model:voice-persona="localSettings.voicePersona"
    />
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
  const showVoiceModal = ref(false)

  const toneOptions = computed(() => [
    { label: t.value('coach_tone_supportive'), value: 'SUPPORTIVE' },
    { label: t.value('coach_tone_tough'), value: 'TOUGH' },
    { label: t.value('coach_tone_analytical'), value: 'ANALYTICAL' },
    { label: t.value('coach_tone_minimal'), value: 'MINIMAL' }
  ])

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
