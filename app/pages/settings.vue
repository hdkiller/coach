<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-4xl mx-auto space-y-6">
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Profile</h2>
          </template>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Email</label>
              <p>{{ user?.email }}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">FTP (Watts)</label>
                <UInput type="number" placeholder="250" />
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-1">Max HR</label>
                <UInput type="number" placeholder="185" />
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-1">Weight (kg)</label>
                <UInput type="number" step="0.1" placeholder="70.0" />
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-1">Date of Birth</label>
                <UInput type="date" />
              </div>
            </div>
            
            <UButton color="primary">
              Save Profile
            </UButton>
          </div>
        </UCard>
        
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Connected Apps</h2>
          </template>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 border rounded-lg">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 class="font-semibold">Intervals.icu</h3>
                  <p class="text-sm text-muted">Power data and training calendar</p>
                </div>
              </div>
              <div v-if="!intervalsConnected">
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="goToConnectIntervals"
                >
                  Connect
                </UButton>
              </div>
              <div v-else class="flex items-center gap-2">
                <UBadge color="success">Connected</UBadge>
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="disconnectIntegration('intervals')"
                >
                  Disconnect
                </UButton>
              </div>
            </div>
            
            <div class="flex items-center justify-between p-4 border rounded-lg">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <UIcon name="i-heroicons-heart" class="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 class="font-semibold">WHOOP</h3>
                  <p class="text-sm text-muted">Recovery, sleep, and strain data</p>
                </div>
              </div>
              <div v-if="!whoopConnected">
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="goToConnectWhoop"
                >
                  Connect
                </UButton>
              </div>
              <div v-else class="flex items-center gap-2">
                <UBadge color="success">Connected</UBadge>
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="disconnectIntegration('whoop')"
                >
                  Disconnect
                </UButton>
              </div>
            </div>
            
            <div class="flex items-center justify-between p-4 border rounded-lg">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UIcon name="i-heroicons-cake" class="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 class="font-semibold">Yazio</h3>
                  <p class="text-sm text-muted">Nutrition tracking and meal planning</p>
                </div>
              </div>
              <div v-if="!yazioConnected">
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="goToConnectYazio"
                >
                  Connect
                </UButton>
              </div>
              <div v-else class="flex items-center gap-2">
                <UBadge color="success">Connected</UBadge>
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="disconnectIntegration('yazio')"
                >
                  Disconnect
                </UButton>
              </div>
            </div>
            
            <div v-if="yazioConnected" class="mt-4 flex items-center gap-4">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                @click="syncIntegration('yazio')"
                :disabled="syncingYazio"
              >
                {{ syncingYazio ? 'Syncing...' : 'Sync Now' }}
              </UButton>
            </div>
          </div>
        </UCard>
        
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-error">Danger Zone</h2>
          </template>
          
          <div class="space-y-4">
            <p class="text-sm text-muted">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <UButton color="error" variant="outline">
              Delete Account
            </UButton>
          </div>
        </UCard>
      </div>
    </template>

  </UDashboardPanel>
</template>

<script setup lang="ts">
const { data } = useAuth()
const user = computed(() => data.value?.user)
const toast = useToast()
const router = useRouter()

definePageMeta({
  middleware: 'auth'
})

// Integration status - use lazy to avoid SSR issues
const { data: integrationStatus, refresh: refreshIntegrations } = useFetch('/api/integrations/status', {
  lazy: true,
  server: false
})

const intervalsConnected = computed(() =>
  integrationStatus.value?.integrations?.some((i: any) => i.provider === 'intervals') ?? false
)

const whoopConnected = computed(() =>
  integrationStatus.value?.integrations?.some((i: any) => i.provider === 'whoop') ?? false
)

const yazioConnected = computed(() =>
  integrationStatus.value?.integrations?.some((i: any) => i.provider === 'yazio') ?? false
)

const syncingYazio = ref(false)

const goToConnectIntervals = () => {
  navigateTo('/connect-intervals')
}

const goToConnectWhoop = () => {
  navigateTo('/connect-whoop')
}

const goToConnectYazio = () => {
  navigateTo('/connect-yazio')
}

const syncIntegration = async (provider: string) => {
  if (provider === 'yazio') {
    syncingYazio.value = true
  }
  
  try {
    const response = await $fetch('/api/integrations/sync', {
      method: 'POST',
      body: { provider }
    })
    
    const providerName = provider === 'intervals'
      ? 'Intervals.icu'
      : provider === 'whoop'
      ? 'WHOOP'
      : 'Yazio'
    
    toast.add({
      title: 'Sync Started',
      description: `Started syncing ${providerName} data`,
      color: 'success'
    })
    
    // Refresh integrations after a delay to show updated sync status
    setTimeout(() => {
      refreshIntegrations()
    }, 2000)
  } catch (error: any) {
    toast.add({
      title: 'Sync Failed',
      description: error.data?.message || `Failed to sync ${provider}`,
      color: 'error'
    })
  } finally {
    if (provider === 'yazio') {
      syncingYazio.value = false
    }
  }
}

const disconnectIntegration = async (provider: string) => {
  try {
    await $fetch(`/api/integrations/${provider}/disconnect`, {
      method: 'DELETE'
    })
    
    const providerName = provider === 'intervals'
      ? 'Intervals.icu'
      : provider === 'whoop'
      ? 'WHOOP'
      : 'Yazio'
    
    toast.add({
      title: 'Disconnected',
      description: `Successfully disconnected from ${providerName}`,
      color: 'success'
    })
    
    // Refresh integration status
    refreshIntegrations()
  } catch (error: any) {
    toast.add({
      title: 'Disconnect Failed',
      description: error.data?.message || `Failed to disconnect from ${provider}`,
      color: 'error'
    })
  }
}

// Handle OAuth callback messages
onMounted(() => {
  const route = useRoute()
  
  if (route.query.whoop_success) {
    toast.add({
      title: 'Connected!',
      description: 'Successfully connected to WHOOP',
      color: 'success'
    })
    // Clean up URL
    router.replace({ query: {} })
  } else if (route.query.whoop_error) {
    const errorMsg = route.query.whoop_error as string
    toast.add({
      title: 'Connection Failed',
      description: errorMsg === 'no_code'
        ? 'Authorization was cancelled or no code was received'
        : `Failed to connect to WHOOP: ${errorMsg}`,
      color: 'error'
    })
    // Clean up URL
    router.replace({ query: {} })
  } else if (route.query.connected === 'yazio') {
    toast.add({
      title: 'Connected!',
      description: 'Successfully connected to Yazio',
      color: 'success'
    })
    // Refresh integrations and clean up URL
    refreshIntegrations()
    router.replace({ query: {} })
  }
})
</script>