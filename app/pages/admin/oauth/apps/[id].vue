<script setup lang="ts">
  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const route = useRoute()
  const appId = route.params.id as string

  const { data, pending, error } = await useFetch(`/api/admin/oauth/apps/${appId}`)

  useHead({
    title: computed(() => `OAuth App: ${data.value?.app.name || 'Loading...'}`)
  })
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="data?.app.name || 'OAuth Application'">
        <template #leading>
          <UButton
            to="/admin/stats/developers"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="pending" class="flex items-center justify-center p-12">
        <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-gray-400" />
      </div>

      <div v-else-if="error" class="p-12 text-center">
        <UIcon name="i-lucide-alert-circle" class="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Failed to load application
        </h2>
        <p class="text-gray-500 mt-2">
          {{ error.statusMessage || 'An unexpected error occurred' }}
        </p>
        <UButton to="/admin/stats/developers" class="mt-6">Back to Developers</UButton>
      </div>

      <div v-else-if="data" class="p-6 space-y-6">
        <!-- App Details Header -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <UCard class="lg:col-span-2">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-lg">Application Details</h3>
                <div class="flex gap-2">
                  <UBadge v-if="data.app.isTrusted" color="success" variant="soft">Trusted</UBadge>
                  <UBadge :color="data.app.isPublic ? 'primary' : 'neutral'" variant="soft">
                    {{ data.app.isPublic ? 'Public' : 'Private' }}
                  </UBadge>
                </div>
              </div>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <div class="space-y-4">
                <div>
                  <div class="text-xs font-semibold text-gray-500 uppercase">App ID</div>
                  <div
                    class="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-1 select-all"
                  >
                    {{ data.app.id }}
                  </div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-gray-500 uppercase">Client ID</div>
                  <div
                    class="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-1 select-all"
                  >
                    {{ data.app.clientId }}
                  </div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-gray-500 uppercase">Description</div>
                  <div class="text-sm text-gray-900 dark:text-white mt-1 italic">
                    {{ data.app.description || 'No description provided' }}
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <div class="text-xs font-semibold text-gray-500 uppercase">Redirect URIs</div>
                  <div class="mt-1 space-y-1">
                    <div
                      v-for="uri in data.app.redirectUris"
                      :key="uri"
                      class="text-xs text-blue-500 font-mono truncate"
                    >
                      {{ uri }}
                    </div>
                  </div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-gray-500 uppercase">Owner</div>
                  <div class="flex items-center gap-2 mt-1">
                    <NuxtLink
                      :to="`/admin/users/${data.app.ownerId}`"
                      class="text-sm font-medium text-primary hover:underline"
                    >
                      {{ data.app.owner.name || 'Unnamed' }}
                    </NuxtLink>
                    <span class="text-xs text-gray-500">({{ data.app.owner.email }})</span>
                  </div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-gray-500 uppercase">Created At</div>
                  <div class="text-sm text-gray-900 dark:text-white mt-1">
                    {{ new Date(data.app.createdAt).toLocaleString() }}
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="font-semibold">Usage Summary</h3>
            </template>
            <div class="flex flex-col gap-6 h-full justify-center py-4">
              <div class="text-center">
                <div class="text-4xl font-bold text-gray-900 dark:text-white">
                  {{ data.app._count.consents }}
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wider mt-1">
                  Total Authorized Users
                </div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-blue-500">
                  {{ data.app._count.tokens }}
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wider mt-1">
                  Total Active Tokens
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Users Table -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Authorized Users</h3>
              <UBadge color="neutral" variant="soft">{{ data.users.length }} users</UBadge>
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900/50">
                <tr class="text-left text-xs uppercase text-gray-500">
                  <th class="py-3 px-6">User</th>
                  <th class="py-3 px-6">Authorized At</th>
                  <th class="py-3 px-6">Last Activity</th>
                  <th class="py-3 px-6">Last IP</th>
                  <th class="py-3 px-6">Country</th>
                  <th class="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="user in data.users"
                  :key="user.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="py-4 px-6 whitespace-nowrap">
                    <div class="flex items-center gap-3">
                      <UAvatar :src="user.image || undefined" :alt="user.name || ''" size="sm" />
                      <div>
                        <div class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ user.name || 'No name' }}
                        </div>
                        <div class="text-xs text-gray-500">
                          <NuxtLink
                            :to="`/admin/users/${user.id}`"
                            class="text-primary hover:underline"
                          >
                            {{ user.email }}
                          </NuxtLink>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">
                    {{ new Date(user.authorizedAt).toLocaleDateString() }}
                  </td>
                  <td class="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">
                    <span v-if="user.lastUsedAt">
                      {{ new Date(user.lastUsedAt).toLocaleString() }}
                    </span>
                    <span v-else class="text-gray-400 italic">Never</span>
                  </td>
                  <td class="py-4 px-6 text-xs text-gray-500 font-mono whitespace-nowrap">
                    {{ user.lastIp || '-' }}
                  </td>
                  <td class="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">
                    {{ user.registrationCountry || '-' }}
                  </td>
                  <td class="py-4 px-6 text-right">
                    <UButton
                      :to="`/admin/users/${user.id}`"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-eye"
                      size="xs"
                    />
                  </td>
                </tr>
                <tr v-if="!data.users.length">
                  <td colspan="6" class="py-12 text-center text-gray-400 text-sm italic">
                    No users have authorized this application yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
