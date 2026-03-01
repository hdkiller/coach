<script setup lang="ts">
  const props = defineProps<{
    personalBests: any[]
  }>()

  const categories = [
    { id: 'RUN', label: 'Running', icon: 'i-heroicons-sparkles' },
    { id: 'CYCLE', label: 'Cycling', icon: 'i-heroicons-bolt' },
    { id: 'SWIM', label: 'Swimming', icon: 'i-heroicons-beaker' },
    { id: 'OTHER', label: 'Other', icon: 'i-heroicons-trophy' }
  ]

  const pbsByCategory = computed(() => {
    const map: Record<string, any[]> = {}
    if (!props.personalBests) return map
    props.personalBests.forEach((pb) => {
      if (!pb || !pb.category) return
      if (!map[pb.category]) map[pb.category] = []
      map[pb.category]!.push(pb)
    })
    return map
  })

  function formatValue(pb: any) {
    if (pb.unit === 's') {
      const mins = Math.floor(pb.value / 60)
      const secs = Math.floor(pb.value % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${Math.round(pb.value)}${pb.unit}`
  }

  function formatType(type: string) {
    return type
      .replace(/_/g, ' ')
      .replace('RUN ', '')
      .replace('POWER ', 'Peak ')
      .replace('ELEVATION GAIN', 'Max Climb')
  }
</script>

<template>
  <div class="space-y-6">
    <UCard v-for="cat in categories.filter((c) => pbsByCategory[c.id])" :key="cat.id">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon :name="cat.icon" class="w-5 h-5 text-primary-500" />
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            {{ cat.label }} All-Time Records
          </h3>
        </div>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div
          v-for="pb in pbsByCategory[cat.id]"
          :key="pb.id"
          class="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 flex flex-col gap-1 group hover:border-primary-500/30 transition-colors"
        >
          <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            {{ formatType(pb.type) }}
          </div>
          <div class="text-2xl font-black text-gray-900 dark:text-white flex items-baseline gap-1">
            {{ formatValue(pb) }}
            <span v-if="pb.unit !== 's'" class="text-xs font-bold text-gray-500 uppercase">{{
              pb.unit
            }}</span>
          </div>
          <div
            class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800"
          >
            <NuxtLink
              v-if="pb.workoutId"
              :to="`/workouts/${pb.workoutId}`"
              class="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              <UIcon name="i-heroicons-link" class="w-3 h-3" />
              View Workout
            </NuxtLink>
            <div class="text-[9px] font-medium text-gray-400 uppercase">
              {{ new Date(pb.date).toLocaleDateString() }}
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <div
      v-if="personalBests.length === 0"
      class="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800"
    >
      <UIcon name="i-heroicons-trophy" class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">No records yet</h3>
      <p class="text-sm text-gray-500 max-w-xs mx-auto mt-1">
        Keep training! Coach Watts will automatically detect your personal bests from your workouts.
      </p>
    </div>
  </div>
</template>
