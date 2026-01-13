<template>
  <span>
    <template v-for="(segment, index) in segments" :key="index">
      <UTooltip v-if="segment.isTerm" :text="segment.definition" :popper="{ placement: 'top' }">
        <span
          class="cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors"
        >
          {{ segment.text }}
        </span>
      </UTooltip>
      <span v-else>{{ segment.text }}</span>
    </template>
  </span>
</template>

<script setup lang="ts">
  import { glossary, sortedGlossaryKeys } from '~/utils/glossary'

  const props = defineProps<{
    text: string
  }>()

  interface TextSegment {
    text: string
    isTerm: boolean
    definition?: string
  }

  const segments = computed<TextSegment[]>(() => {
    if (!props.text) return []

    // Create regex pattern with smart word boundaries
    const patternString = sortedGlossaryKeys
      .map((key) => {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const start = /^\w/.test(key) ? '\\b' : ''
        const end = /\w$/.test(key) ? '\\b' : ''
        return `${start}${escaped}${end}`
      })
      .join('|')

    const pattern = new RegExp(`(${patternString})`, 'gi')
    const text = props.text
    const result: TextSegment[] = []

    let lastIndex = 0
    let match

    while ((match = pattern.exec(text)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        result.push({
          text: text.slice(lastIndex, match.index),
          isTerm: false
        })
      }

      // The matched term
      const term = match[0]
      // Find definition (case-insensitive lookup)
      const definitionKey = Object.keys(glossary).find(
        (k) => k.toLowerCase() === term.toLowerCase()
      )

      result.push({
        text: term,
        isTerm: true,
        definition: definitionKey ? glossary[definitionKey] : ''
      })

      lastIndex = pattern.lastIndex
    }

    // Remaining text
    if (lastIndex < text.length) {
      result.push({
        text: text.slice(lastIndex),
        isTerm: false
      })
    }

    return result.length > 0 ? result : [{ text: props.text, isTerm: false }]
  })
</script>
