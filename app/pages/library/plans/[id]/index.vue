<script setup lang="ts">
  const route = useRoute()

  await navigateTo(
    {
      path: `/library/plans/${route.params.id}/overview`,
      query: route.query
    },
    { replace: true }
  )
</script>

<template>
  <div />
</template>
