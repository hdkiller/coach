<script setup lang="ts">
  import { useClipboard } from '@vueuse/core'
  import { useTranslate } from '@tolgee/vue'
  import IssueFormModal from '~/components/issues/IssueFormModal.vue'

  const { t } = useTranslate('common')

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

  const userStore = useUserStore()
  const { copy } = useClipboard()
  const toast = useToast()

  const showReportModal = ref(false)

  const copyUserId = () => {
    if (!userStore.user?.id) return
    copy(userStore.user.id)
    toast.add({
      title: t.value('help_toast_id_copied_title'),
      description: t.value('help_toast_id_copied_desc'),
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  }

  const helpLinks = computed(() => [
    {
      title: t.value('help_resource_docs_title'),
      description: t.value('help_resource_docs_desc'),
      icon: 'i-heroicons-book-open',
      to: '/documentation',
      disabled: false
    },
    {
      title: t.value('help_resource_discord_title'),
      description: t.value('help_resource_discord_desc'),
      icon: 'i-simple-icons-discord',
      to: 'https://discord.gg/dPYkzg49T9',
      external: true
    },
    {
      title: t.value('help_resource_github_title'),
      description: t.value('help_resource_github_desc'),
      icon: 'i-simple-icons-github',
      to: 'https://github.com/newpush/coach/issues',
      external: true
    }
  ])
</script>

<template>
  <UDashboardPanel id="help-center">
    <template #header>
      <UDashboardNavbar :title="t('help_header')">
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
            {{ t('help_header') }}
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            {{ t('help_description') }}
          </p>
        </div>

        <!-- Primary Actions -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <h3 class="text-lg font-bold">{{ t('help_action_report_bug') }}</h3>
                <p class="text-sm text-gray-500">{{ t('help_action_report_bug_desc') }}</p>
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
                <h3 class="text-lg font-bold">{{ t('help_action_my_issues') }}</h3>
                <p class="text-sm text-gray-500">{{ t('help_action_my_issues_desc') }}</p>
              </div>
            </div>
          </UCard>

          <UCard
            class="hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group"
            @click="
              navigateTo(
                '/chat?initialMessage=' +
                  encodeURIComponent(
                    'Help me create a support ticket. I will describe the bug and you can draft it first.'
                  )
              )
            "
          >
            <div class="flex items-center gap-4">
              <div
                class="p-3 bg-primary-50 dark:bg-primary-950/20 rounded-xl group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors"
              >
                <UIcon name="i-heroicons-sparkles" class="size-8 text-primary-500" />
              </div>
              <div>
                <h3 class="text-lg font-bold">{{ t('help_action_ai_ticket') }}</h3>
                <p class="text-sm text-gray-500">
                  {{ t('help_action_ai_ticket_desc') }}
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UCard
            class="md:col-span-2 border-primary-200 dark:border-primary-800/60 bg-primary-50/60 dark:bg-primary-950/20"
          >
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-light-bulb" class="size-5 text-primary-500" />
                <h2
                  class="text-sm font-black uppercase tracking-widest text-primary-700 dark:text-primary-300"
                >
                  {{ t('help_ai_assistant_title') }}
                </h2>
              </div>
              <p class="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {{ t('help_ai_assistant_desc') }}
              </p>
              <div class="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <p><strong>Try:</strong> {{ t('help_ai_assistant_try_1') }}</p>
                <p><strong>Try:</strong> {{ t('help_ai_assistant_try_2') }}</p>
                <p><strong>Tip:</strong> {{ t('help_ai_assistant_tip') }}</p>
              </div>
              <div class="flex flex-wrap gap-2 pt-1">
                <UButton
                  color="primary"
                  icon="i-heroicons-chat-bubble-left-right"
                  @click="navigateTo('/chat')"
                >
                  {{ t('help_ai_assistant_button_chat') }}
                </UButton>
                <UButton to="/issues" color="neutral" variant="outline" icon="i-heroicons-ticket">
                  {{ t('help_ai_assistant_button_tickets') }}
                </UButton>
              </div>
            </div>
          </UCard>

          <UCard
            class="md:col-span-1 hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group"
            @click="
              navigateTo(
                '/chat?initialMessage=' +
                  encodeURIComponent(
                    'Show me ticket commands. Explain how to create or update support tickets in plain, non-technical language for regular users.'
                  )
              )
            "
          >
            <div class="space-y-3 h-full flex flex-col justify-between">
              <div class="space-y-2">
                <UIcon
                  name="i-heroicons-command-line"
                  class="size-6 text-primary-500 group-hover:scale-105 transition-transform"
                />
                <h3
                  class="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white"
                >
                  {{ t('help_ticket_commands_title') }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {{ t('help_ticket_commands_desc') }}
                </p>
              </div>
              <UButton
                color="primary"
                variant="outline"
                icon="i-heroicons-arrow-right"
                class="self-start"
              >
                {{ t('help_ticket_commands_button') }}
              </UButton>
            </div>
          </UCard>
        </div>

        <!-- Secondary Resources -->
        <div class="space-y-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-gray-400">
            {{ t('help_resources_header') }}
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <template v-for="link in helpLinks" :key="link.title">
              <UCard
                v-if="!link.disabled"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                @click="navigateTo(link.to, { external: link.external })"
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

        <!-- Account Diagnostics -->
        <div class="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <h2 class="text-xs font-black uppercase tracking-widest text-gray-400">
            {{ t('help_diagnostics_header') }}
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UCard
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
              @click="copyUserId"
            >
              <div class="space-y-2">
                <UIcon
                  name="i-heroicons-identification"
                  class="size-5 text-primary-500 group-hover:scale-110 transition-transform"
                />
                <h4 class="font-bold text-sm group-hover:text-primary-500 transition-colors">
                  {{ t('help_diagnostics_id_title') }}
                </h4>
                <div
                  class="text-[10px] font-mono text-gray-600 dark:text-gray-400 break-all bg-gray-100/50 dark:bg-gray-900/40 p-2 rounded border border-gray-200 dark:border-gray-800"
                >
                  {{ userStore.user?.id || 'Loading...' }}
                </div>
                <p class="text-[10px] text-gray-400 italic">
                  {{ t('help_diagnostics_id_hint') }}
                </p>
              </div>
            </UCard>
          </div>
        </div>
      </div>

      <IssueFormModal v-model:open="showReportModal" />
    </template>
  </UDashboardPanel>
</template>
