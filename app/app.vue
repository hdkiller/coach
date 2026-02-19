<script setup lang="ts">
  const colorMode = useColorMode()

  const color = computed(() => (colorMode.value === 'dark' ? '#1b1718' : 'white'))

  const { isOpen, options } = useUpgradeModal()

  useHead({
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { key: 'theme-color', name: 'theme-color', content: color }
    ],
    link: [
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' }
    ],
    htmlAttrs: {
      lang: 'en'
    }
  })
</script>

<template>
  <UApp>
    <ImpersonationBanner />
    <CoachingBanner />
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <UpgradeModal v-model:open="isOpen" v-bind="options" />
    </ClientOnly>
  </UApp>
</template>
