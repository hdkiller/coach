<template>
  <div v-if="rule || fallbackLabel" :class="containerClasses">
    <!-- Logo -->
    <div v-if="rule" class="relative flex items-end">
      <img
        :src="rule.logoLight"
        :alt="`Data from ${provider}`"
        :class="[
          rule.logoHeightClass,
          rule.logoWidthClass,
          'w-auto max-w-full object-contain dark:hidden'
        ]"
      />
      <img
        :src="rule.logoDark"
        :alt="`Data from ${provider}`"
        :class="[
          rule.logoHeightClass,
          rule.logoWidthClass,
          'hidden w-auto max-w-full object-contain dark:block',
          rule.invertInDarkMode ? 'invert' : ''
        ]"
      />
    </div>

    <!-- Text (Device Name or Attribution) -->
    <span
      v-if="rule && shouldShowText"
      class="ml-2 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
      :class="textClasses"
    >
      {{ rule.textFormat(deviceName) }}
    </span>
    <span
      v-else-if="fallbackLabel"
      class="font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
      :class="fallbackTextClasses"
    >
      {{ fallbackLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
  import { getAttributionRule } from '~/utils/attribution-rules'

  const props = withDefaults(
    defineProps<{
      provider: string
      deviceName?: string
      mode?: 'standard' | 'minimal' | 'overlay'
      fallbackLabel?: string
    }>(),
    {
      mode: 'standard',
      deviceName: undefined,
      fallbackLabel: ''
    }
  )

  const rule = computed(() => getAttributionRule(props.provider))

  const shouldShowText = computed(() => {
    if (!rule.value) return false
    // Always show text if the rule requires it (e.g. Garmin needs device name)
    // But suppress it if format returns empty string (e.g. Strava)
    return rule.value.requiresDeviceName && rule.value.textFormat(props.deviceName)
  })

  const containerClasses = computed(() => {
    const classes = ['flex', 'items-end', 'select-none']

    switch (props.mode) {
      case 'overlay':
        // High contrast, absolute positioning context usually
        classes.push('bg-white/80 dark:bg-black/60', 'backdrop-blur-sm', 'px-2', 'py-1', 'rounded')
        break
      case 'minimal':
        classes.push('text-xs')
        break
      case 'standard':
      default:
        classes.push('text-sm')
        break
    }

    return classes
  })

  const textClasses = computed(() => {
    if (props.mode === 'overlay') return 'text-xs font-semibold'
    return ''
  })

  const fallbackTextClasses = computed(() => {
    const classes = []
    if (!rule.value) {
      classes.push('uppercase', 'tracking-widest')
    }
    if (props.mode === 'overlay') classes.push('text-[10px]', 'font-black')
    else if (props.mode === 'minimal') classes.push('text-[9px]', 'font-black')
    else classes.push('text-xs', 'font-semibold')
    if (rule.value) classes.push('ml-2')
    return classes
  })
</script>

<style scoped>
  @media print {
    div {
      display: flex !important;
      print-color-adjust: exact;
    }
  }
</style>
