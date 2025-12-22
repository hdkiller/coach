<template>
  <UAlert
    v-if="missingFields.length > 0"
    title="Incomplete Profile"
    :description="`Please provide your ${missingFields.join(' and ')} to unlock full functionality.`"
    icon="i-heroicons-exclamation-triangle"
    color="amber"
    variant="subtle"
    :actions="[{ label: 'Update Settings', to: '/profile/settings', color: 'amber', variant: 'solid', size: 'xs' }]"
    class="mb-6"
  />
</template>

<script setup lang="ts">
const props = defineProps<{
  missingFields: string[]
}>()
</script>
