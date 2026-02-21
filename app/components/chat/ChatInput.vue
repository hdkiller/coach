<script setup lang="ts">
  import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'

  const props = withDefaults(
    defineProps<{
      modelValue: string
      status: any
      error?: any
      disabled?: boolean
      mobileEnterBehavior?: 'newline' | 'send'
    }>(),
    {
      error: undefined,
      disabled: false,
      mobileEnterBehavior: 'newline'
    }
  )

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
    (e: 'submit', event?: Event): void
  }>()

  const promptRef = ref<any>(null)
  let attachedTextarea: HTMLTextAreaElement | null = null

  const isLikelyMobile = () => {
    if (!import.meta.client) return false
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    )
  }

  const resolveTextarea = (): HTMLTextAreaElement | null => {
    const direct = promptRef.value?.textarea
    if (direct instanceof HTMLTextAreaElement) return direct

    const root = promptRef.value?.$el as HTMLElement | undefined
    return root?.querySelector('textarea') || null
  }

  const handleTextareaKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.isComposing) return
    if (props.mobileEnterBehavior !== 'newline' || !isLikelyMobile()) return
    if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return

    event.preventDefault()
    event.stopPropagation()

    const target = event.target as HTMLTextAreaElement | null
    if (!target) return

    const value = props.modelValue || ''
    const start = target.selectionStart ?? value.length
    const end = target.selectionEnd ?? value.length
    const nextValue = `${value.slice(0, start)}\n${value.slice(end)}`

    emit('update:modelValue', nextValue)

    nextTick(() => {
      const textarea = resolveTextarea()
      if (!textarea) return
      const cursor = start + 1
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const attachTextareaListener = () => {
    const textarea = resolveTextarea()
    if (!textarea || textarea === attachedTextarea) return

    if (attachedTextarea) {
      attachedTextarea.removeEventListener('keydown', handleTextareaKeydown, true)
    }

    textarea.addEventListener('keydown', handleTextareaKeydown, true)
    attachedTextarea = textarea
  }

  onMounted(() => {
    nextTick(() => {
      attachTextareaListener()
    })
  })

  onUpdated(() => {
    attachTextareaListener()
  })

  onBeforeUnmount(() => {
    if (attachedTextarea) {
      attachedTextarea.removeEventListener('keydown', handleTextareaKeydown, true)
      attachedTextarea = null
    }
  })

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
      <UChatPrompt
        ref="promptRef"
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
