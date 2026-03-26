<script setup lang="ts">
  import {
    ANALYTICS_PRESET_CATEGORIES,
    type AnalyticsPresetCategory,
    type AnalyticsSystemPreset
  } from '~/utils/analytics-presets'

  const props = defineProps<{
    leftRailTab: 'roster' | 'library'
    athleteSearch: string
    widgetSearch: string
    activeCategory: 'all' | AnalyticsPresetCategory
    rosterMode: 'single' | 'compare'
    loadingAthletes: boolean
    filteredAthletes: any[]
    selectedAthleteIds: string[]
    groupedSystemWidgets: any[]
    filteredCustomWidgets: any[]
    selectedWidgetId?: string
  }>()

  const emit = defineEmits<{
    'update:leftRailTab': [value: 'roster' | 'library']
    'update:athleteSearch': [value: string]
    'update:widgetSearch': [value: string]
    'update:activeCategory': [value: 'all' | AnalyticsPresetCategory]
    'update:rosterMode': [value: 'single' | 'compare']
    selectSingleAthlete: [athleteId: string | null]
    toggleCompareAthlete: [athleteId: string]
    selectWidget: [widget: any]
  }>()

  function widgetIcon(widget: { visualType?: string; type?: string }) {
    switch (widget.visualType || widget.type) {
      case 'scatter':
        return 'i-lucide-chart-scatter'
      case 'heatmap':
        return 'i-lucide-grid-2x2'
      case 'combo':
        return 'i-lucide-chart-column-increasing'
      case 'stackedBar':
      case 'horizontalBar':
      case 'bar':
        return 'i-lucide-bar-chart-3'
      default:
        return 'i-lucide-line-chart'
    }
  }

  function audienceLabel(widget: Pick<AnalyticsSystemPreset, 'audience'> | any) {
    if (widget.isCustom) return 'Custom'
    if (widget.audience === 'coach') return 'Coach'
    if (widget.audience === 'athlete') return 'Athlete'
    return 'Athlete + Coach'
  }
</script>

