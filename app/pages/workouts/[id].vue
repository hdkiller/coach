<template>
  <UDashboardPanel id="workout-detail">
    <template #header>
      <UDashboardNavbar :title="workout ? `Workout: ${workout.title}` : 'Workout Details'">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            class="hidden sm:flex"
            @click="goBack"
          >
            Back to Data
          </UButton>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            class="sm:hidden"
            @click="goBack"
          />
        </template>

        <template #right>
          <div class="flex gap-2">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>
            <UDropdownMenu
              :items="[
                [
                  {
                    label: 'Edit Workout',
                    icon: 'i-heroicons-pencil-square',
                    onSelect: () => (isEditModalOpen = true)
                  },
                  {
                    label: 'Share Workout',
                    icon: 'i-heroicons-share',
                    onSelect: () => (isShareModalOpen = true)
                  }
                ],
                [
                  {
                    label: 'Delete Workout',
                    icon: 'i-heroicons-trash',
                    color: 'error',
                    onSelect: () => (isDeleteModalOpen = true)
                  }
                ]
              ]"
            >
              <UButton
                icon="i-heroicons-ellipsis-horizontal"
                color="neutral"
                variant="outline"
                size="sm"
              />
            </UDropdownMenu>
            <UButton
              icon="i-heroicons-chat-bubble-left-right"
              color="primary"
              variant="solid"
              size="sm"
              class="font-bold"
              @click="chatAboutWorkout"
            >
              <span class="hidden sm:inline">Chat about this workout</span>
              <span class="sm:hidden">Chat</span>
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <div class="flex gap-2 overflow-x-auto">
          <UButton variant="ghost" color="neutral" @click="scrollToSection('header')">
            <UIcon name="i-lucide-file-text" class="w-4 h-4 mr-2" />
            Overview
          </UButton>
          <UButton
            v-if="shouldShowExercises(workout)"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('exercises')"
          >
            <UIcon name="i-lucide-dumbbell" class="w-4 h-4 mr-2" />
            Exercises
          </UButton>
          <UButton
            v-if="workout?.overallScore || workout?.technicalScore"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('scores')"
          >
            <UIcon name="i-lucide-award" class="w-4 h-4 mr-2" />
            Scores
          </UButton>
          <UButton
            v-if="hasTrainingMetrics(workout)"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('training-impact')"
          >
            <UIcon name="i-lucide-activity-square" class="w-4 h-4 mr-2" />
            Training Impact
          </UButton>
          <UButton variant="ghost" color="neutral" @click="scrollToSection('analysis')">
            <UIcon name="i-lucide-sparkles" class="w-4 h-4 mr-2" />
            AI Analysis
          </UButton>
          <UButton
            v-if="shouldShowDetailedPacing(workout)"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('power-curve')"
          >
            <UIcon name="i-lucide-zap" class="w-4 h-4 mr-2" />
            Power Curve
          </UButton>
          <UButton
            v-if="shouldShowIntervals(workout)"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('intervals')"
          >
            <UIcon name="i-lucide-timer" class="w-4 h-4 mr-2" />
            Intervals
          </UButton>
          <UButton
            v-if="shouldShowDetailedPacing(workout)"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('advanced')"
          >
            <UIcon name="i-lucide-microscope" class="w-4 h-4 mr-2" />
            Advanced
          </UButton>
          <UButton
            v-if="shouldShowMap(workout)"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('map')"
          >
            <UIcon name="i-lucide-map" class="w-4 h-4 mr-2" />
            Map
          </UButton>
          <UButton
            v-if="shouldShowDetailedPacing(workout)"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('pacing')"
          >
            <UIcon name="i-lucide-activity" class="w-4 h-4 mr-2" />
            Pacing
          </UButton>
          <UButton
            v-if="shouldShowDetailedPacing(workout)"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('timeline')"
          >
            <UIcon name="i-lucide-chart-line" class="w-4 h-4 mr-2" />
            Timeline
          </UButton>
          <UButton
            v-if="shouldShowPacing(workout)"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('zones')"
          >
            <UIcon name="i-lucide-layers" class="w-4 h-4 mr-2" />
            Zones
          </UButton>
          <UButton
            v-if="hasEfficiencyMetrics(workout)"
            variant="ghost"
            color="neutral"
            @click="scrollToSection('efficiency')"
          >
            <UIcon name="i-lucide-gauge" class="w-4 h-4 mr-2" />
            Efficiency
          </UButton>
          <UButton variant="ghost" color="neutral" @click="scrollToSection('metrics')">
            <UIcon name="i-lucide-bar-chart-3" class="w-4 h-4 mr-2" />
            Metrics
          </UButton>
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="max-w-5xl mx-auto w-full p-0 sm:p-6 pb-24 space-y-4 sm:space-y-8">
        <!-- Loading State -->
        <div v-if="loading" class="p-4 sm:p-0 space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2">
              <UCard :ui="{ root: 'rounded-none sm:rounded-xl shadow-none sm:shadow' }">
                <div class="space-y-4">
                  <USkeleton class="h-8 w-3/4" />
                  <div class="flex gap-3">
                    <USkeleton class="h-4 w-24" />
                    <USkeleton class="h-4 w-24" />
                    <USkeleton class="h-4 w-24" />
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    <USkeleton v-for="i in 4" :key="i" class="h-16 w-full rounded-lg" />
                  </div>
                </div>
              </UCard>
            </div>
            <div class="lg:col-span-1">
              <UCard :ui="{ root: 'rounded-none sm:rounded-xl shadow-none sm:shadow' }">
                <USkeleton class="h-4 w-32 mb-4" />
                <div class="flex justify-center items-center h-48">
                  <USkeleton class="h-32 w-32 rounded-full" />
                </div>
              </UCard>
            </div>
          </div>
        </div>

        <div v-else-if="error" class="p-4 sm:p-0 text-center py-12">
          <UAlert
            icon="i-heroicons-exclamation-triangle"
            color="error"
            variant="soft"
            title="Data Error"
            :description="error"
          />
        </div>

        <div v-else-if="workout" class="space-y-4 sm:space-y-8">
          <!-- Header Section: Workout Info (2/3) + Performance Scores (1/3) -->
          <div id="header" class="scroll-mt-20" />
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <!-- Workout Info Card - 2/3 -->
            <div class="lg:col-span-2">
              <div
                class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 h-full border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
              >
                <!-- Navigation & Date -->
                <div
                  class="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-gray-800"
                >
                  <div class="flex items-center gap-4">
                    <UButton
                      icon="i-heroicons-chevron-left"
                      color="neutral"
                      variant="subtle"
                      size="sm"
                      class="rounded-lg"
                      @click="navigateDate(-1)"
                    />
                    <div class="flex flex-col">
                      <div
                        class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500"
                      >
                        {{ formatDateWeekday(workout.date) }}
                      </div>
                      <div
                        class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight"
                      >
                        {{ formatDatePrimary(workout.date) }}
                      </div>
                    </div>
                    <UButton
                      icon="i-heroicons-chevron-right"
                      color="neutral"
                      variant="subtle"
                      size="sm"
                      class="rounded-lg"
                      @click="navigateDate(1)"
                    />
                  </div>

                  <div class="flex gap-2 items-end">
                    <template v-if="workout.deviceName">
                      <UiDataAttribution
                        v-if="
                          detectProvider(workout.deviceName) &&
                          detectProvider(workout.deviceName) !== workout.source
                        "
                        :provider="detectProvider(workout.deviceName) || ''"
                        :device-name="workout.deviceName"
                      />
                      <span
                        v-else-if="
                          !detectProvider(workout.deviceName) &&
                          workout.source !== 'garmin' &&
                          workout.source !== 'zwift'
                        "
                        class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      >
                        {{ workout.deviceName }}
                      </span>
                    </template>

                    <UiDataAttribution
                      v-if="
                        [
                          'strava',
                          'garmin',
                          'zwift',
                          'apple_health',
                          'whoop',
                          'intervals',
                          'withings',
                          'hevy'
                        ].includes(workout.source)
                      "
                      :provider="workout.source"
                      :device-name="workout.deviceName"
                    />
                    <span
                      v-else
                      :class="getSourceBadgeClass(workout.source)"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      {{ workout.source }}
                    </span>
                  </div>
                </div>

                <div class="flex items-start justify-between mb-6">
                  <div class="flex-1">
                    <h1
                      class="text-2xl font-black tracking-tight text-gray-900 dark:text-white mb-2 uppercase"
                    >
                      {{ workout.title }}
                    </h1>
                    <div
                      class="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 font-black uppercase tracking-widest text-[10px]"
                    >
                      <div class="flex items-center gap-1">
                        <span class="i-heroicons-clock w-3.5 h-3.5" />
                        {{ formatDuration(workout.durationSec) }}
                      </div>
                      <div v-if="workout.type" class="flex items-center gap-1">
                        <span class="i-heroicons-tag w-3.5 h-3.5" />
                        {{ workout.type }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Key Stats Grid -->
                <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div
                    v-if="workout.trainingLoad"
                    class="rounded-xl p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 cursor-pointer hover:border-blue-500/50 transition-all active:scale-[0.98] group"
                    @click="
                      handleOpenMetric({
                        key: 'Training Load',
                        value: Math.round(workout.trainingLoad),
                        unit: ''
                      })
                    "
                  >
                    <div class="flex items-center justify-between mb-1">
                      <UTooltip
                        :popper="{ placement: 'top' }"
                        :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
                        arrow
                      >
                        <div
                          class="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 border-b border-dashed border-blue-300 dark:border-blue-700 inline-block cursor-help"
                        >
                          Training Load
                        </div>
                        <template #content>
                          <div class="text-left text-sm">{{ metricTooltips['Training Load'] }}</div>
                        </template>
                      </UTooltip>
                      <UIcon
                        name="i-heroicons-magnifying-glass-circle"
                        class="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div
                      class="text-2xl font-black text-blue-900 dark:text-blue-100 tracking-tight"
                    >
                      {{ Math.round(workout.trainingLoad) }}
                    </div>
                  </div>
                  <div
                    v-if="workout.averageHr"
                    class="rounded-xl p-4 bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800/50 cursor-pointer hover:border-pink-500/50 transition-all active:scale-[0.98] group"
                    @click="
                      handleOpenMetric({ key: 'Avg HR', value: workout.averageHr, unit: 'BPM' })
                    "
                  >
                    <div class="flex items-center justify-between mb-1">
                      <UTooltip
                        :popper="{ placement: 'top' }"
                        :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
                        arrow
                      >
                        <div
                          class="text-[10px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400 mb-1 border-b border-dashed border-pink-300 dark:border-pink-700 inline-block cursor-help"
                        >
                          Avg HR
                        </div>
                        <template #content>
                          <div class="text-left text-sm">{{ metricTooltips['Avg HR'] }}</div>
                        </template>
                      </UTooltip>
                      <UIcon
                        name="i-heroicons-magnifying-glass-circle"
                        class="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div
                      class="text-2xl font-black text-pink-900 dark:text-pink-100 tracking-tight"
                    >
                      {{ workout.averageHr }}
                      <span class="text-xs font-bold text-pink-500 uppercase">BPM</span>
                    </div>
                  </div>
                  <div
                    v-if="workout.averageWatts"
                    class="rounded-xl p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 cursor-pointer hover:border-purple-500/50 transition-all active:scale-[0.98] group"
                    @click="
                      handleOpenMetric({ key: 'Avg Power', value: workout.averageWatts, unit: 'W' })
                    "
                  >
                    <div class="flex items-center justify-between mb-1">
                      <UTooltip
                        :popper="{ placement: 'top' }"
                        :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
                        arrow
                      >
                        <div
                          class="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1 border-b border-dashed border-purple-300 dark:border-purple-700 inline-block cursor-help"
                        >
                          Avg Power
                        </div>
                        <template #content>
                          <div class="text-left text-sm">{{ metricTooltips['Avg Power'] }}</div>
                        </template>
                      </UTooltip>
                      <UIcon
                        name="i-heroicons-magnifying-glass-circle"
                        class="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div
                      class="text-2xl font-black text-purple-900 dark:text-purple-100 tracking-tight"
                    >
                      {{ workout.averageWatts
                      }}<span class="text-xs font-bold text-purple-500 uppercase">W</span>
                    </div>
                  </div>
                  <div
                    v-if="workout.normalizedPower"
                    class="rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 cursor-pointer hover:border-indigo-500/50 transition-all active:scale-[0.98] group"
                    @click="
                      handleOpenMetric({
                        key: 'Norm Power',
                        value: workout.normalizedPower,
                        unit: 'W'
                      })
                    "
                  >
                    <div class="flex items-center justify-between mb-1">
                      <UTooltip
                        :popper="{ placement: 'top' }"
                        :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
                        arrow
                      >
                        <div
                          class="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 border-b border-dashed border-indigo-300 dark:border-indigo-700 inline-block cursor-help"
                        >
                          Norm Power
                        </div>
                        <template #content>
                          <div class="text-left text-sm">{{ metricTooltips['Norm Power'] }}</div>
                        </template>
                      </UTooltip>
                      <UIcon
                        name="i-heroicons-magnifying-glass-circle"
                        class="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div
                      class="text-2xl font-black text-indigo-900 dark:text-indigo-100 tracking-tight"
                    >
                      {{ workout.normalizedPower
                      }}<span class="text-xs font-bold text-indigo-500 uppercase">W</span>
                    </div>
                  </div>
                </div>

                <div
                  v-if="workout.description"
                  class="mt-6 p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800"
                >
                  <p
                    class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium"
                  >
                    {{ workout.description }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Performance Scores Card - 1/3 -->
            <div id="scores" class="scroll-mt-20 lg:col-span-1">
              <div
                v-if="
                  workout.overallScore ||
                  workout.technicalScore ||
                  workout.effortScore ||
                  workout.pacingScore ||
                  workout.executionScore
                "
                class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800 h-full"
              >
                <h2
                  class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"
                >
                  <UIcon name="i-heroicons-star" class="w-4 h-4 text-amber-500" />
                  Performance Summary
                </h2>
                <div style="height: 200px">
                  <PerformanceScoreChart
                    :scores="{
                      overall: workout.overallScore,
                      technical: workout.technicalScore,
                      effort: workout.effortScore,
                      pacing: workout.pacingScore,
                      execution: workout.executionScore
                    }"
                  />
                </div>
              </div>
              <!-- Placeholder for when analysis is missing -->
              <div
                v-else
                class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800 h-full flex flex-col items-center justify-center text-center"
              >
                <div
                  class="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4"
                >
                  <UIcon name="i-heroicons-sparkles" class="w-6 h-6 text-gray-400" />
                </div>
                <h2 class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Analysis Required
                </h2>
                <p
                  class="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed max-w-[140px]"
                >
                  Initialize analysis to generate performance metrics.
                </p>
                <UButton
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  class="mt-6 font-black uppercase tracking-widest text-[9px]"
                  @click="scrollToSection('analysis')"
                >
                  Go to Analysis
                </UButton>
              </div>
            </div>
          </div>

          <!-- Training Impact Section (TSS, CTL, ATL, TSB) -->
          <div id="training-impact" class="scroll-mt-20 space-y-4">
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              Systemic Impact & Load
            </h2>
            <div
              v-if="hasTrainingMetrics(workout)"
              class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
            >
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <!-- TSS -->
                <div
                  class="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 shadow-sm cursor-pointer hover:border-blue-500/50 transition-all active:scale-[0.98] group"
                  @click="
                    handleOpenMetric({
                      key: 'TSS (Load)',
                      value: Math.round(workout.tss || workout.trainingLoad || 0)
                    })
                  "
                >
                  <div class="flex items-center justify-between mb-2">
                    <UTooltip
                      :popper="{ placement: 'top' }"
                      :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
                      arrow
                    >
                      <span
                        class="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300 border-b border-dashed border-blue-300 dark:border-blue-700 cursor-help"
                        >TSS (Load)</span
                      >
                      <template #content>
                        <div class="text-left text-sm">{{ metricTooltips['TSS (Load)'] }}</div>
                      </template>
                    </UTooltip>
                    <UIcon
                      name="i-heroicons-magnifying-glass-circle"
                      class="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div class="text-2xl font-black text-blue-900 dark:text-blue-100 tracking-tight">
                    {{ Math.round(workout.tss || workout.trainingLoad || 0) }}
                  </div>
                </div>

                <!-- CTL (Fitness) -->
                <div
                  class="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 shadow-sm cursor-pointer hover:border-green-500/50 transition-all active:scale-[0.98] group"
                  @click="
                    handleOpenMetric({
                      key: 'Fitness (CTL)',
                      value: workout.ctl ? Math.round(workout.ctl) : 0
                    })
                  "
                >
                  <div class="flex items-center justify-between mb-2">
                    <UTooltip
                      :popper="{ placement: 'top' }"
                      :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
                      arrow
                    >
                      <span
                        class="text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-300 border-b border-dashed border-green-300 dark:border-green-700 cursor-help"
                        >Fitness (CTL)</span
                      >
                      <template #content>
                        <div class="text-left text-sm">{{ metricTooltips['Fitness (CTL)'] }}</div>
                      </template>
                    </UTooltip>
                    <UIcon
                      name="i-heroicons-magnifying-glass-circle"
                      class="w-4 h-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div
                    class="text-2xl font-black text-green-900 dark:text-green-100 tracking-tight"
                  >
                    {{ workout.ctl ? Math.round(workout.ctl) : '-' }}
                  </div>
                </div>

                <!-- ATL (Fatigue) -->
                <div
                  class="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 shadow-sm cursor-pointer hover:border-orange-500/50 transition-all active:scale-[0.98] group"
                  @click="
                    handleOpenMetric({
                      key: 'Fatigue (ATL)',
                      value: workout.atl ? Math.round(workout.atl) : 0
                    })
                  "
                >
                  <div class="flex items-center justify-between mb-2">
                    <UTooltip
                      :popper="{ placement: 'top' }"
                      :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
                      arrow
                    >
                      <span
                        class="text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300 border-b border-dashed border-orange-300 dark:border-orange-700 cursor-help"
                        >Fatigue (ATL)</span
                      >
                      <template #content>
                        <div class="text-left text-sm">{{ metricTooltips['Fatigue (ATL)'] }}</div>
                      </template>
                    </UTooltip>
                    <UIcon
                      name="i-heroicons-magnifying-glass-circle"
                      class="w-4 h-4 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div
                    class="text-2xl font-black text-orange-900 dark:text-orange-100 tracking-tight"
                  >
                    {{ workout.atl ? Math.round(workout.atl) : '-' }}
                  </div>
                </div>

                <!-- TSB (Form) -->
                <div
                  class="p-4 rounded-xl border shadow-sm cursor-pointer hover:opacity-90 transition-all active:scale-[0.98] group"
                  :class="getFormClass(calculateForm(workout))"
                  @click="
                    handleOpenMetric({ key: 'Form (TSB)', value: calculateForm(workout) || 0 })
                  "
                >
                  <div class="flex items-center justify-between mb-2">
                    <UTooltip
                      :popper="{ placement: 'top' }"
                      :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
                      arrow
                    >
                      <span
                        class="text-[10px] font-black uppercase tracking-widest opacity-80 border-b border-dashed border-gray-400 cursor-help"
                        >Form (TSB)</span
                      >
                      <template #content>
                        <div class="text-left text-sm">{{ metricTooltips['Form (TSB)'] }}</div>
                      </template>
                    </UTooltip>
                    <UIcon
                      name="i-heroicons-magnifying-glass-circle"
                      class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div class="text-2xl font-black tracking-tight">
                    {{
                      calculateForm(workout) !== null
                        ? (calculateForm(workout)! > 0 ? '+' : '') + calculateForm(workout)
                        : '-'
                    }}
                  </div>
                </div>
              </div>

              <!-- Detailed Explanation Accordion -->
              <div class="border-t border-gray-100 dark:border-gray-800 pt-4">
                <UAccordion
                  :items="[{ label: 'How is this calculated?', slot: 'explanation' }]"
                  color="gray"
                  variant="ghost"
                >
                  <template #explanation>
                    <div
                      class="text-sm text-gray-600 dark:text-gray-400 space-y-3 pt-2 font-medium"
                    >
                      <p>
                        <strong>Data Source:</strong>
                        <span v-if="workout.source === 'intervals'">
                          This data is synced directly from
                          <a
                            href="https://intervals.icu"
                            target="_blank"
                            class="text-primary-500 hover:underline font-bold"
                            >Intervals.icu</a
                          >.
                        </span>
                        <span v-else>
                          This data is calculated locally based on your workout intensity.
                        </span>
                      </p>
                      <ul class="list-disc pl-5 space-y-2 leading-relaxed">
                        <li>
                          <strong>TSS (Training Stress Score):</strong> Measures the physiological
                          cost of a ride. 100 points is roughly equivalent to 1 hour at your
                          threshold power (FTP).
                        </li>
                        <li>
                          <strong>CTL (Fitness):</strong> Exponentially weighted average of your
                          daily TSS over 42 days. It models your training load sustainability.
                        </li>
                        <li>
                          <strong>ATL (Fatigue):</strong> Exponentially weighted average of your
                          daily TSS over 7 days. It reflects current physiological strain.
                        </li>
                        <li>
                          <strong>TSB (Form):</strong> Simply <code>CTL - ATL</code>. A positive TSB
                          indicates you are tapered and ready for peak performance.
                        </li>
                      </ul>
                    </div>
                  </template>
                </UAccordion>
              </div>
            </div>
          </div>

          <!-- Exercises Section -->
          <div v-if="shouldShowExercises(workout)" id="exercises" class="scroll-mt-20 space-y-4">
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              Exercises
            </h2>
            <WorkoutsExerciseList :exercises="workout.exercises" />
          </div>

          <!-- Nutrition Debrief -->
          <div
            v-if="nutritionEnabled && (workout.kilojoules || workout.plannedWorkout)"
            class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-l-4 border-orange-500 border-y sm:border-y sm:border-r border-gray-100 dark:border-gray-800"
          >
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-orange-100 dark:bg-orange-950/40 rounded-xl">
                  <UIcon
                    name="i-heroicons-beaker"
                    class="w-6 h-6 text-orange-600 dark:text-orange-400"
                  />
                </div>
                <h2
                  class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white"
                >
                  Nutrition Summary
                </h2>
              </div>
              <div v-if="workout.plannedWorkout?.tss" class="text-right">
                <div class="text-[10px] uppercase font-black text-gray-400 tracking-widest">
                  Energy Delta
                </div>
                <div
                  class="text-sm font-black tracking-tight"
                  :class="kJDelta >= 10 ? 'text-red-500' : 'text-green-500'"
                >
                  {{ kJDelta > 0 ? '+' : '' }}{{ kJDelta }}% kJ vs. Plan
                </div>
              </div>
            </div>

            <!-- Recovery Correction Banner -->
            <div
              v-if="kJDelta >= 10"
              class="mb-6 p-4 bg-orange-50 dark:bg-orange-950 rounded-xl border border-orange-200 dark:border-orange-900/50 flex items-start gap-3"
            >
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-6 h-6 text-orange-500 shrink-0"
              />
              <div>
                <h3
                  class="font-black text-orange-900 dark:text-orange-100 text-sm uppercase tracking-tight"
                >
                  Fueling Adjustment Recommended
                </h3>
                <p
                  class="text-xs text-orange-800 dark:text-orange-300 mt-0.5 font-medium leading-relaxed"
                >
                  Session was significantly harder than prescribed (+{{ kJDelta }}% kJ).
                  Recommending {{ recoveryCarbBump }}g additional carbohydrates over the next 4
                  hours.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Actual vs Planned -->
              <div class="space-y-4">
                <div
                  class="flex items-center justify-between text-[10px] font-black uppercase tracking-widest"
                >
                  <span class="text-gray-500">Actual Energy (kJ)</span>
                  <span class="text-gray-900 dark:text-white"
                    >{{ workout.kilojoules || 0 }} kJ</span
                  >
                </div>
                <div
                  class="flex items-center justify-between text-[10px] font-black uppercase tracking-widest"
                >
                  <span class="text-gray-500">Planned Energy (kJ)</span>
                  <span class="text-gray-400">{{ plannedKJ || 'No target set' }} kJ</span>
                </div>
                <div
                  class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden mt-2"
                >
                  <div
                    class="bg-orange-500 h-full transition-all duration-1000"
                    :style="{
                      width:
                        Math.min(((workout.kilojoules || 0) / (plannedKJ || 1)) * 100, 100) + '%'
                    }"
                  />
                </div>
              </div>

              <!-- Subjective Feedback -->
              <div
                class="bg-gray-50 dark:bg-gray-950 p-4 rounded-xl space-y-3 border border-gray-100 dark:border-gray-800"
              >
                <div class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Digestion & Stomach Feel
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    v-for="i in 5"
                    :key="i"
                    :color="stomachFeel === i ? 'primary' : 'neutral'"
                    :variant="stomachFeel === i ? 'solid' : 'ghost'"
                    size="sm"
                    class="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
                    @click="updateStomachFeel(i)"
                  >
                    {{ i }}
                  </UButton>
                </div>
                <div
                  class="flex justify-between text-[9px] text-gray-400 font-bold uppercase tracking-widest px-1"
                >
                  <span>Poor</span>
                  <span>Great</span>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Analysis Section -->
          <div id="analysis" class="scroll-mt-20 space-y-4">
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              AI Analysis
            </h2>

            <!-- Plan Adherence (if linked) -->
            <div v-if="workout.plannedWorkout" class="px-4 sm:px-0">
              <PlanAdherence
                :adherence="workout.planAdherence"
                :regenerating="analyzingAdherence"
                :planned-workout="workout.plannedWorkout"
                @regenerate="analyzeAdherence"
              />
            </div>

            <div
              class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
            >
              <div class="flex items-center justify-between mb-8">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary-500" />
                  <h3
                    class="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white"
                  >
                    Analysis Detail
                  </h3>
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    v-if="!workout.aiAnalysis"
                    icon="i-heroicons-sparkles"
                    color="primary"
                    variant="solid"
                    size="sm"
                    class="font-black uppercase tracking-widest text-[10px]"
                    :loading="analyzingWorkout"
                    :disabled="analyzingWorkout"
                    @click="analyzeWorkout"
                  >
                    Analyze
                  </UButton>
                  <UButton
                    v-else
                    icon="i-heroicons-arrow-path"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    class="font-black uppercase tracking-widest text-[10px]"
                    :loading="analyzingWorkout"
                    :disabled="analyzingWorkout"
                    @click="analyzeWorkout"
                  >
                    Regenerate
                  </UButton>
                  <UButton
                    v-if="canPublishSummaryToIntervals"
                    icon="i-heroicons-paper-airplane"
                    color="primary"
                    variant="outline"
                    size="sm"
                    class="font-black uppercase tracking-widest text-[10px]"
                    :loading="publishingSummary"
                    :disabled="publishingSummary || analyzingWorkout"
                    @click="publishSummaryToIntervals"
                  >
                    Publish
                  </UButton>
                </div>
              </div>

              <!-- Structured Analysis Display -->
              <div v-if="workout.aiAnalysisJson" class="space-y-8">
                <!-- Executive Summary -->
                <div
                  class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-6 border border-blue-100 dark:border-blue-900/30"
                >
                  <h3
                    class="text-[10px] font-black uppercase tracking-widest text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2"
                  >
                    <span class="i-heroicons-light-bulb w-4 h-4" />
                    Workout Summary
                  </h3>
                  <p class="text-base text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                    {{ workout.aiAnalysisJson.executive_summary }}
                  </p>
                </div>

                <!-- Analysis Sections -->
                <div
                  v-if="workout.aiAnalysisJson.sections"
                  class="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div
                    v-for="(section, index) in workout.aiAnalysisJson.sections"
                    :key="index"
                    class="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
                  >
                    <div
                      class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-gray-900/30"
                    >
                      <h3
                        class="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white"
                      >
                        {{ section.title }}
                      </h3>
                      <UBadge
                        :color="getStatusColor(section.status)"
                        variant="soft"
                        size="xs"
                        class="font-black uppercase tracking-widest text-[9px]"
                      >
                        {{ section.status_label || section.status }}
                      </UBadge>
                    </div>
                    <div class="px-5 py-4">
                      <ul class="space-y-3">
                        <li
                          v-for="(point, pIndex) in section.analysis_points"
                          :key="pIndex"
                          class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <span
                            class="i-heroicons-chevron-right w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0"
                          />
                          <span class="leading-tight font-medium">{{ point }}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <!-- Recommendations -->
                <div
                  v-if="workout.aiAnalysisJson.recommendations?.length"
                  class="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
                >
                  <div
                    class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
                  >
                    <h3
                      class="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2"
                    >
                      <span class="i-heroicons-clipboard-document-list w-4 h-4" />
                      Strategic Recommendations
                    </h3>
                  </div>
                  <div class="px-5 py-6 space-y-4">
                    <div
                      v-for="(rec, index) in workout.aiAnalysisJson.recommendations"
                      :key="index"
                      class="border-l-4 pl-4 py-1"
                      :class="getPriorityBorderClass(rec.priority)"
                    >
                      <div class="flex items-center gap-2 mb-1.5">
                        <h4
                          class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight"
                        >
                          {{ rec.title }}
                        </h4>
                        <span
                          v-if="rec.priority"
                          :class="getPriorityBadgeClass(rec.priority)"
                          class="text-[9px] px-1.5 py-0 rounded font-black uppercase tracking-widest"
                        >
                          {{ rec.priority }}
                        </span>
                      </div>
                      <p
                        class="text-xs text-gray-700 dark:text-gray-400 leading-relaxed font-medium"
                      >
                        {{ rec.description }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Strengths & Weaknesses -->
                <div
                  v-if="
                    workout.aiAnalysisJson.strengths?.length ||
                    workout.aiAnalysisJson.weaknesses?.length
                  "
                  class="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div
                    v-if="workout.aiAnalysisJson.strengths?.length"
                    class="bg-green-50 dark:bg-green-950/20 rounded-xl p-6 border border-green-100 dark:border-green-900/50"
                  >
                    <h3
                      class="text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-400 mb-4 flex items-center gap-2"
                    >
                      <span class="i-heroicons-check-circle w-4 h-4" />
                      Strengths Identified
                    </h3>
                    <ul class="space-y-2">
                      <li
                        v-for="(strength, index) in workout.aiAnalysisJson.strengths"
                        :key="index"
                        class="flex items-start gap-2 text-xs font-bold text-green-800 dark:text-green-300"
                      >
                        <span class="i-heroicons-plus-circle w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{{ strength }}</span>
                      </li>
                    </ul>
                  </div>

                  <div
                    v-if="workout.aiAnalysisJson.weaknesses?.length"
                    class="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-6 border border-orange-100 dark:border-orange-900/50"
                  >
                    <h3
                      class="text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-400 mb-4 flex items-center gap-2"
                    >
                      <span class="i-heroicons-exclamation-triangle w-4 h-4" />
                      Areas of Concern
                    </h3>
                    <ul class="space-y-2">
                      <li
                        v-for="(weakness, index) in workout.aiAnalysisJson.weaknesses"
                        :key="index"
                        class="flex items-start gap-2 text-xs font-bold text-orange-800 dark:text-orange-300"
                      >
                        <span
                          class="i-heroicons-arrow-trending-up w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>{{ weakness }}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <!-- Timestamp -->
                <div
                  v-if="workout.aiAnalyzedAt"
                  class="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-gray-800"
                >
                  <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Synchronized Analysis • {{ formatDate(workout.aiAnalyzedAt) }}
                  </div>
                  <AiFeedback
                    v-if="workout.llmUsageId"
                    :llm-usage-id="workout.llmUsageId"
                    :initial-feedback="workout.feedback"
                    :initial-feedback-text="workout.feedbackText"
                  />
                </div>
              </div>

              <!-- Fallback to Markdown -->
              <div v-else-if="workout.aiAnalysis" class="space-y-4">
                <div class="prose prose-sm dark:prose-invert max-w-none">
                  <!-- eslint-disable vue/no-v-html -->
                  <div
                    class="text-gray-700 dark:text-gray-300 font-medium"
                    v-html="renderedAnalysis"
                  />
                  <!-- eslint-enable vue/no-v-html -->
                </div>
                <div
                  v-if="workout.aiAnalyzedAt"
                  class="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-gray-800"
                >
                  <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Legacy Analysis • {{ formatDate(workout.aiAnalyzedAt) }}
                  </div>
                  <AiFeedback
                    v-if="workout.llmUsageId"
                    :llm-usage-id="workout.llmUsageId"
                    :initial-feedback="workout.feedback"
                    :initial-feedback-text="workout.feedbackText"
                  />
                </div>
              </div>

              <div v-else-if="!analyzingWorkout" class="text-center py-12">
                <div class="text-gray-500 dark:text-gray-400">
                  <div
                    class="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <UIcon name="i-heroicons-bolt" class="w-8 h-8 opacity-40" />
                  </div>
                  <p class="text-sm font-black uppercase tracking-widest">AI Analysis Pending</p>
                  <p class="text-xs mt-2 text-gray-400 max-w-xs mx-auto">
                    Click "Analyze" to initialize deep performance auditing on this session.
                  </p>
                </div>
              </div>

              <div v-else class="text-center py-12">
                <div
                  class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"
                />
                <p
                  class="text-sm text-gray-600 dark:text-gray-400 font-black uppercase tracking-widest"
                >
                  Analyzing Activity...
                </p>
              </div>
            </div>
          </div>

          <!-- Technical Visualizations -->
          <div id="visualizations" class="space-y-4 sm:space-y-8">
            <!-- Power Curve Section -->
            <div
              v-if="shouldShowDetailedPacing(workout)"
              id="power-curve"
              class="scroll-mt-20 space-y-4"
            >
              <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
                Power Curve
              </h2>
              <PowerCurveChart :workout-id="workout.id" />
            </div>

            <!-- Interval Analysis Section -->
            <div v-if="shouldShowIntervals(workout)" id="intervals" class="scroll-mt-20 space-y-4">
              <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
                Interval Breakdown
              </h2>
              <IntervalsAnalysis :workout-id="workout.id" />
            </div>

            <!-- Advanced Analytics Section -->
            <div
              v-if="shouldShowDetailedPacing(workout)"
              id="advanced"
              class="scroll-mt-20 space-y-4"
            >
              <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
                Advanced Metrics
              </h2>
              <AdvancedWorkoutMetrics :workout-id="workout.id" @open-metric="handleOpenMetric" />
            </div>

            <!-- Route Map Section -->
            <div v-if="shouldShowMap(workout)" id="map" class="scroll-mt-20 space-y-4">
              <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
                Session Route
              </h2>
              <UiWorkoutMap
                :coordinates="workout.streams.latlng"
                :interactive="true"
                :provider="workout.source"
                :device-name="workout.deviceName"
              />
            </div>

            <!-- Pacing Analysis -->
            <div
              v-if="shouldShowDetailedPacing(workout)"
              id="pacing"
              class="scroll-mt-20 space-y-4"
            >
              <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
                Pacing Analysis
              </h2>
              <PacingAnalysis :workout-id="workout.id" @open-metric="handleOpenMetric" />
            </div>

            <!-- Timeline -->
            <div
              v-if="shouldShowDetailedPacing(workout)"
              id="timeline"
              class="scroll-mt-20 space-y-4"
            >
              <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
                Workout Timeline
              </h2>
              <WorkoutTimeline :workout-id="workout.id" />
            </div>

            <!-- Zones -->
            <div v-if="shouldShowPacing(workout)" id="zones" class="scroll-mt-20 space-y-4">
              <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
                Zone Distribution
              </h2>
              <ZoneChart
                :workout-id="workout.id"
                :activity-type="workout.type"
                :stream-data="workout.streams"
              />
            </div>

            <!-- Efficiency -->
            <div
              v-if="hasEfficiencyMetrics(workout)"
              id="efficiency"
              class="scroll-mt-20 space-y-4"
            >
              <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
                Efficiency Metrics
              </h2>
              <EfficiencyMetricsCard
                :metrics="{
                  variabilityIndex: workout.variabilityIndex,
                  efficiencyFactor: workout.efficiencyFactor,
                  decoupling: workout.decoupling,
                  powerHrRatio: workout.powerHrRatio,
                  polarizationIndex: workout.polarizationIndex,
                  lrBalance: workout.lrBalance
                }"
                @open-metric="handleOpenMetric"
              />
            </div>
          </div>

          <!-- Personal Notes -->
          <div class="px-0 sm:px-0">
            <NotesEditor
              v-model="workout.notes"
              :notes-updated-at="workout.notesUpdatedAt"
              :api-endpoint="`/api/workouts/${workout.id}/notes`"
              class="rounded-none sm:rounded-xl border-x-0 sm:border-x border-y shadow-none sm:shadow"
              @update:notes-updated-at="workout.notesUpdatedAt = $event"
            />
          </div>

          <!-- Detailed Metrics Section -->
          <div v-if="availableMetrics.length > 0" id="metrics" class="scroll-mt-20 space-y-4">
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              Activity Metrics
            </h2>
            <div
              class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3"
            >
              <div
                v-for="metric in availableMetrics"
                :key="metric.key"
                class="flex justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 group cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/50 px-2 -mx-2 transition-colors"
                @click="handleOpenMetric({ key: metric.label, value: metric.value })"
              >
                <UTooltip
                  :popper="{ placement: 'top' }"
                  :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
                  arrow
                >
                  <span
                    class="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-dashed border-gray-300 dark:border-gray-700 cursor-help group-hover:text-primary-500 group-hover:border-primary-300 transition-colors"
                    >{{ metric.label }}</span
                  >
                  <template #content>
                    <div class="text-left text-sm">{{ metricTooltips[metric.label] }}</div>
                  </template>
                </UTooltip>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-black text-gray-900 dark:text-white tabular-nums">{{
                    metric.value
                  }}</span>
                  <UIcon
                    name="i-heroicons-magnifying-glass-circle"
                    class="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Data Streams Section -->
          <div v-if="availableStreams.length > 0" id="streams" class="scroll-mt-20 space-y-4">
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              Data Streams
            </h2>
            <div
              class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800 flex flex-wrap gap-2.5"
            >
              <UBadge
                v-for="stream in availableStreams"
                :key="stream.key"
                color="neutral"
                variant="subtle"
                size="sm"
                class="cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors uppercase font-black tracking-widest text-[9px] px-2.5 py-1"
                @click="
                  openStreamModal({
                    ...stream,
                    label: stream.label || '',
                    color: stream.color || '#000000',
                    unit: stream.unit || ''
                  })
                "
              >
                {{ stream.label }}
              </UBadge>
            </div>
          </div>

          <!-- Duplicate Workout Section -->
          <div
            v-if="workout.isDuplicate || workout.duplicates?.length || workout.plannedWorkout"
            id="duplicates"
            class="scroll-mt-20 space-y-4"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              Version Control
            </h2>
            <div
              class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
            >
              <!-- Case 1: This is a duplicate -->
              <div
                v-if="workout.isDuplicate"
                class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800"
              >
                <div class="flex items-start gap-3">
                  <UIcon
                    name="i-heroicons-information-circle"
                    class="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0"
                  />
                  <div>
                    <h3
                      class="font-bold text-yellow-900 dark:text-yellow-100 uppercase tracking-tight"
                    >
                      This workout is a duplicate
                    </h3>
                    <p class="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                      This workout has been identified as a duplicate of another activity. The
                      primary version is likely from a more preferred source.
                    </p>

                    <div v-if="workout.canonicalWorkout" class="mt-4">
                      <p
                        class="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2"
                      >
                        Original Workout Reference:
                      </p>
                      <NuxtLink
                        :to="`/workouts/${workout.canonicalWorkout.id}`"
                        class="block p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-500 transition-all"
                      >
                        <div class="flex items-center justify-between">
                          <div class="min-w-0 flex-1">
                            <div
                              class="font-black text-gray-900 dark:text-white truncate uppercase tracking-tight"
                            >
                              {{ workout.canonicalWorkout.title }}
                            </div>
                            <div
                              class="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest"
                            >
                              {{ formatDate(workout.canonicalWorkout.date) }}
                            </div>
                          </div>
                          <div class="flex items-center gap-4 ml-4 shrink-0">
                            <div class="w-48 flex justify-end">
                              <UiDataAttribution
                                v-if="
                                  [
                                    'strava',
                                    'garmin',
                                    'zwift',
                                    'apple_health',
                                    'whoop',
                                    'intervals',
                                    'withings',
                                    'hevy'
                                  ].includes(workout.canonicalWorkout.source)
                                "
                                :provider="workout.canonicalWorkout.source"
                                :device-name="workout.canonicalWorkout.deviceName"
                                mode="minimal"
                              />
                              <span
                                v-else
                                :class="getSourceBadgeClass(workout.canonicalWorkout.source)"
                                class="py-0 px-1.5 text-[10px]"
                              >
                                {{ workout.canonicalWorkout.source }}
                              </span>
                            </div>
                            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </NuxtLink>
                    </div>

                    <div class="mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-800/50">
                      <UButton
                        size="xs"
                        color="warning"
                        variant="soft"
                        icon="i-heroicons-arrow-path-rounded-square"
                        class="font-bold"
                        :loading="promoting"
                        @click="promoteWorkout"
                      >
                        Promote to Primary
                      </UButton>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Case 2: This is the original, but has duplicates -->
              <div v-else-if="workout.duplicates && workout.duplicates.length > 0">
                <div class="flex items-start gap-3 mb-4">
                  <UIcon
                    name="i-heroicons-document-duplicate"
                    class="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0"
                  />
                  <div>
                    <h3 class="font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      Linked Duplicates
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      Merged sessions identified as duplicates of this activity.
                    </p>
                  </div>
                </div>

                <div class="space-y-2">
                  <NuxtLink
                    v-for="dup in workout.duplicates"
                    :key="dup.id"
                    :to="`/workouts/${dup.id}`"
                    class="block p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-500 transition-all"
                  >
                    <div class="flex items-center justify-between">
                      <div class="min-w-0 flex-1">
                        <div
                          class="font-black text-gray-900 dark:text-white truncate uppercase tracking-tight"
                        >
                          {{ dup.title }}
                        </div>
                        <div
                          class="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest"
                        >
                          {{ formatDate(dup.date) }}
                        </div>
                      </div>
                      <div class="flex items-center gap-4 ml-4 shrink-0">
                        <UBadge
                          color="warning"
                          variant="subtle"
                          size="xs"
                          class="font-bold uppercase tracking-widest"
                          >Duplicate</UBadge
                        >
                        <div class="w-48 flex justify-end">
                          <UiDataAttribution
                            v-if="
                              [
                                'strava',
                                'garmin',
                                'zwift',
                                'apple_health',
                                'whoop',
                                'intervals',
                                'withings',
                                'hevy'
                              ].includes(dup.source)
                            "
                            :provider="dup.source"
                            :device-name="dup.deviceName"
                            mode="minimal"
                          />
                          <span
                            v-else
                            :class="getSourceBadgeClass(dup.source)"
                            class="py-0 px-1.5 text-[10px]"
                          >
                            {{ dup.source }}
                          </span>
                        </div>
                        <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </NuxtLink>
                </div>
              </div>

              <!-- Linked Planned Workout -->
              <div
                v-if="workout.plannedWorkout"
                class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800"
              >
                <div class="flex items-start gap-3 mb-4">
                  <UIcon
                    name="i-heroicons-calendar"
                    class="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0"
                  />
                  <div>
                    <h3 class="font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      Prescribed Plan Match
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      This activity successfully completed the following planned workout.
                    </p>
                  </div>
                </div>

                <NuxtLink
                  :to="`/workouts/planned/${workout.plannedWorkout.id}`"
                  class="block p-4 bg-primary-50 dark:bg-primary-950/20 rounded-xl border border-primary-100 dark:border-primary-900/50 hover:border-primary-500 dark:hover:border-primary-500 transition-all shadow-sm"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <div
                        class="font-black text-gray-900 dark:text-white uppercase tracking-tight"
                      >
                        {{ workout.plannedWorkout.title }}
                      </div>
                      <div
                        class="text-[10px] text-gray-500 mt-1 flex items-center gap-2 font-bold uppercase tracking-widest"
                      >
                        {{ formatDateUTC(workout.plannedWorkout.date) }}
                        <span
                          v-if="workout.plannedWorkout.type"
                          class="px-1.5 py-0 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-black uppercase tracking-widest"
                        >
                          {{ workout.plannedWorkout.type }}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <UBadge
                        color="primary"
                        variant="solid"
                        size="xs"
                        class="font-black uppercase tracking-widest"
                        >Plan</UBadge
                      >
                      <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Metric Detail Modal -->
  <WorkoutsMetricDetailModal
    v-if="activeMetric"
    v-model="isMetricModalOpen"
    :metric-key="activeMetric.key"
    :value="activeMetric.value"
    :unit="activeMetric.unit"
    :rating="activeMetric.rating"
    :rating-color="activeMetric.ratingColor"
    :workout-id="workout?.id"
    :streams="workout?.streams"
  />

  <!-- Promote Workout Confirmation Modal -->
  <UModal
    v-model:open="isPromoteModalOpen"
    title="Promote Workout"
    description="This will make the current workout the primary version."
  >
    <template #body>
      <div class="space-y-4">
        <div
          class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800"
        >
          <div class="flex items-start gap-3">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0"
            />
            <div>
              <h3 class="font-semibold text-yellow-900 dark:text-yellow-100">Are you sure?</h3>
              <p class="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                This action will swap the primary status. The current primary workout will become a
                duplicate of this one.
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="isPromoteModalOpen = false"
        />
        <UButton
          label="Make Primary"
          color="warning"
          variant="solid"
          :loading="promoting"
          @click="confirmPromoteWorkout"
        />
      </div>
    </template>
  </UModal>

  <!-- Share Modal -->
  <UModal
    v-model:open="isShareModalOpen"
    title="Share Workout"
    description="Create a read-only link to this workout and share it directly to social platforms."
  >
    <template #body>
      <ShareAccessPanel
        :link="shareLink"
        :loading="generatingShareLink"
        :expiry-value="shareExpiryValue"
        resource-label="workout"
        :share-title="
          workout?.title ? `Workout: ${workout.title}` : 'Workout shared from Coach Wattz'
        "
        @update:expiry-value="shareExpiryValue = $event"
        @generate="generateShareLink"
        @copy="copyToClipboard"
      />
    </template>
    <template #footer>
      <UButton label="Close" color="neutral" variant="ghost" @click="isShareModalOpen = false" />
    </template>
  </UModal>

  <!-- Stream Chart Modal -->
  <StreamChartModal
    v-if="selectedStream"
    v-model:open="isStreamModalOpen"
    :workout-id="workout?.id"
    :stream-key="selectedStream.key"
    :title="selectedStream.label"
    :color="selectedStream.color"
    :unit="selectedStream.unit"
  />

  <!-- Edit Workout Modal -->
  <WorkoutsEditModal
    v-if="workout"
    v-model:open="isEditModalOpen"
    :workout="workout"
    @updated="fetchWorkout"
    @delete="
      isEditModalOpen = false
      isDeleteModalOpen = true
    "
  />

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Delete Workout"
    description="This will permanently remove the activity from your history."
  >
    <template #body>
      <div class="space-y-4">
        <div
          class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800"
        >
          <div class="flex items-start gap-3">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0"
            />
            <div>
              <h3 class="font-semibold text-red-900 dark:text-red-100">Are you sure?</h3>
              <p class="text-sm text-red-800 dark:text-red-200 mt-1">
                This action cannot be undone. All data, analysis, and metrics associated with this
                workout will be permanently deleted.
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="workout?.source !== 'manual' && workout?.source !== 'fit_file'"
          class="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800"
        >
          <div class="flex items-start gap-3">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0"
            />
            <div>
              <h3
                class="font-semibold text-orange-900 dark:text-orange-100 uppercase tracking-tight text-xs"
              >
                Sync Note
              </h3>
              <p class="text-xs text-orange-800 dark:text-orange-200 mt-1 font-medium">
                This activity was synced from <strong>{{ workout?.source }}</strong
                >. If you don't delete it there as well, it may be re-imported during the next
                synchronization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="isDeleteModalOpen = false"
        />
        <UButton
          label="Delete Permanently"
          color="error"
          variant="solid"
          :loading="deleting"
          @click="deleteWorkout"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { marked } from 'marked'
  import PlanAdherence from '~/components/workouts/PlanAdherence.vue'
  import StreamChartModal from '~/components/charts/streams/StreamChartModal.vue'
  import { metricTooltips } from '~/utils/tooltips'
  import { formatDistance as formatDist, formatTemperature } from '~/utils/metrics'

  const { formatDate: baseFormatDate, formatDateTime, formatDateUTC } = useFormat()

  definePageMeta({
    middleware: 'auth'
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const config = useRuntimeConfig()
  const upgradeModal = useUpgradeModal()
  const userStore = useUserStore()
  const nutritionEnabled = computed(
    () =>
      userStore.profile?.nutritionTrackingEnabled !== false &&
      userStore.user?.nutritionTrackingEnabled !== false
  )

  const workout = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const analyzingWorkout = ref(false)
  const analyzingAdherence = ref(false)
  const publishingSummary = ref(false)
  const sharing = ref(false)
  const promoting = ref(false)
  const isPromoteModalOpen = ref(false)
  const isEditModalOpen = ref(false)
  const isDeleteModalOpen = ref(false)
  const deleting = ref(false)
  const stomachFeel = ref<number | null>(null)

  function goBack() {
    router.back()
  }

  const plannedKJ = computed(() => {
    if (!workout.value?.plannedWorkout) return null
    const pw = workout.value.plannedWorkout
    // Simple estimation: TSS * 10 or from duration/intensity if available
    // For now use a multiplier for demonstration
    return Math.round((pw.tss || 100) * 8.5)
  })

  const kJDelta = computed(() => {
    if (!workout.value?.kilojoules || !plannedKJ.value) return 0
    return Math.round(((workout.value.kilojoules - plannedKJ.value) / plannedKJ.value) * 100)
  })

  const recoveryCarbBump = computed(() => {
    if (kJDelta.value < 10) return 0
    // roughly 40g per 15% delta
    return Math.round((kJDelta.value / 15) * 40)
  })

  async function updateStomachFeel(val: number) {
    stomachFeel.value = val
    try {
      await $fetch(`/api/workouts/${workout.value.id}/metadata`, {
        method: 'POST' as any,
        body: { stomachFeel: val }
      })
      toast.add({
        title: 'Feedback Saved',
        description: 'Thank you! Your feedback helps tune your carb limits.',
        color: 'success'
      })
    } catch (e) {
      console.error('Failed to save stomach feel', e)
    }
  }

  // Stream Modal State
  const isStreamModalOpen = ref(false)
  const selectedStream = ref<{ key: string; label: string; color: string; unit: string } | null>(
    null
  )

  function openStreamModal(stream: { key: string; label: string; color: string; unit: string }) {
    selectedStream.value = stream
    isStreamModalOpen.value = true
  }

  // Metric Detail Modal State
  const isMetricModalOpen = ref(false)
  const activeMetric = ref<any>(null)

  function handleOpenMetric(metric: any) {
    activeMetric.value = metric
    isMetricModalOpen.value = true
  }

  // Share functionality
  const isShareModalOpen = ref(false)
  const shareLink = ref('')
  const shareExpiryValue = ref('2592000')
  const generatingShareLink = ref(false)

  const generateShareLink = async (options?: { expiresIn?: number | null; forceNew?: boolean }) => {
    if (!workout.value?.id || generatingShareLink.value) return

    generatingShareLink.value = true
    try {
      const body: Record<string, any> = {
        resourceType: 'WORKOUT',
        resourceId: workout.value.id
      }
      if (options?.expiresIn !== undefined) body.expiresIn = options.expiresIn
      if (options?.forceNew) body.forceNew = true

      const response = await $fetch('/api/share/generate', {
        method: 'POST',
        body
      })
      shareLink.value = response.url
    } catch (error) {
      console.error('Failed to generate share link:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to generate share link. Please try again.',
        color: 'error'
      })
    } finally {
      generatingShareLink.value = false
    }
  }

  const copyToClipboard = () => {
    if (!shareLink.value) return

    navigator.clipboard.writeText(shareLink.value)
    toast.add({
      title: 'Copied',
      description: 'Share link copied to clipboard.',
      color: 'success'
    })
  }

  watch(isShareModalOpen, (newValue) => {
    if (newValue && !shareLink.value) {
      generateShareLink()
    }
  })

  // Set page title and description
  useHead(() => {
    if (!workout.value) {
      return {
        title: 'Workout Details',
        meta: [{ name: 'description', content: 'View detailed workout analysis and metrics' }]
      }
    }

    const workoutType = workout.value.type ? ` - ${workout.value.type}` : ''
    const workoutDate = baseFormatDate(workout.value.date)

    const title = `${workout.value.title} | Coach Wattz`

    const descriptionParts = [
      `${workout.value.title}${workoutType}`,
      `${workoutDate}`,
      workout.value.durationSec ? `Duration: ${formatDuration(workout.value.durationSec)}` : null,
      workout.value.trainingLoad
        ? `Training Load: ${Math.round(workout.value.trainingLoad)}`
        : null,
      workout.value.overallScore ? `Score: ${workout.value.overallScore}/10` : null
    ]
      .filter(Boolean)
      .join(' • ')

    return {
      title,
      meta: [{ name: 'description', content: descriptionParts }]
    }
  })

  // Rendered markdown analysis
  const renderedAnalysis = computed(() => {
    if (!workout.value?.aiAnalysis) return ''
    return marked(workout.value.aiAnalysis)
  })

  const workoutSummary = computed(() => {
    const summary = workout.value?.aiAnalysisJson?.executive_summary
    return typeof summary === 'string' ? summary.trim() : ''
  })

  const canPublishSummaryToIntervals = computed(() => {
    return Boolean(
      workout.value?.source === 'intervals' && workout.value?.externalId && workoutSummary.value
    )
  })

  // Available metrics computed property - only shows non-null values
  const availableMetrics = computed(() => {
    if (!workout.value) return []

    const metrics: Array<{ key: string; label: string; value: string }> = []

    // Power metrics
    if (workout.value.averageWatts)
      metrics.push({
        key: 'avgPower',
        label: 'Average Power',
        value: `${workout.value.averageWatts}W`
      })
    if (workout.value.maxWatts)
      metrics.push({ key: 'maxPower', label: 'Max Power', value: `${workout.value.maxWatts}W` })
    if (workout.value.normalizedPower)
      metrics.push({
        key: 'np',
        label: 'Normalized Power',
        value: `${workout.value.normalizedPower}W`
      })
    if (workout.value.weightedAvgWatts)
      metrics.push({
        key: 'wap',
        label: 'Weighted Avg Power',
        value: `${workout.value.weightedAvgWatts}W`
      })

    // Heart rate metrics
    if (workout.value.maxHr)
      metrics.push({ key: 'maxHr', label: 'Max HR', value: `${workout.value.maxHr} bpm` })

    // Cadence metrics
    if (workout.value.averageCadence)
      metrics.push({
        key: 'avgCad',
        label: 'Average Cadence',
        value: `${workout.value.averageCadence} rpm`
      })
    if (workout.value.maxCadence)
      metrics.push({
        key: 'maxCad',
        label: 'Max Cadence',
        value: `${workout.value.maxCadence} rpm`
      })

    // Advanced metrics
    if (workout.value.variabilityIndex)
      metrics.push({
        key: 'vi',
        label: 'Variability Index',
        value: workout.value.variabilityIndex.toFixed(3)
      })
    if (workout.value.powerHrRatio)
      metrics.push({
        key: 'phr',
        label: 'Power/HR Ratio',
        value: workout.value.powerHrRatio.toFixed(2)
      })
    if (workout.value.efficiencyFactor)
      metrics.push({
        key: 'ef',
        label: 'Efficiency Factor',
        value: workout.value.efficiencyFactor.toFixed(2)
      })
    if (workout.value.decoupling)
      metrics.push({
        key: 'dec',
        label: 'Decoupling',
        value: `${workout.value.decoupling.toFixed(1)}%`
      })
    if (workout.value.polarizationIndex)
      metrics.push({
        key: 'pi',
        label: 'Polarization Index',
        value: workout.value.polarizationIndex.toFixed(2)
      })
    if (workout.value.lrBalance)
      metrics.push({
        key: 'lr',
        label: 'L/R Balance',
        value: `${workout.value.lrBalance.toFixed(1)}%`
      })

    // Advanced Physiology
    if (workout.value.strainScore)
      metrics.push({
        key: 'strain',
        label: 'Strain Score',
        value: workout.value.strainScore.toFixed(1)
      })
    if (workout.value.hrLoad)
      metrics.push({ key: 'hrLoad', label: 'HR Load', value: workout.value.hrLoad.toFixed(0) })
    if (workout.value.workAboveFtp)
      metrics.push({
        key: 'workAboveFtp',
        label: 'Work > FTP',
        value: `${(workout.value.workAboveFtp / 1000).toFixed(1)} kJ`
      })
    if (workout.value.wBalDepletion)
      metrics.push({
        key: 'wBal',
        label: "W' Bal Depletion",
        value: `${(workout.value.wBalDepletion / 1000).toFixed(1)} kJ`
      })
    if (workout.value.wPrime)
      metrics.push({
        key: 'wPrime',
        label: "W'",
        value: `${(workout.value.wPrime / 1000).toFixed(1)} kJ`
      })
    if (workout.value.carbsUsed)
      metrics.push({ key: 'carbs', label: 'Carbs Used', value: `${workout.value.carbsUsed} g` })

    // Training status
    if (workout.value.ctl)
      metrics.push({ key: 'ctl', label: 'CTL (Fitness)', value: workout.value.ctl.toFixed(1) })
    if (workout.value.atl)
      metrics.push({ key: 'atl', label: 'ATL (Fatigue)', value: workout.value.atl.toFixed(1) })
    if (workout.value.ftp)
      metrics.push({ key: 'ftp', label: 'FTP at Time', value: `${workout.value.ftp}W` })

    // Subjective metrics
    if (workout.value.rpe)
      metrics.push({ key: 'rpe', label: 'RPE', value: `${workout.value.rpe}/10` })
    if (workout.value.sessionRpe)
      metrics.push({ key: 'srpe', label: 'Session RPE', value: `${workout.value.sessionRpe}` })
    // Standardized feel scale is 1-5 (1=Weak, 5=Strong)
    if (workout.value.feel)
      metrics.push({ key: 'feel', label: 'Feel', value: `${workout.value.feel}/5` })
    if (workout.value.trimp)
      metrics.push({ key: 'trimp', label: 'TRIMP', value: `${workout.value.trimp}` })

    // Environment
    if (workout.value.avgTemp !== null && workout.value.avgTemp !== undefined)
      metrics.push({
        key: 'temp',
        label: 'Avg Temperature',
        value: formatTemperature(
          workout.value.avgTemp,
          userStore.profile?.temperatureUnits || 'Celsius'
        )
      })
    if (workout.value.trainer !== null && workout.value.trainer !== undefined)
      metrics.push({
        key: 'trainer',
        label: 'Indoor Trainer',
        value: workout.value.trainer ? 'Yes' : 'No'
      })

    return metrics
  })

  // Available streams computed property
  const availableStreams = computed(() => {
    if (!workout.value || !workout.value.streams) return []
    const streams = []

    // Define stream metadata
    const streamMetadata: Record<string, { label: string; color: string; unit: string }> = {
      time: { label: 'Time', color: '#9ca3af', unit: 's' },
      distance: { label: 'Distance', color: '#6b7280', unit: userStore.distanceUnitLabel },
      velocity: { label: 'Velocity', color: '#3b82f6', unit: 'm/s' },
      heartrate: { label: 'Heart Rate', color: '#ef4444', unit: 'bpm' },
      cadence: { label: 'Cadence', color: '#f59e0b', unit: 'rpm' },
      watts: { label: 'Power', color: '#8b5cf6', unit: 'W' },
      altitude: { label: 'Altitude', color: '#10b981', unit: 'm' },
      latlng: { label: 'GPS', color: '#6366f1', unit: '' },
      grade: { label: 'Grade', color: '#14b8a6', unit: '%' },
      moving: { label: 'Moving', color: '#9ca3af', unit: '' },
      torque: { label: 'Torque', color: '#f97316', unit: 'N-m' },
      temp: { label: 'Temperature', color: '#06b6d4', unit: userStore.temperatureUnitLabel },
      respiration: { label: 'Respiration', color: '#ec4899', unit: 'brpm' },
      hrv: { label: 'HRV', color: '#84cc16', unit: 'ms' },
      leftRightBalance: { label: 'L/R Balance', color: '#d946ef', unit: '%' }
    }

    const streamKeys = Object.keys(streamMetadata)

    for (const key of streamKeys) {
      if (
        workout.value.streams[key] &&
        Array.isArray(workout.value.streams[key]) &&
        workout.value.streams[key].length > 0
      ) {
        streams.push({
          key,
          ...streamMetadata[key]
        })
      }
    }
    return streams
  })

  // Fetch workout data
  async function fetchWorkout() {
    loading.value = true
    error.value = null
    try {
      const id = route.params.id
      workout.value = await $fetch(`/api/workouts/${id}`)
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to load workout'
      console.error('Error fetching workout:', e)
    } finally {
      loading.value = false
    }
  }

  // Background Task Monitoring
  const { refresh: refreshRuns } = useUserRuns()
  const { onTaskCompleted } = useUserRunsState()

  // Analyze workout function
  async function analyzeWorkout() {
    if (!workout.value) return

    analyzingWorkout.value = true
    try {
      const result = (await $fetch(`/api/workouts/${workout.value.id}/analyze`, {
        method: 'POST'
      })) as any

      // If already completed, update immediately
      if (result.status === 'COMPLETED' && 'analysis' in result && result.analysis) {
        workout.value.aiAnalysis = result.analysis
        workout.value.aiAnalyzedAt = result.analyzedAt
        workout.value.aiAnalysisStatus = 'COMPLETED'
        analyzingWorkout.value = false

        toast.add({
          title: 'Analysis Ready',
          description: 'Workout analysis already exists',
          color: 'success',
          icon: 'i-heroicons-check-circle'
        })
        return
      }

      // Update status
      workout.value.aiAnalysisStatus = result.status
      refreshRuns()

      // Show processing message
      toast.add({
        title: 'Analysis Started',
        description: 'Your workout is being analyzed by AI. This may take a minute...',
        color: 'info',
        icon: 'i-heroicons-sparkles'
      })
    } catch (e: any) {
      console.error('Error triggering workout analysis:', e)
      analyzingWorkout.value = false

      if (e.data?.statusCode === 429 || e.status === 429) {
        upgradeModal.show({
          title: 'Crush Your Training Momentum',
          featureTitle: 'Strategic Analysis',
          featureDescription:
            'Unlock elite-level auditing for every session. Upgrade to Supporter or Pro for always-on automatic analysis and deeper performance insights.',
          recommendedTier: 'supporter',
          bullets: [
            'Always-On Auto Analysis',
            'Deep Execution Scoring',
            'Technical Pacing Audit',
            'Strategic Improvements'
          ]
        })
        return
      }

      toast.add({
        title: 'Analysis Failed',
        description: e.data?.message || e.message || 'Failed to start workout analysis',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    }
  }

  // Analyze plan adherence
  async function analyzeAdherence() {
    if (!workout.value) return

    analyzingAdherence.value = true
    try {
      await $fetch(`/api/workouts/${workout.value.id}/analyze-adherence`, {
        method: 'POST'
      })
      refreshRuns()

      toast.add({
        title: 'Analysis Started',
        description: 'Analyzing plan adherence...',
        color: 'info',
        icon: 'i-heroicons-sparkles'
      })
    } catch (e: any) {
      console.error('Error triggering adherence analysis:', e)
      analyzingAdherence.value = false

      if (e.data?.statusCode === 429 || e.status === 429) {
        upgradeModal.show({
          title: 'Usage Quota Reached',
          featureTitle: 'Plan Adherence Analysis',
          featureDescription:
            'You have reached the analysis quota for your current plan. Upgrade to Supporter or Pro for higher quotas.',
          recommendedTier: 'supporter'
        })
        return
      }

      toast.add({
        title: 'Analysis Failed',
        description: e.data?.message || 'Failed to start adherence analysis',
        color: 'error'
      })
    }
  }

  async function publishSummaryToIntervals() {
    if (!workout.value || !canPublishSummaryToIntervals.value || publishingSummary.value) return

    publishingSummary.value = true
    try {
      await $fetch(`/api/workouts/${workout.value.id}/publish-summary`, {
        method: 'POST'
      })

      toast.add({
        title: 'Published',
        description: 'Workout summary has been added to Intervals.icu notes',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })

      await fetchWorkout()
    } catch (e: any) {
      console.error('Error publishing workout summary:', e)
      toast.add({
        title: 'Publish Failed',
        description: e.data?.message || e.message || 'Failed to publish workout summary',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    } finally {
      publishingSummary.value = false
    }
  }

  // Listen for completion
  onTaskCompleted('analyze-workout', async (run) => {
    await fetchWorkout()
    analyzingWorkout.value = false
    toast.add({
      title: 'Analysis Complete',
      description: 'AI workout analysis has been generated successfully',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  })

  onTaskCompleted('analyze-plan-adherence', async (run) => {
    await fetchWorkout()
    analyzingAdherence.value = false
    toast.add({
      title: 'Adherence Analysis Complete',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  })

  async function promoteWorkout() {
    if (!workout.value) return
    isPromoteModalOpen.value = true
  }

  async function confirmPromoteWorkout() {
    if (!workout.value) return

    promoting.value = true
    try {
      await $fetch(`/api/workouts/${workout.value.id}/promote`, {
        method: 'POST'
      })

      toast.add({
        title: 'Success',
        description: 'Workout promoted to primary version',
        color: 'success'
      })

      // Refresh to reflect changes
      await fetchWorkout()
      isPromoteModalOpen.value = false
    } catch (e: any) {
      console.error('Failed to promote workout:', e)
      toast.add({
        title: 'Error',
        description: e.data?.message || 'Failed to promote workout',
        color: 'error'
      })
    } finally {
      promoting.value = false
    }
  }

  async function deleteWorkout() {
    if (!workout.value || deleting.value) return

    deleting.value = true
    try {
      await $fetch(`/api/workouts/${workout.value.id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: 'Workout Deleted',
        description: 'The activity has been removed.',
        color: 'success'
      })

      // Navigate back to activities/history
      router.push('/activities')
    } catch (e: any) {
      console.error('Failed to delete workout:', e)
      toast.add({
        title: 'Error',
        description: e.data?.message || 'Failed to delete workout',
        color: 'error'
      })
    } finally {
      deleting.value = false
      isDeleteModalOpen.value = false
    }
  }

  // Utility functions
  function formatDate(date: string | Date) {
    return formatDateTime(date, 'EEEE, MMMM d, yyyy h:mm a')
  }

  function formatDatePrimary(date: string | Date) {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    })
  }

  function formatDateWeekday(date: string | Date) {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      weekday: 'long'
    })
  }

  function navigateDate(direction: number) {
    if (!workout.value) return
    const neighborId = direction > 0 ? workout.value.nextWorkoutId : workout.value.prevWorkoutId

    if (neighborId) {
      navigateTo(`/workouts/${neighborId}`)
    } else {
      // Fallback: if no neighbor, go to activities for that date range
      const baseDate = new Date(workout.value.date)
      const targetDate = new Date(baseDate)
      targetDate.setDate(baseDate.getDate() + direction)
      navigateTo({
        path: '/activities',
        query: { date: targetDate.toISOString().split('T')[0] }
      })
    }
  }

  function formatDuration(seconds: number) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  function formatDistance(meters: number) {
    return formatDist(meters, userStore.profile?.distanceUnits || 'Kilometers')
  }

  function getSourceBadgeClass(source: string) {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold'
    if (source === 'intervals')
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
    if (source === 'whoop')
      return `${baseClass} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`
    if (source === 'strava')
      return `${baseClass} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`
    if (source === 'garmin')
      return `${baseClass} bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200`
    return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`
  }

  function getStatusColor(status: string) {
    if (!status) return 'neutral'
    const s = status.toLowerCase()
    if (s === 'excellent' || s === 'good') return 'success'
    if (s === 'moderate' || s === 'fair') return 'warning'
    if (s === 'needs_improvement' || s === 'poor' || s === 'failing') return 'error'
    return 'neutral'
  }

  function getStatusBadgeClass(status: string) {
    const color = getStatusColor(status)
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold'

    if (color === 'success')
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
    if (color === 'warning')
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
    if (color === 'error')
      return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`

    return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`
  }

  function getPriorityBadgeClass(priority: string) {
    const baseClass = 'px-2 py-0.5 rounded text-xs font-medium'
    if (priority === 'high')
      return `${baseClass} bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200`
    if (priority === 'medium')
      return `${baseClass} bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200`
    if (priority === 'low')
      return `${baseClass} bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200`
    return `${baseClass} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200`
  }

  function getPriorityBorderClass(priority: string) {
    if (priority === 'high') return 'border-red-500'
    if (priority === 'medium') return 'border-yellow-500'
    if (priority === 'low') return 'border-blue-500'
    return 'border-gray-300'
  }

  function getScoreCircleClass(score: number) {
    if (score >= 8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (score >= 6) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    if (score >= 4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  function shouldShowExercises(workout: any) {
    if (!workout) return false
    return workout.exercises && workout.exercises.length > 0
  }

  function shouldShowPowerCurve(workout: any) {
    if (!workout) return false
    // Show power curve if workout has power data (watts stream)
    const supportedSources = ['strava', 'intervals', 'fit_file']
    return (
      supportedSources.includes(workout.source) &&
      workout.streams &&
      (workout.averageWatts || workout.maxWatts)
    )
  }

  function shouldShowMap(workout: any) {
    if (!workout || !workout.streams) return false
    return (
      workout.streams.latlng &&
      Array.isArray(workout.streams.latlng) &&
      workout.streams.latlng.length > 0
    )
  }

  function shouldShowIntervals(workout: any) {
    if (!workout || !workout.streams) return false
    const supportedSources = ['strava', 'intervals', 'fit_file']
    return (
      supportedSources.includes(workout.source) &&
      (workout.streams.watts || workout.streams.heartrate || workout.streams.velocity)
    )
  }

  function shouldShowPacing(workout: any) {
    if (!workout) return false
    // Show timeline/zones if workout has stream data (time-series HR, power, velocity, etc.)
    // OR if it has cached zone data in rawJson (fallback for Whoop, etc.)
    const supportedSources = ['strava', 'intervals', 'fit_file', 'whoop']
    const hasRawZones = workout.rawJson?.score?.zone_durations?.length > 0
    const hasStreams =
      workout.streams &&
      (workout.streams.heartrate ||
        workout.streams.watts ||
        workout.streams.velocity ||
        workout.streams.hrZoneTimes ||
        workout.streams.powerZoneTimes)
    return (supportedSources.includes(workout.source) && hasStreams) || hasRawZones
  }

  function shouldShowDetailedPacing(workout: any) {
    if (!workout || !workout.streams) return false
    // Detailed pacing needs raw time-series data
    return workout.streams.heartrate || workout.streams.watts || workout.streams.velocity
  }

  function hasEfficiencyMetrics(workout: any) {
    if (!workout) return false
    return (
      workout.variabilityIndex !== null ||
      workout.efficiencyFactor !== null ||
      workout.decoupling !== null ||
      workout.powerHrRatio !== null ||
      workout.polarizationIndex !== null ||
      workout.lrBalance !== null
    )
  }

  function hasTrainingMetrics(workout: any) {
    if (!workout) return false
    return (
      (workout.tss !== null || workout.trainingLoad !== null) &&
      (workout.ctl !== null || workout.atl !== null)
    )
  }

  function calculateForm(workout: any) {
    if (!workout || workout.ctl === null || workout.atl === null) return null
    return Math.round(workout.ctl - workout.atl)
  }

  function getFormClass(form: number | null) {
    if (form === null)
      return 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500'

    if (form >= 25)
      return 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-900 dark:text-blue-100' // Transition
    if (form >= 5)
      return 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-900 dark:text-green-100' // Fresh
    if (form >= -10)
      return 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white' // Grey zone / Neutral
    if (form >= -30)
      return 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100' // Optimal Training
    return 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-900 dark:text-red-100' // High Risk
  }

  // Scroll to section
  function scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Chat about workout
  function chatAboutWorkout() {
    if (!workout.value) return
    navigateTo({
      path: '/chat',
      query: { workoutId: workout.value.id }
    })
  }

  function detectProvider(name: string | undefined): string | undefined {
    if (!name) return undefined
    const lower = name.toLowerCase()
    if (lower.includes('zwift')) return 'zwift'
    if (lower.includes('garmin')) return 'garmin'
    if (lower.includes('apple')) return 'apple_health'
    return undefined
  }

  // Load data on mount
  onMounted(() => {
    fetchWorkout()
  })
</script>
