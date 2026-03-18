<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="space-y-6">
      <UCard :ui="{ root: 'rounded-3xl shadow-none' }">
        <div class="flex items-center justify-between mb-4">
          <div class="space-y-2">
            <USkeleton class="h-8 w-64" />
            <USkeleton class="h-4 w-48" />
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <USkeleton v-for="i in 4" :key="i" class="h-16 w-full rounded-lg" />
        </div>
      </UCard>
      <USkeleton class="h-64 w-full rounded-3xl" />
    </div>

    <!-- Unified Template Header (Architect Style) -->
    <section
      v-else-if="template"
      class="rounded-3xl border border-default/80 bg-default/95 p-5 shadow-sm sm:p-6"
    >
      <!-- Top Row: Title & Stats -->
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between pb-6 border-b border-default/60"
      >
        <div class="min-w-0 space-y-2">
          <h2 class="truncate text-2xl font-black tracking-tight text-highlighted uppercase">
            {{ template.title }}
          </h2>
          <div class="flex flex-wrap items-center gap-3">
            <div
              class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20"
            >
              <UIcon :name="getWorkoutIcon(template.type)" class="w-3.5 h-3.5" />
              <span class="font-black uppercase tracking-widest text-[10px]">{{
                template.type
              }}</span>
            </div>
            <UBadge
              v-if="template.category"
              color="neutral"
              variant="soft"
              size="sm"
              class="font-black uppercase tracking-widest text-[10px]"
            >
              {{ template.category }}
            </UBadge>
          </div>
        </div>

        <div class="flex shrink-0 flex-wrap items-center gap-6 mt-1">
          <!-- KPI Metrics (Architect Style) -->
          <div class="flex items-center gap-6">
            <!-- Duration -->
            <div class="flex items-center gap-6">
              <div>
                <div class="text-[9px] font-black uppercase tracking-[0.18em] text-muted">
                  Duration
                </div>
                <div class="text-base font-bold text-highlighted leading-none mt-1">
                  {{ formatDuration(template.durationSec) }}
                </div>
              </div>
            </div>

            <div class="h-6 w-px bg-default/60" />

            <!-- Stress -->
            <div v-if="template.tss" class="flex items-center gap-6">
              <div>
                <div class="text-[9px] font-black uppercase tracking-[0.18em] text-muted">
                  Stress
                </div>
                <div class="text-base font-bold text-highlighted leading-none mt-1">
                  {{ Math.round(template.tss) }}
                  <span class="text-[10px] text-muted ml-0.5">TSS</span>
                </div>
              </div>
            </div>

            <div v-if="template.tss" class="h-6 w-px bg-default/60" />

            <!-- Usage -->
            <div class="flex items-center gap-6">
              <div>
                <div class="text-[9px] font-black uppercase tracking-[0.18em] text-muted">
                  Usage
                </div>
                <div class="text-base font-bold text-highlighted leading-none mt-1">
                  {{ template.usageCount || 0 }}
                  <span class="text-[10px] text-muted ml-0.5">times</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Description -->
      <div v-if="template.description" class="mt-6">
        <p class="text-sm text-muted leading-relaxed max-w-4xl">
          {{ template.description }}
        </p>
      </div>
    </section>

    <!-- Execution Plan (Full Width) -->
    <div v-if="template" class="space-y-4">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-sm font-black uppercase tracking-[0.15em] text-muted">Execution Plan</h3>
      </div>

      <component
        :is="getWorkoutComponent(template.type)"
        v-if="template.structuredWorkout"
        v-model:steps-tab="activeStepsTab"
        :workout="template"
        :user-ftp="userFtp"
        :generating="generating"
        :allow-edit="allowEdit"
        is-blueprint
        class="shadow-none border-none"
        @save="$emit('save', $event)"
        @regenerate="$emit('regenerate')"
        @view="$emit('view')"
        @adjust="$emit('adjust')"
      />

      <div
        v-else
        class="rounded-3xl border border-dashed border-default/80 bg-muted/10 p-12 text-center"
      >
        <div class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/20 mb-4">
          <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-muted" />
        </div>
        <h3 class="text-sm font-bold text-highlighted uppercase tracking-widest mb-1">
          Structure Pending
        </h3>
        <p class="text-xs text-muted max-w-xs mx-auto">
          This template doesn't have a structured execution plan yet.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import RideView from '~/components/workouts/planned/RideView.vue'
  import RunView from '~/components/workouts/planned/RunView.vue'
  import SwimView from '~/components/workouts/planned/SwimView.vue'
  import StrengthView from '~/components/workouts/planned/StrengthView.vue'

  const props = defineProps<{
    template: any
    userFtp?: number
    loading?: boolean
    generating?: boolean
    allowEdit?: boolean
  }>()

  const activeStepsTab = ref<'view' | 'edit'>('view')

  function formatDuration(seconds: number | null | undefined) {
    if (!seconds) return '0m'
    const mins = Math.floor(seconds / 60)
    if (mins >= 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    return `${mins}m`
  }

  function getWorkoutIcon(type: string) {
    switch (type) {
      case 'Ride':
      case 'VirtualRide':
        return 'i-tabler-bike'
      case 'Run':
        return 'i-tabler-run'
      case 'Swim':
        return 'i-tabler-swimming'
      case 'Gym':
      case 'WeightTraining':
        return 'i-tabler-barbell'
      default:
        return 'i-tabler-activity'
    }
  }

  function getWorkoutComponent(type: string) {
    switch (type) {
      case 'Ride':
      case 'VirtualRide':
        return RideView
      case 'Run':
        return RunView
      case 'Swim':
        return SwimView
      case 'Gym':
      case 'WeightTraining':
        return StrengthView
      default:
        return RideView
    }
  }
</script>
