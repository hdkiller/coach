<script setup lang="ts">
  import { en, hu, de, fr, it, nl, ru, ja, zh_cn, es } from '@nuxt/ui/locale'
  import { useTolgee } from '@tolgee/vue'

  const tolgee = useTolgee(['language'])
  const locales = [en, es, de, fr, hu, it, nl, ru, ja, zh_cn].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const selectedLanguage = computed({
    get: () => {
      const lang = tolgee.value.getLanguage() || 'en'
      return lang === 'zh' ? 'zh-CN' : lang
    },
    set: (language: string) => {
      // Tolgee uses 'zh', but Nuxt UI uses 'zh-CN' for flag rendering.
      const tolgeeLang = language === 'zh-CN' ? 'zh' : language
      void tolgee.value.changeLanguage(tolgeeLang)
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
