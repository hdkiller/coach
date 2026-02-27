<script setup lang="ts">
  import {
    Chart as ChartJS,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale
  } from 'chart.js'
  import { Bar } from 'vue-chartjs'

  ChartJS.register(Tooltip, Legend, BarElement, CategoryScale, LinearScale)

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const { data: stats, pending } = await useFetch('/api/admin/stats/developers')

  useHead({
    title: 'Developer Stats'
  })

  const stackedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  }

  const getAppColor = (appId: string) => {
    let hash = 0
    for (let i = 0; i < appId.length; i++) {
      hash = appId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase()
    return '#' + '00000'.substring(0, 6 - c.length) + c
  }

  const dailyAuthorizationsChartData = computed(() => {
    if (!stats.value?.dailyAuthorizations) return { labels: [], datasets: [] }

    const data = stats.value.dailyAuthorizations
    const dates = [...new Set(data.map((d: any) => d.date))].sort()
    const apps = [...new Set(data.map((d: any) => d.appId))]

    return {
      labels: dates.map((d: any) =>
        new Date(d!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      ),
      datasets: apps.map((appId: any) => {
        const appName = data.find((d: any) => d.appId === appId)?.appName || appId
        return {
          label: appName,
          backgroundColor: getAppColor(appId),
          data: dates.map((date: any) => {
            const entry = data.find((d: any) => d.date === date && d.appId === appId)
            return entry ? entry.count : 0
          })
        }
      })
    }
  })
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
      <UButton to="/admin/stats" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Developer Platform Stats</h1>
    </div>

    <div class="p-6 space-y-6">
      <div v-if="pending" class="flex items-center justify-center p-12">
        <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-gray-400" />
      </div>

      <template v-else>
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UCard class="bg-gray-50 dark:bg-gray-800/50">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-key" class="w-5 h-5" />
                <h3 class="font-semibold">API Keys</h3>
              </div>
            </template>
            <div class="flex justify-between items-end">
              <div>
                <div class="text-3xl font-bold">{{ stats?.apiKeys.total }}</div>
                <div class="text-sm text-gray-500">Total Issued</div>
                <div class="text-xs text-purple-500 mt-1">
                  {{ stats?.apiKeys.uniqueUsers }} unique users
                </div>
              </div>
              <div class="text-right">
                <div class="text-xl font-bold text-green-600">
                  {{ stats?.apiKeys.activeLast30Days }}
                </div>
                <div class="text-xs text-gray-500">Active (30d)</div>
              </div>
            </div>
          </UCard>

          <!-- OAuth Apps -->
          <UCard class="bg-gray-50 dark:bg-gray-800/50">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-box" class="w-5 h-5" />
                <h3 class="font-semibold">OAuth Apps</h3>
              </div>
            </template>
            <div class="flex justify-between items-end">
              <div>
                <div class="text-3xl font-bold">{{ stats?.oauthApps.total }}</div>
                <div class="text-sm text-gray-500">Registered Apps</div>
                <div class="text-xs text-blue-500 mt-1">
                  {{ stats?.oauthApps.uniqueDevelopers }} developers
                </div>
              </div>
              <div class="text-right">
                <div class="text-xl font-bold text-blue-600">{{ stats?.oauthApps.public }}</div>
                <div class="text-xs text-gray-500">Public Listings</div>
              </div>
            </div>
          </UCard>

          <!-- OAuth Tokens -->
          <UCard class="bg-gray-50 dark:bg-gray-800/50">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-shield-check" class="w-5 h-5" />
                <h3 class="font-semibold">User Authorizations</h3>
              </div>
            </template>
            <div class="flex justify-between items-end">
              <div>
                <div class="text-3xl font-bold">{{ stats?.oauthTokens.total }}</div>
                <div class="text-sm text-gray-500">Total Grants</div>
              </div>
              <div class="text-right">
                <div class="text-xl font-bold text-amber-600">
                  {{ stats?.oauthTokens.activeLast30Days }}
                </div>
                <div class="text-xs text-gray-500">Active Sessions (30d)</div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Daily Authorizations Chart -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Daily User Authorizations per App</h3>
              <div class="text-xs text-gray-500">Last 30 days</div>
            </div>
          </template>
          <div v-if="stats?.dailyAuthorizations?.length" class="h-80 relative">
            <Bar :data="dailyAuthorizationsChartData" :options="stackedBarOptions" />
          </div>
          <div v-else class="h-80 flex items-center justify-center text-gray-400 italic text-sm">
            No authorizations recorded in the last 30 days.
          </div>
        </UCard>

        <!-- OAuth Applications Table -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Registered OAuth Applications</h3>
              <UBadge color="neutral" variant="soft"
                >{{ stats?.oauthApps.list.length }} apps</UBadge
              >
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr
                  class="text-left text-xs uppercase text-gray-500 bg-gray-50 dark:bg-gray-900/50"
                >
                  <th class="py-3 px-4">Application</th>
                  <th class="py-3 px-4">Owner</th>
                  <th class="py-3 px-4">Created</th>
                  <th class="py-3 px-4 text-center">Status</th>
                  <th class="py-3 px-4 text-right">Users</th>
                  <th class="py-3 px-4 text-right">Active Tokens</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="app in stats?.oauthApps.list"
                  :key="app.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <UAvatar
                        :src="app.logoUrl ?? undefined"
                        :alt="app.name"
                        size="sm"
                        :icon="!app.logoUrl ? 'i-lucide-box' : undefined"
                      />
                      <div>
                        <div class="font-medium text-gray-900 dark:text-white">{{ app.name }}</div>
                        <div class="text-xs text-gray-500 truncate max-w-[200px]">
                          {{ app.description || 'No description' }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-sm">
                    <div class="text-gray-900 dark:text-white">{{ app.owner.name }}</div>
                    <div class="text-xs text-gray-500">{{ app.owner.email }}</div>
                  </td>
                  <td class="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                    {{ new Date(app.createdAt).toLocaleDateString() }}
                  </td>
                  <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <UTooltip text="Public Listing">
                        <UIcon
                          :name="app.isPublic ? 'i-lucide-globe' : 'i-lucide-lock'"
                          :class="app.isPublic ? 'text-blue-500' : 'text-gray-400'"
                          class="w-4 h-4"
                        />
                      </UTooltip>
                      <UTooltip text="Trusted App">
                        <UIcon
                          v-if="app.isTrusted"
                          name="i-lucide-shield-check"
                          class="text-green-500 w-4 h-4"
                        />
                      </UTooltip>
                    </div>
                  </td>
                  <td
                    class="py-3 px-4 text-right text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    {{ app._count.consents }}
                  </td>
                  <td class="py-3 px-4 text-right text-sm text-gray-500">
                    {{ app._count.tokens }}
                  </td>
                </tr>
                <tr v-if="!stats?.oauthApps.list.length">
                  <td colspan="6" class="py-12 text-center text-gray-400 text-sm italic">
                    No OAuth applications registered yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </template>
    </div>
  </div>
</template>
