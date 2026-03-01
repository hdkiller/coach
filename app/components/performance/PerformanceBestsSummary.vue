<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <UCard
      v-for="cat in summaryItems"
      :key="cat.id"
      class="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-l-4 group hover:border-primary-300 transition-all cursor-pointer shadow-sm hover:shadow-md"
      :class="cat.borderColor"
      @click="navigateTo('/performance/bests')"
    >
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">{{
            cat.label
          }}</span>
          <UIcon :name="cat.icon" class="w-3.5 h-3.5" :class="cat.iconColor" />
        </div>

        <div v-if="cat.pb" class="space-y-0.5">
          <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
            {{ formatType(cat.pb.type) }}
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-xl font-black text-gray-900 dark:text-white tabular-nums">
              {{ formatValue(cat.pb) }}
            </span>
            <span
              v-if="cat.pb.unit !== 's'"
              class="text-[10px] font-bold text-gray-500 uppercase"
              >{{ cat.pb.unit }}</span
            >
          </div>
        </div>

        <div v-else class="py-2">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic"
            >No records yet</span
          >
        </div>

        <!-- Hover indicator -->
        <div
          class="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span class="text-[8px] font-black text-primary-500 uppercase tracking-widest"
            >View All</span
          >
          <UIcon name="i-heroicons-arrow-right" class="w-2.5 h-2.5 text-primary-500" />
        </div>
      </div>
    </UCard>

    <!-- Link Card to Full Trophy Case -->
    <UCard
      class="bg-gray-50 dark:bg-gray-900/50 border-l-4 border-l-gray-300 group hover:border-primary-500 transition-all cursor-pointer flex flex-col justify-center items-center text-center py-0"
      @click="navigateTo('/performance/bests')"
    >
      <div class="flex flex-col items-center justify-center h-full">
        <UIcon
          name="i-heroicons-trophy"
          class="w-6 h-6 text-gray-400 group-hover:text-primary-500 mb-2 transition-colors"
        />
        <span class="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest"
          >View Trophy Case</span
        >
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    personalBests: any[]
  }>()

  const categories = [
    {
      id: 'RUN',
      label: 'Running',
      icon: 'i-heroicons-sparkles',
      borderColor: 'border-l-blue-500',
      iconColor: 'text-blue-500'
    },
    {
      id: 'CYCLE',
      label: 'Cycling',
      icon: 'i-heroicons-bolt',
      borderColor: 'border-l-green-500',
      iconColor: 'text-green-500'
    },
    {
      id: 'SWIM',
      label: 'Swimming',
      icon: 'i-heroicons-beaker',
      borderColor: 'border-l-cyan-500',
      iconColor: 'text-cyan-500'
    }
  ]

  const summaryItems = computed(() => {
    return categories.map((cat) => {
      // Find the "best" PB for this category to show as summary
      // We prioritize certain types like 5K for run, 20M Power for cycle
      const pbs = props.personalBests.filter((pb) => pb.category === cat.id)
      let bestPb = null

      if (cat.id === 'RUN') {
        bestPb =
          pbs.find((p) => p.type === 'RUN_5K') || pbs.find((p) => p.type === 'RUN_1K') || pbs[0]
      } else if (cat.id === 'CYCLE') {
        bestPb =
          pbs.find((p) => p.type === 'POWER_20M') ||
          pbs.find((p) => p.type === 'POWER_60M') ||
          pbs[0]
      } else {
        bestPb = pbs[0]
      }

      return {
        ...cat,
        pb: bestPb
      }
    })
  })

  function formatValue(pb: any) {
    if (pb.unit === 's') {
      const mins = Math.floor(pb.value / 60)
      const secs = Math.floor(pb.value % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${Math.round(pb.value)}`
  }

  function formatType(type: string) {
    return type
      .replace(/_/g, ' ')
      .replace('RUN ', '')
      .replace('POWER ', 'Peak ')
      .replace('ELEVATION GAIN', 'Max Climb')
  }
</script>
