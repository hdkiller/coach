<template>
  <div class="space-y-6">
    <UCard :ui="{ body: 'hidden' }">
      <template #header>
        <h2 class="text-xl font-bold uppercase tracking-tight text-red-600">Danger Zone</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Manage sensitive account settings and data deletion.
        </p>
      </template>
    </UCard>
    <SettingsDangerZone />
  </div>
</template>

<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Danger Zone',
    meta: [{ name: 'description', content: 'Manage sensitive account settings and data deletion.' }]
  })
</script>
