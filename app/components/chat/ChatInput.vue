<script setup lang="ts">
  defineProps<{
    modelValue: string
    status: any
    error?: any
    disabled?: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
    (e: 'submit', event?: Event): void
  }>()
</script>

<template>
  <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
    <UContainer class="py-2 sm:py-4 px-2 sm:px-4">
      <UChatPrompt
        :model-value="modelValue"
        :error="error"
        :disabled="disabled"
        placeholder="Ask Coach Watts..."
        @update:model-value="emit('update:modelValue', $event)"
        @submit="emit('submit', $event)"
      >
        <UChatPromptSubmit :status="status" :disabled="disabled" />
      </UChatPrompt>
    </UContainer>
  </div>
</template>
