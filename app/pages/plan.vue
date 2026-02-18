<template>
  <UDashboardPanel id="training-plan-page">
    <template #header>
      <UDashboardNavbar title="Training Plan">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>
            <UButton
              v-if="activePlan"
              color="neutral"
              variant="outline"
              size="sm"
              class="font-bold"
              icon="i-heroicons-share"
              @click="isShareModalOpen = true"
            >
              <span class="hidden sm:inline">Share</span>
            </UButton>
            <UButton
              v-if="activePlan"
              color="neutral"
              variant="outline"
              size="sm"
              class="font-bold"
              icon="i-heroicons-bookmark"
              @click="navigateTo('/plans')"
            >
              <span class="hidden sm:inline">My Plans</span>
            </UButton>
            <UButton
              v-if="activePlan"
              color="neutral"
              variant="outline"
              size="sm"
              class="font-bold"
              icon="i-heroicons-plus"
              @click="startNewPlan"
            >
              <span class="hidden sm:inline">New Plan</span>
              <span class="sm:hidden">New</span>
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-4 sm:space-y-6">
        <!-- Dashboard Branding -->
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Training Plan
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Periodized Progression & Physiological Alignment
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="loading && !activePlan" class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <UCard v-for="i in 3" :key="i">
              <template #header>
                <USkeleton class="h-4 w-32" />
              </template>
              <div class="flex flex-col items-center justify-center h-32 space-y-3">
                <USkeleton class="h-12 w-12 rounded-full" />
                <USkeleton class="h-4 w-24" />
              </div>
            </UCard>
          </div>
          <UCard>
            <template #header>
              <USkeleton class="h-4 w-48" />
            </template>
            <div class="space-y-4">
              <USkeleton v-for="i in 5" :key="i" class="h-12 w-full" />
            </div>
          </UCard>
        </div>

        <!-- Active Plan View -->
        <div v-else-if="activePlan">
          <PlanDashboard
            :key="activePlan.id"
            :plan="activePlan"
            :user-ftp="userFtp"
            :is-generating="isPolling"
            :should-auto-generate="autoTriggerStructure"
            @refresh="fetchActivePlan"
            @generation-started="autoTriggerStructure = false"
          />
        </div>

        <!-- No Plan State / Onboarding -->
        <div v-else class="max-w-4xl mx-auto text-center py-8 sm:py-12">
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-10"
          >
            <div
              class="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <UIcon name="i-heroicons-trophy" class="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <h2 class="text-2xl sm:text-3xl font-bold mb-3">Start Your Goal-Driven Plan</h2>
            <p class="text-base sm:text-lg text-muted mb-8 max-w-lg mx-auto">
              Select a race or fitness goal, and let our AI build a periodized training plan
              tailored to your schedule and physiology.
            </p>
            <UButton size="xl" color="primary" @click.stop="openWizard">
              Create Training Plan
            </UButton>
          </div>
        </div>

        <!-- Plan Wizard Modal -->
        <!-- Only render if explicitly open to prevent ghost clicks -->
        <UModal
          v-if="showWizard"
          v-model:open="showWizard"
          :ui="{ content: 'w-full sm:max-w-4xl' }"
          title="Create Training Plan"
          description="Follow the steps to configure your personalized training plan."
        >
          <template #body>
            <div class="p-6">
              <PlanWizard @close="showWizard = false" @plan-created="onPlanCreated" />
            </div>
          </template>
        </UModal>

        <!-- Share Plan Modal -->
        <UModal
          v-model:open="isShareModalOpen"
          title="Share Training Plan"
          description="Create a read-only link to your training plan and share it directly to social platforms."
        >
          <template #body>
            <ShareAccessPanel
              :link="shareLink"
              :loading="generatingShareLink"
              :expiry-value="shareExpiryValue"
              resource-label="training plan"
              :share-title="
                activePlan?.goal?.title
                  ? `Training Plan: ${activePlan.goal.title}`
                  : 'Training plan shared from Coach Wattz'
              "
              @update:expiry-value="shareExpiryValue = $event"
              @generate="generateShareLink"
              @copy="copyToClipboard"
            />
          </template>
          <template #footer>
            <UButton
              label="Close"
              color="neutral"
              variant="ghost"
              @click="isShareModalOpen = false"
            />
          </template>
        </UModal>

        <!-- New Plan Confirmation Modal -->
        <UModal
          v-model:open="isArchiveModalOpen"
          title="Create New Plan"
          description="Create a new plan? This will archive your current active plan."
        >
          <template #footer>
            <div class="flex justify-end gap-2 w-full">
              <UButton color="neutral" variant="ghost" @click="isArchiveModalOpen = false">
                Cancel
              </UButton>
              <UButton
                color="primary"
                @click="
                  async () => {
                    isArchiveModalOpen = false
                    await abandonActivePlan()
                    openWizard()
                  }
                "
              >
                Create Plan
              </UButton>
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import PlanWizard from '~/components/plans/PlanWizard.vue'
  import PlanDashboard from '~/components/plans/PlanDashboard.vue'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Training Plan'
  })

  const showWizard = ref(false)
  const isPolling = ref(false)
  const autoTriggerStructure = ref(false)
  const isArchiveModalOpen = ref(false)
  const toast = useToast()

  // Share state
  const isShareModalOpen = ref(false)
  const shareLink = ref('')
  const shareExpiryValue = ref('2592000')
  const generatingShareLink = ref(false)

  const { data, status, refresh } = await useFetch<any>('/api/plans/active')
  const activePlan = computed(() => data.value?.plan)
  const userFtp = computed(() => data.value?.userFtp)
  const loading = computed(() => status.value === 'pending')

  const generateShareLink = async (options?: { expiresIn?: number | null; forceNew?: boolean }) => {
    if (!activePlan.value?.id || generatingShareLink.value) return

    generatingShareLink.value = true
    try {
      const body: Record<string, any> = {
        resourceType: 'TRAINING_PLAN',
        resourceId: activePlan.value.id
      }
      if (options?.expiresIn !== undefined) body.expiresIn = options.expiresIn
      if (options?.forceNew) body.forceNew = true

      const response = await $fetch('/api/share/generate', {
        method: 'POST',
        body
      })
      shareLink.value = response.url
    } catch (error) {
      console.error('Failed to generate share link:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to generate share link. Please try again.',
        color: 'error'
      })
    } finally {
      generatingShareLink.value = false
    }
  }

  const copyToClipboard = () => {
    if (!shareLink.value) return

    navigator.clipboard.writeText(shareLink.value)
    toast.add({
      title: 'Copied',
      description: 'Share link copied to clipboard.',
      color: 'success'
    })
  }

  // Watch for share modal opening to generate link if it doesn't exist
  watch(isShareModalOpen, (newValue) => {
    if (newValue && !shareLink.value) {
      generateShareLink()
    }
  })

  // Watch for plan changes to reset share link
  watch(
    () => activePlan.value?.id,
    () => {
      shareLink.value = ''
    }
  )

  function fetchActivePlan() {
    refresh()
  }

  function openWizard() {
    showWizard.value = true
  }

  async function abandonActivePlan() {
    if (!activePlan.value?.id) return

    try {
      await $fetch(`/api/plans/${activePlan.value.id}/abandon`, {
        method: 'POST'
      })
      // Clear local state
      data.value.plan = null
    } catch (error) {
      console.error('Failed to abandon plan:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to archive current plan.',
        color: 'error'
      })
    }
  }

  function startNewPlan() {
    isArchiveModalOpen.value = true
  }

  function onPlanCreated(plan: any) {
    // Optimistic update
    if (!data.value) data.value = {}
    data.value.plan = plan

    showWizard.value = false

    toast.add({
      title: 'Plan Created',
      description: 'AI is generating your workouts. This may take a moment.',
      color: 'info'
    })

    // Start polling for workouts
    startPolling()
  }

  function startPolling() {
    if (isPolling.value) return
    isPolling.value = true

    let attempts = 0
    const maxAttempts = 20 // 1 minute

    const interval = setInterval(async () => {
      attempts++
      await refresh()

      // Check if first block has workouts
      const hasWorkouts = activePlan.value?.blocks?.[0]?.weeks?.[0]?.workouts?.length > 0

      if (hasWorkouts || attempts >= maxAttempts) {
        clearInterval(interval)
        isPolling.value = false
        if (hasWorkouts) {
          toast.add({
            title: 'Workouts Ready',
            description: 'Your training plan has been populated.',
            color: 'success'
          })

          // Pass a signal to PlanDashboard to auto-generate structure
          autoTriggerStructure.value = true
        }
      }
    }, 3000)
  }

  // Safety: Close wizard if plan exists
</script>
