<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-hidden"
  >
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-950">
          <tr>
            <th
              class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              Date
            </th>
            <th
              class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              Recov
            </th>
            <th
              class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              Readiness
            </th>
            <th
              class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              Sleep
            </th>
            <th
              class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              HRV
            </th>
            <th
              class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              RHR
            </th>
            <th
              class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              Weight
            </th>
            <th
              class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              BP
            </th>
            <th
              class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              Feel
            </th>
          </tr>
        </thead>
        <tbody
          v-if="loading"
          class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800"
        >
          <tr v-for="i in 10" :key="i">
            <td v-for="j in 9" :key="j" class="px-6 py-4">
              <USkeleton class="h-4 w-full" />
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="wellness.length === 0" class="bg-white dark:bg-gray-900">
          <tr>
            <td
              colspan="9"
              class="p-8 text-center text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest text-xs"
            >
              No biometric data recorded
            </td>
          </tr>
        </tbody>
        <tbody
          v-else
          class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800"
        >
          <tr
            v-for="item in wellness"
            :key="item.id"
            class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="navigateToWellness(item.id)"
          >
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium uppercase tracking-tight"
            >
              {{ formatDateUTC(item.date, 'MMM dd, yyyy') }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span
                v-if="item.recoveryScore"
                :class="getRecoveryBadgeClass(item.recoveryScore)"
                class="px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-widest"
              >
                {{ item.recoveryScore }}%
              </span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-bold tabular-nums"
            >
              {{ item.readiness ? item.readiness + '/10' : '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
              <div class="font-black tabular-nums">
                {{ item.sleepHours ? item.sleepHours.toFixed(1) + 'h' : '-' }}
              </div>
              <div
                v-if="item.sleepScore"
                class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter"
              >
                {{ item.sleepScore }}% Qual
              </div>
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-bold tabular-nums"
            >
              {{ item.hrv ? Math.round(item.hrv) + 'ms' : '-' }}
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-bold tabular-nums"
            >
              {{ item.restingHr ? item.restingHr : '-' }}
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-bold tabular-nums"
            >
              {{ item.weight ? item.weight.toFixed(1) + 'kg' : '-' }}
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-bold tabular-nums"
            >
              {{
                item.systolic && item.diastolic
                  ? `${item.systolic}/${item.diastolic}`
                  : '-'
              }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span
                v-if="item.mood"
                :class="getMoodBadgeClass(item.mood)"
                class="px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-widest"
              >
                {{ item.mood }}/10
              </span>
              <span v-else class="text-gray-400">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/30"
    >
      <div class="flex items-center justify-between">
        <div class="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }}-{{
            Math.min(currentPage * itemsPerPage, totalItems)
          }}
          of {{ totalItems }} entries
        </div>
        <div class="flex gap-2">
          <UButton
            :disabled="currentPage === 1"
            color="neutral"
            variant="ghost"
            size="xs"
            class="font-black uppercase tracking-widest text-[10px]"
            @click="$emit('update:page', currentPage - 1)"
          >
            Prev
          </UButton>
          <div class="flex gap-1">
            <UButton
              v-for="page in visiblePages"
              :key="page"
              size="xs"
              :color="page === currentPage ? 'primary' : 'neutral'"
              :variant="page === currentPage ? 'solid' : 'ghost'"
              class="font-black uppercase tracking-widest text-[10px] min-w-[28px] justify-center"
              @click="$emit('update:page', page)"
            >
              {{ page }}
            </UButton>
          </div>
          <UButton
            :disabled="currentPage === totalPages"
            color="neutral"
            variant="ghost"
            size="xs"
            class="font-black uppercase tracking-widest text-[10px]"
            @click="$emit('update:page', currentPage + 1)"
          >
            Next
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    wellness: any[]
    loading: boolean
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    visiblePages: number[]
  }>()

  defineEmits(['update:page'])

  const { formatDateUTC } = useFormat()

  function getRecoveryBadgeClass(score: number) {
    const baseClass = 'px-2 py-1 rounded text-xs font-semibold'
    if (score > 80)
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
    if (score >= 60)
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
    if (score >= 40)
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
    return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
  }

  function getMoodBadgeClass(mood: number) {
    const baseClass = 'px-2 py-1 rounded text-xs font-semibold'
    if (mood >= 8)
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
    if (mood >= 6)
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
    if (mood >= 4)
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
    return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
  }

  function navigateToWellness(id: string) {
    navigateTo(`/fitness/${id}`)
  }
</script>
