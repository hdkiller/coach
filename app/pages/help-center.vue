<script setup lang="ts">
  import IssueFormModal from '~/components/issues/IssueFormModal.vue'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Help Center',
    meta: [
      {
        name: 'description',
        content: 'Get support, report bugs, and track your active issues.'
      }
    ]
  })

  const showReportModal = ref(false)

  const helpLinks = [
    {
      title: 'Documentation',
      description: 'Coming soon.',
      icon: 'i-heroicons-book-open',
      to: '#',
      disabled: true
    },
    {
      title: 'Community Discord',
      description: 'Join other athletes and developers in our discord.',
      icon: 'i-simple-icons-discord',
      to: 'https://discord.gg/dPYkzg49T9',
      external: true
    },
    {
      title: 'GitHub Issues',
      description: 'View public feature requests and system-wide bugs.',
      icon: 'i-simple-icons-github',
      to: 'https://github.com/newpush/coach/issues',
      external: true
    }
  ]
</script>

<template>
  <UDashboardPanel id="help-center">
    <template #header>
      <UDashboardNavbar title="Help Center">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <ClientOnly>
            <DashboardTriggerMonitorButton />
            <NotificationDropdown />
          </ClientOnly>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-8 max-w-5xl mx-auto pb-24">
        <!-- Branding Header -->
        <div>
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Help Center
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Support Resources & Issue Tracking
          </p>
        </div>

        <!-- Primary Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UCard
            class="hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group"
            @click="showReportModal = true"
          >
            <div class="flex items-center gap-4">
              <div
                class="p-3 bg-primary-50 dark:bg-primary-950/20 rounded-xl group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors"
              >
                <UIcon name="i-heroicons-bug-ant" class="size-8 text-primary-500" />
              </div>
              <div>
                <h3 class="text-lg font-bold">Report a Bug</h3>
                <p class="text-sm text-gray-500">Encountered an issue? Tell us about it.</p>
              </div>
            </div>
          </UCard>

          <UCard
            class="hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group"
            @click="navigateTo('/issues')"
          >
            <div class="flex items-center gap-4">
              <div
                class="p-3 bg-primary-50 dark:bg-primary-950/20 rounded-xl group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors"
              >
                <UIcon name="i-heroicons-ticket" class="size-8 text-primary-500" />
              </div>
              <div>
                <h3 class="text-lg font-bold">My Issues</h3>
                <p class="text-sm text-gray-500">Track progress on your reported issues.</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Secondary Resources -->
        <div class="space-y-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-gray-400">
            Additional Resources
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <template v-for="link in helpLinks" :key="link.title">
              <UCard
                v-if="!link.disabled"
                :to="link.to"
                :target="link.external ? '_blank' : undefined"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
              >
                <div class="space-y-2">
                  <UIcon :name="link.icon" class="size-5 text-primary-500" />
                  <h4 class="font-bold text-sm group-hover:text-primary-500 transition-colors">
                    {{ link.title }}
                  </h4>
                  <p class="text-xs text-gray-500 leading-relaxed">{{ link.description }}</p>
                </div>
              </UCard>
              <UCard v-else class="opacity-60 cursor-not-allowed">
                <div class="space-y-2">
                  <UIcon :name="link.icon" class="size-5 text-gray-400" />
                  <h4 class="font-bold text-sm">{{ link.title }}</h4>
                  <p class="text-xs text-gray-500 leading-relaxed">{{ link.description }}</p>
                </div>
              </UCard>
            </template>
          </div>
        </div>
      </div>

      <IssueFormModal v-model:open="showReportModal" />
    </template>
  </UDashboardPanel>
</template>
