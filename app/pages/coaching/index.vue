<template>
  <UDashboardPanel id="coaching-dashboard">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #title>
          <CoachingNavbarLinks />
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
        <!-- 1. Header & Utility Bar -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 sm:px-0">
          <div>
            <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Strategic Overview
            </h1>
            <p
              class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
            >
              Performance Roster & Compliance Control
            </p>
          </div>

          <!-- Quick Actions Utility Bar -->
          <div class="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <UButton
              color="primary"
              variant="solid"
              icon="i-lucide-user-plus"
              label="Add Athlete"
              size="sm"
              class="font-bold whitespace-nowrap"
              to="/coaching/athletes"
            />
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-library"
              label="Workouts"
              size="sm"
              class="font-bold whitespace-nowrap"
              to="/library/workouts"
            />
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-scroll-text"
              label="Plans"
              size="sm"
              class="font-bold whitespace-nowrap"
              to="/library/plans"
            />
          </div>
        </div>

        <CoachingBanner />

        <!-- Loading State -->
        <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <USkeleton class="lg:col-span-2 h-[400px] rounded-2xl" />
          <USkeleton class="h-[400px] rounded-2xl" />
        </div>

        <!-- Empty State -->
        <div
          v-else-if="overviewData.athletes.length === 0"
          class="py-24 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl"
        >
          <div class="bg-neutral-100 dark:bg-neutral-800 p-6 rounded-full inline-block mb-4">
            <UIcon name="i-heroicons-users" class="w-12 h-12 text-neutral-400" />
          </div>
          <h3 class="text-xl font-bold">Connect Your First Athlete</h3>
          <p class="text-neutral-500 max-w-sm mx-auto mb-6">
            Connecting athletes allows you to track their weekly compliance and live activity feed.
          </p>
          <UButton color="primary" size="lg" to="/coaching/athletes" label="Go to Athletes" />
        </div>

        <!-- 2. Main Strategic Grid -->
        <div v-else class="space-y-8">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <!-- Weekly Compliance (2/3) -->
            <div class="lg:col-span-2">
              <CoachingWeeklyCompliance
                :athletes="overviewData.athletes"
                :week-days="overviewData.weekDays"
              />
            </div>

            <!-- Recent Activity (1/3) -->
            <div class="h-full">
              <CoachingActivityFeed :feed="overviewData.feed" />
            </div>
          </div>

          <!-- 3. Full Roster Grid (Original Element) -->
          <div class="space-y-4">
            <div class="flex items-center justify-between px-4 sm:px-0">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Your Roster
              </h2>
              <UButton
                variant="link"
                color="primary"
                to="/coaching/athletes"
                label="Manage Roster"
                icon="i-heroicons-arrow-right"
                trailing
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <UCard
                v-for="athlete in overviewData.athletes.slice(0, 8)"
                :key="athlete.id"
                class="hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer group"
                :ui="{ body: 'p-4' }"
                @click="router.push(`/coaching/athletes/${athlete.id}`)"
              >
                <div class="flex items-center gap-3">
                  <UAvatar :src="athlete.image" :alt="athlete.name" size="md" />
                  <div class="flex-1 min-w-0">
                    <p
                      class="font-bold text-sm truncate group-hover:text-primary-600 transition-colors"
                    >
                      {{ athlete.name }}
                    </p>
                    <div class="flex gap-1 mt-1">
                      <div
                        v-for="(day, idx) in athlete.compliance.slice(-5)"
                        :key="idx"
                        class="w-1.5 h-1.5 rounded-full"
                        :class="getMiniStatusClass(day.status)"
                      />
                    </div>
                  </div>
                  <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
                </div>
              </UCard>
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
        content: 'Strategic overview of your athletes performance and compliance.'
      }
    ]
  })

  const router = useRouter()
  const toast = useToast()
  const loading = ref(true)
  const overviewData = ref<any>({
    athletes: [],
    feed: [],
    weekDays: []
  })

  async function fetchData() {
    loading.value = true
    try {
      const data = await $fetch('/api/coaching/overview')
      overviewData.value = data
    } catch (e) {
      console.error(e)
      toast.add({ title: 'Failed to load coaching overview', color: 'error' })
    } finally {
      loading.value = false
    }
  }

  function getMiniStatusClass(status: string) {
    if (status === 'completed' || status === 'unscheduled_completed') return 'bg-green-500'
    if (status === 'missed') return 'bg-orange-500'
    if (status === 'planned') return 'bg-blue-500'
    return 'bg-neutral-200 dark:bg-neutral-800'
  }

  onMounted(fetchData)
</script>
