<script setup lang="ts">
  import { en, hu, de, fr, it, nl } from '@nuxt/ui/locale'
  import { useTolgee } from '@tolgee/vue'

  const tolgee = useTolgee(['language'])
  const locales = [en, hu, de, fr, it, nl]
  const selectedLanguage = computed({
    get: () => tolgee.value.getLanguage() || 'en',
    set: (language: string) => {
      void tolgee.value.changeLanguage(language)
    }
  })
</script>

<template>
  <ULocaleSelect
    v-model="selectedLanguage"
    :locales="locales"
    :ui="{ item: 'cursor-pointer' }"
    class="min-w-[8.5rem]"
    size="sm"
    variant="ghost"
  />
</template>
