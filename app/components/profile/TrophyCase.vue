<script setup lang="ts">
  import { formatDistanceToNow, isToday, isYesterday } from 'date-fns'

  const props = defineProps<{
    personalBests: any[]
  }>()

  const categories = [
    { id: 'RUN', label: 'Running', icon: 'i-heroicons-sparkles', color: 'blue' },
    { id: 'CYCLE', label: 'Cycling', icon: 'i-heroicons-bolt', color: 'green' },
    { id: 'SWIM', label: 'Swimming', icon: 'i-heroicons-beaker', color: 'cyan' },
    { id: 'OTHER', label: 'Other', icon: 'i-heroicons-trophy', color: 'gray' }
  ]

  // Major milestones that should be "featured" heroes
  const heroTypes = ['RUN_5K', 'POWER_20M', 'ELEVATION_GAIN']
  const featuredTypes = ['RUN_10K', 'POWER_1M', 'POWER_5M', 'RUN_1K']

  const pbsByCategory = computed(() => {
    const map: Record<string, any[]> = {}
    if (!props.personalBests) return map

    // Sort: Heroes first, then Featured, then others
    const sorted = [...props.personalBests].sort((a, b) => {
      const getPriority = (type: string) => {
        if (heroTypes.includes(type)) return 0
        if (featuredTypes.includes(type)) return 1
        return 2
      }
      return getPriority(a.type) - getPriority(b.type)
    })

    sorted.forEach((pb) => {
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
      if (mins > 60) {
        const hrs = Math.floor(mins / 60)
        const rmins = mins % 60
        return `${hrs}:${rmins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
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

  function getHumanDate(date: string | Date) {
    try {
      const d = new Date(date)
      if (isToday(d)) return 'Today'
      if (isYesterday(d)) return 'Yesterday'
      return formatDistanceToNow(d, { addSuffix: true })
    } catch (e) {
      return ''
    }
  }

  function isRecent(date: string | Date) {
    const d = new Date(date)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return d > thirtyDaysAgo
  }

  function getSportIcon(pb: any) {
    if (pb.type.includes('POWER')) return 'i-heroicons-bolt'
    if (pb.type.includes('ELEVATION')) return 'i-heroicons-mountain-20-solid'
    if (pb.category === 'RUN') return 'i-lucide-footprints'
    if (pb.category === 'CYCLE') return 'i-heroicons-bicycle'
    return 'i-heroicons-trophy'
  }

  function getCardClass(pb: any) {
    const isHero = heroTypes.includes(pb.type)
    const recent = isRecent(pb.date)

    let classes =
      'relative group overflow-hidden transition-all duration-500 ease-out hover:-translate-y-1 '

    // Glassmorphism base
    classes +=
      'backdrop-blur-md bg-white/80 dark:bg-gray-900/60 border border-gray-100 dark:border-white/5 '

    if (isHero) {
      classes +=
        'md:col-span-2 lg:col-span-1 border-amber-400/30 dark:border-amber-400/20 shadow-[0_0_20px_-12px_rgba(251,191,36,0.2)] '
    } else {
      classes += 'shadow-sm hover:shadow-xl '
    }

    if (recent) {
      if (pb.category === 'RUN') classes += 'shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)] '
      else if (pb.category === 'CYCLE') classes += 'shadow-[0_0_30px_-10px_rgba(34,197,94,0.2)] '
      else classes += 'shadow-[0_0_30px_-10px_rgba(251,191,36,0.2)] '
    }

    return classes
  }
</script>

<template>
  <div class="space-y-16">
    <div
      v-for="cat in categories.filter((c) => pbsByCategory[c.id])"
      :key="cat.id"
      class="space-y-8"
    >
      <!-- Section Header -->
      <div class="flex items-center gap-4 px-4 sm:px-0">
        <div
          class="p-3 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl text-gray-900 dark:text-white border border-gray-200/50 dark:border-white/10 shadow-sm"
        >
          <UIcon :name="cat.icon" class="w-6 h-6" />
        </div>
        <div>
          <h3
            class="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic"
          >
            {{ cat.label }} Hall of Fame
          </h3>
          <p
            class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]"
          >
            Elite performances from your history
          </p>
        </div>
        <div class="flex-1 border-b border-dashed border-gray-200 dark:border-gray-800 ml-2" />
      </div>

      <!-- Trophy Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="pb in pbsByCategory[cat.id]"
          :key="pb.id"
          :class="getCardClass(pb)"
          class="p-8 rounded-[32px] flex flex-col justify-between h-full"
        >
          <!-- Hero Glow & Patterns -->
          <div
            v-if="heroTypes.includes(pb.type)"
            class="absolute -top-24 -right-24 w-64 h-64 bg-amber-400/10 blur-[80px] rounded-full"
          />
          <div
            v-if="isRecent(pb.date)"
            class="absolute inset-0 bg-gradient-to-tr from-transparent via-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          />

          <div class="relative">
            <!-- Top Header: Icon + Badge -->
            <div class="flex items-start justify-between mb-6">
              <div
                class="p-4 rounded-[22px] bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-inner group-hover:border-primary-500/40 transition-colors duration-500"
              >
                <UIcon :name="getSportIcon(pb)" class="w-7 h-7 text-primary-500" />
              </div>

              <div v-if="isRecent(pb.date)" class="relative">
                <div class="absolute inset-0 bg-amber-400 blur-md opacity-20 animate-pulse" />
                <div
                  class="relative flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-400 dark:bg-amber-400 text-black overflow-hidden"
                >
                  <!-- Shimmer Effect -->
                  <div
                    class="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  />
                  <UIcon name="i-heroicons-sparkles" class="w-4 h-4" />
                  <span class="text-[10px] font-black uppercase tracking-widest">New Record</span>
                </div>
              </div>

              <div
                v-else-if="heroTypes.includes(pb.type)"
                class="p-1.5 rounded-full border border-amber-400/40 text-amber-500"
              >
                <UIcon name="i-heroicons-trophy" class="w-5 h-5" />
              </div>
            </div>

            <!-- Value & Label -->
            <div class="space-y-1">
              <div
                class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.25em]"
              >
                {{ formatType(pb.type) }}
              </div>
              <div class="flex items-baseline gap-2">
                <span
                  class="text-5xl font-black text-gray-900 dark:text-white tracking-tighter italic tabular-nums font-athletic"
                >
                  {{ formatValue(pb) }}
                </span>
                <span
                  v-if="pb.unit !== 's'"
                  class="text-xl font-black text-gray-900 dark:text-white opacity-40 uppercase italic"
                >
                  {{ pb.unit }}
                </span>
                <span
                  v-else
                  class="text-sm font-black text-gray-400 dark:text-gray-600 uppercase opacity-50 tracking-widest"
                >
                  pace
                </span>
              </div>
            </div>

            <!-- Secondary Stats / Context -->
            <div v-if="pb.metadata || pb.workout" class="mt-6 flex flex-wrap gap-5">
              <div
                v-if="pb.metadata?.avgHr || pb.workout?.averageHr"
                class="flex items-center gap-2"
              >
                <div class="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
                  <UIcon name="i-heroicons-heart" class="w-4 h-4 text-red-500/60" />
                </div>
                <span class="text-xs font-black text-gray-500 dark:text-gray-400 tabular-nums">
                  {{ pb.metadata?.avgHr || pb.workout?.averageHr }}
                  <span class="ml-0.5 text-[9px] opacity-60">BPM</span>
                </span>
              </div>
              <div
                v-if="pb.metadata?.avgCadence || pb.workout?.averageCadence"
                class="flex items-center gap-2"
              >
                <div class="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <UIcon name="i-lucide-rotate-cw" class="w-4 h-4 text-blue-500/60" />
                </div>
                <span class="text-xs font-black text-gray-500 dark:text-gray-400 tabular-nums">
                  {{ pb.metadata?.avgCadence || pb.workout?.averageCadence }}
                  <span class="ml-0.5 text-[9px] opacity-60">RPM</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Footer: Date + Action -->
          <div
            class="mt-10 pt-6 border-t border-gray-100/50 dark:border-white/5 flex items-center justify-between"
          >
            <div class="flex flex-col">
              <div
                class="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest"
              >
                Achieved
              </div>
              <div class="text-sm font-black text-gray-700 dark:text-gray-300 italic">
                {{ getHumanDate(pb.date) }}
              </div>
            </div>

            <UButton
              v-if="pb.workoutId"
              :to="`/workouts/${pb.workoutId}`"
              icon="i-heroicons-arrow-right"
              color="neutral"
              variant="subtle"
              size="md"
              class="rounded-2xl group/btn transition-all duration-300 hover:bg-primary-500 hover:text-white"
              :ui="{
                icon: { base: 'transition-transform duration-300 group-hover/btn:translate-x-1' }
              }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="personalBests.length === 0"
      class="text-center py-32 bg-gray-50/50 dark:bg-gray-900/30 backdrop-blur-md rounded-[50px] border-2 border-dashed border-gray-200 dark:border-white/10 max-w-2xl mx-auto"
    >
      <div
        class="w-24 h-24 bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl flex items-center justify-center mx-auto mb-8 transform -rotate-12 border border-gray-100 dark:border-white/5"
      >
        <UIcon name="i-heroicons-trophy" class="w-12 h-12 text-gray-200" />
      </div>
      <h3 class="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
        The Case is Empty
      </h3>
      <p class="text-base text-gray-500 max-w-sm mx-auto mt-3 font-medium leading-relaxed">
        Your peak performances are waiting. Go out, push your limits, and Coach Watts will celebrate
        you here.
      </p>
      <UButton
        color="primary"
        variant="solid"
        size="xl"
        class="mt-10 font-black uppercase tracking-widest rounded-2xl px-10 py-4 shadow-xl shadow-primary-500/20"
        to="/activities"
      >
        Ignite Training
      </UButton>
    </div>
  </div>
</template>

<style scoped>
  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }

  /* Fallback for athletic font if not globally defined */
  .font-athletic {
    font-family:
      'Inter var',
      'Inter',
      system-ui,
      -apple-system,
      sans-serif;
    font-stretch: condensed;
  }
</style>
