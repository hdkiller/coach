<template>
  <aside
    class="flex min-h-full flex-col overflow-hidden rounded-3xl border border-default/80 bg-default/90 shadow-sm backdrop-blur"
  >
    <div class="border-b border-default/80 px-5 py-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-[10px] font-black uppercase tracking-[0.24em] text-primary/80">
            Utility Panel
          </div>
          <h3 class="mt-2 text-lg font-black tracking-tight text-highlighted">Workouts</h3>
          <p class="mt-1 text-xs leading-5 text-muted">
            Reference workouts, check blueprint health, and keep planning heuristics nearby.
          </p>
        </div>

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-magnifying-glass"
          size="xs"
          @click="showSearch = !showSearch"
        />
      </div>

      <UInput
        v-if="showSearch"
        v-model="searchQuery"
        placeholder="Filter templates..."
        size="sm"
        icon="i-heroicons-funnel"
        class="mt-4"
      />
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-4">
      <div class="space-y-6">
        <section class="space-y-3">
          <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            Quick stats
          </div>

          <div class="grid gap-3">
            <div
              v-for="stat in quickStats"
              :key="stat.label"
              class="rounded-2xl border border-default/70 bg-muted/25 px-4 py-3"
            >
              <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                {{ stat.label }}
              </div>
              <div class="mt-2 text-sm font-semibold text-highlighted">{{ stat.value }}</div>
            </div>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              Library preview
            </div>
            <UButton
              to="/library/workouts"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-arrow-top-right-on-square"
            >
              Manage
            </UButton>
          </div>

          <div v-if="loading" class="space-y-3">
            <USkeleton v-for="i in 4" :key="i" class="h-18 w-full rounded-xl" />
          </div>

          <UAlert
            v-else-if="status === 'error'"
            color="warning"
            variant="soft"
            title="Library unavailable"
            description="Workout templates failed to load, but the architect canvas is still available."
          />

          <div
            v-else-if="filteredTemplates.length === 0"
            class="rounded-2xl border border-dashed border-default p-4 text-sm text-muted"
          >
            No matching templates found.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="rounded-2xl border border-default/80 bg-default p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-highlighted">
                    {{ template.title }}
                  </div>
                  <div class="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                    {{ template.type || 'Workout' }}
                  </div>
                </div>

                <UIcon
                  :name="getWorkoutIcon(template.type)"
                  class="mt-0.5 h-4 w-4 shrink-0 text-primary"
                />
              </div>

              <div class="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span class="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted">
                  {{ Math.round((template.durationSec || 0) / 60) }} min
                </span>
                <span
                  v-if="template.tss"
                  class="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted"
                >
                  {{ Math.round(template.tss) }} TSS
                </span>
                <span class="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted">
                  {{ template.category || 'Base' }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-3">
          <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            Planning notes
          </div>

          <div class="space-y-2">
            <div
              v-for="tip in planningTips"
              :key="tip"
              class="rounded-2xl border border-default/70 bg-muted/25 px-4 py-3 text-sm leading-6 text-muted"
            >
              {{ tip }}
            </div>
          </div>
        </section>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { getWorkoutIcon } from '~/utils/activity-types'

  defineProps<{
    quickStats: Array<{ label: string; value: string }>
    planningTips: string[]
  }>()

  const showSearch = ref(false)
  const searchQuery = ref('')

  const { data: templates, status } = useLazyFetch<any[]>('/api/library/workouts', {
    server: false,
    default: () => []
  })

  const loading = computed(() => status.value === 'pending')

  const filteredTemplates = computed(() => {
    if (!templates.value?.length) {
      return []
    }

    const query = searchQuery.value.trim().toLowerCase()
    const visibleTemplates = templates.value.slice(0, query ? templates.value.length : 5)

    if (!query) {
      return visibleTemplates
    }

    return visibleTemplates.filter(
      (template) =>
        template.title?.toLowerCase().includes(query) ||
        template.category?.toLowerCase().includes(query) ||
        template.type?.toLowerCase().includes(query)
    )
  })
</script>
