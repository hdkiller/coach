<template>
  <UDashboardPanel id="coaching-team">
    <template #header>
      <UDashboardNavbar title="My Team">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-8">
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            My Team
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Your Personal Coaching & Mentorship Network
          </p>
        </div>

        <!-- Invite Section -->
        <UCard
          :ui="{
            body: 'p-6',
            root: 'overflow-hidden border-2 border-primary-500/20 bg-primary-50/30 dark:bg-primary-950/10'
          }"
        >
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-1">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">Invite a Coach</h3>
              <p class="text-sm text-neutral-600 dark:text-neutral-400 max-w-md">
                Give this code to your coach so they can connect to your account and manage your
                training.
              </p>
            </div>

            <div class="flex flex-col items-center gap-3">
              <div v-if="invite.code" class="flex items-center gap-2">
                <div
                  class="px-6 py-3 bg-white dark:bg-gray-900 border-2 border-primary-500 rounded-lg font-mono text-2xl font-bold tracking-widest shadow-inner text-primary-600 dark:text-primary-400"
                >
                  {{ invite.code }}
                </div>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-clipboard"
                  @click="copyInvite"
                />
              </div>
              <div
                v-else-if="loadingInvite"
                class="h-14 w-48 bg-gray-200 animate-pulse rounded-lg"
              />

              <UButton
                v-if="!invite.code"
                color="primary"
                label="Generate Invite Code"
                icon="i-heroicons-plus"
                :loading="generatingInvite"
                @click="createInvite"
              />
              <p v-else class="text-[10px] text-neutral-500 uppercase font-bold">
                Expires {{ formatFullDate(invite.expiresAt) }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- My Coaches List -->
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">My Coaches</h2>

          <div v-if="loading" class="space-y-4">
            <UCard v-for="i in 2" :key="i">
              <div class="flex items-center gap-3">
                <USkeleton class="h-10 w-10 rounded-full" />
                <USkeleton class="h-4 w-48" />
              </div>
            </UCard>
          </div>

          <div
            v-else-if="coaches.length === 0"
            class="text-center py-12 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <div class="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-full mb-3 inline-block">
              <UIcon name="i-heroicons-academic-cap" class="w-6 h-6 text-neutral-400" />
            </div>
            <p class="text-neutral-500 text-sm">You haven't connected with any coaches yet.</p>
          </div>

          <div v-else class="space-y-3">
            <UCard v-for="rel in coaches" :key="rel.id" :ui="{ body: 'p-3 sm:p-4' }">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <UAvatar :src="rel.coach.image" :alt="rel.coach.name" />
                  <div>
                    <p class="font-bold text-sm">{{ rel.coach.name }}</p>
                    <p class="text-xs text-neutral-500">{{ rel.coach.email }}</p>
                  </div>
                </div>
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  label="Remove"
                  @click="confirmRemoveCoach(rel.coach)"
                />
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Remove Coach Confirmation -->
  <UModal
    v-model:open="isRemoveModalOpen"
    title="Remove Coach"
    :description="`Are you sure you want to remove ${coachToRemove?.name} as your coach? They will no longer have access to your data.`"
  >
    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="isRemoveModalOpen = false" />
      <UButton label="Remove Coach" color="error" :loading="removingCoach" @click="removeCoach" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'My Team | Coaching',
    meta: [
      {
        name: 'description',
        content: 'Manage your coaching relationships and mentorship network.'
      }
    ]
  })

  const coaches = ref<any[]>([])
  const invite = ref<any>({ status: 'NONE' })

  const loading = ref(true)
  const loadingInvite = ref(false)
  const generatingInvite = ref(false)
  const removingCoach = ref(false)

  const isRemoveModalOpen = ref(false)
  const coachToRemove = ref<any>(null)

  const toast = useToast()

  async function fetchData() {
    loading.value = true
    try {
      const [coachesData, inviteData] = await Promise.all([
        $fetch('/api/coaching/coaches'),
        $fetch('/api/coaching/invite')
      ])
      coaches.value = coachesData as any[]
      invite.value = inviteData
    } catch (e) {
      console.error(e)
      toast.add({ title: 'Failed to load coaching data', color: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function createInvite() {
    generatingInvite.value = true
    try {
      invite.value = await $fetch('/api/coaching/invite', { method: 'POST' })
      toast.add({ title: 'Invite code generated!', color: 'success' })
    } catch (e) {
      toast.add({ title: 'Failed to generate code', color: 'error' })
    } finally {
      generatingInvite.value = false
    }
  }

  function confirmRemoveCoach(coach: any) {
    coachToRemove.value = coach
    isRemoveModalOpen.value = true
  }

  async function removeCoach() {
    if (!coachToRemove.value) return
    removingCoach.value = true
    try {
      await $fetch(`/api/coaching/coaches/${coachToRemove.value.id}`, { method: 'DELETE' })
      toast.add({ title: 'Coach removed', color: 'success' })
      await fetchData()
      isRemoveModalOpen.value = false
    } catch (e) {
      toast.add({ title: 'Failed to remove coach', color: 'error' })
    } finally {
      removingCoach.value = false
    }
  }

  function copyInvite() {
    if (!invite.value.code) return
    navigator.clipboard.writeText(invite.value.code)
    toast.add({ title: 'Code copied to clipboard', color: 'primary' })
  }

  function formatFullDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  onMounted(fetchData)
</script>
