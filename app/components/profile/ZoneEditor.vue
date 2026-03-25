<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h5 class="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
        <UIcon :name="icon" class="w-4 h-4" :class="iconColor" />
        {{ title }}
      </h5>
      <div class="flex gap-2">
        <slot name="actions"></slot>
        <UButton size="xs" color="primary" variant="soft" icon="i-lucide-plus" @click="addZone"
          >Add Zone</UButton
        >
      </div>
    </div>

    <div
      class="border rounded-lg divide-y border-gray-200 dark:border-gray-800 dark:divide-gray-800 overflow-hidden bg-white dark:bg-gray-900"
    >
      <!-- Header -->
      <div
        class="grid grid-cols-12 gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider"
      >
        <div class="col-span-5 pl-1">Zone Name</div>
        <div class="col-span-3">Min ({{ displayUnits || units }})</div>
        <div class="col-span-3">Max ({{ displayUnits || units }})</div>
        <div class="col-span-1 text-center"></div>
      </div>

      <!-- Rows -->
      <draggable
        v-if="modelValue.length"
        v-model="zones"
        item-key="id"
        handle=".drag-handle"
        :animation="200"
        ghost-class="opacity-50"
      >
        <template #item="{ element: zone, index }">
          <div
            class="grid grid-cols-12 gap-2 p-2 items-center group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
          >
            <div class="col-span-5 flex items-center gap-2">
              <UIcon
                name="i-lucide-grip-vertical"
                class="drag-handle w-4 h-4 text-gray-300 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <UInput v-model="zone.name" size="xs" class="w-full" placeholder="Zone Name" />
            </div>
            <div class="col-span-3">
              <UInput
                :model-value="getDraftValue(index, 'min', zone.min)"
                :type="usesFormattedInputs ? 'text' : 'number'"
                size="xs"
                class="w-full"
                @update:model-value="setDraftValue(index, 'min', $event)"
                @blur="commitDraftValue(index, 'min')"
                @keydown.enter.prevent="commitDraftValue(index, 'min')"
              />
            </div>
            <div class="col-span-3">
              <UInput
                :model-value="getDraftValue(index, 'max', zone.max)"
                :type="usesFormattedInputs ? 'text' : 'number'"
                size="xs"
                class="w-full"
                @update:model-value="setDraftValue(index, 'max', $event)"
                @blur="commitDraftValue(index, 'max')"
                @keydown.enter.prevent="commitDraftValue(index, 'max')"
              />
            </div>
            <div class="col-span-1 flex justify-center">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                tabindex="-1"
                @click="removeZone(index)"
              />
            </div>
          </div>
        </template>
      </draggable>

      <div v-if="!modelValue.length" class="p-6 text-center text-sm text-gray-500 italic">
        No zones defined. Click "Add Zone" or "Calculate" to start.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import draggable from 'vuedraggable'

  const props = defineProps<{
    modelValue: any[]
    title: string
    units: string
    displayUnits?: string
    icon: string
    iconColor?: string
    formatValue?: ((value: number | null | undefined) => string) | null
    parseValue?: ((value: string) => number | null) | null
  }>()

  const emit = defineEmits(['update:modelValue'])

  const zones = computed({
    get: () => props.modelValue || [],
    set: (val) => emit('update:modelValue', val)
  })

  const usesFormattedInputs = computed(() => Boolean(props.formatValue && props.parseValue))
  const drafts = ref<Array<{ min: string; max: string }>>([])

  function formatDraftValue(value: number | null | undefined) {
    if (props.formatValue) return props.formatValue(value)
    if (value === null || value === undefined) return ''
    return String(value)
  }

  function syncDrafts() {
    drafts.value = (props.modelValue || []).map((zone) => ({
      min: formatDraftValue(zone?.min),
      max: formatDraftValue(zone?.max)
    }))
  }

  watch(
    () => props.modelValue,
    () => syncDrafts(),
    { deep: true, immediate: true }
  )

  function getDraftValue(index: number, key: 'min' | 'max', rawValue: number | null | undefined) {
    if (!usesFormattedInputs.value) {
      return rawValue === null || rawValue === undefined ? '' : String(rawValue)
    }

    if (!drafts.value[index]) {
      drafts.value[index] = {
        min: formatDraftValue(props.modelValue?.[index]?.min),
        max: formatDraftValue(props.modelValue?.[index]?.max)
      }
    }

    return drafts.value[index]?.[key] ?? ''
  }

  function setDraftValue(index: number, key: 'min' | 'max', value: string | number) {
    if (!drafts.value[index]) {
      drafts.value[index] = {
        min: formatDraftValue(props.modelValue?.[index]?.min),
        max: formatDraftValue(props.modelValue?.[index]?.max)
      }
    }

    drafts.value[index][key] = String(value ?? '')

    if (!usesFormattedInputs.value) {
      commitDraftValue(index, key)
    }
  }

  function commitDraftValue(index: number, key: 'min' | 'max') {
    const zone = props.modelValue?.[index]
    if (!zone) return

    const raw = drafts.value[index]?.[key] ?? ''
    const parsed = props.parseValue ? props.parseValue(raw) : Number(raw)

    if (parsed === null || Number.isNaN(parsed)) {
      if (drafts.value[index]) drafts.value[index][key] = formatDraftValue(zone[key])
      return
    }

    const nextZones = [...zones.value]
    nextZones[index] = {
      ...nextZones[index],
      [key]: parsed
    }
    emit('update:modelValue', nextZones)

    if (drafts.value[index]) drafts.value[index][key] = formatDraftValue(parsed)
  }

  function addZone() {
    const newZone = {
      name: `Zone ${zones.value.length + 1}`,
      min: 0,
      max: 0
    }
    emit('update:modelValue', [...zones.value, newZone])
  }

  function removeZone(index: number) {
    const newZones = [...zones.value]
    newZones.splice(index, 1)
    emit('update:modelValue', newZones)
  }
</script>
