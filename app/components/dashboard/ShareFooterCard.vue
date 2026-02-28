<template>
  <div class="px-4 sm:px-0">
    <div
      class="rounded-xl border border-gray-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/60"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <div
            class="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500"
          >
            <UIcon name="i-heroicons-heart" class="h-3.5 w-3.5" />
            Help Us Grow
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            If Coach Watts has been useful, share it with a friend or post it on your socials.
          </p>
        </div>

        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-heroicons-share"
          class="shrink-0 font-medium"
          @click="isOpen = true"
        >
          Share Coach Watts
        </UButton>
      </div>
    </div>

    <DashboardShareCoachWattsModal v-model:open="isOpen" />
  </div>
</template>

<script setup lang="ts">
  const isOpen = ref(false)
</script>
