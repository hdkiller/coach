<script setup lang="ts">
  defineProps<{
    modelValue: string
    status: any
    error?: any
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
        placeholder="Ask Coach Watts..."
        @update:model-value="emit('update:modelValue', $event)"
        @submit="emit('submit', $event)"
      >
        <UChatPromptSubmit :status="status" />
      </UChatPrompt>
    </UContainer>
  </div>
</template>
