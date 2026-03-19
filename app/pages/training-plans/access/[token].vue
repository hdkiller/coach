<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <div v-if="pending" class="space-y-4">
      <USkeleton class="h-16 rounded-3xl" />
      <USkeleton class="h-[480px] rounded-3xl" />
    </div>

    <div v-else-if="!plan" class="rounded-3xl border border-default/70 p-12 text-center">
      <h1 class="text-2xl font-bold text-highlighted">Private link unavailable</h1>
      <p class="mt-2 text-sm text-muted">
        This private plan link may have expired or been removed.
      </p>
    </div>

    <div v-else class="space-y-8">
      <div class="rounded-[2rem] border border-default/70 bg-default p-6 shadow-sm sm:p-8">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.22em] text-primary">
              Private full-access link
            </p>
            <h1 class="mt-3 text-4xl font-black tracking-tight text-highlighted">
              {{ plan.name }}
            </h1>
            <p class="mt-3 text-base text-muted">
              {{ plan.publicDescription || plan.description }}
            </p>
          </div>
          <UBadge color="success" variant="soft">Full access</UBadge>
        </div>
      </div>

      <div class="space-y-5">
        <div
          v-for="block in plan.blocks"
          :key="block.id"
          class="rounded-3xl border border-default/70 bg-default p-5"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-xl font-bold text-highlighted">{{ block.name }}</h2>
              <p class="text-sm text-muted">{{ block.type }}</p>
            </div>
            <UBadge color="neutral" variant="soft">{{ block.weeks.length }} weeks</UBadge>
          </div>

          <div class="mt-4 grid gap-4 lg:grid-cols-2">
            <div
              v-for="week in block.weeks"
              :key="week.id"
              class="rounded-2xl border border-default/60 bg-muted/10 p-4"
            >
              <div class="font-semibold text-highlighted">Week {{ week.weekNumber }}</div>
              <p v-if="week.focus" class="mt-2 text-sm text-muted">{{ week.focus }}</p>

              <div class="mt-4 space-y-2">
                <div
                  v-for="workout in week.workouts"
                  :key="workout.id"
                  class="rounded-xl border border-default/50 bg-default px-3 py-2"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="font-medium text-highlighted">{{ workout.title }}</div>
                    <div class="text-xs text-muted">{{ dayLabel(workout.dayIndex) }}</div>
                  </div>
                  <div class="mt-1 text-xs text-muted">
                    {{ workout.type || 'Workout' }}
                    <span v-if="workout.durationSec">
                      • {{ formatDuration(workout.durationSec) }}</span
                    >
                    <span v-if="workout.tss"> • {{ Math.round(workout.tss) }} TSS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({
    layout: 'public'
  })

  const route = useRoute()
  const token = route.params.token as string

  const { data, pending } = await useFetch(`/api/public/plans/access/${token}`)
  const plan = computed(() => (data.value as any)?.plan)

  useSeoMeta({
    title: () => (plan.value ? `${plan.value.name} | Private Plan Link` : 'Private Plan Link'),
    description: () => 'Private full-access training plan link.',
    robots: 'noindex, nofollow'
  })

  function dayLabel(dayIndex: number) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIndex] || 'Day'
  }

  function formatDuration(durationSec: number) {
    const minutes = Math.round((durationSec || 0) / 60)
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    if (!hours) return `${minutes} min`
    if (!remainder) return `${hours}h`
    return `${hours}h ${remainder}m`
  }
</script>
