<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }" class="overflow-hidden">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-black uppercase tracking-widest text-neutral-500">
          Weekly Compliance Overview
        </h3>
        <div class="flex items-center gap-4 text-[10px] font-bold uppercase">
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded-full bg-green-500" />
            <span>Completed</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded-full bg-orange-500" />
            <span>Missed</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded-full bg-blue-500" />
            <span>Planned</span>
          </div>
        </div>
      </div>
    </template>

    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr
            class="border-b border-gray-100 dark:border-gray-800 bg-neutral-50/50 dark:bg-neutral-900/50"
          >
            <th
              class="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-neutral-400 min-w-[160px] sticky left-0 bg-white dark:bg-gray-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
            >
              Athlete
            </th>
            <th
              v-for="day in weekDays"
              :key="day.date"
              class="py-3 px-2 text-center text-[10px] font-black uppercase tracking-wider text-neutral-400 min-w-[80px]"
            >
              <div>{{ day.label }}</div>
              <div class="text-[9px] opacity-50">{{ formatDate(day.date, 'MMM d') }}</div>
            </th>
            <th
              class="py-3 px-4 text-right text-[10px] font-black uppercase tracking-wider text-neutral-400"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="athlete in athletes" :key="athlete.id">
            <!-- Main Row -->
            <tr
              class="border-b border-gray-50 dark:border-gray-800/50 hover:bg-neutral-50/30 dark:hover:bg-neutral-800/10 transition-colors cursor-pointer"
              :class="{
                'bg-primary-50/30 dark:bg-primary-950/10': expandedAthleteId === athlete.id
              }"
              @click="toggleExpand(athlete.id)"
            >
              <td
                class="py-3 px-4 sticky left-0 bg-white dark:bg-gray-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
              >
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="
                      expandedAthleteId === athlete.id
                        ? 'i-heroicons-chevron-down'
                        : 'i-heroicons-chevron-right'
                    "
                    class="w-3.5 h-3.5 text-neutral-400 transition-transform"
                  />
                  <UAvatar :src="athlete.image" :alt="athlete.name" size="xs" />
                  <span class="text-sm font-bold truncate">{{ athlete.name }}</span>
                </div>
              </td>
              <td v-for="(day, idx) in athlete.compliance" :key="idx" class="py-3 px-2">
                <div class="flex items-center justify-center">
                  <UTooltip :text="getStatusTooltip(day)">
                    <div
                      class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      :class="getStatusClasses(day.status)"
                    >
                      <UIcon :name="getStatusIcon(day.status)" class="w-4 h-4" />
                    </div>
                  </UTooltip>
                </div>
              </td>
              <td class="py-3 px-4 text-right">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-user-circle"
                  size="xs"
                  label="Profile"
                  @click.stop="goToProfile(athlete.id)"
                />
              </td>
            </tr>

            <!-- Expanded Detail Row -->
            <tr v-if="expandedAthleteId === athlete.id">
              <td
                :colspan="weekDays.length + 2"
                class="p-6 bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-gray-100 dark:border-gray-800"
              >
                <div class="max-w-4xl">
                  <CoachingAthleteCard :athlete="athlete.fullData || athlete" />
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  const props = defineProps<{
    athletes: any[]
    weekDays: any[]
  }>()

  const { formatDate } = useFormat()
  const router = useRouter()
  const expandedAthleteId = ref<string | null>(null)

  function toggleExpand(id: string) {
    if (expandedAthleteId.value === id) {
      expandedAthleteId.value = null
    } else {
      expandedAthleteId.value = id
    }
  }

  function goToProfile(id: string) {
    router.push(`/coaching/athletes/${id}`)
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return 'i-heroicons-check-circle-solid'
      case 'unscheduled_completed':
        return 'i-heroicons-bolt-solid'
      case 'missed':
        return 'i-heroicons-x-circle-solid'
      case 'planned':
        return 'i-heroicons-calendar-days'
      default:
        return 'i-heroicons-minus'
    }
  }

  function getStatusClasses(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800'
      case 'unscheduled_completed':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800/50'
      case 'missed':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 ring-1 ring-orange-200 dark:ring-orange-800'
      case 'planned':
        return 'bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400 border border-dashed border-blue-200 dark:border-blue-800'
      default:
        return 'bg-neutral-50 text-neutral-300 dark:bg-neutral-800/20 dark:text-neutral-700'
    }
  }

  function getStatusTooltip(day: any) {
    if (day.status === 'completed') return 'Completed as planned'
    if (day.status === 'unscheduled_completed') return 'Unscheduled workout completed'
    if (day.status === 'missed') return 'Missed planned workout'
    if (day.status === 'planned') return 'Planned workout'
    return 'No activity'
  }
</script>
