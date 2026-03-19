<script setup lang="ts">
  const route = useRoute()

  await navigateTo(
    {
      path: `/coach/${route.params.slug}`,
      query: route.query
    },
    { replace: true, redirectCode: 301 }
  )
</script>

<template>
  <div />
</template>
