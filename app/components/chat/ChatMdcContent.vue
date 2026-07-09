<script setup lang="ts">
  import { ref } from 'vue'

  defineProps<{
    value: string
  }>()

  const renderError = ref(false)

  onErrorCaptured((error) => {
    console.warn('[ChatMdcContent] MDC render failed, falling back to plain text:', error)
    renderError.value = true
    return false
  })
</script>

<template>
  <pre
    v-if="renderError"
    class="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-inherit"
    >{{ value }}</pre>
  <MDC v-else :value="value" />
</template>
