<template>
  <UModal
    v-model:open="isOpen"
    title="Refine or Refresh"
    description="Provide feedback to adjust the plan, or leave empty to simply refresh with latest data."
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          label="Your Feedback (Optional)"
          name="feedback"
          help="The coach will re-evaluate your data. Add context to guide the new plan."
        >
          <UTextarea
            v-model="feedback"
            placeholder="e.g. 'I'm feeling extra tired today', 'I want to do a harder session'. Leave empty for a quick refresh."
            :rows="5"
            autofocus
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
        <UButton
          color="primary"
          variant="solid"
          class="font-bold px-6"
          :loading="loading"
          icon="i-heroicons-arrow-path"
          @click="submit"
        >
          {{ feedback.trim() ? 'Refine Plan' : 'Refresh Data' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
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
