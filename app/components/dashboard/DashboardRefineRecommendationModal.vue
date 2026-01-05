<template>
  <UModal 
    v-model:open="isOpen" 
    title="Refine Recommendation" 
    description="Provide feedback to the AI coach to regenerate the recommendation."
    :ui="{ width: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <UTextarea
          v-model="feedback"
          placeholder="e.g. 'I'm feeling extra tired today', 'I want to do a harder session', 'My knee hurts'"
          :rows="4"
          autofocus
          class="w-full"
        />
        <p class="text-xs text-muted">
          The coach will re-evaluate your data and this feedback to suggest a new plan.
        </p>
      </div>
    </template>
    
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
        <UButton color="primary" :loading="loading" @click="submit">Regenerate</UButton>
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
  if (!feedback.value.trim()) return
  emit('submit', feedback.value)
}
</script>
