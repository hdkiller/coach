<template>
  <UDashboardPanel id="nutrition-strategy">
    <template #header>
      <UDashboardNavbar title="Metabolic Strategy">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-3">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>

            <UButton
              to="/nutrition/history"
              icon="i-lucide-history"
              color="neutral"
              variant="ghost"
            >
              <span class="hidden sm:inline">View History</span>
            </UButton>

            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              :loading="loading"
              @click="refreshData"
            >
              <span class="hidden sm:inline">Refresh</span>
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Chart Section -->
          <div class="lg:col-span-2 space-y-6">
            <UCard :ui="{ body: 'p-0 sm:p-6' }">
              <template #header>
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                      Metabolic Horizon
                    </h3>
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      7-day rolling glycogen tank projection
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="flex items-center gap-1">
                      <div class="size-2 rounded-full bg-blue-500" />
                      <span class="text-xs text-gray-500">Actual</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <div class="size-2 rounded-full bg-blue-500 border border-dashed" />
                      <span class="text-xs text-gray-500">Projected</span>
                    </div>
                  </div>
                </div>
              </template>

              <div v-if="loadingWave" class="h-[300px] flex items-center justify-center">
                <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-gray-400" />
              </div>
              <NutritionMultiDayEnergyChart v-else-if="wavePoints.length" :points="wavePoints" />
              <div v-else class="h-[300px] flex items-center justify-center text-gray-500">
                No wave data available
              </div>
            </UCard>

            <UCard>
              <template #header>
                <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                  Weekly Fueling Periodization
                </h3>
              </template>
              <div v-if="loadingStrategy" class="h-24 flex items-center justify-center">
                <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-gray-400" />
              </div>
              <NutritionWeeklyFuelingGrid v-else-if="strategy" :days="strategy.fuelingMatrix" />
            </UCard>
          </div>

          <!-- Sidebar Section -->
          <div class="space-y-6">
            <!-- Strategy Summary Card -->
            <UCard color="primary" variant="subtle">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-sparkles" class="size-5 text-primary-500" />
                  <h3 class="text-base font-semibold leading-6">Strategic Summary</h3>
                </div>
              </template>
              <div v-if="loadingStrategy" class="space-y-2">
                <USkeleton class="h-4 w-full" />
                <USkeleton class="h-4 w-3/4" />
                <USkeleton class="h-4 w-5/6" />
              </div>
              <p
                v-else-if="strategy"
                class="text-sm leading-relaxed text-gray-700 dark:text-gray-300"
              >
                {{ strategy.summary }}
              </p>
            </UCard>

            <!-- Hydration Debt Card -->
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-droplets" class="size-5 text-blue-500" />
                  <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                    Fluid Balance
                  </h3>
                </div>
              </template>
              <div class="text-center py-4">
                <div
                  class="text-3xl font-bold"
                  :class="strategy?.hydrationDebt > 1000 ? 'text-error-500' : 'text-info-500'"
                >
                  {{ strategy?.hydrationDebt || 0 }}ml
                </div>
                <p class="text-sm text-gray-500 mt-1">Persistent Fluid Debt</p>

                <div
                  class="mt-4 p-3 rounded-lg bg-info-50 dark:bg-info-900/20 text-info-700 dark:text-info-300 text-xs"
                >
                  {{ hydrationAdvice }}
                </div>
              </div>
            </UCard>

            <!-- Fueling Script / Grocery List -->
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-shopping-cart" class="size-5 text-warning-500" />
                  <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                    Fueling Script
                  </h3>
                </div>
              </template>
              <div v-if="loadingStrategy" class="space-y-4">
                <USkeleton class="h-10 w-full" />
                <USkeleton class="h-10 w-full" />
              </div>
              <div v-else-if="strategy" class="space-y-4">
                <div
                  v-for="priority in fuelingPriorities"
                  :key="priority.date"
                  class="p-3 border border-gray-100 dark:border-gray-800 rounded-lg"
                >
                  <div class="flex justify-between items-start mb-1">
                    <span class="text-xs font-bold uppercase text-gray-500">{{
                      priority.dayLabel
                    }}</span>
                    <UBadge :color="getStateColor(priority.state)" size="xs" variant="subtle">
                      {{ priority.label }}
                    </UBadge>
                  </div>
                  <p class="text-sm font-medium">{{ priority.advice }}</p>
                </div>

                <UButton
                  block
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-clipboard-list"
                  @click="showGroceryList = true"
                >
                  View Grocery Needs
                </UButton>
              </div>
            </UCard>
          </div>
        </div>
      </div>

      <UModal
        v-model:open="showGroceryList"
        title="Strategic Grocery List"
        :ui="{ content: 'sm:max-w-md' }"
      >
        <template #content>
          <div class="p-6 space-y-4">
            <p class="text-sm text-gray-500">
              Based on your metabolic horizon, ensure you have these fueling essentials ready:
            </p>

            <ul class="space-y-2">
              <li
                v-for="item in groceryItems"
                :key="item.name"
                class="flex items-center gap-2 text-sm"
              >
                <UIcon :name="item.icon" class="size-4 text-primary-500" />
                <span>{{ item.name }}</span>
                <span class="ml-auto text-xs text-gray-400">{{ item.reason }}</span>
              </li>
            </ul>

            <div
              class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-xs text-primary-700 dark:text-primary-300"
            >
              <strong>Pro Tip:</strong> Focus on high-glycemic carbs for your State 3 days to ensure
              rapid replenishment.
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { format, parseISO } from 'date-fns'

  definePageMeta({
    middleware: 'auth',
    layout: 'default'
  })

  const loadingWave = ref(true)
  const loadingStrategy = ref(true)
  const wavePoints = ref<any[]>([])
  const strategy = ref<any>(null)
  const showGroceryList = ref(false)

  const loading = computed(() => loadingWave.value || loadingStrategy.value)

  async function refreshData() {
    loadingWave.value = true
    loadingStrategy.value = true

    try {
      const [waveRes, strategyRes] = await Promise.all([
        $fetch('/api/nutrition/extended-wave', { query: { daysAhead: 3 } }),
        $fetch('/api/nutrition/strategy')
      ])

      wavePoints.value = (waveRes as any).points
      strategy.value = strategyRes
    } catch (e) {
      console.error('Failed to load nutrition strategy:', e)
    } finally {
      loadingWave.value = false
      loadingStrategy.value = false
    }
  }

  onMounted(() => {
    refreshData()
  })

  const hydrationAdvice = computed(() => {
    if (!strategy.value) return 'Loading...'
    const debt = strategy.value.hydrationDebt
    if (debt > 1500)
      return 'Severe dehydration risk. Sip 250ml every 30 mins until balance is restored.'
    if (debt > 500) return 'Moderate fluid debt. Increase intake by 500ml over your baseline today.'
    return 'Fluid balance is optimal. Maintain standard hydration pattern.'
  })

  const fuelingPriorities = computed(() => {
    if (!strategy.value) return []
    return strategy.value.fuelingMatrix
      .filter((d: any) => d.state >= 2 || !d.isRest)
      .slice(0, 3)
      .map((d: any) => ({
        ...d,
        dayLabel: format(parseISO(d.date), 'EEEE'),
        advice:
          d.state === 3
            ? `Focus on "Aggressive Refill" (8-12g/kg) to support peak performance.`
            : d.state === 2
              ? `Target steady carb availability (5-7g/kg) for endurance support.`
              : `Eco mode active. Focus on high-quality baseline macros.`
      }))
  })

  const groceryItems = computed(() => {
    if (!strategy.value) return []
    const items = [
      { name: 'Complex Carbs', reason: 'Daily baseline', icon: 'i-lucide-wheat' },
      { name: 'Electrolytes', reason: 'Fluid retention', icon: 'i-lucide-flask-conical' }
    ]

    if (strategy.value.fuelingMatrix.some((d: any) => d.state === 3)) {
      items.push({
        name: 'Simple Sugars/Gels',
        reason: 'High intensity fueling',
        icon: 'i-lucide-zap'
      })
      items.push({ name: 'Rice/Pasta', reason: 'Carb loading', icon: 'i-lucide-utensils-crossed' })
    }

    if (strategy.value.hydrationDebt > 1000) {
      items.push({ name: 'Sodium/Sea Salt', reason: 'Rehydration focus', icon: 'i-lucide-waves' })
    }

    return items
  })

  function getStateColor(state: number) {
    if (state === 3) return 'primary'
    if (state === 2) return 'info'
    return 'success'
  }
</script>
