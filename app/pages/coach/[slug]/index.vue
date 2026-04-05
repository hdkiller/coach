<template>
  <PublicProfilePage role="coach" />
</template>

<script setup lang="ts">
  import PublicProfilePage from '~/components/public/PublicProfilePage.vue'

  definePageMeta({
    layout: 'public'
  })
</script>
