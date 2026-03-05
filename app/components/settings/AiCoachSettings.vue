<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary" />
        <h2 class="text-xl font-semibold">{{ t('ai_coach_header') }}</h2>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Coach Personality -->
      <div>
        <label class="block text-sm font-medium mb-2">{{ t('coach_section_personality') }}</label>
        <p class="text-sm text-muted mb-3">
          {{ t('coach_section_personality_desc') }}
        </p>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <USelect
            v-model="localSettings.aiPersona"
            :items="personaOptions"
            size="lg"
            class="min-w-0 flex-1"
            @update:model-value="handleChange"
          />
          <UButton
            color="neutral"
            variant="soft"
            icon="i-heroicons-speaker-wave"
            :label="t('coach_voice_button')"
            @click="isVoiceSettingsOpen = true"
          />
        </div>
      </div>

      <!-- Analysis Levels Selection -->
      <div>
        <label class="block text-sm font-medium mb-2">{{ t('coach_analysis_levels') }}</label>
        <p class="text-sm text-muted mb-3">{{ t('coach_analysis_levels_desc') }}</p>
        <div class="space-y-3">
          <div
            v-for="model in modelOptions"
            :key="model.value"
            class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors relative"
            :class="{
              'border-primary bg-primary/5': localSettings.aiModelPreference === model.value,
              'opacity-60 grayscale-[0.5]': !isModelAvailable(model)
            }"
            @click="handleModelClick(model)"
          >
            <input
              type="radio"
              :checked="localSettings.aiModelPreference === model.value"
              :disabled="!isModelAvailable(model)"
              class="mt-1"
            />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <div class="font-medium">{{ model.label }}</div>
                <div v-if="shouldShowLock(model)" class="flex items-center gap-2">
                  <UBadge color="primary" variant="subtle" size="sm">{{ t('billing_tier_pro') }}</UBadge>
                  <UIcon name="i-heroicons-lock-closed" class="w-4 h-4 text-neutral-500" />
                </div>
              </div>
              <div class="text-sm text-muted mt-1">{{ model.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Communication Preferences -->
      <div>
        <label class="block text-sm font-medium mb-2">{{ t('coach_communication') }}</label>
        <p class="text-sm text-muted mb-3">{{ t('coach_communication_desc') }}</p>
        <div class="space-y-3">
          <USwitch
            v-model="localSettings.aiConversationalEngagement"
            :label="t('coach_conversational_label')"
            :description="t('coach_conversational_desc')"
            @update:model-value="handleChange"
          />
        </div>
      </div>

      <!-- Data & Privacy Settings -->
      <div>
        <label class="block text-sm font-medium mb-2">{{ t('coach_data_privacy') }}</label>
        <p class="text-sm text-muted mb-3">{{ t('coach_data_privacy_desc') }}</p>
        <div class="space-y-3">
          <USwitch
            v-model="localSettings.nutritionTrackingEnabled"
            :label="t('coach_nutrition_analysis_label')"
            :description="t('coach_nutrition_analysis_desc')"
            @update:model-value="handleChange"
          />
          <USwitch
            v-model="localSettings.updateWorkoutNotesEnabled"
            :label="t('coach_update_notes_label')"
            :description="t('coach_update_notes_desc')"
            @update:model-value="handleChange"
          />
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end">
        <UButton :loading="saving" @click="saveSettings"> {{ t('settings_save_changes') }} </UButton>
      </div>
    </div>
  </UCard>

  <SettingsAiVoiceSettingsModal
    v-model:open="isVoiceSettingsOpen"
    v-model:gemini-voice-name="localSettings.aiTtsVoiceName"
    v-model:voice-style="localSettings.aiTtsStyle"
    v-model:voice-speed="localSettings.aiTtsSpeed"
    v-model:auto-read-messages="localSettings.aiTtsAutoReadMessages"
  />
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('settings')

  const props = defineProps<{
    forceUnlocked?: boolean
    settings: {
      aiPersona: string
      aiModelPreference: string
      aiAutoAnalyzeWorkouts: boolean
      aiAutoAnalyzeNutrition: boolean
      aiAutoAnalyzeReadiness: boolean
      aiProactivityEnabled: boolean
      aiConversationalEngagement: boolean
      aiDeepAnalysisEnabled: boolean
      aiContext?: string | null
      nutritionTrackingEnabled: boolean
      updateWorkoutNotesEnabled: boolean
      nickname?: string | null
      aiTtsStyle: 'coach' | 'calm' | 'direct' | 'energetic'
      aiTtsVoiceName: string
      aiTtsSpeed: 'slow' | 'normal' | 'fast'
      aiTtsAutoReadMessages: boolean
    }
  }>()

  const emit = defineEmits<{
    save: [settings: typeof props.settings]
  }>()

  const localSettings = ref({ ...props.settings })
  const saving = ref(false)
  const isVoiceSettingsOpen = ref(false)
  const userStore = useUserStore()
  const upgradeModal = useUpgradeModal()

  const personaOptions = [
    { value: 'Analytical', label: t.value('coach_persona_analytical') },
    { value: 'Supportive', label: t.value('coach_persona_supportive') },
    { value: 'Drill Sergeant', label: t.value('coach_persona_drill') },
    { value: 'Motivational', label: t.value('coach_persona_motivational') }
  ]

  const modelOptions = [
    {
      value: 'flash',
      label: t.value('coach_model_quick_label'),
      description: t.value('coach_model_quick_desc'),
      minTier: 'FREE'
    },
    {
      value: 'pro',
      label: t.value('coach_model_thoughtful_label'),
      description: t.value('coach_model_thoughtful_desc'),
      minTier: 'PRO'
    },
    {
      value: 'experimental',
      label: t.value('coach_model_experimental_label'),
      description: t.value('coach_model_experimental_desc'),
      minTier: 'PRO'
    }
  ]

  const isContributor = computed(() => userStore.user?.subscriptionStatus === 'CONTRIBUTOR')

  function isModelAvailable(model: any) {
    if (props.forceUnlocked) return true
    if (model.minTier === 'FREE') return true
    if (isContributor.value) return true
    return userStore.hasMinimumTier(model.minTier as any)
  }

  function shouldShowLock(model: any) {
    return model.minTier === 'PRO' && !isModelAvailable(model)
  }

  function handleModelClick(model: any) {
    if (isModelAvailable(model)) {
      selectModel(model.value)
      return
    }

    upgradeModal.show({
      featureTitle: `${model.label} ${t.value('coach_upgrade_analysis_suffix')}`,
      featureDescription: t.value('coach_upgrade_analysis_desc'),
      recommendedTier: 'pro'
    })
  }

  function selectModel(value: string) {
    localSettings.value.aiModelPreference = value
    handleChange()
  }

  function handleChange() {
    // Auto-save on change (optional, can be removed if you want explicit save only)
    // For now, just mark as changed
  }

  async function saveSettings() {
    saving.value = true
    try {
      emit('save', { ...localSettings.value })
    } finally {
      saving.value = false
    }
  }

  // Watch for prop changes to update local state
  watch(
    () => props.settings,
    (newSettings) => {
      localSettings.value = { ...newSettings }
    },
    { deep: true }
  )
</script>
