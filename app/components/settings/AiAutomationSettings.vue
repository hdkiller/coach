<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-primary" />
        <h2 class="text-xl font-semibold">{{ t('automation_header') }}</h2>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Auto-Analyze Readiness (Supporter+) -->
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <USwitch
            v-model="localSettings.aiAutoAnalyzeReadiness"
            :label="t('automation_readiness_label')"
            :description="t('automation_readiness_desc')"
            :disabled="!canUseTier('SUPPORTER')"
            @update:model-value="handleChange"
          />
        </div>
        <div v-if="!canUseTier('SUPPORTER')" class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle" size="xs">{{ t('billing_tier_supporter') }}</UBadge>
          <UButton
            icon="i-heroicons-lock-closed"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="
              upgradeModal.show({
                featureTitle: t('automation_readiness_label'),
                featureDescription: t('automation_readiness_upgrade_desc'),
                recommendedTier: 'supporter'
              })
            "
          />
        </div>
      </div>

      <!-- Auto-Analyze Workouts (Supporter+) -->
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <USwitch
            v-model="localSettings.aiAutoAnalyzeWorkouts"
            :label="t('automation_workouts_label')"
            :description="t('automation_workouts_desc')"
            :disabled="!canUseTier('SUPPORTER')"
            @update:model-value="handleChange"
          />
        </div>
        <div v-if="!canUseTier('SUPPORTER')" class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle" size="xs">{{ t('billing_tier_supporter') }}</UBadge>
          <UButton
            icon="i-heroicons-lock-closed"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="
              upgradeModal.show({
                featureTitle: t('automation_workouts_label'),
                featureDescription: t('automation_workouts_upgrade_desc'),
                recommendedTier: 'supporter'
              })
            "
          />
        </div>
      </div>

      <!-- Auto-Analyze Nutrition (Supporter+) -->
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <USwitch
            v-model="localSettings.aiAutoAnalyzeNutrition"
            :label="t('automation_nutrition_label')"
            :description="t('automation_nutrition_desc')"
            :disabled="!canUseTier('SUPPORTER')"
            @update:model-value="handleChange"
          />
        </div>
        <div v-if="!canUseTier('SUPPORTER')" class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle" size="xs">{{ t('billing_tier_supporter') }}</UBadge>
          <UButton
            icon="i-heroicons-lock-closed"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="
              upgradeModal.show({
                featureTitle: t('automation_nutrition_label'),
                featureDescription: t('automation_nutrition_upgrade_desc'),
                recommendedTier: 'supporter'
              })
            "
          />
        </div>
      </div>

      <!-- Thoughtful Analysis (Pro+) -->
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <USwitch
            v-model="localSettings.aiDeepAnalysisEnabled"
            :label="t('automation_thoughtful_label')"
            :description="t('automation_thoughtful_desc')"
            :disabled="!canUseTier('PRO')"
            @update:model-value="handleChange"
          />
        </div>
        <div v-if="!canUseTier('PRO')" class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle" size="xs">{{ t('billing_tier_pro') }}</UBadge>
          <UButton
            icon="i-heroicons-lock-closed"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="
              upgradeModal.show({
                featureTitle: t('automation_thoughtful_label'),
                featureDescription: t('automation_thoughtful_upgrade_desc'),
                recommendedTier: 'pro'
              })
            "
          />
        </div>
      </div>

      <!-- Proactive Coaching (Pro+) -->
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <USwitch
            v-model="localSettings.aiProactivityEnabled"
            :label="t('automation_proactive_label')"
            :description="t('automation_proactive_desc')"
            :disabled="!canUseTier('PRO')"
            @update:model-value="handleChange"
          />
        </div>
        <div v-if="!canUseTier('PRO')" class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle" size="xs">{{ t('billing_tier_pro') }}</UBadge>
          <UButton
            icon="i-heroicons-lock-closed"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="
              upgradeModal.show({
                featureTitle: t('automation_proactive_label'),
                featureDescription: t('automation_proactive_upgrade_desc'),
                recommendedTier: 'pro'
              })
            "
          />
        </div>
      </div>

      <USeparator class="my-2" />

      <div class="space-y-1">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
          {{ t('automation_tools_header') }}
        </h3>
      </div>

      <USwitch
        v-model="localSettings.aiRequireToolApproval"
        :label="t('automation_tool_approval_label')"
        :description="t('automation_tool_approval_desc')"
        @update:model-value="handleChange"
      />

      <!-- Save Button -->
      <div class="flex justify-end pt-4">
        <UButton :loading="saving" @click="saveSettings"> {{ t('settings_save_changes') }} </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('settings')

  const props = defineProps<{
    forceUnlocked?: boolean
    settings: {
      aiAutoAnalyzeWorkouts: boolean
      aiAutoAnalyzeNutrition: boolean
      aiAutoAnalyzeReadiness: boolean
      aiProactivityEnabled: boolean
      aiConversationalEngagement: boolean
      aiDeepAnalysisEnabled: boolean
      aiRequireToolApproval: boolean
      [key: string]: any // Allow other props to pass through without type error if mixed
    }
  }>()

  const emit = defineEmits<{
    save: [settings: typeof props.settings]
  }>()

  const localSettings = ref({ ...props.settings })
  const saving = ref(false)
  const userStore = useUserStore()
  const upgradeModal = useUpgradeModal()

  function canUseTier(tier: 'SUPPORTER' | 'PRO') {
    if (props.forceUnlocked) return true
    return userStore.hasMinimumTier(tier)
  }

  function handleChange() {
    // Auto-save on change (optional)
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
      // Only update if changed to avoid overwriting local edits while typing?
      // For switches it's fine.
      localSettings.value = { ...localSettings.value, ...newSettings }
    },
    { deep: true }
  )
</script>
