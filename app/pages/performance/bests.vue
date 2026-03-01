<template>
  <UDashboardPanel id="performance-bests">
    <template #header>
      <UDashboardNavbar title="All-Time Personal Bests">
        <template #leading>
          <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" to="/performance">
            Back to Performance
          </UButton>
        </template>
        <template #right>
          <ClientOnly>
            <DashboardTriggerMonitorButton />
          </ClientOnly>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-4 sm:space-y-6 pb-24">
        <!-- Header Branding -->
        <div class="px-4 sm:px-0">
          <h1
            class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic"
          >
            Trophy Case
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.3em] mt-1"
          >
            Historic peak performances & milestones
          </p>
        </div>

        <div v-if="pending" class="flex justify-center py-24">
          <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-primary-500" />
        </div>

        <div v-else-if="data" class="space-y-12">
          <TrophyCase :personal-bests="data.personalBests || []" />
        </div>

        <div v-else class="text-center py-24">
          <p class="text-gray-500">Failed to load personal bests.</p>
          <UButton color="primary" variant="subtle" class="mt-4" @click="() => refresh()"
            >Retry</UButton
          >
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import TrophyCase from '~/components/profile/TrophyCase.vue'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Personal Bests | Coach Watts',
    meta: [
      {
        name: 'description',
        content: 'View your all-time records and peak performances detected by Coach Watts.'
      }
    ]
  })

  // Fetch athlete profile data which includes personalBests
  const { data, pending, refresh } = await useFetch<any>('/api/scores/athlete-profile', {
    key: 'athlete-profile-bests'
  })
</script>
