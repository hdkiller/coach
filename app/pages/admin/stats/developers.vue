<script setup lang="ts">
  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const { data: stats, pending } = await useFetch('/api/admin/stats/developers')

  useHead({
    title: 'Developer Stats'
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
        <!-- API Keys -->
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
      </template>
    </div>
  </div>
</template>
