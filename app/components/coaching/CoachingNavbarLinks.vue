<script setup lang="ts">
  const links = [
    {
      label: 'Overview',
      icon: 'i-lucide-layout-dashboard',
      to: '/coaching',
      exact: true
    },
    {
      label: 'Calendar',
      icon: 'i-lucide-calendar-days',
      to: '/coaching/calendar'
    },
    {
      label: 'Athletes',
      icon: 'i-lucide-users-round',
      to: '/coaching/athletes'
    },
    {
      label: 'Analytics',
      icon: 'i-lucide-bar-chart-3',
      to: '/analytics'
    },
    {
      label: 'Team',
      icon: 'i-lucide-building-2',
      to: '/coaching/team'
    }
  ]
</script>

<template>
  <div
    class="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 h-full pointer-events-none"
  >
    <div class="pointer-events-auto">
      <UNavigationMenu :items="links" orientation="horizontal" />
    </div>
  </div>
</template>
