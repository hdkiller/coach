<script setup lang="ts">
  import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale
  } from 'chart.js'
  import { Pie, Bar } from 'vue-chartjs'
  import { format } from 'date-fns'

  ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

  definePageMeta({
    layout: 'admin',
    middleware: ['auth']
  })

  // Ensure only admin can access (though middleware 'admin' likely handles this, duplicating check is safe)
  const { data: stats, pending, error } = await useFetch('/api/admin/subscriptions')

  useHead({
    title: 'Subscription Analytics'
  })

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const
      }
    }
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  }

  // computed charts
  const tierChartData = computed(() => {
    if (!stats.value?.tierCounts) return { labels: [], datasets: [] }

    const labels = stats.value.tierCounts.map((t: any) => t.subscriptionTier)
    const data = stats.value.tierCounts.map((t: any) => t._count.id)
    const backgroundColors = labels.map((l: string) => {
      if (l === 'PRO') return '#10b981' // emerald-500
      if (l === 'SUPPORTER') return '#3b82f6' // blue-500
      return '#9ca3af' // gray-400
    })

    return {
      labels,
      datasets: [
        {
          backgroundColor: backgroundColors,
          data
        }
      ]
    }
  })

  const statusChartData = computed(() => {
    if (!stats.value?.statusCounts) return { labels: [], datasets: [] }

    const labels = stats.value.statusCounts.map((s: any) => s.subscriptionStatus)
    const data = stats.value.statusCounts.map((s: any) => s._count.id)
    const backgroundColors = labels.map((l: string) => {
      if (l === 'ACTIVE') return '#10b981'
      if (l === 'CANCELED') return '#f59e0b'
      if (l === 'PAST_DUE') return '#ef4444'
      return '#9ca3af'
    })

    return {
      labels,
      datasets: [
        {
          backgroundColor: backgroundColors,
          data
        }
      ]
    }
  })

  const activeSubscribersCount = computed(() => {
    const active = stats.value?.statusCounts.find((s: any) => s.subscriptionStatus === 'ACTIVE')
    return active ? active._count.id : 0
  })

  const impersonating = ref<string | null>(null)
  const toast = useToast()

  async function impersonateUser(userId: string) {
    impersonating.value = userId
    try {
      await $fetch('/api/admin/impersonate', {
        method: 'POST',
        body: { userId }
      })

      toast.add({
        title: 'Success',
        description: 'Redirecting to impersonated user dashboard...',
        color: 'success'
      })

      // Force hard reload to ensure cookies are picked up and session is re-evaluated
      window.location.href = '/dashboard'
    } catch (error) {
      toast.add({
        title: 'Error',
        description: 'Failed to impersonate user',
        color: 'error'
      })
    } finally {
      impersonating.value = null
    }
  }

  const columns = [
    { key: 'name', label: 'User' },
    { key: 'subscriptionTier', label: 'Tier' },
    { key: 'subscriptionStatus', label: 'Status' },
    { key: 'subscriptionStartedAt', label: 'Subscribed' },
    { key: 'createdAt', label: 'Joined' },
    { key: 'actions', label: '' }
  ]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Subscription Analytics">
        <template #leading>
          <UButton to="/admin" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <div v-if="pending" class="flex items-center justify-center p-12">
          <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-gray-400" />
        </div>

        <div v-else-if="error" class="text-center text-red-500">
          Failed to load subscription data: {{ error.message }}
        </div>

        <template v-else>
          <!-- Top Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UCard>
              <div class="text-center">
                <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                  Est. Monthly Revenue
                </div>
                <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${{ stats?.estimatedMRR.toFixed(2) }}
                </div>
              </div>
            </UCard>
            <UCard>
              <div class="text-center">
                <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                  Active Subscribers
                </div>
                <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {{ activeSubscribersCount }}
                </div>
              </div>
            </UCard>
            <UCard>
              <div class="text-center">
                <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                  Recent Premium Users
                </div>
                <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {{ stats?.recentPremiumUsers.length }}
                </div>
              </div>
            </UCard>
          </div>

          <!-- Charts -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UCard title="Subscriptions by Tier">
              <template #header>
                <h3 class="font-semibold">Subscriptions by Tier</h3>
              </template>
              <div class="h-64 relative">
                <Pie :data="tierChartData" :options="pieOptions" />
              </div>
            </UCard>

            <UCard title="Subscriptions by Status">
              <template #header>
                <h3 class="font-semibold">Subscriptions by Status</h3>
              </template>
              <div class="h-64 relative">
                <Bar :data="statusChartData" :options="barOptions" />
              </div>
            </UCard>
          </div>

          <!-- Recent Premium Users Table -->
          <UCard :ui="{ body: 'p-0' }">
            <template #header>
              <h3 class="font-semibold">Recent Premium Subscriptions</h3>
            </template>

            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead
                  class="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase font-bold text-xs"
                >
                  <tr>
                    <th class="px-6 py-3">User</th>
                    <th class="px-6 py-3">Tier</th>
                    <th class="px-6 py-3">Status</th>
                    <th class="px-6 py-3">Subscribed</th>
                    <th class="px-6 py-3">Joined</th>
                    <th class="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr
                    v-for="user in stats?.recentPremiumUsers"
                    :key="user.id"
                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td class="px-6 py-3">
                      <div class="flex items-center gap-3">
                        <UAvatar :src="user.image || undefined" :alt="user.name || ''" size="sm" />
                        <div>
                          <div class="font-medium text-gray-900 dark:text-white">
                            {{ user.name || 'No name' }}
                          </div>
                          <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {{ user.email }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-3">
                      <UBadge
                        :color="user.subscriptionTier === 'PRO' ? 'primary' : 'info'"
                        size="xs"
                      >
                        {{ user.subscriptionTier }}
                      </UBadge>
                    </td>
                    <td class="px-6 py-3">
                      <UBadge
                        :color="
                          user.subscriptionStatus === 'ACTIVE'
                            ? 'success'
                            : user.subscriptionStatus === 'CANCELED'
                              ? 'warning'
                              : 'neutral'
                        "
                        size="xs"
                        variant="subtle"
                      >
                        {{ user.subscriptionStatus }}
                      </UBadge>
                    </td>
                    <td class="px-6 py-3 text-gray-500 whitespace-nowrap">
                      <div v-if="user.subscriptionStartedAt">
                        {{ format(new Date(user.subscriptionStartedAt), 'MMM d, yyyy') }}
                        <div class="text-[10px] opacity-60">
                          {{ format(new Date(user.subscriptionStartedAt), 'HH:mm') }}
                        </div>
                      </div>
                      <span v-else class="text-gray-400 italic">N/A</span>
                    </td>
                    <td class="px-6 py-3 text-gray-500 whitespace-nowrap">
                      {{ format(new Date(user.createdAt), 'MMM d, yyyy') }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div class="flex justify-end gap-2">
                        <UButton
                          :to="`/admin/users/${user.id}`"
                          color="neutral"
                          variant="ghost"
                          icon="i-lucide-eye"
                          size="xs"
                          aria-label="View Details"
                        />
                        <UButton
                          color="neutral"
                          variant="ghost"
                          icon="i-lucide-user-cog"
                          label="Impersonate"
                          size="xs"
                          :loading="impersonating === user.id"
                          @click="impersonateUser(user.id)"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!stats?.recentPremiumUsers.length">
                    <td colspan="6" class="px-6 py-8 text-center text-gray-400">
                      No recent premium subscriptions found.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
