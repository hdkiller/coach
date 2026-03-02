<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Connect Fitbit">
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
                class="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700"
              >
                <img
                  src="/images/logos/fitbit_square.png"
                  alt="Fitbit Logo"
                  class="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h2 class="text-xl font-semibold">Connect Fitbit</h2>
                <p class="text-sm text-muted">
                  Connect your Fitbit account to sync nutrition, sleep, and heart-rate trends.
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-6">
            <div class="bg-muted/50 p-4 rounded-lg">
              <h3 class="font-medium mb-2">What you'll get:</h3>
              <ul class="text-sm text-muted space-y-2">
                <li>• Daily calories and macros</li>
                <li>• Logged foods and meal entries</li>
                <li>• Water intake summaries</li>
                <li>• Sleep duration and stage summaries</li>
                <li>• HRV and resting heart-rate trends</li>
              </ul>
            </div>

            <div class="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <div class="flex gap-3">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                />
                <div class="text-sm">
                  <p class="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Secure OAuth Connection
                  </p>
                  <p class="text-blue-700 dark:text-blue-300">
                    You'll be redirected to Fitbit's secure login page. We never see your password.
                    You can revoke access anytime from your Fitbit account settings.
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="font-medium">Permissions we'll request:</h3>
              <div class="space-y-2 text-sm text-muted">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-600" />
                  <span>Read nutrition and food logs</span>
                </div>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-600" />
                  <span>Read sleep and recovery metrics</span>
                </div>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-600" />
                  <span>Read heart-rate and HRV summaries</span>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton to="/settings/apps" color="neutral" variant="outline"> Cancel </UButton>
              <UButton :loading="connecting" color="primary" @click="connect">
                Connect Fitbit
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
    title: 'Connect Fitbit',
    meta: [
      {
        name: 'description',
        content: 'Connect your Fitbit account to sync nutrition, sleep, and heart-rate trends.'
      }
    ]
  })

  const connecting = ref(false)

  const goBack = () => {
    router.push('/settings/apps')
  }

  const connect = async () => {
    connecting.value = true
    try {
      window.location.href = '/api/integrations/fitbit/authorize'
    } catch (error: any) {
      toast.add({
        title: 'Connection Failed',
        description: error.message || 'Failed to initiate Fitbit connection',
        color: 'error'
      })
      connecting.value = false
    }
  }
</script>
