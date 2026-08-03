<template>
  <UDashboardPanel id="calendar">
    <template #header>
      <UDashboardNavbar title="Community Calendar">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 w-full max-w-7xl mx-auto">
        <div class="mb-8">
          <h2 class="text-3xl font-bold font-athletic uppercase text-white tracking-tight">
            Town Hall
          </h2>
          <p class="text-gray-400 mt-2 text-lg">
            See who is racing what and RSVP to join the crew.
          </p>
        </div>

        <div v-if="pending" class="flex justify-center items-center h-64">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 animate-spin" />
        </div>

        <div v-else-if="error" class="flex flex-col justify-center items-center h-64 text-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-500 mb-4" />
          <h3 class="text-xl font-bold text-white mb-2">Error loading events</h3>
          <p class="text-gray-400">{{ error.message }}</p>
          <UButton class="mt-4" @click="refresh">Retry</UButton>
        </div>

        <div
          v-else-if="events.length === 0"
          class="flex flex-col justify-center items-center h-64 text-center bg-gray-900/50 rounded-xl border border-white/5 p-8"
        >
          <UIcon name="i-heroicons-calendar" class="w-12 h-12 text-gray-500 mb-4" />
          <h3 class="text-xl font-bold text-white mb-2">No Upcoming Events</h3>
          <p class="text-gray-400">Check back later for new community races and socials.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <UCard
            v-for="event in events"
            :key="event.id"
            class="flex flex-col bg-gray-900 border-white/10 hover:border-primary-500/50 transition-colors"
          >
            <div class="flex justify-between items-start mb-4">
              <UBadge
                :color="getTypeColor(event.type)"
                variant="subtle"
                size="sm"
                class="uppercase tracking-widest font-bold text-[10px]"
              >
                {{ event.type || 'Event' }}
              </UBadge>
              <div class="text-right">
                <div class="text-lg font-bold text-white">{{ formatDate(event.date) }}</div>
                <div class="text-xs text-gray-500">
                  {{ formatDistanceToNow(new Date(event.date), { addSuffix: true }) }}
                </div>
              </div>
            </div>

            <h3 class="text-xl font-bold text-white mb-2 font-athletic uppercase leading-tight">
              {{ event.title }}
            </h3>

            <div class="flex items-center gap-2 text-gray-400 text-sm mb-4">
              <UIcon name="i-heroicons-map-pin" class="w-4 h-4 flex-shrink-0" />
              <span class="truncate">{{ event.location || 'TBD' }}</span>
            </div>

            <p class="text-sm text-gray-400 mb-6 line-clamp-2 min-h-[40px]">
              {{ event.description }}
            </p>

            <div class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UAvatarGroup
                  v-if="event.participants && event.participants.length > 0"
                  size="sm"
                  :max="3"
                >
                  <UAvatar
                    v-for="p in event.participants"
                    :key="p.id"
                    :src="p.image || undefined"
                    :alt="p.name || 'Athlete'"
                    :text="p.name ? p.name.charAt(0).toUpperCase() : 'A'"
                    class="ring-gray-900"
                  />
                </UAvatarGroup>
                <div class="text-xs font-medium text-gray-400">
                  <span v-if="event.participants && event.participants.length > 0">
                    <strong class="text-white">{{ event.participants.length }}</strong> Racing
                  </span>
                  <span v-else>Be the first</span>
                </div>
              </div>

              <UButton
                :color="isParticipating(event) ? 'green' : 'primary'"
                :variant="isParticipating(event) ? 'subtle' : 'solid'"
                :icon="isParticipating(event) ? 'i-heroicons-check' : 'i-heroicons-plus'"
                size="sm"
                :loading="loadingEventId === event.id"
                @click="toggleRSVP(event.id)"
              >
                {{ isParticipating(event) ? "You're Racing!" : "I'm Racing This!" }}
              </UButton>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { format, formatDistanceToNow } from 'date-fns'

  definePageMeta({
    middleware: 'auth',
    layout: 'dashboard'
  })

  const { data: session } = useAuth()
  const {
    data: events,
    pending,
    error,
    refresh
  } = useFetch('/api/events', {
    default: () => []
  })

  const loadingEventId = ref<string | null>(null)
  const toast = useToast()

  const isParticipating = (event: any) => {
    if (!session.value?.user?.id || !event.participants) return false
    return event.participants.some((p: any) => p.id === session.value.user.id)
  }

  const toggleRSVP = async (eventId: string) => {
    loadingEventId.value = eventId
    try {
      await $fetch('/api/events/rsvp', {
        method: 'POST',
        body: { eventId }
      })

      // Refresh the local data to reflect new RSVP status
      await refresh()

      toast.add({
        title: 'RSVP Updated',
        icon: 'i-heroicons-check-circle',
        color: 'green'
      })
    } catch (e: any) {
      toast.add({
        title: 'Failed to update RSVP',
        description: e.message || 'Please try again.',
        icon: 'i-heroicons-exclamation-triangle',
        color: 'red'
      })
    } finally {
      loadingEventId.value = null
    }
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM do, yyyy')
  }

  const getTypeColor = (type: string | null) => {
    if (!type) return 'gray'
    const t = type.toLowerCase()
    if (t.includes('triathlon')) return 'blue'
    if (t.includes('run')) return 'orange'
    if (t.includes('cycl') || t.includes('bike')) return 'cyan'
    if (t.includes('social')) return 'purple'
    if (t.includes('swim')) return 'sky'
    return 'primary'
  }
</script>
