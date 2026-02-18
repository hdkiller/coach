<script setup lang="ts">
  const props = defineProps<{
    userId: string
    currentIssueId?: string
  }>()

  const { data: tickets, pending } = await useFetch(`/api/admin/users/${props.userId}/tickets`)

  const otherIssues = computed(() => {
    if (!tickets.value) return []
    return tickets.value.filter((t: any) => t.id !== props.currentIssueId)
  })

  function getStatusColor(status: string) {
    switch (status) {
      case 'OPEN':
        return 'error'
      case 'IN_PROGRESS':
        return 'warning'
      case 'RESOLVED':
        return 'success'
      case 'CLOSED':
        return 'neutral'
      default:
        return 'neutral'
    }
  }

  const { formatDate } = useFormat()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">User's Other Issues</h3>
        <UBadge v-if="otherIssues.length > 0" color="neutral" variant="subtle" size="xs">
          {{ otherIssues.length }}
        </UBadge>
      </div>
    </template>

    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
    </div>

    <div v-else-if="otherIssues.length === 0" class="py-4 text-center text-xs text-gray-500 italic">
      No other issues from this user.
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="ticket in otherIssues"
        :key="ticket.id"
        class="group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        @click="navigateTo(`/admin/issues/${ticket.id}`)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <p
              class="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-primary-500"
            >
              {{ ticket.title }}
            </p>
            <p class="text-[10px] text-gray-500 mt-0.5">
              {{ formatDate(ticket.createdAt, 'MMM d, yyyy') }}
            </p>
          </div>
          <UBadge :color="getStatusColor(ticket.status)" variant="soft" size="xs" class="mt-0.5">
            {{ ticket.status }}
          </UBadge>
        </div>
      </div>
    </div>
  </UCard>
</template>
