<template>
  <UDashboardPanel id="coaching-athletes">
    <template #header>
      <UDashboardNavbar title="Athletes">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>
            <UButton
              v-if="athletes.length > 0"
              color="neutral"
              variant="outline"
              icon="i-heroicons-calendar-days"
              size="sm"
              class="font-bold"
              to="/coaching/calendar"
            >
              Calendar
            </UButton>
            <UButton
              color="primary"
              variant="solid"
              icon="i-heroicons-user-plus"
              size="sm"
              class="font-bold"
              @click="isConnectModalOpen = true"
            >
              Add Athlete
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-6">
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            My Athletes
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Managing Your Performance Roster
          </p>
        </div>

        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UCard v-for="i in 3" :key="i">
            <template #header>
              <div class="flex items-center gap-3">
                <USkeleton class="h-12 w-12 rounded-full" />
                <div class="space-y-2">
                  <USkeleton class="h-4 w-32" />
                  <USkeleton class="h-3 w-48" />
                </div>
              </div>
            </template>
            <USkeleton class="h-20 w-full rounded-lg" />
          </UCard>
        </div>

        <div
          v-else-if="athletes.length === 0"
          class="py-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
        >
          <div class="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-full mb-4">
            <UIcon name="i-heroicons-users" class="w-8 h-8 text-neutral-400" />
          </div>
          <h3 class="font-bold text-lg">No Athletes Yet</h3>
          <p class="text-neutral-500 mb-6 max-w-xs">
            Ask your athlete for their invite code to start coaching them.
          </p>
          <UButton
            color="primary"
            label="Connect Athlete"
            icon="i-heroicons-user-plus"
            @click="isConnectModalOpen = true"
          />
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CoachingAthleteCard
            v-for="rel in athletes"
            :key="rel.id"
            :athlete="rel.athlete"
            @view="viewAthlete"
            @message="messageAthlete"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Connect Athlete Modal -->
  <UModal
    v-model:open="isConnectModalOpen"
    title="Add New Athlete"
    description="Enter the invite code provided by your athlete to connect their account."
  >
    <template #body>
      <UFormField label="Invite Code" help="Codes are 6 characters long (e.g. AB12XY)">
        <UInput
          v-model="connectCode"
          placeholder="ENTER-CODE"
          class="font-mono uppercase text-center text-xl w-full"
          maxlength="6"
        />
      </UFormField>
    </template>
    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="isConnectModalOpen = false" />
      <UButton
        label="Connect Athlete"
        color="primary"
        :loading="connecting"
        :disabled="!connectCode || connectCode.length < 6"
        @click="connectAthlete"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'My Athletes | Coaching',
    meta: [
      {
        name: 'description',
        content: 'Manage the athletes you are currently coaching.'
      }
    ]
  })

  const athletes = ref<any[]>([])
  const loading = ref(true)
  const connecting = ref(false)
  const isConnectModalOpen = ref(false)
  const connectCode = ref('')
  const toast = useToast()
  const router = useRouter()

  async function fetchData() {
    loading.value = true
    try {
      const data = await $fetch('/api/coaching/athletes')
      athletes.value = data as any[]
    } catch (e) {
      console.error(e)
      toast.add({ title: 'Failed to load athletes', color: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function connectAthlete() {
    connecting.value = true
    try {
      await $fetch('/api/coaching/athletes/connect', {
        method: 'POST',
        body: { code: connectCode.value.toUpperCase() }
      })
      toast.add({ title: 'Athlete connected successfully!', color: 'success' })
      await fetchData()
      isConnectModalOpen.value = false
      connectCode.value = ''
    } catch (err: any) {
      toast.add({
        title: 'Failed to connect: ' + (err.data?.message || 'Invalid code'),
        color: 'error'
      })
    } finally {
      connecting.value = false
    }
  }

  function viewAthlete(athlete: any) {
    router.push(`/coaching/athletes/${athlete.id}`)
  }

  function messageAthlete(athlete: any) {
    router.push('/chat')
  }

  onMounted(fetchData)
</script>
