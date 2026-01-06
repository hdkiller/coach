<script setup lang="ts">
import { format } from 'date-fns'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const page = ref(1)
const pageCount = ref(20)

const { data, pending, refresh } = await useFetch('/api/admin/webhooks', {
  query: {
    page,
    limit: pageCount
  },
  watch: [page]
})

const columns = [
  {
    accessorKey: 'provider',
    header: 'Provider',
    id: 'provider'
  },
  {
    accessorKey: 'eventType',
    header: 'Event Type',
    id: 'eventType'
  },
  {
    accessorKey: 'status',
    header: 'Status',
    id: 'status'
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    id: 'createdAt'
  },
  {
    id: 'actions',
    header: 'Actions'
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PROCESSED': return 'green'
    case 'PENDING': return 'yellow'
    case 'FAILED': return 'red'
    case 'IGNORED': return 'gray'
    default: return 'gray'
  }
}

const selectedLog = ref<any>(null)
const isDetailsOpen = ref(false)

const openDetails = (log: any) => {
  selectedLog.value = log
  isDetailsOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Webhook Logs</h1>
      <UButton
        icon="i-heroicons-arrow-path"
        color="gray"
        variant="ghost"
        :loading="pending"
        @click="refresh"
      />
    </div>

    <UCard>
      <UTable
        :data="data?.data || []"
        :columns="columns"
        :loading="pending"
      >
        <template #status-cell="{ row }">
          <UBadge :color="getStatusColor(row.original.status)" variant="subtle" size="xs">
            {{ row.original.status }}
          </UBadge>
        </template>

        <template #createdAt-cell="{ row }">
          {{ format(new Date(row.original.createdAt), 'MMM d, yyyy HH:mm:ss') }}
        </template>

        <template #actions-cell="{ row }">
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-eye"
            size="xs"
            @click="openDetails(row.original)"
          />
        </template>
      </UTable>

      <div class="flex justify-end px-3 py-3.5 border-t border-gray-200 dark:border-gray-700">
        <UPagination
          v-if="data?.meta"
          v-model="page"
          :page-count="pageCount"
          :total="data.meta.total"
        />
      </div>
    </UCard>

    <UModal v-model:open="isDetailsOpen">
      <template #content>
        <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                Webhook Details
              </h3>
              <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isDetailsOpen = false" />
            </div>
          </template>

          <div class="space-y-4" v-if="selectedLog">
            <div>
              <span class="font-bold">ID:</span> {{ selectedLog.id }}
            </div>
            <div>
              <span class="font-bold">Provider:</span> {{ selectedLog.provider }}
            </div>
            <div>
              <span class="font-bold">Event Type:</span> {{ selectedLog.eventType }}
            </div>
            <div>
              <span class="font-bold">Status:</span>
              <UBadge :color="getStatusColor(selectedLog.status)" variant="subtle" size="xs" class="ml-2">
                {{ selectedLog.status }}
              </UBadge>
            </div>
            <div>
              <span class="font-bold">Processed At:</span> {{ selectedLog.processedAt ? format(new Date(selectedLog.processedAt), 'MMM d, yyyy HH:mm:ss') : 'N/A' }}
            </div>
            <div v-if="selectedLog.error">
              <span class="font-bold text-red-500">Error:</span>
              <pre class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-xs overflow-x-auto">{{ selectedLog.error }}</pre>
            </div>
            
            <div>
              <h4 class="font-bold mb-2">Payload</h4>
              <pre class="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">{{ JSON.stringify(selectedLog.payload, null, 2) }}</pre>
            </div>
            
            <div v-if="selectedLog.headers">
              <h4 class="font-bold mb-2">Headers</h4>
              <pre class="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">{{ JSON.stringify(selectedLog.headers, null, 2) }}</pre>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
