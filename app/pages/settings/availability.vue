<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Training Schedule',
    meta: [
      {
        name: 'description',
        content: 'Manage your weekly training availability and preferences.'
      }
    ]
  })

  const toast = useToast()
  const { data: availability, refresh } = await useFetch('/api/availability')

  const saving = ref(false)

  async function onSave(updatedAvailability: any[]) {
    saving.value = true
    try {
      await $fetch('/api/availability', {
        method: 'POST',
        body: { availability: updatedAvailability }
      })
      toast.add({
        title: 'Schedule Saved',
        description: 'Your training availability has been updated',
        color: 'success'
      })
      await refresh()
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to save availability',
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold">Training Schedule</h2>
      <p class="text-neutral-500">
        Define your weekly rhythm to help the AI Coach plan your workouts effectively.
      </p>
    </div>

    <SettingsAvailabilitySettings
      v-if="availability"
      :initial-availability="availability"
      :loading="saving"
      @save="onSave"
    />
    <div v-else class="space-y-4">
      <div
        v-for="i in 7"
        :key="i"
        class="h-48 w-full bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-800 animate-pulse"
      />
    </div>
  </div>
</template>
