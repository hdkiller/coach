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

const promptRef = ref<any>(null)

defineExpose({
  focus: () => {
    // Try multiple ways to focus since it's a complex Nuxt UI component
    if (promptRef.value?.textarea) {
      promptRef.value.textarea.focus()
    } else if (typeof promptRef.value?.focus === 'function') {
      promptRef.value.focus()
    }
  }
})
</script>

<template>
  <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
    <UContainer class="py-2 sm:py-4 px-2 sm:px-4">
      <UChatPrompt ref="promptRef" :model-value="modelValue" :error="error" :disabled="disabled"
        placeholder="Ask Coach Watts..." @update:model-value="emit('update:modelValue', $event)"
        @submit="emit('submit', $event)">
        <UChatPromptSubmit :status="status" :disabled="disabled" />
      </UChatPrompt>
    </UContainer>
  </div>
</template>
