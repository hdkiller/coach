<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Connect Wahoo">
        <template #leading>
          <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" @click="goBack">
            Back
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-2xl mx-auto">
        <UCard>
          <template #header>
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700"
              >
                <img
                  src="/images/logos/wahoo_logo_square.jpeg"
                  alt="Wahoo Logo"
                  class="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 class="text-xl font-semibold">Connect Wahoo</h2>
                <p class="text-sm text-muted">
                  Sync your workouts and training plans with Wahoo Cloud.
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-6">
            <div class="bg-muted/50 p-4 rounded-lg">
              <h3 class="font-medium mb-2">What will be synced?</h3>
              <ul class="text-sm text-muted space-y-2">
                <li>✓ Completed workouts from your Wahoo devices</li>
                <li>✓ High-resolution power and heart rate data</li>
                <li>✓ Planned workouts automatically pushed to your head unit</li>
                <li>✓ Training zones and profile metrics</li>
              </ul>
            </div>

            <div class="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
              <div class="flex items-start gap-3">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                />
                <div class="text-sm text-blue-900 dark:text-blue-200">
                  <p class="font-medium mb-1">OAuth Authorization</p>
                  <p>
                    You'll be redirected to Wahoo Cloud to authorize access. This enables
                    bidirectional sync between Coach Watts and your Wahoo ELEMNT.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton to="/dashboard" color="neutral" variant="outline"> Cancel </UButton>
              <UButton :loading="connecting" icon="i-heroicons-bolt" @click="connect">
                Connect with Wahoo
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  const toast = useToast()
  const router = useRouter()

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Connect Wahoo',
    meta: [
      {
        name: 'description',
        content: 'Connect your Wahoo account to sync activities and planned workouts.'
      }
    ]
  })

  const connecting = ref(false)

  const goBack = () => {
    router.push('/dashboard')
  }

  const connect = async () => {
    connecting.value = true
    try {
      window.location.href = '/api/integrations/wahoo/authorize'
    } catch (error: any) {
      toast.add({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect to Wahoo',
        color: 'error'
      })
      connecting.value = false
    }
  }
</script>
