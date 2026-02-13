<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
    <UCard class="w-full max-w-md">
      <div v-if="loading" class="py-12 flex flex-col items-center gap-4">
        <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-primary" />
        <p class="text-sm text-gray-500 font-medium">Validating request...</p>
      </div>

      <div v-else-if="error" class="py-6 text-center">
        <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Authorization Error</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">{{ error }}</p>
        <UButton label="Go Back" variant="link" class="mt-6" @click="navigateTo('/dashboard')" />
      </div>

      <div v-else-if="app" class="space-y-6">
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="flex items-center gap-3">
            <img src="/media/logo.webp" alt="Coach Watts" class="size-10 object-contain" />
            <UIcon name="i-heroicons-plus" class="text-gray-400 w-4 h-4" />
            <UAvatar
              :src="app.logoUrl || undefined"
              :alt="app.name"
              size="lg"
              icon="i-heroicons-cube"
            />
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              Authorize {{ app.name }}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
              would like to access your Coach Watts account.
            </p>
          </div>
        </div>

        <USeparator />

        <!-- Current User Info -->
        <div
          v-if="user"
          class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700"
        >
          <div class="flex items-center gap-2 overflow-hidden">
            <UAvatar :src="user.image || undefined" :alt="user.name || undefined" size="xs" />
            <div class="flex flex-col min-w-0">
              <p class="text-xs font-bold text-gray-900 dark:text-white truncate">
                {{ user.name }}
              </p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate">{{ user.email }}</p>
            </div>
          </div>
          <UButton
            label="Switch"
            variant="ghost"
            size="xs"
            color="neutral"
            class="text-[10px] font-bold"
            @click="handleSwitchAccount"
          />
        </div>

        <USeparator />

        <div class="space-y-3">
          <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            This app will be able to:
          </p>
          <ul class="space-y-3">
            <li v-for="scope in parsedScopes" :key="scope.id" class="flex items-start gap-3">
              <div class="p-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <UIcon :name="scope.icon" class="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p class="text-sm font-bold text-gray-900 dark:text-white">{{ scope.title }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  {{ scope.description }}
                </p>
              </div>
            </li>
          </ul>
        </div>

        <USeparator />

        <div class="flex flex-col gap-3">
          <UButton
            label="Authorize"
            color="primary"
            block
            size="lg"
            class="font-bold"
            :loading="processing"
            @click="handleAction('approve')"
          />
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            block
            class="font-bold"
            @click="handleAction('deny')"
          />
        </div>

        <p
          class="text-[10px] text-gray-400 dark:text-gray-500 text-center font-medium leading-relaxed"
        >
          By authorizing, you allow this app to access your data as described. You can revoke access
          at any time in your Settings.
        </p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({
    layout: 'simple',
    middleware: 'oauth-auth'
  })

  const { data: authData, signOut } = useAuth()
  const route = useRoute()
  const toast = useToast()

  const user = computed(() => authData.value?.user)
  const loading = ref(true)
  const processing = ref(false)
  const error = ref<string | null>(null)
  const app = ref<any>(null)

  const query = route.query as any

  const scopeMap: Record<string, any> = {
    'profile:read': {
      id: 'profile:read',
      title: 'Read Profile',
      description: 'Access your basic profile info, FTP, and settings.',
      icon: 'i-heroicons-user'
    },
    'profile:write': {
      id: 'profile:write',
      title: 'Update Profile',
      description: 'Modify your profile settings like weight and FTP.',
      icon: 'i-heroicons-pencil-square'
    },
    'workout:read': {
      id: 'workout:read',
      title: 'Read Workouts',
      description: 'View your workout history and performance metrics.',
      icon: 'i-heroicons-activity'
    },
    'workout:write': {
      id: 'workout:write',
      title: 'Manage Workouts',
      description: 'Upload new workouts or edit existing ones.',
      icon: 'i-heroicons-cloud-arrow-up'
    },
    'health:read': {
      id: 'health:read',
      title: 'Read Health Data',
      description: 'Access your HRV, sleep, and recovery metrics.',
      icon: 'i-heroicons-heart'
    },
    offline_access: {
      id: 'offline_access',
      title: 'Offline Access',
      description: 'Allow this app to access your data when you are not using it.',
      icon: 'i-heroicons-clock'
    }
  }

  const parsedScopes = computed(() => {
    const scopes = (query.scope || 'profile:read').split(/[\s,]+/)
    return scopes.map(
      (s: string) =>
        scopeMap[s] || {
          id: s,
          title: s,
          description: `Access to ${s} resources.`,
          icon: 'i-heroicons-key'
        }
    )
  })

  async function handleSwitchAccount() {
    // Redirect back to this page but with prompt=login
    const newQuery = { ...route.query, prompt: 'login' }
    const callbackUrl = useNuxtApp().$router.resolve({
      path: route.path,
      query: newQuery
    }).fullPath

    await signOut({ callbackUrl })
  }

  async function fetchAppDetails() {
    if (!query.client_id) {
      error.value = 'Missing client_id parameter.'
      loading.value = false
      return
    }

    try {
      const data: any = await $fetch('/api/oauth/authorize-details', {
        params: { client_id: query.client_id }
      })
      app.value = data
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to load application details.'
    } finally {
      loading.value = false
    }
  }

  async function handleAction(action: 'approve' | 'deny') {
    processing.value = true
    try {
      const response: any = await $fetch('/api/oauth/authorize', {
        method: 'POST',
        body: {
          ...query,
          action
        }
      })

      if (response.redirect) {
        window.location.href = response.redirect
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err.data?.message || 'Authorization failed',
        color: 'error'
      })
      processing.value = false
    }
  }

  onMounted(() => {
    fetchAppDetails()
  })

  useHead({
    title: 'Authorize Application',
    meta: [
      {
        name: 'description',
        content: 'Authorize a third-party application to access your Coach Watts data.'
      }
    ]
  })
</script>