<template>
  <div class="space-y-3 p-3">
    <div class="inline-flex w-full items-center rounded-2xl border border-default bg-muted/20 p-1">
      <UButton
        size="sm"
        :color="leftRailTab === 'roster' ? 'primary' : 'neutral'"
        :variant="leftRailTab === 'roster' ? 'soft' : 'ghost'"
        class="flex-1"
        @click="emit('update:leftRailTab', 'roster')"
      >
        Roster
      </UButton>
      <UButton
        size="sm"
        :color="leftRailTab === 'library' ? 'primary' : 'neutral'"
        :variant="leftRailTab === 'library' ? 'soft' : 'ghost'"
        class="flex-1"
        @click="emit('update:leftRailTab', 'library')"
      >
        Library
      </UButton>
    </div>

    <div v-if="leftRailTab === 'roster'" class="space-y-2">
      <div class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
        Athlete roster
      </div>
      <div class="flex items-center gap-2">
        <UInput
          :model-value="athleteSearch"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search athletes"
          size="sm"
          class="flex-1"
          @update:model-value="emit('update:athleteSearch', $event)"
        />
        <div
          class="inline-flex items-center gap-1 rounded-full border border-default bg-muted/15 p-1"
        >
          <UButton
            size="xs"
            color="neutral"
            :variant="rosterMode === 'single' ? 'soft' : 'ghost'"
            class="rounded-full px-3"
            icon="i-lucide-user"
            @click="emit('update:rosterMode', 'single')"
          >
            Single
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            :variant="rosterMode === 'compare' ? 'soft' : 'ghost'"
            class="rounded-full px-3"
            icon="i-lucide-users"
            @click="emit('update:rosterMode', 'compare')"
          >
            Compare
          </UButton>
        </div>
      </div>
    </div>

    <div
      v-if="leftRailTab === 'roster'"
      class="max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto pr-1"
    >
      <button
        class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
        :class="
          selectedAthleteIds.length === 0
            ? 'border-primary/60 bg-primary/5'
            : 'border-default/70 bg-default'
        "
        @click="emit('selectSingleAthlete', null)"
      >
        <div class="flex items-center gap-3">
          <UAvatar icon="i-lucide-user" size="md" />
          <div class="min-w-0 flex-1">
            <div class="truncate font-bold text-highlighted">My personal data</div>
            <div class="text-xs text-muted">Preview your own analytics context</div>
          </div>
        </div>
      </button>

      <div v-if="loadingAthletes" class="space-y-2">
        <USkeleton v-for="i in 3" :key="i" class="h-20 rounded-2xl" />
      </div>

      <div
        v-else-if="filteredAthletes.length === 0"
        class="rounded-2xl border border-dashed border-default/70 bg-default p-4 text-sm text-muted"
      >
        No athletes match this search.
      </div>

      <button
        v-for="rel in filteredAthletes"
        :key="rel.athleteId"
        class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
        :class="
          selectedAthleteIds.includes(rel.athleteId)
            ? 'border-primary/60 bg-primary/5'
            : 'border-default/70 bg-default'
        "
        @click="
          rosterMode === 'compare'
            ? emit('toggleCompareAthlete', rel.athleteId)
            : emit('selectSingleAthlete', rel.athleteId)
        "
      >
        <div class="flex items-center gap-3">
          <UAvatar :src="rel.athlete.image" :alt="rel.athlete.name" size="md" />
          <div class="min-w-0 flex-1">
            <div class="truncate font-bold text-highlighted">{{ rel.athlete.name }}</div>
            <div class="text-xs text-muted">{{ rel.athlete.email }}</div>
          </div>
          <UIcon
            v-if="rosterMode === 'compare' && selectedAthleteIds.includes(rel.athleteId)"
            name="i-lucide-check"
            class="h-4 w-4 text-primary"
          />
        </div>
      </button>
    </div>

    <div v-if="leftRailTab === 'library'" class="space-y-3">
      <div class="space-y-1">
        <div class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
          Chart library
        </div>
        <UInput
          :model-value="widgetSearch"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search charts"
          size="sm"
          @update:model-value="emit('update:widgetSearch', $event)"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          size="xs"
          :color="activeCategory === 'all' ? 'primary' : 'neutral'"
          :variant="activeCategory === 'all' ? 'soft' : 'outline'"
          class="rounded-full"
          @click="emit('update:activeCategory', 'all')"
        >
          All
        </UButton>
        <UButton
          v-for="category in ANALYTICS_PRESET_CATEGORIES"
          :key="category.value"
          size="xs"
          :color="activeCategory === category.value ? 'primary' : 'neutral'"
          :variant="activeCategory === category.value ? 'soft' : 'outline'"
          class="rounded-full"
          @click="emit('update:activeCategory', category.value)"
        >
          {{ category.label }}
        </UButton>
      </div>
    </div>

    <div
      v-if="leftRailTab === 'library'"
      class="max-h-[calc(100vh-260px)] space-y-4 overflow-y-auto pr-1"
    >
      <div v-for="group in groupedSystemWidgets" :key="group.value" class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
            {{ group.label }}
          </div>
          <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
            {{ group.widgets.length }}
          </div>
        </div>

        <button
          v-for="widget in group.widgets"
          :key="widget.id"
          class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
          :class="
            selectedWidgetId === widget.id
              ? 'border-primary/60 bg-primary/5'
              : 'border-default/70 bg-default'
          "
          @click="emit('selectWidget', widget)"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-default/60 bg-muted/30"
            >
              <UIcon :name="widgetIcon(widget)" class="h-4 w-4 text-primary-500" />
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <div class="truncate font-bold text-highlighted">{{ widget.name }}</div>
              <p class="line-clamp-2 text-xs text-muted">
                {{ widget.description }}
              </p>
              <div class="flex flex-wrap gap-1 pt-1">
                <UBadge v-if="widget.flagship" color="warning" variant="soft" size="xs">
                  Flagship
                </UBadge>
                <UBadge color="primary" variant="soft" size="xs">{{ group.label }}</UBadge>
                <UBadge color="neutral" variant="outline" size="xs">{{ widget.visualType }}</UBadge>
                <UBadge color="neutral" variant="outline" size="xs">{{
                  audienceLabel(widget)
                }}</UBadge>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div v-if="filteredCustomWidgets.length > 0" class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Custom</div>
          <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
            {{ filteredCustomWidgets.length }}
          </div>
        </div>

        <button
          v-for="widget in filteredCustomWidgets"
          :key="widget.id"
          class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
          :class="
            selectedWidgetId === widget.id
              ? 'border-primary/60 bg-primary/5'
              : 'border-default/70 bg-default'
          "
          @click="emit('selectWidget', widget)"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-default/60 bg-muted/30"
            >
              <UIcon :name="widgetIcon(widget)" class="h-4 w-4 text-primary-500" />
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <div class="truncate font-bold text-highlighted">{{ widget.name }}</div>
              <p class="line-clamp-2 text-xs text-muted">
                {{ widget.description }}
              </p>
              <div class="flex flex-wrap gap-1 pt-1">
                <UBadge color="neutral" variant="soft" size="xs">Custom</UBadge>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div
        v-if="groupedSystemWidgets.length === 0 && filteredCustomWidgets.length === 0"
        class="rounded-2xl border border-dashed border-default/70 bg-default p-4 text-sm text-muted"
      >
        No charts match this search.
      </div>
    </div>
  </div>
</template>
