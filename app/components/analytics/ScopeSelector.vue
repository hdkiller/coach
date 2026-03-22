<script setup lang="ts">
  defineOptions({ inheritAttrs: false })

  interface AnalyticsScopeValue {
    target: string
    targetId?: string
    targetIds?: string[]
  }

  const props = defineProps<{
    modelValue: AnalyticsScopeValue
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: AnalyticsScopeValue]
  }>()

  const attrs = useAttrs()
  const route = useRoute()
  const athletes = ref<any[]>([])
  const loading = ref(false)
  const open = ref(false)
  const search = ref('')
  const compareMode = ref(props.modelValue.target === 'athletes')

  async function fetchAthletes() {
    loading.value = true
    try {
      athletes.value = await $fetch<any[]>('/api/coaching/athletes')
    } catch (e) {
      console.error('Failed to load athletes for scope selector:', e)
      athletes.value = []
    } finally {
      loading.value = false
    }
  }

  const filteredAthletes = computed(() => {
    const query = search.value.trim().toLowerCase()
    if (!query) return athletes.value

    return athletes.value.filter(
      (relationship) =>
        relationship.athlete.name.toLowerCase().includes(query) ||
        relationship.athlete.email.toLowerCase().includes(query)
    )
  })

  const selectedIds = computed(() => {
    if (props.modelValue.target === 'athletes') {
      return props.modelValue.targetIds || []
    }

    if (props.modelValue.target === 'athlete' && props.modelValue.targetId) {
      return [props.modelValue.targetId]
    }

    return []
  })

  const selectedAthletes = computed(() =>
    athletes.value.filter((relationship) => selectedIds.value.includes(relationship.athleteId))
  )

  const triggerLabel = computed(() => {
    if (props.modelValue.target === 'self') return 'My Data'
    if (selectedAthletes.value.length === 1)
      return selectedAthletes.value[0]?.athlete.name || 'Athlete'
    if (selectedAthletes.value.length > 1) {
      return `${selectedAthletes.value[0]?.athlete.name || 'Athletes'} +${selectedAthletes.value.length - 1}`
    }

    return 'Select Scope'
  })

  const triggerIcon = computed(() => {
    if (selectedAthletes.value.length > 1) return 'i-lucide-users'
    return 'i-lucide-user'
  })

  function selectSelf() {
    compareMode.value = false
    emit('update:modelValue', { target: 'self' })
    open.value = false
  }

  function selectSingleAthlete(athleteId: string) {
    compareMode.value = false
    emit('update:modelValue', { target: 'athlete', targetId: athleteId })
    open.value = false
  }

  function toggleCompareAthlete(athleteId: string) {
    compareMode.value = true
    const ids = new Set(selectedIds.value)

    if (ids.has(athleteId)) {
      ids.delete(athleteId)
    } else {
      ids.add(athleteId)
    }

    const next = Array.from(ids)

    if (next.length === 0) {
      emit('update:modelValue', { target: 'self' })
      return
    }

    if (next.length === 1) {
      emit('update:modelValue', { target: 'athlete', targetId: next[0] })
      return
    }

    emit('update:modelValue', { target: 'athletes', targetIds: next })
  }

  watch(
    () => props.modelValue.target,
    (target) => {
      compareMode.value = target === 'athletes'
    }
  )

  function closeScopePopover(reason: string) {
    console.log('[AnalyticsScopeSelector] closeScopePopover', { reason, route: route.fullPath })
    open.value = false
  }

  onBeforeRouteLeave(() => {
    closeScopePopover('route-leave')
  })

  onBeforeUnmount(() => {
    closeScopePopover('unmount')
  })

  onMounted(fetchAthletes)
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      color="neutral"
      variant="outline"
      size="sm"
      class="h-9 min-w-[180px] justify-between px-3 font-bold"
      :icon="triggerIcon"
      :disabled="!loading && athletes.length === 0"
      v-bind="attrs"
    >
      <span class="min-w-0 truncate">{{ triggerLabel }}</span>
      <template #trailing>
        <UIcon name="i-lucide-chevron-down" class="h-4 w-4 opacity-50" />
      </template>
    </UButton>

    <template #content>
      <div class="w-[320px] space-y-3 p-3">
        <div
          class="inline-flex w-full items-center rounded-2xl border border-default bg-muted/20 p-1"
        >
          <UButton
            size="sm"
            :color="!compareMode ? 'primary' : 'neutral'"
            :variant="!compareMode ? 'soft' : 'ghost'"
            class="flex-1"
            @click="compareMode = false"
          >
            Single
          </UButton>
          <UButton
            size="sm"
            :color="compareMode ? 'primary' : 'neutral'"
            :variant="compareMode ? 'soft' : 'ghost'"
            class="flex-1"
            @click="compareMode = true"
          >
            Compare
          </UButton>
        </div>

        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search athletes..."
          size="sm"
        />

        <button
          class="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:border-primary/50"
          :class="
            props.modelValue.target === 'self'
              ? 'border-primary/60 bg-primary/5'
              : 'border-default/70 bg-default'
          "
          @click="selectSelf"
        >
          <UAvatar icon="i-lucide-user" size="md" />
          <div class="min-w-0 flex-1">
            <div class="truncate font-bold text-highlighted">My Data</div>
            <div class="text-xs text-muted">Use your personal analytics context</div>
          </div>
        </button>

        <div class="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          <div v-if="loading" class="space-y-2">
            <USkeleton v-for="i in 3" :key="i" class="h-16 rounded-2xl" />
          </div>

          <button
            v-for="relationship in filteredAthletes"
            :key="relationship.athleteId"
            class="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:border-primary/50"
            :class="
              selectedIds.includes(relationship.athleteId)
                ? 'border-primary/60 bg-primary/5'
                : 'border-default/70 bg-default'
            "
            @click="
              compareMode
                ? toggleCompareAthlete(relationship.athleteId)
                : selectSingleAthlete(relationship.athleteId)
            "
          >
            <UAvatar :src="relationship.athlete.image" :alt="relationship.athlete.name" size="md" />
            <div class="min-w-0 flex-1">
              <div class="truncate font-bold text-highlighted">{{ relationship.athlete.name }}</div>
              <div class="text-xs text-muted">{{ relationship.athlete.email }}</div>
            </div>
            <UIcon
              v-if="compareMode && selectedIds.includes(relationship.athleteId)"
              name="i-lucide-check"
              class="h-4 w-4 text-primary"
            />
          </button>
        </div>

        <div
          v-if="compareMode"
          class="rounded-2xl border border-default/70 bg-default p-3 text-xs text-muted"
        >
          Select multiple athletes to compare them on the same chart. One selection falls back to a
          single-athlete scope.
        </div>
      </div>
    </template>
  </UPopover>
</template>
