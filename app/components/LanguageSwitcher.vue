<script setup lang="ts">
  import { en, hu, de, fr, it, nl, ru, ja, zh_cn } from '@nuxt/ui/locale'
  import { useTolgee } from '@tolgee/vue'

  const tolgee = useTolgee(['language'])
  const locales = [en, hu, de, fr, it, nl, ru, ja, { ...zh_cn, code: 'zh' }]
  const selectedLanguage = computed({
    get: () => tolgee.value.getLanguage() || 'en',
    set: (language: string) => {
      // Tolgee uses 'zh', but Nuxt UI uses 'zh_cn' for internal mapping in ULocaleSelect if we are not careful.
      // Actually ULocaleSelect expects the locale object.
      // We need to make sure the value bound to v-model matches what Tolgee expects.
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
