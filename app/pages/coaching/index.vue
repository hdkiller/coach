<template>
  <UDashboardPanel id="coaching-dashboard">
    <template #header>
      <UDashboardNavbar title="Coaching Dashboard">
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
      <div class="p-0 sm:p-6 space-y-6">
        <!-- Dashboard Branding -->
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Coach's Dashboard
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Strategic Overview & Performance Management
          </p>
        </div>

        <CoachingBanner />

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <UCard :ui="{ body: 'p-4 sm:p-6' }">
            <div class="flex items-center gap-4">
              <div class="bg-primary-50 dark:bg-primary-950/20 p-3 rounded-xl">
                <UIcon name="i-lucide-users" class="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">Athletes</p>
                <p class="text-2xl font-black text-gray-900 dark:text-white">
                  {{ athletes.length }}
                </p>
              </div>
            </div>
          </UCard>

          <UCard :ui="{ body: 'p-4 sm:p-6' }">
            <div class="flex items-center gap-4">
              <div class="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl">
                <UIcon name="i-lucide-calendar" class="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">Events</p>
                <p class="text-2xl font-black text-gray-900 dark:text-white">
                  {{ totalEvents }}
                </p>
              </div>
            </div>
          </UCard>

          <UCard :ui="{ body: 'p-4 sm:p-6' }">
            <div class="flex items-center gap-4">
              <div class="bg-green-50 dark:bg-green-950/20 p-3 rounded-xl">
                <UIcon name="i-lucide-check-circle" class="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">Compliance</p>
                <p class="text-2xl font-black text-gray-900 dark:text-white">--%</p>
              </div>
            </div>
          </UCard>

          <UCard :ui="{ body: 'p-4 sm:p-6' }">
            <div class="flex items-center gap-4">
              <div class="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-xl">
                <UIcon name="i-lucide-shield-alert" class="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">Alerts</p>
                <p class="text-2xl font-black text-gray-900 dark:text-white">0</p>
              </div>
            </div>
          </UCard>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Recent Athletes Section -->
          <div class="lg:col-span-2 space-y-4">
            <div class="flex items-center justify-between px-4 sm:px-0">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">Your Roster</h2>
              <UButton variant="link" color="neutral" to="/coaching/athletes"> View All </UButton>
            </div>

            <div v-if="loading" class="space-y-4">
              <UCard v-for="i in 3" :key="i">
                <div class="flex items-center gap-3">
                  <USkeleton class="h-10 w-10 rounded-full" />
                  <USkeleton class="h-4 w-48" />
                </div>
              </UCard>
            </div>

            <div
              v-else-if="athletes.length === 0"
              class="p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800"
            >
              <p class="text-gray-500">No athletes connected yet.</p>
              <UButton
                color="primary"
                variant="link"
                to="/coaching/athletes"
                class="mt-2 font-bold"
              >
                Connect Your First Athlete
              </UButton>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UCard
                v-for="rel in athletes.slice(0, 4)"
                :key="rel.id"
                class="hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
                :ui="{ body: 'p-4' }"
                @click="router.push(`/coaching/athletes/${rel.athlete.id}`)"
              >
                <div class="flex items-center gap-3">
                  <UAvatar :src="rel.athlete.image" :alt="rel.athlete.name" size="md" />
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm truncate">{{ rel.athlete.name }}</p>
                    <p class="text-xs text-gray-500 truncate">{{ rel.athlete.email }}</p>
                  </div>
                  <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
                </div>
              </UCard>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="space-y-4">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white px-4 sm:px-0">
              Quick Actions
            </h2>
            <div class="grid grid-cols-1 gap-3">
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-calendar-days"
                label="Coaching Calendar"
                size="lg"
                class="justify-start"
                to="/coaching/calendar"
              />
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-user-plus"
                label="Add Athlete"
                size="lg"
                class="justify-start"
                to="/coaching/athletes"
              />
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-library"
                label="Workout Library"
                size="lg"
                class="justify-start"
                to="/library/workouts"
              />
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-scroll-text"
                label="Plan Templates"
                size="lg"
                class="justify-start"
                to="/library/plans"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Coach Dashboard | Coaching',
    meta: [
      {
        name: 'description',
        content: 'Your strategic coaching overview.'
      }
    ]
  })

  const athletes = ref<any[]>([])
  const loading = ref(true)
  const totalEvents = ref(0)
  const router = useRouter()
  const toast = useToast()

  async function fetchData() {
    loading.value = true
    try {
      const data = await $fetch('/api/coaching/athletes')
      athletes.value = data as any[]
      // You could fetch more detailed dashboard stats here
    } catch (e) {
      console.error(e)
      toast.add({ title: 'Failed to load dashboard data', color: 'error' })
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchData)
</script>
