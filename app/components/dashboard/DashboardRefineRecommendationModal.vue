<template>
  <UModal
    v-model:open="isOpen"
    :title="t('training_recommendation_refine_modal_title')"
    :description="t('training_recommendation_refine_modal_description')"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          :label="t('training_recommendation_refine_modal_feedback_label')"
          name="feedback"
          :help="t('training_recommendation_refine_modal_feedback_help')"
        >
          <UTextarea
            v-model="feedback"
            :placeholder="t('training_recommendation_refine_modal_feedback_placeholder')"
            :rows="5"
            autofocus
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
          icon="i-heroicons-arrow-path"
          @click="submit"
        >
          {{
            feedback.trim()
              ? t('training_recommendation_refine_modal_refine_button')
              : t('training_recommendation_refine_modal_refresh_button')
          }}
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

  const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
  })

  const feedback = ref('')

  function submit() {
    emit('submit', feedback.value)
  }
</script>
