<template>
  <UModal
    v-model:open="isOpen"
    :title="t('training_recommendation_adhoc_modal_title')"
    :description="t('training_recommendation_adhoc_modal_description')"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-5">
        <UFormField
          :label="t('training_recommendation_adhoc_modal_type_label')"
          name="type"
          :help="t('training_recommendation_adhoc_modal_type_help')"
        >
          <USelect
            v-model="form.type"
            :items="activityOptions"
            class="w-full"
            icon="i-heroicons-bolt"
          />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <UFormField
            :label="t('training_recommendation_adhoc_modal_duration_label')"
            name="duration"
            :help="t('training_recommendation_adhoc_modal_duration_help')"
          >
            <UInput
              v-model.number="form.durationMinutes"
              type="number"
              step="15"
              class="w-full"
              icon="i-heroicons-clock"
              trailing-icon="i-heroicons-chevron-up-down"
            >
              <template #trailing>
                <span class="text-xs text-gray-500 pr-2">min</span>
              </template>
            </UInput>
          </UFormField>

          <UFormField
            :label="t('training_recommendation_adhoc_modal_intensity_label')"
            name="intensity"
            :help="t('training_recommendation_adhoc_modal_intensity_help')"
          >
            <USelect
              v-model="form.intensity"
              :items="intensityOptions"
              class="w-full"
              icon="i-heroicons-fire"
            />
          </UFormField>
        </div>

        <UFormField
          :label="t('training_recommendation_adhoc_modal_notes_label')"
          name="notes"
          :help="t('training_recommendation_adhoc_modal_notes_help')"
        >
          <UTextarea
            v-model="form.notes"
            :placeholder="t('training_recommendation_adhoc_modal_notes_placeholder')"
            :rows="3"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">{{
          t('banner_exit')
        }}</UButton>
        <UButton
          color="primary"
          variant="solid"
          class="font-bold px-6"
          :loading="loading"
          icon="i-heroicons-sparkles"
          @click="submit"
        >
          {{ t('training_recommendation_adhoc_modal_generate_button') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('dashboard')

  const props = defineProps<{
    open: boolean
    loading?: boolean
  }>()

  const emit = defineEmits(['update:open', 'submit'])
  const { trackAdhocWorkoutCreate } = useAnalytics()

  const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
  })

  const form = reactive({
    type: 'Ride',
    durationMinutes: 60,
    intensity: 'Endurance',
    notes: ''
  })

  const activityOptions = computed(() => [
    { label: t.value('navigation_cycling'), value: 'Ride' },
    { label: t.value('navigation_running'), value: 'Run' },
    { label: t.value('navigation_swimming'), value: 'Swim' },
    { label: t.value('navigation_strength'), value: 'WeightTraining' }
  ])

  const intensityOptions = ['Recovery', 'Endurance', 'Tempo', 'Threshold', 'VO2Max', 'Anaerobic']

  function submit() {
    trackAdhocWorkoutCreate(form.type)
    emit('submit', { ...form })
  }
</script>
