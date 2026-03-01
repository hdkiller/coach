<template>
  <div v-if="summaryItems.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <UCard
      v-for="cat in summaryItems"
      :key="cat.id"
      class="relative group overflow-hidden transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-xl backdrop-blur-md bg-white/80 dark:bg-gray-900/60 border border-gray-100 dark:border-white/5 cursor-pointer"
      :ui="{
        root: 'rounded-[24px]',
        body: 'p-5'
      }"
      @click="navigateTo('/performance/bests')"
    >
      <!-- Accent Line -->
      <div class="absolute top-0 left-0 w-full h-1 opacity-60" :class="cat.bgColor" />

      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div
            class="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5"
          >
            <UIcon :name="cat.icon" class="w-4 h-4" :class="cat.iconColor" />
          </div>
          <div
            v-if="cat.pb && isRecent(cat.pb.date)"
            class="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"
          />
        </div>

        <div v-if="cat.pb" class="space-y-0.5">
          <div
            class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]"
          >
            {{ formatType(cat.pb.type) }}
          </div>
          <div class="flex items-baseline gap-1.5">
            <span
              class="text-3xl font-black text-gray-900 dark:text-white tabular-nums italic tracking-tighter"
            >
              {{ formatValue(cat.pb) }}
            </span>
            <span
              v-if="cat.pb.unit !== 's'"
              class="text-xs font-black text-gray-400 dark:text-gray-600 uppercase italic opacity-60"
              >{{ cat.pb.unit }}</span
            >
            <span
              v-else
              class="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase opacity-60"
              >pace</span
            >
          </div>
        </div>

        <!-- Hover indicator -->
        <div
          class="flex items-center gap-1.5 mt-1 transition-all duration-300 transform translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
        >
          <span class="text-[9px] font-black text-primary-500 uppercase tracking-widest"
            >Hall of Fame</span
          >
          <UIcon
            name="i-heroicons-arrow-right"
            class="w-3 h-3 text-primary-500 transition-transform duration-300 group-hover:translate-x-1"
          />
        </div>
      </div>
    </UCard>

    <!-- Link Card to Full Trophy Case -->
    <UCard
      class="backdrop-blur-md bg-gray-50/50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-white/5 group hover:border-primary-500/50 transition-all duration-500 cursor-pointer flex flex-col justify-center items-center text-center"
      :ui="{ root: 'rounded-[24px]', body: 'p-0 h-full flex items-center justify-center' }"
      @click="navigateTo('/performance/bests')"
    >
      <div class="flex flex-col items-center justify-center py-6">
        <div
          class="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500"
        >
          <UIcon
            name="i-heroicons-trophy"
            class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors"
          />
        </div>
        <span
          class="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]"
          >Full Trophy Case</span
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
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500'
    },
    {
      id: 'CYCLE',
      label: 'Cycling',
      icon: 'i-heroicons-bolt',
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500'
    },
    {
      id: 'SWIM',
      label: 'Swimming',
      icon: 'i-heroicons-beaker',
      iconColor: 'text-cyan-500',
      bgColor: 'bg-cyan-500'
    }
  ]

  const summaryItems = computed(() => {
    if (!props.personalBests?.length) return []

    return categories
      .map((cat) => {
        const pbs = props.personalBests.filter((pb) => pb.category === cat.id)
        if (!pbs.length) return null

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
      .filter(Boolean) as any[]
  })

  function isRecent(date: string | Date) {
    const d = new Date(date)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return d > thirtyDaysAgo
  }

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
