<script setup lang="ts">
  const route = useRoute()

  await navigateTo(
    {
      path: `/library/plans/${route.params.id}/architect`,
      query: route.query
    },
    { replace: true }
  )
</script>

<template>
  <div />
</template>
