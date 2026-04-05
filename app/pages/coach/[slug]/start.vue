<template>
  <CoachStartPage />
</template>

<script setup lang="ts">
  import CoachStartPage from '~/components/public/CoachStartPage.vue'

  definePageMeta({
    layout: false
  })

  useHead({
    htmlAttrs: {
      class: 'dark'
    }
  })
</script>
