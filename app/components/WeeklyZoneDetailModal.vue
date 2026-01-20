<template>
  <UModal v-model:open="isOpen" title="Weekly Training Zones">
    <template #body>
      <div v-if="weekData" class="space-y-6">
        <!-- Week Info -->
        <div class="text-sm text-gray-600 dark:text-gray-400">
          Week {{ weekData.weekNumber }} • {{ weekData.completedWorkouts }} workout{{
            weekData.completedWorkouts !== 1 ? 's' : ''
          }}
        </div>

        <!-- Zone Distribution Chart -->
        <div>
          <h3 class="text-lg font-semibold mb-3">
            {{ zoneType === 'hr' ? 'Heart Rate' : 'Power' }} Zone Distribution
          </h3>
          <div class="space-y-2">
            <div v-for="(zone, index) in zoneBreakdown" :key="index" class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium">{{ zone.name }}</span>
                <span class="text-gray-600 dark:text-gray-400">
                  {{ formatTime(zone.time) }} ({{ zone.percentage.toFixed(1) }}%)
                </span>
              </div>
              <div class="w-full h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <div
                  class="h-full flex items-center px-2 text-white text-xs font-medium transition-all"
                  :style="{
                    width: zone.percentage + '%',
                    backgroundColor: zone.color
                  }"
                >
                  <span v-if="zone.percentage > 10">{{ zone.percentage.toFixed(0) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Workout Type Breakdown -->
        <div v-if="workoutTypeBreakdown.length > 0">
          <h3 class="text-lg font-semibold mb-3">Time by Workout Type</h3>
          <div class="space-y-2">
            <div
              v-for="type in workoutTypeBreakdown"
              :key="type.type"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  :name="getActivityIcon(type.type)"
                  class="w-5 h-5 text-gray-600 dark:text-gray-400"
                />
                <span class="font-medium">{{ type.type }}</span>
              </div>
              <div class="text-right">
                <div class="font-semibold">{{ formatTime(type.duration) }}</div>
                <div class="text-xs text-gray-500">
                  {{ type.count }} workout{{ type.count !== 1 ? 's' : '' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ formatTime(weekData.totalDuration) }}
            </div>
            <div class="text-xs text-gray-500">Total Duration</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ (weekData.totalDistance / 1000).toFixed(1) }}
            </div>
            <div class="text-xs text-gray-500">Total Distance (km)</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ Math.round(weekData.totalTSS) }}
            </div>
            <div class="text-xs text-gray-500">Total TSS</div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton color="neutral" variant="ghost" @click="closeModal"> Close </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { getSportSettingsForActivity } from '~/utils/sportSettings'

  const props = defineProps<{
    modelValue: boolean
    weekData: {
      weekNumber: number
      completedWorkouts: number
      totalDuration: number
      totalDistance: number
      totalTSS: number
      workoutIds: string[]
      activities: any[]
    } | null
    userZones: any
    allSportSettings?: any[]
    streams?: any[]
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
  }>()

  const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  // Zone colors expanded to support up to 8 zones
  const zoneColors = [
    'rgb(34, 197, 94)', // Z1 - Green
    'rgb(59, 130, 246)', // Z2 - Blue
    'rgb(245, 158, 11)', // Z3 - Yellow
    'rgb(249, 115, 22)', // Z4 - Orange
    'rgb(239, 68, 68)', // Z5 - Red
    'rgb(124, 58, 237)', // Z6 - Violet
    'rgb(168, 85, 247)', // Z7 - Purple
    'rgb(236, 72, 153)' // Z8 - Pink
  ]

  function getZoneColor(index: number): string {
    return zoneColors[index] || '#999999'
  }

  const aggregatedZones = ref<number[]>([])
  const zoneType = ref<'hr' | 'power'>('hr')
  const loading = ref(false)

  const zoneBreakdown = computed(() => {
    if (!props.userZones || aggregatedZones.value.length === 0) return []

    // Use default zones for labels if we have mixed zones?
    // Ideally we should normalize, but for now we just show distribution.
    // We use the default zones for NAMES and RANGES in the UI list, but the distribution IS calculated correctly per activity.
    // Wait, if Activity A has Z1=100-120 and Activity B has Z1=110-130, we just aggregate "Z1".
    // This is fine for "Zone Distribution" charts usually.
    const zones = zoneType.value === 'hr' ? props.userZones.hrZones : props.userZones.powerZones
    const total = aggregatedZones.value.reduce((sum, val) => sum + val, 0)

    if (total === 0) return []

    return zones
      .map((zone: any, index: number) => {
        const timeInZone = aggregatedZones.value[index] || 0
        return {
          name: zone.name,
          time: timeInZone,
          percentage: total > 0 ? (timeInZone / total) * 100 : 0,
          color: getZoneColor(index)
        }
      })
      .filter((z: any) => z.time > 0)
  })

  const workoutTypeBreakdown = computed(() => {
    if (!props.weekData) return []

    const typeMap = new Map<string, { count: number; duration: number }>()

    props.weekData.activities.forEach((activity) => {
      const type = activity.type || 'Unknown'
      const existing = typeMap.get(type) || { count: 0, duration: 0 }
      typeMap.set(type, {
        count: existing.count + 1,
        duration: existing.duration + (activity.duration || 0)
      })
    })

    return Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.duration - a.duration)
  })

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  function getActivityIcon(type: string) {
    const t = (type || '').toLowerCase()
    if (t.includes('ride') || t.includes('cycle')) return 'i-heroicons-bolt'
    if (t.includes('run')) return 'i-heroicons-fire'
    if (t.includes('swim')) return 'i-heroicons-beaker'
    if (t.includes('weight') || t.includes('strength')) return 'i-heroicons-trophy'
    return 'i-heroicons-check-circle'
  }

  function closeModal() {
    isOpen.value = false
  }

  function getActivityZones(activity: any) {
    if (!props.allSportSettings || !activity) return props.userZones

    const settings = getSportSettingsForActivity(props.allSportSettings, activity.type || '')
    if (!settings) return props.userZones

    return {
      hrZones: settings.hrZones,
      powerZones: settings.powerZones
    }
  }

  async function fetchZoneData() {
    if (import.meta.server) return
    if (!props.weekData || props.weekData.workoutIds.length === 0) return

    loading.value = true

    try {
      let streams = props.streams

      if (!streams) {
        // Fetch necessary keys with low resolution fallback to keep payload small
        streams = await $fetch<any[]>('/api/workouts/streams', {
          method: 'POST',
          body: {
            workoutIds: props.weekData.workoutIds,
            keys: ['hrZoneTimes', 'powerZoneTimes', 'heartrate', 'watts', 'time'],
            points: 150
          }
        }).catch(() => [])
      }

      // Aggregate zone data
      const hrZoneTimes = new Array(8).fill(0)
      const powerZoneTimes = new Array(8).fill(0)
      let hasHrData = false
      let hasPowerData = false

      streams.forEach((stream) => {
        if (!stream) return

        // Resolve zones for this specific activity
        const activity = props.weekData?.activities.find((a) => a.id === stream.workoutId)
        const zones = getActivityZones(activity)
        if (!zones) return

        const timeArray = stream.time

        // Priority 1: Use cached zone times if available (much faster and uses less data)
        // Note: Cached zone times from DB/ingestion *should* have used the correct zones at ingestion time.
        // If ingestion logic was correct, this is fine. If ingestion used default zones, this is bad.
        // Assuming ingestion logic is/was correct (it runs on backend using sportSettingsRepository).
        if (
          stream.hrZoneTimes &&
          Array.isArray(stream.hrZoneTimes) &&
          stream.hrZoneTimes.length > 0
        ) {
          hasHrData = true
          stream.hrZoneTimes.forEach((duration: number, index: number) => {
            if (index < 8) hrZoneTimes[index] += duration
          })
        } else if ('heartrate' in stream && Array.isArray(stream.heartrate) && zones.hrZones) {
          // Fallback to manual calculation from stream
          hasHrData = true
          stream.heartrate.forEach((hr: number, index: number) => {
            if (hr === null || hr === undefined) return

            let duration = 1
            if (timeArray && Array.isArray(timeArray) && timeArray.length > index) {
              if (index < timeArray.length - 1) {
                duration = timeArray[index + 1] - timeArray[index]
              } else if (index > 0) {
                duration = timeArray[index] - timeArray[index - 1]
              }
            }
            // Sanity check: cap duration to avoid massive spikes from pauses (e.g. > 5 mins)
            if (duration < 0) duration = 0
            if (duration > 300) duration = 1

            const zoneIndex = getZoneIndex(hr, zones.hrZones)
            if (zoneIndex >= 0 && zoneIndex < 8) hrZoneTimes[zoneIndex] += duration
          })
        }

        // Priority 1: Use cached zone times if available
        if (
          stream.powerZoneTimes &&
          Array.isArray(stream.powerZoneTimes) &&
          stream.powerZoneTimes.length > 0
        ) {
          hasPowerData = true
          stream.powerZoneTimes.forEach((duration: number, index: number) => {
            if (index < 8) powerZoneTimes[index] += duration
          })
        } else if ('watts' in stream && Array.isArray(stream.watts) && zones.powerZones) {
          // Fallback to manual calculation from stream
          hasPowerData = true
          stream.watts.forEach((watts: number, index: number) => {
            if (watts === null || watts === undefined) return

            let duration = 1
            if (timeArray && Array.isArray(timeArray) && timeArray.length > index) {
              if (index < timeArray.length - 1) {
                duration = timeArray[index + 1] - timeArray[index]
              } else if (index > 0) {
                duration = timeArray[index] - timeArray[index - 1]
              }
            }
            if (duration < 0) duration = 0
            if (duration > 300) duration = 1

            const zoneIndex = getZoneIndex(watts, zones.powerZones)
            if (zoneIndex >= 0 && zoneIndex < 8) powerZoneTimes[zoneIndex] += duration
          })
        }
      })

      // Prefer power if available
      if (hasPowerData) {
        zoneType.value = 'power'
        aggregatedZones.value = powerZoneTimes
      } else if (hasHrData) {
        zoneType.value = 'hr'
        aggregatedZones.value = hrZoneTimes
      }
    } catch (e) {
      console.error('Error fetching zone data for modal:', e)
    } finally {
      loading.value = false
    }
  }

  function getZoneIndex(value: number, zones: any[]): number {
    if (!zones) return -1

    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i]
      if (value >= zone.min && value <= zone.max) {
        return i
      }
    }

    if (value > zones[zones.length - 1].max) {
      return zones.length - 1
    }

    return -1
  }

  // Fetch data when modal opens
  watch(
    () => [props.modelValue, props.userZones, props.streams],
    ([isOpen]) => {
      if (isOpen && props.weekData && props.userZones) {
        fetchZoneData()
      }
    }
  )
</script>
