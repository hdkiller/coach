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
    if (pb.type.includes('ELEVATION')) return 'i-lucide-mountain'
    if (pb.category === 'RUN') return 'i-lucide-footprints'
    if (pb.category === 'CYCLE') return 'i-lucide-bike'
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
          class="floating-card-base grain-overlay p-10 rounded-[40px] flex flex-col justify-between h-full group !bg-white dark:!bg-[#111111] !border-gray-200 dark:!border-white/5"
        >
          <!-- Hero Glow & Patterns -->
          <div
            v-if="heroTypes.includes(pb.type)"
            class="absolute -top-32 -right-32 w-80 h-80 bg-amber-400/10 blur-[100px] rounded-full -z-10"
          />

          <div class="relative">
            <!-- Top Header: Icon + Badge -->
            <div class="flex items-start justify-between mb-10">
              <div
                class="p-5 rounded-[24px] bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-white/5 group-hover:border-primary-500/40 transition-colors duration-500"
              >
                <UIcon :name="getSportIcon(pb)" class="w-8 h-8 text-primary-500" />
              </div>

              <div v-if="isRecent(pb.date)" class="relative group/badge">
                <div
                  class="relative flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-400 text-black overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-neon-pulse"
                >
                  <!-- Holographic Shimmer Effect -->
                  <div
                    class="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12"
                  />
                  <UIcon name="i-heroicons-sparkles" class="w-5 h-5 animate-spin-slow" />
                  <span class="text-xs font-black uppercase tracking-[0.2em]">New Record</span>
                </div>
              </div>

              <div
                v-else-if="heroTypes.includes(pb.type)"
                class="w-12 h-12 rounded-full border border-amber-400/40 text-amber-500 flex items-center justify-center bg-amber-400/5 shadow-[0_0_20px_rgba(251,191,36,0.1)]"
              >
                <UIcon name="i-heroicons-trophy" class="w-6 h-6" />
              </div>
            </div>

            <!-- Value & Label -->
            <div class="space-y-3">
              <div
                class="text-[11px] font-black text-gray-500 dark:text-gray-600 uppercase tracking-[0.4em] ml-1"
              >
                {{ formatType(pb.type) }}
              </div>
              <div class="flex items-baseline gap-4">
                <span
                  class="text-8xl font-black text-gray-900 dark:text-white tracking-tighter italic tabular-nums font-athletic leading-none drop-shadow-2xl"
                >
                  {{ formatValue(pb) }}
                </span>
                <span
                  v-if="pb.unit !== 's'"
                  class="text-xl font-black text-gray-500 dark:text-gray-600 uppercase italic tracking-widest"
                >
                  {{ pb.unit }}
                </span>
                <span
                  v-else
                  class="text-xs font-black text-gray-500 dark:text-gray-600 uppercase tracking-[0.3em] italic"
                >
                  pace
                </span>
              </div>
            </div>

            <!-- Secondary Stats / Context -->
            <div v-if="pb.metadata || pb.workout" class="mt-10 flex flex-wrap gap-8 ml-1">
              <div
                v-if="pb.metadata?.avgHr || pb.workout?.averageHr"
                class="flex items-center gap-3 group/stat"
              >
                <div
                  class="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/5 group-hover/stat:border-red-500/30 transition-colors"
                >
                  <UIcon name="i-heroicons-heart" class="w-6 h-6 text-red-500/60" />
                </div>
                <div>
                  <div
                    class="text-[9px] font-bold text-gray-500 dark:text-gray-600 uppercase tracking-widest mb-0.5"
                  >
                    Avg Heart Rate
                  </div>
                  <span class="text-base font-black text-gray-700 dark:text-gray-400 tabular-nums">
                    {{ pb.metadata?.avgHr || pb.workout?.averageHr }}
                    <span class="text-[10px] text-gray-500 dark:text-gray-600">BPM</span>
                  </span>
                </div>
              </div>
              <div
                v-if="pb.metadata?.avgCadence || pb.workout?.averageCadence"
                class="flex items-center gap-3 group/stat"
              >
                <div
                  class="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/5 group-hover/stat:border-blue-500/30 transition-colors"
                >
                  <UIcon name="i-lucide-rotate-cw" class="w-6 h-6 text-blue-500/60" />
                </div>
                <div>
                  <div
                    class="text-[9px] font-bold text-gray-500 dark:text-gray-600 uppercase tracking-widest mb-0.5"
                  >
                    Avg Cadence
                  </div>
                  <span class="text-base font-black text-gray-700 dark:text-gray-400 tabular-nums">
                    {{ pb.metadata?.avgCadence || pb.workout?.averageCadence }}
                    <span class="text-[10px] text-gray-500 dark:text-gray-600">RPM</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer: Date + Action -->
          <div
            class="mt-14 pt-8 border-t border-gray-200 dark:border-white/5 flex items-end justify-between ml-1"
          >
            <div class="flex flex-col gap-1.5">
              <div
                class="text-[10px] font-black text-gray-500 dark:text-gray-600 uppercase tracking-[0.3em]"
              >
                Achieved
              </div>
              <div class="text-base font-black text-gray-700 dark:text-gray-500 italic">
                {{ getHumanDate(pb.date) }}
              </div>
            </div>

            <UButton
              v-if="pb.workoutId"
              :to="`/workouts/${pb.workoutId}`"
              icon="i-heroicons-arrow-right"
              color="neutral"
              variant="ghost"
              size="xl"
              class="rounded-full h-14 w-14 flex items-center justify-center transition-all duration-500 hover:bg-primary-500 hover:text-white hover:scale-110 shadow-lg hover:shadow-primary-500/20 group/arrow"
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
  @keyframes neon-pulse {
    0%,
    100% {
      filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.4));
    }
    50% {
      filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.8));
    }
  }

  .animate-neon-pulse {
    animation: neon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animate-spin-slow {
    animation: spin 6s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
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
