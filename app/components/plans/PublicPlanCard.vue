<template>
  <div
    class="group relative flex flex-col overflow-hidden rounded-[2.2rem] border border-default/70 bg-default shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md md:flex-row"
  >
    <!-- Left Visual/Badge Side (on Desktop) -->
    <div
      class="flex flex-col justify-center border-b border-default/60 bg-muted/5 p-6 md:w-64 md:border-b-0 md:border-r"
    >
      <div class="flex flex-wrap gap-2">
        <UBadge
          :color="plan.accessState === 'FREE' ? 'success' : 'warning'"
          variant="soft"
          size="sm"
        >
          {{ plan.accessState === 'FREE' ? 'Free' : 'Preview' }}
        </UBadge>
        <UBadge v-if="plan.isFeatured" color="primary" variant="soft" size="sm">Featured</UBadge>
      </div>

      <div class="mt-4 hidden md:block">
        <div class="flex items-center gap-2 text-primary">
          <UIcon :name="getSportIcon(plan.primarySport)" class="h-8 w-8" />
          <div class="text-xs font-black uppercase tracking-widest text-muted">
            {{ sportLabel }}
          </div>
        </div>
      </div>

      <div class="mt-auto hidden pt-6 md:block">
        <div class="text-[10px] font-black uppercase tracking-widest text-muted">Length</div>
        <div class="text-lg font-bold text-highlighted">
          {{ plan.lengthWeeks || 'Flexible' }} weeks
        </div>
      </div>
    </div>

    <!-- Right Content Side -->
    <div class="flex flex-1 flex-col p-6 sm:p-8">
      <div class="flex items-center justify-between gap-4 md:hidden">
        <div class="text-xs font-black uppercase tracking-widest text-primary">
          {{ sportLabel }}
        </div>
        <div class="text-[10px] font-black uppercase tracking-widest text-muted">
          {{ plan.lengthWeeks }} weeks
        </div>
      </div>

      <div class="mt-2 md:mt-0">
        <NuxtLink
          :to="planPath"
          class="block text-2xl font-black tracking-tight text-highlighted transition-colors group-hover:text-primary"
        >
          {{ plan.name || 'Untitled Plan' }}
        </NuxtLink>
        <p v-if="plan.publicHeadline" class="mt-2 text-base font-medium text-muted line-clamp-1">
          {{ plan.publicHeadline }}
        </p>
        <p class="mt-3 text-sm leading-6 text-muted line-clamp-2">
          {{ plan.publicDescription || plan.description || 'No description provided.' }}
        </p>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-default/60 pt-6">
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-black uppercase tracking-wider text-muted">Skill</div>
          <div class="text-sm font-bold text-highlighted">{{ skillLabel || 'All' }}</div>
        </div>
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-black uppercase tracking-wider text-muted">Volume</div>
          <div class="text-sm font-bold text-highlighted">{{ volumeLabel || 'Flexible' }}</div>
        </div>
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-black uppercase tracking-wider text-muted">Rhythm</div>
          <div class="text-sm font-bold text-highlighted">
            {{ plan.daysPerWeek ? `${plan.daysPerWeek} days/wk` : 'Flexible' }}
          </div>
        </div>

        <div class="ml-auto flex items-center gap-4">
          <NuxtLink
            v-if="coachPath"
            :to="coachPath"
            class="flex items-center gap-2.5 transition-colors hover:text-primary"
          >
            <div class="text-right hidden sm:block">
              <div class="text-[10px] font-black uppercase tracking-wider text-muted">
                {{ plan.author.coachingBrand || 'Coach' }}
              </div>
              <div class="text-xs font-bold text-highlighted">{{ plan.author.displayName }}</div>
            </div>
            <UAvatar
              :src="plan.author.image || undefined"
              :alt="plan.author.displayName"
              size="sm"
              class="border border-default/60"
            />
          </NuxtLink>

          <UButton
            :to="planPath"
            color="primary"
            size="md"
            trailing-icon="i-heroicons-arrow-right"
            class="rounded-full px-6"
          >
            View Plan
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import {
    buildPublicCoachPath,
    buildPublicPlanPath,
    getPublicSportByValue
  } from '../../../shared/public-plans'

  const { plan } = defineProps<{ plan: any }>()

  const planPath = computed(() => buildPublicPlanPath(plan))
  const coachPath = computed(() => buildPublicCoachPath(plan.author?.slug))
  const sportLabel = computed(
    () => getPublicSportByValue(plan.primarySport)?.label || plan.primarySport || null
  )
  const skillLabel = computed(() => formatEnumLabel(plan.skillLevel))
  const volumeLabel = computed(() => formatEnumLabel(plan.weeklyVolumeBand))

  function formatEnumLabel(value?: string | null) {
    if (!value) return null
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function getSportIcon(sport: string) {
    const icons: Record<string, string> = {
      CYCLING: 'i-heroicons-bolt',
      RUNNING: 'i-heroicons-fire',
      TRIATHLON: 'i-heroicons-trophy',
      STRENGTH: 'i-heroicons-hand-thumb-up'
    }
    return icons[sport] || 'i-heroicons-academic-cap'
  }
</script>
