<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800 overflow-hidden"
  >
    <div
      v-for="(workoutExercise, eIndex) in exercises"
      :key="workoutExercise.id"
      :class="[
        'transition-all',
        eIndex !== exercises.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
      ]"
    >
      <!-- Exercise Header -->
      <div class="px-5 py-4 flex justify-between items-center group cursor-default">
        <div class="flex items-center gap-4">
          <div class="relative">
            <UAvatar
              v-if="workoutExercise.exercise.imageUrl"
              :src="workoutExercise.exercise.imageUrl"
              :alt="workoutExercise.exercise.title"
              size="md"
              class="ring-2 ring-gray-100 dark:ring-gray-800"
            />
            <div
              v-else
              class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 font-black text-xs uppercase tracking-tighter"
            >
              {{ workoutExercise.exercise.title.substring(0, 2).toUpperCase() }}
            </div>
          </div>

          <div>
            <h3 class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {{ workoutExercise.exercise.title }}
            </h3>
            <div class="flex items-center gap-2 mt-0.5">
              <span
                v-if="workoutExercise.exercise.primaryMuscle"
                class="text-[9px] font-black uppercase tracking-widest text-primary-500"
              >
                {{ workoutExercise.exercise.primaryMuscle }}
              </span>
              <span
                v-if="workoutExercise.notes"
                class="text-[9px] text-gray-400 font-bold uppercase tracking-widest"
              >
                • {{ workoutExercise.notes }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sets Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead
            class="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50/50 dark:bg-gray-950/50"
          >
            <tr>
              <th scope="col" class="px-6 py-3 w-16">Set</th>
              <th scope="col" class="px-6 py-3">Protocol</th>
              <th scope="col" class="px-6 py-3 text-right">Load</th>
              <th scope="col" class="px-6 py-3 text-right">Volume</th>
              <th v-if="hasDistance(workoutExercise)" scope="col" class="px-6 py-3 text-right">
                Dist
              </th>
              <th v-if="hasDuration(workoutExercise)" scope="col" class="px-6 py-3 text-right">
                Time
              </th>
              <th scope="col" class="px-6 py-3 text-right">Intensity</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800/50">
            <tr
              v-for="(set, index) in workoutExercise.sets"
              :key="set.id"
              class="hover:bg-gray-50/30 dark:hover:bg-gray-800/20 transition-colors"
            >
              <td class="px-6 py-3.5 font-black text-gray-900 dark:text-white tabular-nums text-xs">
                {{ Number(index) + 1 }}
              </td>
              <td class="px-6 py-3.5">
                <span
                  v-if="set.type !== 'NORMAL'"
                  class="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest"
                  :class="getSetTypeClass(set.type)"
                >
                  {{ set.type }}
                </span>
                <span v-else class="text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                  >Standard</span
                >
              </td>
              <td
                class="px-6 py-3.5 text-right font-black text-gray-900 dark:text-white tabular-nums text-xs"
              >
                <span v-if="set.weight"
                  >{{ set.weight
                  }}<span class="text-[9px] ml-0.5 text-gray-400 font-bold uppercase">{{
                    set.weightUnit || 'kg'
                  }}</span></span
                >
                <span v-else class="text-gray-300 dark:text-gray-700">—</span>
              </td>
              <td
                class="px-6 py-3.5 text-right font-black text-gray-900 dark:text-white tabular-nums text-xs"
              >
                <span v-if="set.reps"
                  >{{ set.reps
                  }}<span class="text-[9px] ml-0.5 text-gray-400 font-bold uppercase"
                    >reps</span
                  ></span
                >
                <span v-else class="text-gray-300 dark:text-gray-700">—</span>
              </td>
              <td
                v-if="hasDistance(workoutExercise)"
                class="px-6 py-3.5 text-right font-black text-gray-900 dark:text-white tabular-nums text-xs"
              >
                <span v-if="set.distanceMeters"
                  >{{ set.distanceMeters
                  }}<span class="text-[9px] ml-0.5 text-gray-400 font-bold uppercase">m</span></span
                >
              </td>
              <td
                v-if="hasDuration(workoutExercise)"
                class="px-6 py-3.5 text-right font-black text-gray-900 dark:text-white tabular-nums text-xs"
              >
                <span v-if="set.durationSec">{{ formatDuration(set.durationSec) }}</span>
              </td>
              <td class="px-6 py-3.5 text-right">
                <span
                  v-if="set.rpe"
                  class="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-black tabular-nums tracking-widest"
                  :class="getRpeClass(set.rpe)"
                >
                  RPE {{ set.rpe }}
                </span>
                <span v-else class="text-gray-300 dark:text-gray-700">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    exercises: any[]
  }>()

  function hasDistance(workoutExercise: any) {
    return workoutExercise.sets?.some((s: any) => s.distanceMeters)
  }

  function hasDuration(workoutExercise: any) {
    return workoutExercise.sets?.some((s: any) => s.durationSec)
  }

  function getSetTypeClass(type: string) {
    switch (type) {
      case 'WARMUP':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
      case 'DROPSET':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
      case 'FAILURE':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  function getRpeClass(rpe: number) {
    if (rpe >= 9) return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    if (rpe >= 7) return 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
    if (rpe >= 5) return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
    return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }
</script>
