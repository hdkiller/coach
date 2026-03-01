<script setup lang="ts">
  import { formatDistanceToNow } from 'date-fns'

  const props = defineProps<{
    personalBests: any[]
  }>()

  const categories = [
    { id: 'RUN', label: 'Running', icon: 'i-heroicons-sparkles', color: 'blue' },
    { id: 'CYCLE', label: 'Cycling', icon: 'i-heroicons-bolt', color: 'green' },
    { id: 'SWIM', label: 'Swimming', icon: 'i-heroicons-beaker', color: 'cyan' },
    { id: 'OTHER', label: 'Other', icon: 'i-heroicons-trophy', color: 'gray' }
  ]

  // Major milestones that should be "featured" (larger cards)
  const featuredTypes = ['RUN_5K', 'RUN_10K', 'POWER_20M', 'POWER_1M', 'ELEVATION_GAIN']

  const pbsByCategory = computed(() => {
    const map: Record<string, any[]> = {}
    if (!props.personalBests) return map

    // Sort so featured ones or more "important" ones come first or as desired
    const sorted = [...props.personalBests].sort((a, b) => {
      const aFeatured = featuredTypes.includes(a.type) ? 0 : 1
      const bFeatured = featuredTypes.includes(b.type) ? 0 : 1
      return aFeatured - bFeatured
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

  function getRelativeDate(date: string | Date) {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
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
    if (pb.category === 'CYCLE') return 'i-heroicons-騎乘' // Fallback or specific
    return 'i-heroicons-trophy'
  }

  function getCardClass(pb: any) {
    const isFeatured = featuredTypes.includes(pb.type)
    const recent = isRecent(pb.date)

    let classes =
      'relative group overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg '

    if (isFeatured) {
      classes +=
        'md:col-span-2 lg:col-span-1 border-2 border-primary-500/20 bg-gradient-to-br from-white to-primary-50 dark:from-gray-900 dark:to-primary-950/20 '
    } else {
      classes += 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 '
    }

    if (recent) {
      classes += 'ring-2 ring-amber-400/50 '
    }

    return classes
  }
</script>

<template>
  <div class="space-y-12">
    <div
      v-for="cat in categories.filter((c) => pbsByCategory[c.id])"
      :key="cat.id"
      class="space-y-6"
    >
      <!-- Section Header -->
      <div class="flex items-center gap-4 px-4 sm:px-0">
        <div
          class="p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <UIcon :name="cat.icon" class="w-6 h-6" />
        </div>
        <div>
          <h3
            class="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic"
          >
            {{ cat.label }} Hall of Fame
          </h3>
          <p class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
            Records detected from your {{ cat.label.toLowerCase() }} activities
          </p>
        </div>
        <div class="flex-1 border-b border-dashed border-gray-200 dark:border-gray-800 ml-2" />
      </div>

      <!-- Trophy Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="pb in pbsByCategory[cat.id]"
          :key="pb.id"
          :class="getCardClass(pb)"
          class="p-6 rounded-3xl flex flex-col justify-between h-full"
        >
          <!-- Featured Background Glow -->
          <div
            v-if="featuredTypes.includes(pb.type)"
            class="absolute -top-12 -right-12 w-32 h-32 bg-primary-500/10 blur-3xl rounded-full"
          />

          <div class="relative">
            <!-- Top Header: Icon + Badge -->
            <div class="flex items-start justify-between mb-4">
              <div
                class="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm group-hover:border-primary-500/50 transition-colors"
              >
                <UIcon :name="getSportIcon(pb)" class="w-6 h-6 text-primary-500" />
              </div>
              <div
                v-if="isRecent(pb.date)"
                class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 animate-pulse"
              >
                <UIcon
                  name="i-heroicons-sparkles"
                  class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400"
                />
                <span
                  class="text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest"
                  >New Record</span
                >
              </div>
            </div>

            <!-- Value & Label -->
            <div class="space-y-1">
              <div
                class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]"
              >
                {{ formatType(pb.type) }}
              </div>
              <div class="flex items-baseline gap-2">
                <span
                  class="text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic"
                >
                  {{ formatValue(pb) }}
                </span>
                <span
                  v-if="pb.unit !== 's'"
                  class="text-lg font-black text-gray-400 dark:text-gray-600 uppercase italic"
                >
                  {{ pb.unit }}
                </span>
                <span v-else class="text-sm font-bold text-gray-400 dark:text-gray-600 uppercase">
                  pace
                </span>
              </div>
            </div>

            <!-- Secondary Stats / Context -->
            <div v-if="pb.metadata" class="mt-4 flex flex-wrap gap-4">
              <div v-if="pb.metadata.avgHr" class="flex items-center gap-1.5 text-gray-500">
                <UIcon name="i-heroicons-heart" class="w-3.5 h-3.5 text-red-500/70" />
                <span class="text-[10px] font-bold uppercase tracking-tight"
                  >{{ pb.metadata.avgHr }} bpm</span
                >
              </div>
              <div v-if="pb.metadata.avgCadence" class="flex items-center gap-1.5 text-gray-500">
                <UIcon name="i-lucide-rotate-cw" class="w-3.5 h-3.5 text-blue-500/70" />
                <span class="text-[10px] font-bold uppercase tracking-tight"
                  >{{ pb.metadata.avgCadence }} rpm</span
                >
              </div>
            </div>
          </div>

          <!-- Footer: Date + Action -->
          <div
            class="mt-8 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between"
          >
            <div class="flex flex-col">
              <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                Achieved
              </div>
              <div class="text-xs font-bold text-gray-600 dark:text-gray-300">
                {{ getRelativeDate(pb.date) }}
              </div>
            </div>

            <UButton
              v-if="pb.workoutId"
              :to="`/workouts/${pb.workoutId}`"
              icon="i-heroicons-arrow-right"
              color="neutral"
              variant="subtle"
              size="sm"
              class="rounded-xl group-hover:bg-primary-500 group-hover:text-white transition-all"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="personalBests.length === 0"
      class="text-center py-24 bg-gray-50 dark:bg-gray-900/50 rounded-[40px] border-2 border-dashed border-gray-200 dark:border-gray-800 max-w-2xl mx-auto"
    >
      <div
        class="w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 transform -rotate-6"
      >
        <UIcon name="i-heroicons-trophy" class="w-10 h-10 text-gray-200" />
      </div>
      <h3 class="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
        The Case is Empty
      </h3>
      <p class="text-sm text-gray-500 max-w-xs mx-auto mt-2 font-medium">
        Go out and push your limits. Coach Watts will automatically celebrate your peak performances
        here.
      </p>
      <UButton
        color="primary"
        variant="solid"
        size="lg"
        class="mt-8 font-black uppercase tracking-widest rounded-2xl"
        to="/activities"
      >
        Start Training
      </UButton>
    </div>
  </div>
</template>
