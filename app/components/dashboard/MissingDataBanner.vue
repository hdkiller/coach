<template>
  <div
    v-if="isVisible && missingFields.length > 0"
    class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-none sm:rounded-lg p-4 mb-6"
  >
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 shrink-0">
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="w-5 h-5 text-amber-600 dark:text-amber-400"
          />
        </div>
        <div>
          <h3 class="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-tight">
            {{ t('profile_banner_title') }}
          </h3>
          <p class="mt-1 text-sm text-amber-700 dark:text-amber-300 font-medium">
            {{ t('profile_banner_missing_prefix') }}
            <span class="font-bold underline decoration-amber-500/30">{{ missingFieldsList }}</span
            >{{ t('profile_banner_missing_suffix') }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
        <UButton
          to="/profile/settings"
          color="warning"
          variant="solid"
          size="sm"
          class="font-bold"
          icon="i-heroicons-user-circle"
        >
          {{ t('profile_banner_button') }}
        </UButton>
        <UButton
          color="warning"
          variant="ghost"
          size="sm"
          icon="i-heroicons-x-mark"
          @click="dismiss"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('dashboard')
  const { t: tp } = useTranslate('profile')

  const props = defineProps<{
    missingFields: string[]
  }>()

  const isVisible = ref(true)
  const storageKey = 'profile-banner-dismissed'

  onMounted(() => {
    const dismissed = localStorage.getItem(storageKey)
    if (dismissed) {
      isVisible.value = false
    }
  })

  const fieldTranslationMap: Record<string, string> = {
    sex: 'basic_form_sex',
    dob: 'basic_form_dob',
    weight: 'basic_body_metrics_weight',
    height: 'basic_body_metrics_height',
    restingHr: 'basic_personal_info_resting_hr', // Added to profile.json below if missing
    maxHr: 'basic_personal_info_max_hr',
    lthr: 'basic_personal_info_lthr'
  }

  const missingFieldsList = computed(() => {
    if (props.missingFields.length === 0) return ''

    const translatedFields = props.missingFields.map((field) => {
      const key = fieldTranslationMap[field]
      return key ? tp.value(key) : field
    })

    if (translatedFields.length === 1) return translatedFields[0]

    // Simple join for now, could use a localized join helper if needed
    const last = translatedFields[translatedFields.length - 1]
    const others = translatedFields.slice(0, -1).join(', ')
    return `${others} & ${last}`
  })

  function dismiss() {
    isVisible.value = false
    localStorage.setItem(storageKey, 'true')
  }
</script>
