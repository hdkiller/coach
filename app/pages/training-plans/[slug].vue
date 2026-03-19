<template>
  <PublicPlansCatalogPage v-if="isSport" :override-sport="slug" />
  <PublicPlanDetailPage v-else :override-slug="slug" />
</template>

<script setup lang="ts">
  import PublicPlansCatalogPage from '~/components/plans/PublicPlansCatalogPage.vue'
  import PublicPlanDetailPage from '~/components/plans/PublicPlanDetailPage.vue'
  import { getPublicSportBySegment } from '~/shared/public-plans'

  const route = useRoute()
  const slug = route.params.slug as string

  const isSport = computed(() => !!getPublicSportBySegment(slug))

  definePageMeta({
    layout: 'public'
  })
</script>
