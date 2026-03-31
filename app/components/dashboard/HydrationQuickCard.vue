<template>
  <UCard
    v-if="!embedded"
    :ui="{
      root: 'rounded-none sm:rounded-lg shadow-none sm:shadow h-full',
      body: 'p-4 sm:p-5'
    }"
    class="flex flex-col"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/70"
          >
            <UIcon name="i-tabler-droplet" class="h-5 w-5" />
          </div>
          <div>
            <h3
              class="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400"
            >
              {{ title }}
            </h3>
            <p class="text-sm font-bold text-gray-900 dark:text-white">
              {{ statusLabel }}
            </p>
          </div>
        </div>

        <UButton
          v-if="showJournalButton"
          :to="`/nutrition/${date}`"
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-heroicons-arrow-right"
          trailing
          title="Open Journal"
        />
      </div>
    </template>

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-8 w-28" />
      <USkeleton class="h-3 w-full rounded-full" />
      <div class="grid grid-cols-3 gap-2">
        <USkeleton v-for="chip in 3" :key="chip" class="h-9 w-full rounded-xl" />
      </div>
    </div>

    <div v-else class="flex h-full flex-col gap-4">
      <div
        class="rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50 to-cyan-50 p-4 dark:border-blue-900/70 dark:from-slate-900 dark:to-blue-950/40"
      >
        <div class="flex items-end justify-between gap-4">
          <div>
            <div class="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              {{ actualLiters }}
            </div>
            <div
              class="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"
            >
              of {{ targetLiters }} target
            </div>
          </div>
          <UBadge
            :color="progressBadgeColor"
            variant="soft"
            size="sm"
            class="shrink-0 font-black uppercase"
          >
            {{ progressPercent }}%
          </UBadge>
        </div>

        <div class="mt-3 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-white/10">
          <div
            class="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-400 transition-all duration-300"
            :style="{ width: `${Math.min(progressPercent, 100)}%` }"
          />
        </div>

        <p class="mt-3 text-xs font-medium leading-relaxed text-gray-600 dark:text-gray-300">
          {{ statusMessage }}
        </p>
      </div>

      <div class="space-y-2">
        <div
          class="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500"
        >
          Quick Add
        </div>
        <div class="grid grid-cols-3 gap-2">
          <UButton
            v-for="chip in quickAddOptions"
            :key="chip"
            :disabled="submitting"
            :loading="submitting && pendingVolume === chip"
            color="primary"
            variant="soft"
            class="justify-center font-black"
            @click="quickAdd(chip)"
          >
            +{{ chip }}ml
          </UButton>
        </div>
      </div>
    </div>
  </UCard>

  <div v-else class="space-y-3">
    <div v-if="showHeader" class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/70"
        >
          <UIcon name="i-tabler-droplet" class="h-4.5 w-4.5" />
        </div>
        <div>
          <h3
            class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400"
          >
            {{ title }}
          </h3>
          <p class="text-sm font-bold text-gray-900 dark:text-white">
            {{ statusLabel }}
          </p>
        </div>
      </div>

      <UButton
        v-if="showJournalButton"
        :to="`/nutrition/${date}`"
        variant="ghost"
        color="neutral"
        size="xs"
        icon="i-heroicons-arrow-right"
        trailing
        title="Open Journal"
      />
    </div>

    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-7 w-24" />
      <USkeleton class="h-3 w-full rounded-full" />
      <div class="grid grid-cols-3 gap-2">
        <USkeleton v-for="chip in 3" :key="chip" class="h-8 w-full rounded-xl" />
      </div>
    </div>

    <div
      v-else
      :class="
        embeddedPlain
          ? 'space-y-4'
          : 'rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50 to-cyan-50 p-4 dark:border-blue-900/70 dark:from-slate-900 dark:to-blue-950/40'
      "
    >
      <div class="flex items-end justify-between gap-4">
        <div>
          <div class="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {{ actualLiters }}
          </div>
          <div
            class="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"
          >
            of {{ targetLiters }} target
          </div>
        </div>
        <UBadge
          :color="progressBadgeColor"
          variant="soft"
          size="sm"
          class="shrink-0 font-black uppercase"
        >
          {{ progressPercent }}%
        </UBadge>
      </div>

      <div
        class="mt-3 h-2 overflow-hidden rounded-full"
        :class="embeddedPlain ? 'bg-gray-100 dark:bg-white/10' : 'bg-white/80 dark:bg-white/10'"
      >
        <div
          class="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-400 transition-all duration-300"
          :style="{ width: `${Math.min(progressPercent, 100)}%` }"
        />
      </div>

      <p class="mt-3 text-xs font-medium leading-relaxed text-gray-600 dark:text-gray-300">
        {{ statusMessage }}
      </p>

      <div class="mt-4 space-y-2">
        <div
          class="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500"
        >
          Quick Add
        </div>
        <div class="grid grid-cols-3 gap-2">
          <UButton
            v-for="chip in quickAddOptions"
            :key="chip"
            :disabled="submitting"
            :loading="submitting && pendingVolume === chip"
            color="primary"
            variant="soft"
            class="justify-center font-black"
            @click="quickAdd(chip)"
          >
            +{{ chip }}ml
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    nutrition?: any | null
    date: string
    loading?: boolean
    embedded?: boolean
    showHeader?: boolean
    showJournalButton?: boolean
    title?: string
    embeddedPlain?: boolean
  }>()

  const emit = defineEmits<{
    refresh: []
  }>()

  let toast: ReturnType<typeof useToast> | null = null
  try {
    toast = useToast()
  } catch {
    toast = null
  }
  const quickAddOptions = [250, 500, 750]
  const optimisticWaterMl = ref<number | null>(null)
  const submitting = ref(false)
  const pendingVolume = ref<number | null>(null)

  watch(
    () => props.nutrition?.waterMl,
    (nextValue) => {
      if (typeof nextValue === 'number') {
        optimisticWaterMl.value = nextValue
      } else if (!props.nutrition) {
        optimisticWaterMl.value = null
      }
    },
    { immediate: true }
  )

  const effectiveWaterMl = computed(() => optimisticWaterMl.value ?? props.nutrition?.waterMl ?? 0)
  const targetWaterMl = computed(() => props.nutrition?.fuelingPlan?.dailyTotals?.fluid || 2000)
  const progressPercent = computed(() => {
    if (targetWaterMl.value <= 0) return 0
    return Math.round((effectiveWaterMl.value / targetWaterMl.value) * 100)
  })
  const actualLiters = computed(() => `${(effectiveWaterMl.value / 1000).toFixed(1)}L`)
  const targetLiters = computed(() => `${(targetWaterMl.value / 1000).toFixed(1)}L`)
  const statusLabel = computed(() => {
    if (progressPercent.value >= 100) return 'Target reached'
    if (progressPercent.value >= 70) return 'Nearly there'
    if (progressPercent.value >= 35) return 'Keep sipping'
    return 'Below target'
  })
  const statusMessage = computed(() => {
    if (progressPercent.value >= 100) {
      return 'Hydration is on track. Keep intake steady across the rest of the day.'
    }

    const remainingMl = Math.max(0, targetWaterMl.value - effectiveWaterMl.value)
    return `${Math.round(remainingMl)}ml left to hit today’s target.`
  })
  const progressBadgeColor = computed(() => {
    if (progressPercent.value >= 100) return 'success'
    if (progressPercent.value >= 70) return 'primary'
    if (progressPercent.value >= 35) return 'warning'
    return 'error'
  })

  async function quickAdd(volumeMl: number) {
    if (submitting.value) return

    const previousWaterMl = effectiveWaterMl.value
    optimisticWaterMl.value = previousWaterMl + volumeMl
    submitting.value = true
    pendingVolume.value = volumeMl

    try {
      const response = await ($fetch as any)('/api/nutrition/hydration-quick-add', {
        method: 'POST',
        body: {
          date: props.date,
          volumeMl
        }
      })

      if (typeof response?.totalWaterMl === 'number') {
        optimisticWaterMl.value = response.totalWaterMl
      }

      toast?.add({
        title: 'Hydration logged',
        description: `Added ${volumeMl}ml to today.`,
        color: 'success'
      })
      emit('refresh')
    } catch (error: any) {
      optimisticWaterMl.value = previousWaterMl
      toast?.add({
        title: 'Hydration log failed',
        description: error?.data?.message || error?.message || 'Please try again.',
        color: 'error'
      })
    } finally {
      submitting.value = false
      pendingVolume.value = null
    }
  }
</script>
const embedded = computed(() => props.embedded === true) const embeddedPlain = computed(() =>
props.embeddedPlain === true) const showHeader = computed(() => props.showHeader !== false) const
showJournalButton = computed(() => props.showJournalButton !== false) const title = computed(() =>
props.title || 'Hydration')
