<template>
  <UCard class="mb-6 h-full flex flex-col justify-center items-center text-center py-8">
    <UIcon
      name="i-heroicons-clipboard-document-check"
      class="w-12 h-12 text-primary-500 mb-4 mx-auto"
    />
    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
      Ready for your weekly review?
    </h2>
    <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto text-sm">
      Track your progress, log your wellness metrics, and give your coach the context they need.
    </p>
    <UButton to="/check-in" color="primary" size="lg" icon="i-heroicons-arrow-right" trailing>
      Go to Check-In
    </UButton>
  </UCard>
</template>

<script setup lang="ts">
  // Simplified CTA for dashboard
</script>
