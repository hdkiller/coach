<script setup lang="ts">
  import type { NavigationMenuItem } from '@nuxt/ui'

  const config = useRuntimeConfig()
  const { data, signOut, refresh } = useAuth()
  const user = computed(() => data.value?.user)
  const toast = useToast()
  const stoppingImpersonation = ref(false)

  // Background Task Monitor State
  const { isOpen: showTriggerMonitor } = useTriggerMonitor()

  const userStore = useUserStore()
  const { formatDate, getUserLocalDate } = useFormat()
  const nutritionEnabled = computed(
    () =>
      userStore.profile?.nutritionTrackingEnabled !== false &&
      userStore.user?.nutritionTrackingEnabled !== false
  )

  // Ensure user data (including subscription) is loaded
  await callOnce(async () => {
    if (data.value?.user) {
      await Promise.all([userStore.fetchUser(), userStore.fetchProfile()])
    }
  })

  onMounted(() => {
    if (!userStore.user) {
      userStore.fetchUser()
    }
    if (!userStore.profile) {
      userStore.fetchProfile()
    }
  })

  const impersonationMeta = useCookie<{
    adminId: string
    adminEmail: string
    impersonatedUserId: string
    impersonatedUserEmail: string
  }>('auth.impersonation_meta')

  const impersonatedEmail = computed(() => impersonationMeta.value?.impersonatedUserEmail)

  async function stopImpersonation() {
    stoppingImpersonation.value = true
    try {
      await $fetch('/api/admin/stop-impersonation', { method: 'POST' })
      toast.add({
        title: 'Impersonation stopped',
        description: 'Returning to admin account',
        color: 'success'
      })
      // Refresh session and redirect
      await refresh()
      await navigateTo('/admin/users')
    } catch (error) {
      console.error('Failed to stop impersonation:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to stop impersonation',
        color: 'error'
      })
    } finally {
      stoppingImpersonation.value = false
    }
  }

  const route = useRoute()

  const open = ref(false)

  const links = computed<NavigationMenuItem[][]>(() => {
    const primaryLinks: any[] = [
      {
        label: 'Dashboard',
        icon: 'i-lucide-layout-dashboard',
        to: '/dashboard',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Activities',
        icon: 'i-lucide-calendar-days',
        to: '/activities',
        onSelect: () => {
          open.value = false
        }
      },
      ...(nutritionEnabled.value
        ? [
            {
              label: 'Nutrition',
              icon: 'i-lucide-utensils',
              to: '/nutrition',
              onSelect: () => {
                open.value = false
              }
            }
          ]
        : []),
      {
        label: 'Performance',
        icon: 'i-lucide-trending-up',
        to: '/performance',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Recommendations',
        icon: 'i-lucide-sparkles',
        to: '/recommendations',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Training Plan',
        icon: 'i-lucide-calendar',
        to: '/plan',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Workouts',
        icon: 'i-lucide-activity',
        to: '/workouts',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Fitness',
        icon: 'i-lucide-heart-pulse',
        to: '/fitness',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Goals',
        icon: 'i-lucide-trophy',
        to: '/profile/goals',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Events',
        icon: 'i-lucide-flag',
        to: '/events',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Reports',
        icon: 'i-lucide-file-text',
        to: '/reports',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Coaching',
        icon: 'i-lucide-users',
        to: '/coaching',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'AI Chat',
        icon: 'i-lucide-message-circle',
        to: '/chat',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Help Center',
        icon: 'i-heroicons-question-mark-circle',
        to: '/help-center',
        onSelect: () => {
          open.value = false
        }
      }
    ]

    if ((user.value as any)?.isAdmin) {
      primaryLinks.push({
        label: 'Admin',
        icon: 'i-lucide-shield-check',
        to: '/admin',
        onSelect: () => {
          open.value = false
        }
      })
    }

    primaryLinks.push({
      label: 'Settings',
      icon: 'i-lucide-settings',
      defaultOpen: route.path.includes('settings'),
      children: [
        {
          label: 'Profile',
          icon: 'i-lucide-user',
          to: '/profile/settings',
          onSelect: () => {
            open.value = false
          }
        },
        {
          label: 'AI Coach',
          icon: 'i-lucide-sparkles',
          to: '/settings/ai',
          onSelect: () => {
            open.value = false
          }
        },
        ...(config.public.stripePublishableKey
          ? [
              {
                label: 'Billing',
                icon: 'i-lucide-credit-card',
                to: '/settings/billing',
                onSelect: () => {
                  open.value = false
                }
              }
            ]
          : []),
        {
          label: 'Apps',
          icon: 'i-lucide-layout-grid',
          to: '/settings/apps',
          onSelect: () => {
            open.value = false
          }
        },
        {
          label: 'Developer',
          icon: 'i-lucide-code-2',
          to: '/settings/developer',
          onSelect: () => {
            open.value = false
          }
        },
        {
          label: 'Danger Zone',
          icon: 'i-lucide-trash-2',
          to: '/settings/danger',
          onSelect: () => {
            open.value = false
          }
        }
      ]
    })

    return [primaryLinks]
  })

  const groups = computed(() => {
    const searchGroups: any[] = []

    // 1. Nutrition Group
    const { getUserLocalDate } = useFormat()
    const localToday = getUserLocalDate()
    const formatDateKey = (d: Date) => d.toISOString().split('T')[0]

    const todayStr = formatDateKey(localToday)
    const yesterdayStr = formatDateKey(new Date(localToday.getTime() - 86400000))
    const tomorrowStr = formatDateKey(new Date(localToday.getTime() + 86400000))

    if (nutritionEnabled.value) {
      searchGroups.push({
        id: 'nutrition',
        label: 'Nutrition',
        items: [
          {
            id: 'nutrition-today',
            label: 'Today',
            icon: 'i-lucide-utensils',
            to: `/nutrition/${todayStr}`,
            onSelect: () => (open.value = false)
          },
          {
            id: 'nutrition-tomorrow',
            label: 'Tomorrow',
            icon: 'i-lucide-utensils',
            to: `/nutrition/${tomorrowStr}`,
            onSelect: () => (open.value = false)
          },
          {
            id: 'nutrition-yesterday',
            label: 'Yesterday',
            icon: 'i-lucide-utensils',
            to: `/nutrition/${yesterdayStr}`,
            onSelect: () => (open.value = false)
          }
        ]
      })
    }

    // 2. Upcoming Workouts (Filter out rest days)
    if (upcomingWorkouts.value?.workouts?.length) {
      const activeWorkouts = upcomingWorkouts.value.workouts
        .filter((w: any) => {
          const title = w.title?.toLowerCase() || ''
          return w.type !== 'REST' && !title.includes('rest day')
        })
        .slice(0, 3)

      if (activeWorkouts.length > 0) {
        searchGroups.push({
          id: 'upcoming-workouts',
          label: 'Upcoming Workouts',
          items: activeWorkouts.map((w: any) => ({
            id: `planned-workout-${w.id}`,
            label: w.title,
            description: formatDate(w.date, 'PPPP'),
            icon: 'i-lucide-calendar-plus',
            to: `/workouts/planned/${w.id}`,
            onSelect: () => (open.value = false)
          }))
        })
      }
    }

    // 3. Recent Workouts
    if (recentWorkouts.value?.length) {
      searchGroups.push({
        id: 'recent-workouts',
        label: 'Recent Workouts',
        items: (recentWorkouts.value as any[]).map((w: any) => ({
          id: `recent-workout-${w.id}`,
          label: w.title,
          description: formatDate(w.date, 'PPPP'),
          icon: 'i-lucide-history',
          to: `/workouts/${w.id}`,
          onSelect: () => (open.value = false)
        }))
      })
    }

    // 4. Navigation Group
    searchGroups.push({
      id: 'links',
      label: 'Go to',
      items: links.value.flat()
    })

    // 5. Settings Group (Deep Links)
    const settingsItems = [
      {
        label: 'Profile: Basic Settings',
        icon: 'i-heroicons-user-circle',
        to: '/profile/settings?tab=basic',
        onSelect: () => (open.value = false)
      },
      {
        label: 'Profile: Sport Settings',
        icon: 'i-heroicons-trophy',
        to: '/profile/settings?tab=sports',
        onSelect: () => (open.value = false)
      },
      {
        label: 'Profile: Availability',
        icon: 'i-lucide-calendar-clock',
        to: '/profile/settings?tab=availability',
        onSelect: () => (open.value = false)
      },
      ...(nutritionEnabled.value
        ? [
            {
              label: 'Profile: Nutrition',
              icon: 'i-heroicons-fire',
              to: '/profile/settings?tab=nutrition',
              onSelect: () => (open.value = false)
            }
          ]
        : []),
      {
        label: 'Athlete Profile',
        icon: 'i-lucide-user-2',
        to: '/profile/athlete',
        onSelect: () => (open.value = false)
      },
      ...(nutritionEnabled.value
        ? [
            {
              label: 'Nutrition: History',
              icon: 'i-lucide-history',
              to: '/nutrition/history',
              onSelect: () => (open.value = false)
            }
          ]
        : []),
      {
        label: 'AI Coach Settings',
        icon: 'i-lucide-sparkles',
        to: '/settings/ai',
        onSelect: () => (open.value = false)
      },
      {
        label: 'Connected Apps (Strava, Garmin, Oura...)',
        icon: 'i-lucide-layout-grid',
        to: '/settings/apps',
        onSelect: () => (open.value = false)
      },
      {
        label: 'Developer Settings',
        icon: 'i-lucide-code-2',
        to: '/settings/developer',
        onSelect: () => (open.value = false)
      },
      {
        label: 'Release Notes',
        icon: 'i-lucide-clipboard-list',
        to: '/settings/release-notes',
        onSelect: () => (open.value = false)
      },
      {
        label: 'Changelog',
        icon: 'i-lucide-history',
        to: '/settings/changelog',
        onSelect: () => (open.value = false)
      },
      {
        label: 'Privacy Policy',
        icon: 'i-lucide-shield',
        to: '/privacy',
        onSelect: () => (open.value = false)
      }
    ]

    if (config.public.stripePublishableKey) {
      settingsItems.push({
        label: 'Billing',
        icon: 'i-lucide-credit-card',
        to: '/settings/billing',
        onSelect: () => (open.value = false)
      })
    }

    searchGroups.push({
      id: 'settings',
      label: 'Settings',
      items: settingsItems
    })

    // 6. Admin Group (Only for Admins)
    if ((user.value as any)?.isAdmin) {
      searchGroups.push({
        id: 'admin',
        label: 'Admin',
        items: [
          {
            label: 'Users Management',
            icon: 'i-lucide-users-2',
            to: '/admin/users',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Subscriptions',
            icon: 'i-lucide-wallet',
            to: '/admin/subscriptions',
            onSelect: () => (open.value = false)
          },
          {
            label: 'System Messages',
            icon: 'i-lucide-megaphone',
            to: '/admin/system-messages',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Tickets',
            icon: 'i-lucide-bug',
            to: '/admin/issues',
            onSelect: () => (open.value = false)
          }
        ]
      })

      searchGroups.push({
        id: 'admin-stats',
        label: 'Admin: Statistics',
        items: [
          {
            label: 'Overview Stats',
            icon: 'i-lucide-bar-chart-3',
            to: '/admin/stats',
            onSelect: () => (open.value = false)
          },
          {
            label: 'LLM Performance & Costs',
            icon: 'i-lucide-brain-circuit',
            to: '/admin/stats/llm',
            onSelect: () => (open.value = false)
          },
          {
            label: 'User Analytics',
            icon: 'i-lucide-trending-up',
            to: '/admin/stats/users',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Developer & API Stats',
            icon: 'i-lucide-code-2',
            to: '/admin/stats/developers',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Webhook Performance',
            icon: 'i-lucide-webhook',
            to: '/admin/stats/webhooks',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Workout & Sync Stats',
            icon: 'i-lucide-activity',
            to: '/admin/stats/workouts',
            onSelect: () => (open.value = false)
          }
        ]
      })

      searchGroups.push({
        id: 'admin-monitoring',
        label: 'Admin: Monitoring',
        items: [
          {
            label: 'AI Logs (Live)',
            icon: 'i-lucide-terminal',
            to: '/admin/ai/logs',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Audit & Security Logs',
            icon: 'i-lucide-scroll-text',
            to: '/admin/audit-logs',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Failed Requests',
            icon: 'i-lucide-alert-triangle',
            to: '/admin/ai/failed-requests',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Trigger.dev Queues',
            icon: 'i-lucide-layers',
            to: '/admin/queues',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Native Webhooks',
            icon: 'i-lucide-webhook',
            to: '/admin/webhooks',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Global LLM Settings',
            icon: 'i-lucide-settings-2',
            to: '/admin/llm/settings',
            onSelect: () => (open.value = false)
          }
        ]
      })

      searchGroups.push({
        id: 'admin-debug',
        label: 'Admin: Debug Tools',
        items: [
          {
            label: 'Trigger.dev Config',
            icon: 'i-lucide-zap',
            to: '/admin/debug/trigger',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Env Vars & Config',
            icon: 'i-lucide-file-code',
            to: '/admin/debug/env',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Database Explorer',
            icon: 'i-lucide-database',
            to: '/admin/debug/database',
            onSelect: () => (open.value = false)
          },
          {
            label: 'Network Ping Tool',
            icon: 'i-lucide-radio',
            to: '/admin/debug/ping',
            onSelect: () => (open.value = false)
          }
        ]
      })
    }

    return searchGroups
  })

  // Smart Item Data Fetching
  const { data: recentWorkouts } = await useFetch('/api/workouts', {
    query: { limit: 3 },
    key: 'recent-workouts-search'
  })

  const { data: upcomingWorkouts } = await useFetch('/api/workouts/planned/upcoming', {
    key: 'upcoming-workouts-search'
  })
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/dashboard"
          class="flex items-center w-full overflow-hidden shrink-0"
          :class="collapsed ? 'p-1 justify-center' : 'p-4 justify-start lg:justify-center'"
        >
          <img
            v-if="!collapsed"
            src="/media/coach_watts_text_cropped.webp"
            alt="Coach Watts"
            class="h-8 lg:h-10 w-auto object-contain"
          />
          <img v-else src="/media/logo.webp" alt="Coach Watts" class="size-12 object-contain" />
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default mb-4" />

        <UNavigationMenu :collapsed="collapsed" :items="links[0]" orientation="vertical" tooltip />
      </template>

      <template #footer="{ collapsed }">
        <div class="w-full">
          <div v-if="!collapsed" class="px-4 pb-2">
            <div class="flex items-center justify-center gap-4 mb-4">
              <NuxtLink
                to="https://www.strava.com"
                target="_blank"
                class="hover:opacity-100 transition-opacity"
              >
                <img
                  src="/images/logos/strava_powered_by_black.png"
                  alt="Powered by Strava"
                  class="h-6 w-auto opacity-75 hover:opacity-100 dark:hidden"
                />
                <img
                  src="/images/logos/strava_powered_by.png"
                  alt="Powered by Strava"
                  class="h-6 w-auto opacity-75 hover:opacity-100 hidden dark:block"
                />
              </NuxtLink>
              <NuxtLink
                to="https://www.garmin.com"
                target="_blank"
                class="hover:opacity-100 transition-opacity"
              >
                <img
                  src="/images/logos/WorksWithGarmin-Black.svg"
                  alt="Works with Garmin"
                  class="h-6 w-auto opacity-75 hover:opacity-100 dark:hidden"
                />
                <img
                  src="/images/logos/WorksWithGarmin-White.svg"
                  alt="Works with Garmin"
                  class="h-6 w-auto opacity-75 hover:opacity-100 hidden dark:block"
                />
              </NuxtLink>
            </div>
            <USeparator class="mb-4" />
            <div class="flex items-center justify-center gap-2">
              <UButton
                to="https://discord.gg/dPYkzg49T9"
                target="_blank"
                color="neutral"
                variant="ghost"
                icon="i-simple-icons-discord"
                size="xs"
                class="flex-1 justify-center"
              >
                Discord
              </UButton>
              <USeparator orientation="vertical" class="h-4" />
              <UButton
                to="https://github.com/newpush/coach"
                target="_blank"
                color="neutral"
                variant="ghost"
                icon="i-simple-icons-github"
                size="xs"
                class="flex-1 justify-center"
              >
                GitHub
              </UButton>
            </div>
            <USeparator class="my-2" />
          </div>

          <div class="p-4 flex items-center gap-3">
            <UAvatar v-if="user" :alt="user.email || ''" size="md" />
            <div v-if="!collapsed" class="flex-1 min-w-0 flex flex-col items-start gap-0.5">
              <UTooltip
                :text="impersonatedEmail || user?.email || ''"
                :popper="{ placement: 'right' }"
              >
                <p class="text-sm font-medium truncate text-gray-900 dark:text-white">
                  {{ user?.name || impersonatedEmail || user?.email }}
                </p>
              </UTooltip>
              <UButton
                v-if="impersonatedEmail"
                variant="link"
                color="warning"
                size="xs"
                :padded="false"
                class="p-0 h-auto font-normal text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
                :loading="stoppingImpersonation"
                @click="stopImpersonation"
              >
                Stop impersonating
              </UButton>
              <UButton
                v-else
                variant="link"
                color="neutral"
                size="xs"
                :padded="false"
                class="p-0 h-auto font-normal text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                @click="signOut({ callbackUrl: '/login' })"
              >
                Sign out
              </UButton>
            </div>
            <ColorModeButton />
          </div>
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <ClientOnly>
      <AiQuickCapture />
      <DashboardTriggerMonitor v-model="showTriggerMonitor" />
      <ImpersonationBanner />
      <CoachingBanner />
    </ClientOnly>
  </UDashboardGroup>
</template>
