<template>
  <UDashboardPanel id="event-detail">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" to="/events">
            Back
          </UButton>
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-heroicons-pencil-square"
              color="primary"
              variant="soft"
              size="sm"
              class="font-bold uppercase tracking-tight"
              @click="openEditModal"
            >
              Edit
            </UButton>
            <UButton
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="sm"
              @click="confirmDeleteEvent"
            />
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-4xl mx-auto w-full p-0 sm:p-6 pb-24 space-y-4 sm:space-y-8">
        <div v-if="loading" class="flex items-center justify-center py-24">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
        </div>

        <div v-else-if="error" class="p-6 text-center">
          <UAlert
            icon="i-heroicons-exclamation-triangle"
            color="error"
            variant="soft"
            title="Data Error"
            :description="error"
          />
        </div>

        <div v-else-if="event" class="space-y-4 sm:space-y-8">
          <!-- 0. THE DATE HEADER -->
          <UCard
            :ui="{
              root: 'rounded-none sm:rounded-xl shadow-none sm:shadow border-x-0 sm:border-x'
            }"
            class="shadow-sm overflow-hidden border-primary-100 dark:border-primary-900/50"
          >
            <div class="flex items-center gap-2 sm:justify-between relative z-10 px-4 py-2">
              <div class="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <!-- Title Section -->
                <div class="md:col-span-2">
                  <div
                    class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 italic mb-1"
                  >
                    {{ formatDateUTC(event.date, 'EEEE, MMMM do yyyy') }}
                  </div>
                  <h1
                    class="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase truncate"
                  >
                    {{ event.title }}
                  </h1>
                  <p
                    class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
                  >
                    {{ event.type || 'General Event' }}
                    <span v-if="event.subType">/ {{ event.subType }}</span>
                  </p>
                </div>

                <!-- Priority Badge -->
                <div
                  class="hidden md:flex md:col-span-1 items-center justify-end pl-6 border-l border-gray-100 dark:border-gray-800"
                >
                  <div class="space-y-1 text-right">
                    <span :class="getPriorityBadgeClass(event.priority)">
                      Priority {{ event.priority }}
                    </span>
                    <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                      Target Event
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <!-- Main Content (2/3) -->
            <div class="lg:col-span-2 space-y-4 sm:space-y-8">
              <UCard
                :ui="{
                  root: 'rounded-none sm:rounded-xl shadow-none sm:shadow border-x-0 sm:border-x',
                  body: 'p-4 sm:p-6'
                }"
              >
                <!-- Key Stats Grid -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div
                    v-if="event.distance"
                    class="rounded-xl p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50"
                  >
                    <div
                      class="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1"
                    >
                      Distance
                    </div>
                    <div
                      class="text-2xl font-black text-blue-900 dark:text-blue-100 tracking-tight"
                    >
                      {{ event.distance
                      }}<span class="text-xs font-bold text-blue-500 uppercase ml-1">km</span>
                    </div>
                  </div>

                  <div
                    v-if="event.elevation"
                    class="rounded-xl p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50"
                  >
                    <div
                      class="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 mb-1"
                    >
                      Elevation
                    </div>
                    <div
                      class="text-2xl font-black text-green-900 dark:text-green-100 tracking-tight"
                    >
                      {{ event.elevation
                      }}<span class="text-xs font-bold text-green-500 uppercase ml-1">m</span>
                    </div>
                  </div>

                  <div
                    v-if="event.expectedDuration"
                    class="rounded-xl p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50"
                  >
                    <div
                      class="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1"
                    >
                      Duration
                    </div>
                    <div
                      class="text-2xl font-black text-purple-900 dark:text-purple-100 tracking-tight"
                    >
                      {{ event.expectedDuration
                      }}<span class="text-xs font-bold text-purple-500 uppercase ml-1">h</span>
                    </div>
                  </div>

                  <div
                    class="rounded-xl p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                  >
                    <div
                      class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1"
                    >
                      Location
                    </div>
                    <div
                      class="text-sm font-black text-gray-900 dark:text-white uppercase truncate tracking-tight"
                    >
                      {{ formatLocation(event) || 'TBD' }}
                    </div>
                  </div>
                </div>

                <!-- Details & Description -->
                <div
                  v-if="event.description || event.startTime || event.websiteUrl"
                  class="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 space-y-6"
                >
                  <div class="flex flex-wrap gap-6">
                    <div v-if="event.startTime" class="space-y-1">
                      <div class="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        Start Time
                      </div>
                      <div
                        class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5"
                      >
                        <UIcon name="i-heroicons-clock" class="w-4 h-4 text-primary-500" />
                        {{ event.startTime }}
                      </div>
                    </div>
                    <div v-if="event.websiteUrl" class="space-y-1">
                      <div class="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        Official Site
                      </div>
                      <a
                        :href="event.websiteUrl"
                        target="_blank"
                        class="text-sm font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1.5 hover:underline transition-all"
                      >
                        <UIcon name="i-heroicons-link" class="w-4 h-4" />
                        Visit Website
                      </a>
                    </div>
                  </div>

                  <div v-if="event.description" class="space-y-2">
                    <h3 class="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      Description
                    </h3>
                    <p
                      class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium"
                    >
                      {{ event.description }}
                    </p>
                  </div>
                </div>
              </UCard>
            </div>

            <!-- Sidebar (1/3) -->
            <div class="lg:col-span-1 space-y-4 sm:space-y-8">
              <!-- Linked Goals -->
              <UCard
                v-if="event.goals && event.goals.length > 0"
                :ui="{
                  root: 'rounded-none sm:rounded-xl shadow-none sm:shadow border-x-0 sm:border-x',
                  header: 'border-b border-gray-100 dark:border-gray-800',
                  body: 'p-4 sm:p-6'
                }"
              >
                <template #header>
                  <h2
                    class="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"
                  >
                    <UIcon name="i-heroicons-flag" class="w-4 h-4 text-primary-500" />
                    Linked Goals
                  </h2>
                </template>

                <div class="space-y-3">
                  <div
                    v-for="goal in event.goals"
                    :key="goal.id"
                    class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-500/50 transition-all group"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <div
                          class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate"
                        >
                          {{ goal.title }}
                        </div>
                        <div
                          class="text-[9px] text-gray-500 mt-1 font-bold uppercase tracking-widest italic"
                        >
                          Target: {{ formatDateUTC(goal.targetDate) }}
                        </div>
                      </div>
                      <UBadge
                        :color="goal.status === 'COMPLETED' ? 'success' : 'primary'"
                        variant="soft"
                        size="xs"
                        class="font-black uppercase tracking-widest text-[8px]"
                      >
                        {{ goal.status === 'COMPLETED' ? 'Done' : 'Active' }}
                      </UBadge>
                    </div>
                  </div>
                </div>
              </UCard>

              <!-- Empty State for Sidebar -->
              <div
                v-else
                class="bg-gray-50 dark:bg-gray-900/50 rounded-none sm:rounded-xl p-8 text-center border-y sm:border border-gray-100 dark:border-gray-800"
              >
                <UIcon name="i-heroicons-flag" class="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p class="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  No Linked Goals
                </p>
                <p
                  class="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed mt-2 italic px-4"
                >
                  Connect this event to a training goal to track specific progress.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Event Form Modal (Edit) -->
      <UModal v-model:open="isEventFormOpen" title="Edit Event" description="Update event details.">
        <template #body>
          <EventForm
            :initial-data="event"
            @success="onEventUpdated"
            @cancel="isEventFormOpen = false"
          />
        </template>
      </UModal>

      <!-- Delete Confirmation Modal -->
      <UModal
        v-model:open="isDeleteModalOpen"
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
      >
        <template #body>
          <div class="space-y-4">
            <p>
              Are you sure you want to delete <strong>{{ event?.title }}</strong
              >?
            </p>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false"
                >Cancel</UButton
              >
              <UButton color="error" variant="solid" :loading="deleting" @click="deleteEvent"
                >Delete</UButton
              >
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import EventForm from '~/components/events/EventForm.vue'

  definePageMeta({
    middleware: 'auth',
    layout: 'default'
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const { formatDateUTC } = useFormat()

  const event = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const isEventFormOpen = ref(false)
  const isDeleteModalOpen = ref(false)
  const deleting = ref(false)

  useHead(() => {
    if (!event.value) {
      return { title: 'Event Details' }
    }
    return {
      title: `${event.value.title} | Coach Wattz`,
      meta: [{ name: 'description', content: `Details for ${event.value.title}` }]
    }
  })

  async function fetchEvent() {
    loading.value = true
    error.value = null
    try {
      const id = route.params.id
      event.value = await $fetch(`/api/events/${id}`)
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to load event'
      console.error('Error fetching event:', e)
    } finally {
      loading.value = false
    }
  }

  function openEditModal() {
    isEventFormOpen.value = true
  }

  function onEventUpdated() {
    isEventFormOpen.value = false
    fetchEvent()
    toast.add({
      title: 'Success',
      description: 'Event updated successfully',
      color: 'success'
    })
  }

  function confirmDeleteEvent() {
    isDeleteModalOpen.value = true
  }

  async function deleteEvent() {
    if (!event.value) return

    deleting.value = true
    try {
      await $fetch(`/api/events/${event.value.id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: 'Success',
        description: 'Event deleted successfully',
        color: 'success'
      })
      router.push('/events')
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to delete event',
        color: 'error'
      })
    } finally {
      deleting.value = false
      isDeleteModalOpen.value = false
    }
  }

  function formatLocation(event: any) {
    const parts = []
    if (event.city) parts.push(event.city)
    if (event.country) parts.push(event.country)
    if (parts.length === 0 && event.location) return event.location
    return parts.join(', ')
  }

  function getPriorityBadgeClass(priority: string) {
    const baseClass = 'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest'
    switch (priority) {
      case 'A':
        return `${baseClass} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 shadow-sm`
      case 'B':
        return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shadow-sm`
      case 'C':
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm`
      default:
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm`
    }
  }

  onMounted(() => {
    fetchEvent()
  })
</script>
