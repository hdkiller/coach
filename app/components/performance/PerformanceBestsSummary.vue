<template>
  <div v-if="summaryItems.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <UCard
      v-for="cat in summaryItems"
      :key="cat.id"
      class="floating-card-base grain-overlay rounded-[32px] cursor-pointer group"
      :ui="{
        root: 'overflow-visible',
        body: 'p-8 flex flex-col gap-8'
      }"
      @click="navigateTo('/performance/bests')"
    >
      <div class="flex items-center justify-between">
        <div
          class="p-4 rounded-2xl bg-gray-950 border border-white/5 group-hover:border-primary-500/40 transition-colors duration-500"
        >
          <UIcon :name="cat.icon" class="w-6 h-6" :class="cat.iconColor" />
        </div>
        <div
          v-if="cat.pb && isRecent(cat.pb.date)"
          class="w-3 h-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.8)]"
        />
      </div>

      <div v-if="cat.pb" class="space-y-2">
        <div
          class="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]"
        >
          {{ formatType(cat.pb.type) }}
        </div>
        <div class="flex items-baseline gap-3">
          <span
            class="text-6xl font-black text-white tabular-nums italic tracking-tighter leading-none"
          >
            {{ formatValue(cat.pb) }}
          </span>
          <span
            v-if="cat.pb.unit !== 's'"
            class="text-base font-black text-gray-600 uppercase italic"
            >{{ cat.pb.unit }}</span
          >
          <span
            v-else
            class="text-[10px] font-black text-gray-600 uppercase tracking-widest italic"
            >pace</span
          >
        </div>
      </div>

      <div
        class="flex items-center justify-between mt-auto pt-6 border-t border-white/5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500"
      >
        <span class="text-[10px] font-black text-primary-500 uppercase tracking-widest"
          >Hall of Fame</span
        >
        <div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
          <UIcon
            name="i-heroicons-arrow-right"
            class="w-4 h-4"
          />
        </div>
      </div>
    </UCard>

    <!-- Link Card to Full Trophy Case -->
    <UCard
      class="floating-card-base grain-overlay border-dashed border-white/10 group hover:border-primary-500/50 transition-all duration-500 cursor-pointer flex flex-col justify-center items-center text-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]"
      :ui="{ root: 'rounded-[32px]', body: 'p-0 h-full flex items-center justify-center' }"
      @click="navigateTo('/performance/bests')"
    >
      <div class="flex flex-col items-center justify-center py-10">
        <div
          class="w-16 h-16 rounded-[24px] bg-gray-950 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-primary-500/30 transition-all duration-500"
        >
          <UIcon
            name="i-heroicons-trophy"
            class="w-8 h-8 text-gray-600 group-hover:text-primary-500 transition-colors"
          />
        </div>
        <span
          class="text-[11px] font-black text-white uppercase tracking-[0.3em]"
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
