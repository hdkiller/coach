<template>
  <PublicPlansCatalogPage v-if="isSubtype" :override-subtype="slug" />
  <PublicPlanDetailPage v-else :override-slug="slug" />
</template>

<script setup lang="ts">
  import PublicPlansCatalogPage from '~/components/plans/PublicPlansCatalogPage.vue'
  import PublicPlanDetailPage from '~/components/plans/PublicPlanDetailPage.vue'
  import { getPublicSportBySegment, getPublicSubtypeLabel } from '../../../../shared/public-plans'

  const route = useRoute()
  const sportSegment = route.params.sport as string
  const slug = route.params.slug as string

  const sportMeta = getPublicSportBySegment(sportSegment)
  const isSubtype = computed(() => {
    if (!sportMeta) return false
    return !!getPublicSubtypeLabel(sportMeta.value, slug)
  })

  definePageMeta({
    layout: 'public'
  })
</script>
