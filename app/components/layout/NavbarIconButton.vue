<script setup lang="ts">
  defineOptions({ inheritAttrs: false })

  withDefaults(
    defineProps<{
      icon: string
      label: string
      color?: 'primary' | 'neutral' | 'error' | 'success' | 'warning' | 'info'
      variant?: 'solid' | 'outline' | 'soft' | 'ghost' | 'link' | 'subtle'
      loading?: boolean
      disabled?: boolean
      to?: string
    }>(),
    {
      color: 'neutral',
      variant: 'outline',
      loading: false,
      disabled: false
    }
  )
</script>

<template>
  <UButton
    v-bind="$attrs"
    :icon="icon"
    :aria-label="label"
    :color="color"
    :variant="variant"
    :loading="loading"
    :disabled="disabled"
    :to="to"
    square
    size="md"
    class="navbar-icon-action"
  />
</template>
