<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer class="py-8">
      <!-- Loading State -->
      <div v-if="pending" class="flex justify-center py-20">
        <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-primary" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-20">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 class="text-xl font-semibold mb-2">Access Denied</h3>
        <p class="text-muted mb-4">{{ error.message || 'This shared workout link is invalid or expired.' }}</p>
        <UButton to="/" color="primary">Go Home</UButton>
      </div>

      <!-- Workout Content -->
      <div v-else-if="workout" class="space-y-6 max-w-4xl mx-auto">
        <!-- Shared Header -->
        <div class="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3">
            <UAvatar :src="user?.image" :alt="user?.name" size="md" />
            <div>
              <div class="text-xs text-muted">Shared by</div>
              <div class="font-semibold text-sm">{{ user?.name || 'Coach Wattz Athlete' }}</div>
            </div>
          </div>
          <UButton to="/" variant="ghost" color="gray" icon="i-heroicons-home">Try Coach Wattz</UButton>
        </div>

        <!-- Header Card -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h1 class="text-3xl font-bold mb-2">{{ workout.title }}</h1>
              <div class="flex flex-wrap items-center gap-3 text-sm text-muted">
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
                  <span>{{ formatDate(workout.date) }}</span>
                </div>
                <span>•</span>
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                  <span>{{ formatDuration(workout.durationSec) }}</span>
                </div>
                <span>•</span>
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-bolt" class="w-4 h-4" />
                  <span>{{ Math.round(workout.tss) }} TSS</span>
                </div>
              </div>
            </div>
            <div class="flex-shrink-0">
              <div class="text-right">
                <div class="text-xs text-muted">Type</div>
                <div class="text-lg font-bold text-primary">{{ workout.type }}</div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div v-if="workout.description" class="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div class="text-sm text-muted mb-1">Description</div>
            <p class="text-sm">{{ workout.description }}</p>
          </div>

          <!-- Training Context -->
          <div v-if="workout.trainingWeek" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="text-xs text-muted mb-2">Training Context</div>
            <div class="flex flex-wrap gap-2 text-sm">
              <UBadge color="gray" variant="soft">
                Goal: {{ workout.trainingWeek.block.plan.goal.title }}
              </UBadge>
              <UBadge color="gray" variant="soft">
                {{ workout.trainingWeek.block.name }}
              </UBadge>
              <UBadge color="gray" variant="soft">
                Week {{ workout.trainingWeek.weekNumber }}
              </UBadge>
              <UBadge color="gray" variant="soft">
                Focus: {{ workout.trainingWeek.focus || workout.trainingWeek.block.primaryFocus }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- Coach Instructions -->
        <div v-if="workout.structuredWorkout?.coachInstructions" class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
          <div class="flex items-start gap-4">
            <div class="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
              <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h3 class="font-semibold text-lg text-blue-900 dark:text-blue-100">Coach's Advice</h3>
              <p class="text-blue-800 dark:text-blue-200 mt-2 italic">"{{ workout.structuredWorkout.coachInstructions }}"</p>
            </div>
          </div>
        </div>

        <!-- Workout Visualization -->
        <div v-if="workout.structuredWorkout" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Power Profile</h3>
          </div>
          <!-- Passing userFtp as undefined for generic % view on public share -->
          <WorkoutChart :workout="workout.structuredWorkout" />
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <UIcon name="i-heroicons-clock" class="w-5 h-5 text-primary" />
              </div>
              <div>
                <div class="text-xs text-muted">Planned Duration</div>
                <div class="text-2xl font-bold">{{ formatDuration(workout.durationSec) }}</div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div class="text-xs text-muted">Training Stress</div>
                <div class="text-2xl font-bold">{{ Math.round(workout.tss) }}</div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <UIcon name="i-heroicons-fire" class="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div class="text-xs text-muted">Intensity</div>
                <div class="text-2xl font-bold">{{ Math.round((workout.workIntensity || 0) * 100) }}%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Coaching Messages Timeline -->
        <WorkoutMessagesTimeline 
          v-if="workout.structuredWorkout?.messages?.length" 
          :workout="workout.structuredWorkout" 
        />
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import WorkoutChart from '~/components/workouts/WorkoutChart.vue'
import WorkoutMessagesTimeline from '~/components/workouts/WorkoutMessagesTimeline.vue'

definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const token = route.params.token as string

const { data, pending, error } = await useFetch(`/api/share/${token}`)

const workout = computed(() => data.value?.data)
const user = computed(() => data.value?.user)

useHead(() => ({
  title: workout.value ? `${workout.value.title} - Coach Wattz` : 'Shared Workout'
}))

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}
</script>
