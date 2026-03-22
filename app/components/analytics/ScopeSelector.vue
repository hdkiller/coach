<script setup lang="ts">
  const props = defineProps<{
    modelValue: { target: string; targetId?: string }
  }>()

  const emit = defineEmits(['update:modelValue'])

  const athletes = ref<any[]>([])
  const loading = ref(false)

  const hasAthletes = computed(() => athletes.value.length > 0)

  async function fetchAthletes() {
    loading.value = true
    try {
      const data = await $fetch('/api/coaching/athletes')
      athletes.value = data as any[]
    } catch (e) {
      console.error('Failed to load athletes for scope selector:', e)
    } finally {
      loading.value = false
    }
  }

  const scopeOptions = computed(() => {
    const options = [
      { label: 'My Data', value: 'self', icon: 'i-lucide-user' }
    ]

    athletes.value.forEach(rel => {
      options.push({
        label: rel.athlete.name,
        value: `athlete:${rel.athleteId}`,
        icon: 'i-lucide-users'
      })
    })

    return options
  })

  const selectedValue = computed(() => {
    if (props.modelValue.target === 'self') return 'self'
    return `athlete:${props.modelValue.targetId}`
  })

  const selectedOption = computed({
    get: () => {
      return scopeOptions.value.find((option) => option.value === selectedValue.value) || scopeOptions.value[0]
    },
    set: (option: any) => {
      const value = option?.value
      if (!value) return

      if (value === 'self') {
        emit('update:modelValue', { target: 'self' })
      } else if (typeof value === 'string' && value.includes(':')) {
        const [, id] = value.split(':')
        emit('update:modelValue', { target: 'athlete', targetId: id })
      }
    }
  })

  const currentLabel = computed(() => {
    return selectedOption.value?.label || 'Select Scope'
  })

  const currentIcon = computed(() => {
    return selectedOption.value?.icon || 'i-lucide-user'
  })

  onMounted(fetchAthletes)
</script>

<template>
  <USelectMenu
    v-if="hasAthletes"
    v-model="selectedOption"
    :items="scopeOptions"
    class="min-w-[180px]"
    :search-input="{
      placeholder: 'Search athletes...'
    }"
    :ui="{
      content: 'min-w-[220px] w-[var(--reka-popper-anchor-width)]',
      trigger: 'inline-flex'
    }"
  >
    <template #trigger>
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        class="font-bold min-w-[180px] h-9 px-3 justify-between"
        :icon="currentIcon"
      >
        <span class="min-w-0 truncate">{{ currentLabel }}</span>
        <template #trailing>
          <UIcon name="i-lucide-chevron-down" class="w-4 h-4 opacity-50" />
        </template>
      </UButton>
    </template>
  </USelectMenu>
</template>
