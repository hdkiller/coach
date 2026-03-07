<template>
  <UDashboardPanel id="workout-detail">
    <template #header>
      <UDashboardNavbar :title="workout ? `Workout: ${workout.title}` : t('details_title')">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            class="hidden sm:flex"
            @click="goBack"
          >
            {{ t('back_to_data') }}
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
            <UButton
              icon="i-heroicons-adjustments-horizontal"
              color="neutral"
              variant="outline"
              size="sm"
              @click="isWorkoutSectionsModalOpen = true"
            >
              <span class="hidden sm:inline">{{ t('controls_customize') }}</span>
            </UButton>
            <UButton
              icon="i-heroicons-share"
              color="neutral"
              variant="outline"
              size="sm"
              class="hidden sm:flex"
              @click="isShareModalOpen = true"
            >
              <span>{{ t('controls_share') }}</span>
            </UButton>
            <UDropdownMenu
              :items="[
                [
                  {
                    label: t('controls_edit'),
                    icon: 'i-heroicons-pencil-square',
                    onSelect: () => (isEditModalOpen = true)
                  },
                  {
                    label: t('controls_share'),
                    icon: 'i-heroicons-share',
                    class: 'sm:hidden',
                    onSelect: () => (isShareModalOpen = true)
                  }
                ],
                [
                  {
                    label: t('controls_delete'),
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
              <span class="hidden sm:inline">{{ t('controls_chat_about') }}</span>
              <span class="sm:hidden">{{ t('controls_chat') }}</span>
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <div class="flex gap-2 overflow-x-auto">
          <UButton
            v-for="section in workoutNavSections"
            :key="section.key"
            variant="ghost"
            color="neutral"
            @click="scrollToSection(section.anchorId)"
          >
            <UIcon :name="section.icon" class="w-4 h-4 mr-2" />
            {{ section.label }}
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
            :title="t('error_data_title')"
            :description="error"
          />
        </div>

        <div v-else-if="workout" class="flex flex-col gap-4 sm:gap-8">
          <!-- Header Section: Workout Info (2/3) + Performance Scores (1/3) -->
          <div id="header" class="scroll-mt-20" />
          <div
            v-if="isSectionEnabled('overview')"
            class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
            :style="sectionStyle('overview')"
          >
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

                    <!-- Map Analysis shortcut -->
                    <UButton
                      :to="`/workouts/${workout.id}/map`"
                      icon="i-heroicons-map"
                      color="primary"
                      variant="subtle"
                      size="sm"
                      class="ml-2 font-bold"
                    >
                      {{ t('map_analysis') }}
                    </UButton>
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
                      {{ t(`source_${workout.source}`) || workout.source }}
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
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-heroicons-hashtag"
                          class="ml-1"
                          :ui="{ base: 'px-1.5' }"
                          @click="showTagEditor = !showTagEditor"
                        >
                          <span v-if="workout.tags?.length" class="text-[9px] font-black">
                            {{ workout.tags.length }}
                          </span>
                        </UButton>
                      </div>

                      <!-- Personal Best Badges -->
                      <div v-if="achievements.length > 0" class="flex items-center gap-1.5 ml-2">
                        <template v-for="pb in achievements" :key="pb.type">
                          <UTooltip
                            :text="`${pb.label}: ${pb.displayValue}${pb.unit === 's' ? '' : pb.unit}`"
                          >
                            <div
                              class="flex items-center gap-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-full border border-yellow-500/20 lowercase font-black text-[10px] tracking-tight"
                            >
                              <UIcon name="i-heroicons-trophy" class="w-2.5 h-2.5" />
                              {{ pb.label }}
                            </div>
                          </UTooltip>
                        </template>
                      </div>
                    </div>

                    <div v-if="showTagEditor" class="mt-5 space-y-3">
                      <div
                        class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                      >
                        <div class="min-w-0 flex-1">
                          <div
                            class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2"
                          >
                            Workout tags
                          </div>
                          <UInputTags
                            v-model="localTagDraft"
                            placeholder="Add local tags"
                            color="neutral"
                            variant="outline"
                            size="sm"
                          />
                          <p
                            class="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400"
                          >
                            Local tags can be edited here. Intervals tags stay read-only.
                          </p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          <UButton
                            color="neutral"
                            variant="ghost"
                            size="sm"
                            :disabled="!hasLocalTagChanges || savingTags"
                            @click="resetLocalTags"
                          >
                            Reset
                          </UButton>
                          <UButton
                            color="primary"
                            variant="solid"
                            size="sm"
                            icon="i-heroicons-tag"
                            :loading="savingTags"
                            :disabled="!hasLocalTagChanges"
                            @click="saveLocalTags"
                          >
                            Save Tags
                          </UButton>
                        </div>
                      </div>

                      <div
                        v-if="intervalsSourceTags.length > 0"
                        class="flex flex-wrap items-center gap-2"
                      >
                        <span
                          class="text-[10px] font-black uppercase tracking-widest text-gray-400"
                        >
                          Intervals
                        </span>
                        <UBadge
                          v-for="tag in intervalsSourceTags"
                          :key="tag"
                          color="neutral"
                          variant="subtle"
                          size="sm"
                          class="font-black tracking-tight lowercase"
                        >
                          {{ tag }}
                        </UBadge>
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
                        key: t('metrics_tss'),
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
                          {{ t('metrics_tss') }}
                        </div>
                        <template #content>
                          <div class="text-left text-sm">{{ tt('training_load') }}</div>
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
                      handleOpenMetric({
                        key: t('metrics_avg_hr'),
                        value: workout.averageHr,
                        unit: 'BPM'
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
                          class="text-[10px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400 mb-1 border-b border-dashed border-pink-300 dark:border-pink-700 inline-block cursor-help"
                        >
                          {{ t('metrics_avg_hr') }}
                        </div>
                        <template #content>
                          <div class="text-left text-sm">{{ tt('avg_hr') }}</div>
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
                      handleOpenMetric({
                        key: t('metrics_avg_power'),
                        value: workout.averageWatts,
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
                          class="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1 border-b border-dashed border-purple-300 dark:border-purple-700 inline-block cursor-help"
                        >
                          {{ t('metrics_avg_power') }}
                        </div>
                        <template #content>
                          <div class="text-left text-sm">{{ tt('avg_power') }}</div>
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
                        key: t('metrics_np'),
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
                          {{ t('metrics_np') }}
                        </div>
                        <template #content>
                          <div class="text-left text-sm">{{ tt('norm_power') }}</div>
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
                  {{ t('performance_summary_header') }}
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
                  {{ t('analysis_required_title') }}
                </h2>
                <p
                  class="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed max-w-[140px]"
                >
                  {{ t('analysis_required_desc') }}
                </p>
                <UButton
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  class="mt-6 font-black uppercase tracking-widest text-[9px]"
                  @click="scrollToSection('analysis')"
                >
                  {{ t('analysis_required_button') }}
                </UButton>
              </div>
            </div>
          </div>

          <!-- Refactored Threshold Detection Banner -->
          <template v-if="detectedThresholds.length > 0">
            <div
              v-for="detection in detectedThresholds"
              :key="detection.type"
              class="relative overflow-hidden bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl transition-all duration-300 group"
            >
              <!-- Decorative Accent -->
              <div class="absolute top-0 left-0 w-1 h-full bg-primary-500" />

              <div class="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
                <!-- Left: Content & Context -->
                <div class="flex-1 space-y-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center border border-primary-500/20"
                    >
                      <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary-500" />
                    </div>
                    <h3
                      class="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-tight italic"
                    >
                      {{ t('level_up_detected', { sport: detection.sportName }) }}
                    </h3>
                  </div>

                  <div class="space-y-2">
                    <p class="text-neutral-600 dark:text-gray-300 leading-relaxed">
                      {{ t('level_up_desc', { label: detection.label }) }}
                    </p>
                    <div class="flex items-center gap-2">
                      <p class="text-xs text-neutral-500 dark:text-gray-500 font-medium">
                        {{
                          t('level_up_peak_effort', {
                            value: detection.peakValue,
                            unit: detection.unit
                          })
                        }}
                      </p>
                      <UBadge
                        v-if="detection.isEstimated"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                        class="uppercase text-[8px] font-bold"
                        :label="t('level_up_estimated')"
                      />
                    </div>
                  </div>

                  <div class="space-y-3 pt-2">
                    <div class="flex flex-wrap items-center gap-4">
                      <UButton
                        size="md"
                        color="primary"
                        variant="solid"
                        class="font-black px-6 shadow-lg shadow-primary-500/20"
                        :label="t('level_up_update_now')"
                        @click="openThresholdUpdate(detection)"
                      />
                      <UButton
                        size="md"
                        color="neutral"
                        variant="ghost"
                        class="text-neutral-500 hover:text-neutral-900 dark:text-gray-400 dark:hover:text-white font-bold"
                        :label="t('level_up_later')"
                        @click="dismissedThresholds.push(detection.type)"
                      />
                    </div>
                    <p class="text-[9px] text-neutral-400 dark:text-gray-500 italic leading-tight">
                      {{ t('level_up_sync_note') }}
                    </p>
                  </div>
                </div>

                <!-- Right: High-Contrast Visualization -->
                <div class="flex items-center justify-center lg:justify-end shrink-0">
                  <div
                    class="flex items-center gap-4 sm:gap-8 bg-neutral-100 dark:bg-black/40 p-6 rounded-2xl border border-neutral-200 dark:border-white/5"
                  >
                    <!-- Old Value -->
                    <div class="text-center">
                      <div
                        class="text-[10px] font-black text-neutral-400 dark:text-gray-500 uppercase tracking-widest mb-1"
                      >
                        {{ t('level_up_old') }}
                      </div>
                      <div
                        class="text-2xl font-bold text-neutral-400 dark:text-gray-400 line-through decoration-neutral-300 dark:decoration-gray-600"
                      >
                        {{ detection.oldValue
                        }}<span class="text-xs ml-0.5">{{ detection.unit.trim() }}</span>
                      </div>
                    </div>

                    <!-- Arrow and Percentage -->
                    <div class="flex flex-col items-center gap-1">
                      <div
                        v-if="detection.percent > 0"
                        class="text-[10px] font-black text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full"
                      >
                        +{{ detection.percent }}%
                      </div>
                      <UIcon
                        name="i-heroicons-arrow-long-right"
                        class="w-8 h-8 text-neutral-300 dark:text-gray-600"
                      />
                    </div>

                    <!-- New Value -->
                    <div class="text-center relative">
                      <div
                        class="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-1"
                      >
                        {{ t('level_up_new') }}
                      </div>
                      <div
                        class="text-4xl font-black text-neutral-900 dark:text-white flex items-baseline gap-1"
                      >
                        {{ detection.newValue }}
                        <span
                          class="text-sm font-bold text-neutral-400 dark:text-gray-500 uppercase"
                          >{{ detection.unit.trim() }}</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Training Impact Section (TSS, CTL, ATL, TSB) -->
          <div
            v-if="isSectionEnabled('training-impact')"
            id="training-impact"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('training-impact')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('impact_header') }}
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
                        <div class="text-left text-sm">{{ tt('tss_load') }}</div>
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
                        <div class="text-left text-sm">{{ tt('fitness_ctl') }}</div>
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
                        <div class="text-left text-sm">{{ tt('fatigue_atl') }}</div>
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
                        <div class="text-left text-sm">{{ tt('form_tsb') }}</div>
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
                  :items="[{ label: t('impact_calc_title'), slot: 'explanation' }]"
                  color="gray"
                  variant="ghost"
                >
                  <template #explanation>
                    <div
                      class="text-sm text-gray-600 dark:text-gray-400 space-y-3 pt-2 font-medium"
                    >
                      <p>
                        <strong>{{ t('impact_source_label') }}</strong>
                        <span v-if="workout.source === 'intervals'">
                          {{ t('impact_source_intervals', { link: 'Intervals.icu' }) }}
                        </span>
                        <span v-else>
                          {{ t('impact_source_local') }}
                        </span>
                      </p>
                      <ul class="list-disc pl-5 space-y-2 leading-relaxed">
                        <li>
                          {{ tt('tss_load') }}
                        </li>
                        <li>
                          {{ tt('fitness_ctl') }}
                        </li>
                        <li>
                          {{ tt('fatigue_atl') }}
                        </li>
                        <li>
                          {{ tt('form_tsb') }}
                        </li>
                      </ul>
                    </div>
                  </template>
                </UAccordion>
              </div>
            </div>
          </div>

          <!-- Exercises Section -->
          <div
            v-if="isSectionEnabled('exercises')"
            id="exercises"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('exercises')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('sections_exercises') }}
            </h2>
            <WorkoutsExerciseList :exercises="workout.exercises" />
          </div>

          <!-- Nutrition Debrief -->
          <div
            v-if="isSectionEnabled('nutrition')"
            id="nutrition"
            class="scroll-mt-20 bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-l-4 border-orange-500 border-y sm:border-y sm:border-r border-gray-100 dark:border-gray-800"
            :style="sectionStyle('nutrition')"
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
                  {{ t('nutrition_header') }}
                </h2>
              </div>
              <div v-if="workout.plannedWorkout?.tss" class="text-right">
                <div class="text-[10px] uppercase font-black text-gray-400 tracking-widest">
                  {{ t('nutrition_energy_delta') }}
                </div>
                <div
                  class="text-sm font-black tracking-tight"
                  :class="kJDelta >= 10 ? 'text-red-500' : 'text-green-500'"
                >
                  {{ t('nutrition_vs_plan', { delta: (kJDelta > 0 ? '+' : '') + kJDelta }) }}
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
                  {{ t('nutrition_adjustment_title') }}
                </h3>
                <p
                  class="text-xs text-orange-800 dark:text-orange-300 mt-0.5 font-medium leading-relaxed"
                >
                  {{ t('nutrition_adjustment_desc', { delta: kJDelta, carbs: recoveryCarbBump }) }}
                </p>
              </div>
            </div>

            <div
              v-if="nutritionEstimate"
              class="mb-6 bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800"
            >
              <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
                Estimated Fuel Cost
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div
                  v-for="item in nutritionEstimate"
                  :key="item.label"
                  class="bg-white dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-800"
                >
                  <div
                    class="text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5"
                  >
                    <UIcon :name="item.icon" class="w-3.5 h-3.5" :class="item.iconClass" />
                    {{ item.label }}
                  </div>
                  <div class="text-sm font-black text-gray-900 dark:text-white">
                    {{ item.value }}
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Actual vs Planned -->
              <div class="space-y-4">
                <div
                  class="flex items-center justify-between text-[10px] font-black uppercase tracking-widest"
                >
                  <span class="text-gray-500">{{ t('nutrition_actual_energy') }}</span>
                  <span class="text-gray-900 dark:text-white"
                    >{{ workout.kilojoules || 0 }} kJ</span
                  >
                </div>
                <div
                  class="flex items-center justify-between text-[10px] font-black uppercase tracking-widest"
                >
                  <span class="text-gray-500">{{ t('nutrition_planned_energy') }}</span>
                  <span class="text-gray-400">{{
                    plannedKJ ? plannedKJ + ' kJ' : t('nutrition_no_target')
                  }}</span>
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
                  {{ t('nutrition_digestion_header') }}
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
                  <span>{{ t('nutrition_digestion_poor') }}</span>
                  <span>{{ t('nutrition_digestion_great') }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Analysis Section -->
          <div
            v-if="isSectionEnabled('analysis')"
            id="analysis"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('analysis')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('analysis_header') }}
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
                    {{ t('analysis_detail_title') }}
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
                    {{ t('analysis_button_analyze') }}
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
                    {{ t('analysis_button_regenerate') }}
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
                    {{ t('analysis_button_publish') }}
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
                    {{ t('performance_summary_header') }}
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
                      {{ t('analysis_strategic_recom') }}
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
                      {{ t('analysis_strengths') }}
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
                      {{ t('analysis_weaknesses') }}
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
                    {{ t('analysis_sync_analysis', { date: formatDate(workout.aiAnalyzedAt) }) }}
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
                    {{ t('analysis_legacy_analysis', { date: formatDate(workout.aiAnalyzedAt) }) }}
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
                  <p class="text-sm font-black uppercase tracking-widest">
                    {{ t('analysis_pending_title') }}
                  </p>
                  <p class="text-xs mt-2 text-gray-400 max-w-xs mx-auto">
                    {{ t('analysis_pending_desc') }}
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
                  {{ t('analysis_analyzing') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Power Curve Section -->
          <div
            v-if="isSectionEnabled('power-curve')"
            id="power-curve"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('power-curve')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('sections_power_curve') }}
            </h2>
            <PowerCurveChart :workout-id="workout.id" />
          </div>

          <!-- Interval Analysis Section -->
          <div
            v-if="isSectionEnabled('intervals')"
            id="intervals"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('intervals')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('sections_intervals') }}
            </h2>
            <IntervalsAnalysis :workout-id="workout.id" />
          </div>

          <!-- Advanced Analytics Section -->
          <div
            v-if="isSectionEnabled('advanced')"
            id="advanced"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('advanced')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('sections_advanced') }}
            </h2>
            <AdvancedWorkoutMetrics :workout-id="workout.id" @open-metric="handleOpenMetric" />
          </div>

          <!-- Route Map Section -->
          <div
            v-if="isSectionEnabled('map')"
            id="map"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('map')"
          >
            <h2
              class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0 flex items-center justify-between w-full"
            >
              <span>{{ t('sections_map') }}</span>
              <UButton
                icon="i-heroicons-arrows-pointing-out"
                size="xs"
                variant="ghost"
                color="neutral"
                class="font-black uppercase tracking-widest text-[9px]"
                :to="`/workouts/${workout.id}/map`"
              >
                {{ t('map_analysis') }}
              </UButton>
            </h2>
            <UiWorkoutMap
              :coordinates="workout.streams.latlng"
              :streams="workout.streams"
              :workout-id="workout.id"
              :interactive="true"
              :provider="workout.source"
              :device-name="workout.deviceName"
            />
          </div>

          <!-- Pacing Analysis -->
          <div
            v-if="isSectionEnabled('pacing')"
            id="pacing"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('pacing')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('sections_pacing') }}
            </h2>
            <PacingAnalysis :workout-id="workout.id" @open-metric="handleOpenMetric" />
          </div>

          <!-- Timeline -->
          <div
            v-if="isSectionEnabled('timeline')"
            id="timeline"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('timeline')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('sections_timeline') }}
            </h2>
            <WorkoutTimeline :workout-id="workout.id" />
          </div>

          <!-- Zones -->
          <div
            v-if="isSectionEnabled('zones')"
            id="zones"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('zones')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('sections_zones') }}
            </h2>
            <ZoneChart
              :workout-id="workout.id"
              :activity-type="workout.type"
              :stream-data="workout.streams"
            />
          </div>

          <!-- Efficiency -->
          <div
            v-if="isSectionEnabled('efficiency')"
            id="efficiency"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('efficiency')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('sections_efficiency') }}
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

          <!-- Personal Notes -->
          <div
            v-if="isSectionEnabled('notes')"
            id="notes"
            class="scroll-mt-20 px-0 sm:px-0"
            :style="sectionStyle('notes')"
          >
            <NotesEditor
              v-model="workout.notes"
              :notes-updated-at="workout.notesUpdatedAt"
              :api-endpoint="`/api/workouts/${workout.id}/notes`"
              class="rounded-none sm:rounded-xl border-x-0 sm:border-x border-y shadow-none sm:shadow"
              @update:notes-updated-at="workout.notesUpdatedAt = $event"
            />
          </div>

          <!-- Detailed Metrics Section -->
          <div
            v-if="isSectionEnabled('metrics')"
            id="metrics"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('metrics')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('sections_metrics') }}
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
                <div class="flex items-center gap-2">
                  <UTooltip
                    v-if="metricTooltips[metric.label]"
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
                  <span
                    v-else
                    class="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-primary-500 transition-colors"
                  >
                    {{ metric.label }}
                  </span>
                  <UBadge
                    v-if="metric.source === 'fit'"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    class="uppercase tracking-widest font-black text-[8px]"
                  >
                    FIT
                  </UBadge>
                </div>
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

            <div
              v-if="analysisFacts"
              class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
            >
              <div class="flex flex-col gap-5">
                <div class="flex items-center justify-between gap-4 flex-wrap">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-beaker" class="w-5 h-5 text-amber-500" />
                    <div class="flex flex-col">
                      <h3
                        class="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white"
                      >
                        Calculated Workout Facts
                      </h3>
                      <div
                        class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
                      >
                        Derived training interpretation signals for this workout
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge
                      color="success"
                      variant="soft"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      Included: {{ includedPromptFactsCount }}
                    </UBadge>
                    <UBadge
                      color="neutral"
                      variant="soft"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      Ignored: {{ ignoredPromptFactsCount }}
                    </UBadge>
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      class="font-black uppercase tracking-widest text-[10px]"
                      :icon="
                        analysisFactsOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'
                      "
                      :label="analysisFactsOpen ? 'Hide Facts' : 'Show Facts'"
                      @click="analysisFactsOpen = !analysisFactsOpen"
                    />
                  </div>
                </div>

                <div
                  v-if="!analysisFactsOpen"
                  class="rounded-xl bg-amber-50/70 dark:bg-amber-950/20 p-4 border border-amber-100 dark:border-amber-900/40"
                >
                  <div
                    class="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2"
                  >
                    Collapsed Summary
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <UBadge
                      :color="getFactBadgeColor(analysisFacts.telemetry.hrUsable)"
                      variant="soft"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      HR usable: {{ formatFactValue(analysisFacts.telemetry.hrUsable) }}
                    </UBadge>
                    <UBadge
                      color="neutral"
                      variant="soft"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      Analysis mode: {{ formatFactValue(analysisFacts.telemetry.analysisMode) }}
                    </UBadge>
                    <UBadge
                      color="neutral"
                      variant="soft"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      L/R mode: {{ formatFactValue(analysisFacts.lrBalance.interpretationMode) }}
                    </UBadge>
                  </div>
                </div>

                <div v-else class="space-y-4">
                  <div class="flex flex-wrap gap-2 mb-1">
                    <UBadge
                      :color="getFactBadgeColor(analysisFacts.telemetry.hrUsable)"
                      variant="soft"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      HR usable: {{ formatFactValue(analysisFacts.telemetry.hrUsable) }}
                    </UBadge>
                    <UBadge
                      :color="getFactBadgeColor(analysisFacts.erg.detected)"
                      variant="soft"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      ERG detected: {{ formatFactValue(analysisFacts.erg.detected) }}
                    </UBadge>
                    <UBadge
                      color="neutral"
                      variant="soft"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      Power source: {{ formatFactValue(analysisFacts.telemetry.powerSourceType) }}
                    </UBadge>
                    <UBadge
                      :color="getFactBadgeColor(analysisFacts.physiology.decouplingValid)"
                      variant="soft"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      Decoupling valid:
                      {{ formatFactValue(analysisFacts.physiology.decouplingValid) }}
                    </UBadge>
                    <UBadge
                      color="neutral"
                      variant="soft"
                      class="font-black uppercase tracking-widest text-[9px]"
                    >
                      L/R mode: {{ formatFactValue(analysisFacts.lrBalance.interpretationMode) }}
                    </UBadge>
                  </div>

                  <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div
                      v-for="group in analysisFactsGroups"
                      :key="group.key"
                      class="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                    >
                      <div
                        class="px-4 py-3 bg-gray-50/70 dark:bg-gray-950/50 border-b border-gray-100 dark:border-gray-800"
                      >
                        <h4
                          class="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white"
                        >
                          {{ group.label }}
                        </h4>
                      </div>
                      <div class="px-4 py-3 space-y-2">
                        <div
                          v-for="entry in group.entries"
                          :key="entry.key"
                          class="flex items-start justify-between gap-4 text-xs"
                        >
                          <UTooltip
                            :text="analysisFactTooltips[entry.key] || entry.label"
                            :popper="{ placement: 'top' }"
                            :ui="{ content: 'w-[280px] h-auto whitespace-normal' }"
                            arrow
                          >
                            <div
                              class="font-black uppercase tracking-widest text-gray-400 border-b border-dashed border-gray-300 dark:border-gray-700 inline-block cursor-help"
                            >
                              {{ entry.label }}
                            </div>
                          </UTooltip>
                          <UTooltip
                            :text="getPromptDecisionReason(entry.path)"
                            :popper="{ placement: 'left' }"
                            :ui="{ content: 'w-[260px] h-auto whitespace-normal' }"
                            arrow
                          >
                            <div
                              class="text-right font-medium cursor-help"
                              :class="getPromptDecisionValueClass(entry.path)"
                            >
                              {{ formatFactValue(entry.value) }}
                            </div>
                          </UTooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Streams Section -->
          <div
            v-if="isSectionEnabled('streams')"
            id="streams"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('streams')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('sections_streams') }}
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
              <UButton
                v-if="hasExtrasMeta"
                icon="i-heroicons-code-bracket-square"
                color="neutral"
                variant="soft"
                size="sm"
                class="uppercase font-black tracking-widest text-[9px] px-2.5 py-1"
                @click="isExtrasMetaModalOpen = true"
              >
                {{ t('modal_extras_title') }}
              </UButton>
            </div>
          </div>

          <!-- Duplicate Workout Section -->
          <div
            v-if="isSectionEnabled('duplicates')"
            id="duplicates"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('duplicates')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('version_header') }}
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
                      {{ t('version_duplicate_title') }}
                    </h3>
                    <p class="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                      {{ t('version_duplicate_desc') }}
                    </p>

                    <div v-if="workout.canonicalWorkout" class="mt-4">
                      <p
                        class="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2"
                      >
                        {{ t('version_original_ref') }}
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
                                {{
                                  t(`source_${workout.canonicalWorkout.source}`) ||
                                  workout.canonicalWorkout.source
                                }}
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
                        {{ t('version_promote_button') }}
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
                      {{ t('version_linked_duplicates') }}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      {{ t('version_linked_desc') }}
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
                          >{{ t('sections_duplicates') }}</UBadge
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
                            {{ t(`source_${dup.source}`) || dup.source }}
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
                      {{ t('version_prescribed_plan') }}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      {{ t('version_prescribed_desc') }}
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
                        >{{ t('legend_plan') }}</UBadge
                      >
                      <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </div>

          <div
            v-if="isSectionEnabled('raw-data')"
            id="raw-data"
            class="scroll-mt-20 space-y-4"
            :style="sectionStyle('raw-data')"
          >
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              {{ t('raw_data_header') }}
            </h2>
            <JsonViewer
              title="Raw Data (JSON)"
              :data="workout.rawJson"
              filename="workout-raw.json"
            />
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

  <WorkoutsWorkoutSectionsSettingsModal
    v-model:open="isWorkoutSectionsModalOpen"
    :sections="workoutSectionsModalOptions"
  />

  <!-- Promote Workout Confirmation Modal -->
  <UModal
    v-model:open="isPromoteModalOpen"
    :title="t('modal_promote_title')"
    :description="t('modal_promote_desc')"
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
              <h3 class="font-semibold text-yellow-900 dark:text-yellow-100">
                {{ t('modal_promote_sure') }}
              </h3>
              <p class="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                {{ t('modal_promote_action_desc') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('banner_exit')"
          color="neutral"
          variant="ghost"
          @click="isPromoteModalOpen = false"
        />
        <UButton
          :label="t('modal_promote_confirm')"
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
    :title="t('modal_share_title')"
    :description="t('modal_share_desc')"
  >
    <template #body>
      <ShareAccessPanel
        :link="shareLink"
        :loading="generatingShareLink"
        :expiry-value="shareExpiryValue"
        resource-label="workout"
        :share-title="
          workout?.title ? `Workout: ${workout.title}` : 'Workout shared from Coach Watts'
        "
        @update:expiry-value="shareExpiryValue = $event"
        @generate="generateShareLink"
        @copy="copyToClipboard"
      />
    </template>
    <template #footer>
      <UButton
        :label="t('banner_exit')"
        color="neutral"
        variant="ghost"
        @click="isShareModalOpen = false"
      />
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

  <!-- Extras Meta Modal -->
  <UModal
    v-model:open="isExtrasMetaModalOpen"
    :title="t('modal_extras_title')"
    :description="t('modal_extras_desc')"
    :ui="{ content: 'max-w-5xl' }"
  >
    <template #body>
      <JsonViewer
        v-if="extrasMetaData"
        title="FIT extrasMeta"
        :data="extrasMetaData"
        :deep="2"
        :default-open="true"
        filename="fit-extras-meta.json"
      />
      <div v-else class="text-sm text-gray-500 py-4">{{ t('modal_extras_empty') }}</div>
    </template>
    <template #footer>
      <UButton
        :label="t('banner_exit')"
        color="neutral"
        variant="ghost"
        @click="isExtrasMetaModalOpen = false"
      />
    </template>
  </UModal>

  <!-- Edit Workout Modal -->
  <WorkoutsEditModal
    v-if="workout"
    v-model:open="isEditModalOpen"
    :workout="workout"
    @updated="fetchWorkout"
    @delete="onDeleteRequested"
  />

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="isDeleteModalOpen"
    :title="t('modal_delete_title')"
    :description="t('modal_delete_desc')"
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
              <h3 class="font-semibold text-red-900 dark:text-red-100">
                {{ t('modal_delete_sure') }}
              </h3>
              <p class="text-sm text-red-800 dark:text-red-200 mt-1">
                {{ t('modal_delete_action_desc') }}
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
                {{ t('modal_delete_sync_note_title') }}
              </h3>
              <p class="text-xs text-orange-800 dark:text-orange-200 mt-1">
                {{
                  t('modal_delete_sync_note_desc', {
                    source: t(`source_${workout?.source}`) || workout?.source
                  })
                }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('banner_exit')"
          color="neutral"
          variant="ghost"
          @click="isDeleteModalOpen = false"
        />
        <UButton
          :label="t('controls_delete')"
          color="error"
          :loading="deleting"
          @click="deleteWorkout"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import { marked } from 'marked'
  import PlanAdherence from '~/components/workouts/PlanAdherence.vue'
  import StreamChartModal from '~/components/charts/streams/StreamChartModal.vue'
  import { metricTooltips } from '~/utils/tooltips'
  import { formatDistance as formatDist, formatTemperature } from '~/utils/metrics'

  const { t } = useTranslate('workout')
  const { t: tt } = useTranslate('workout-tooltips')

  const { formatDate: baseFormatDate, formatDateTime, formatDateUTC } = useFormat()
  const { trackWorkoutViewDetail } = useAnalytics()

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
  const savingTags = ref(false)
  const showTagEditor = ref(false)
  const analysisFactsOpen = ref(false)
  const analyzingWorkout = ref(false)
  const analyzingAdherence = ref(false)
  const promoting = ref(false)
  const deleting = ref(false)
  const publishingSummary = ref(false)

  const isPromoteModalOpen = ref(false)
  const isShareModalOpen = ref(false)
  const isExtrasMetaModalOpen = ref(false)
  const isWorkoutSectionsModalOpen = ref(false)
  const shareExpiryValue = ref('604800') // default 7 days

  const stomachFeel = ref<number | null>(null)

  const { shareLink, generatingShareLink, generateShareLink } = useResourceShare(
    'WORKOUT',
    computed(() => workout.value?.id)
  )

  const copyToClipboard = () => {
    if (!shareLink.value) return
    if (import.meta.client) {
      navigator.clipboard.writeText(shareLink.value)
      toast.add({
        title: 'Copied',
        description: 'Link copied to clipboard.',
        color: 'success'
      })
    }
  }

  watch(isShareModalOpen, (newValue) => {
    if (newValue && !shareLink.value) {
      generateShareLink()
    }
  })

  const renderedAnalysis = computed(() => {
    if (!workout.value?.aiAnalysis) return ''
    return marked(workout.value.aiAnalysis)
  })

  const analysisFacts = computed(() => workout.value?.analysisFacts || null)
  const analysisFactTooltips: Record<string, string> = {
    rpe: 'The athlete-reported intensity of the full session on the RPE scale.',
    sessionRpeLoad:
      'Session RPE multiplied by duration in minutes. This reflects total subjective toll, not a heart-rate zone.',
    subjectiveObjectiveGap:
      'How far the athlete’s subjective load diverges from objective load markers like TSS or training load.',
    musculoskeletalToll:
      'Estimated impact and tissue stress from the session, especially useful for running and strength work.',
    impactProfile:
      'Baseline mechanical impact expectation for the sport, used to contextualize subjective load.',
    analysisMode:
      'Which signal family should lead interpretation for this workout: power, pace, RPE, or a mixed view.',
    hrUsable:
      'Whether heart-rate telemetry is trustworthy enough to support physiological conclusions.',
    hrZeroRatio:
      'Share of HR samples that were literal zero values, which are treated as invalid telemetry.',
    hrMissingRatio:
      'Share of HR samples that were missing or invalid, indicating unreliable heart-rate coverage.',
    hrArtifactFlag:
      'True when the heart-rate stream shows enough placeholder or invalid data to treat it as artifact-prone.',
    powerSourceType:
      'Whether power is treated as direct measured mechanical power, estimated/modelled power, or unknown.',
    powerAbsoluteUsable:
      'Whether the absolute power number is reliable enough to use as a benchmark, not just a relative trend.',
    powerRelativeUsable:
      'Whether available power can still be used for within-athlete trend tracking even if absolute accuracy is uncertain.',
    lrBalanceUsable:
      'Whether left/right balance can be interpreted safely after checking source semantics and possible channel issues.',
    normalHrLagExpected:
      'Whether delayed HR response should be expected physiologically for this workout type and effort profile.',
    normalHrLagDetected:
      'Whether the workout shows a normal delayed HR rise after power or pace increases rather than a sensor problem.',
    steadyStateSegmentsAvailable:
      'Whether there is enough sustained steady work after warm-up to support durability-style physiology checks.',
    warmupExcludedMinutes:
      'Minutes excluded from decoupling logic so warm-up kinetics do not create false positives.',
    decouplingValid:
      'Whether decoupling should be interpreted at all for this session based on duration and telemetry quality.',
    decouplingEffective:
      'The effective post-warm-up decoupling value used for debugging. Negative values can indicate efficiency gain.',
    decouplingDirection:
      'Classifies the session as positive drift, stable, or efficiency gain after excluding the warm-up phase.',
    decouplingConfidence:
      'Confidence in the decoupling reading based on workout duration and signal quality.',
    sourceSemantics:
      'Describes what the L/R balance channels likely represent: true left/right legs, human-vs-motor, or unknown.',
    inversionSuspected:
      'True when the balance channels appear reversed and need correction before interpretation.',
    correctedLeftPct:
      'Left-side percentage after any sanity correction or inversion handling has been applied.',
    correctedRightPct:
      'Right-side percentage after any sanity correction or inversion handling has been applied.',
    interpretationMode:
      'Whether L/R balance is used normally, corrected first, or disabled entirely.',
    correctionReason: 'Short explanation for why L/R interpretation was corrected or disabled.',
    detected:
      'Whether ERG mode was detected from explicit metadata or a strong inferred trainer-control signature.',
    confidence:
      'Confidence level for the current diagnostic group, especially ERG and decoupling inference.',
    source:
      'Whether the ERG inference came from explicit metadata, heuristic inference, or remains unknown.',
    powerControlMode:
      'The likely trainer control mode: ERG, resistance/slope-style control, free ride, or unknown.',
    reasons: 'Short reasons explaining why the system inferred the current ERG status.',
    computedFrom: 'Inputs used to compute this fact payload for the current workout.',
    unavailableInputs: 'Inputs that were missing, so some facts may be downgraded or unavailable.',
    disabledInterpretations:
      'Interpretations intentionally suppressed because the available data is not trustworthy enough.'
  }

  const analysisFactsGroups = computed(() => {
    if (!analysisFacts.value) return []

    return [
      {
        key: 'subjective',
        label: 'Subjective',
        entries: [
          {
            key: 'rpe',
            path: 'subjective.rpe',
            label: 'RPE',
            value: analysisFacts.value.subjective.rpe
          },
          {
            key: 'sessionRpeLoad',
            path: 'subjective.sessionRpeLoad',
            label: 'Session RPE Load',
            value: analysisFacts.value.subjective.sessionRpeLoad
          },
          {
            key: 'subjectiveObjectiveGap',
            path: 'subjective.subjectiveObjectiveGap',
            label: 'Subjective vs Objective Gap',
            value: analysisFacts.value.subjective.subjectiveObjectiveGap
          },
          {
            key: 'musculoskeletalToll',
            path: 'subjective.musculoskeletalToll',
            label: 'Musculoskeletal Toll',
            value: analysisFacts.value.subjective.musculoskeletalToll
          },
          {
            key: 'impactProfile',
            path: 'subjective.impactProfile',
            label: 'Impact Profile',
            value: analysisFacts.value.subjective.impactProfile
          }
        ]
      },
      {
        key: 'telemetry',
        label: 'Telemetry',
        entries: [
          {
            key: 'analysisMode',
            path: 'telemetry.analysisMode',
            label: 'Analysis Mode',
            value: analysisFacts.value.telemetry.analysisMode
          },
          {
            key: 'hrUsable',
            path: 'telemetry.hrUsable',
            label: 'HR Usable',
            value: analysisFacts.value.telemetry.hrUsable
          },
          {
            key: 'hrZeroRatio',
            path: 'telemetry.hrZeroRatio',
            label: 'HR Zero Ratio',
            value: analysisFacts.value.telemetry.hrZeroRatio
          },
          {
            key: 'hrMissingRatio',
            path: 'telemetry.hrMissingRatio',
            label: 'HR Missing Ratio',
            value: analysisFacts.value.telemetry.hrMissingRatio
          },
          {
            key: 'hrArtifactFlag',
            path: 'telemetry.hrArtifactFlag',
            label: 'HR Artifact Flag',
            value: analysisFacts.value.telemetry.hrArtifactFlag
          },
          {
            key: 'powerSourceType',
            path: 'telemetry.powerSourceType',
            label: 'Power Source Type',
            value: analysisFacts.value.telemetry.powerSourceType
          },
          {
            key: 'powerAbsoluteUsable',
            path: 'telemetry.powerAbsoluteUsable',
            label: 'Power Absolute Usable',
            value: analysisFacts.value.telemetry.powerAbsoluteUsable
          },
          {
            key: 'powerRelativeUsable',
            path: 'telemetry.powerRelativeUsable',
            label: 'Power Relative Usable',
            value: analysisFacts.value.telemetry.powerRelativeUsable
          },
          {
            key: 'lrBalanceUsable',
            path: 'telemetry.lrBalanceUsable',
            label: 'L/R Balance Usable',
            value: analysisFacts.value.telemetry.lrBalanceUsable
          }
        ]
      },
      {
        key: 'physiology',
        label: 'Physiology',
        entries: [
          {
            key: 'normalHrLagExpected',
            path: 'physiology.normalHrLagExpected',
            label: 'Normal HR Lag Expected',
            value: analysisFacts.value.physiology.normalHrLagExpected
          },
          {
            key: 'normalHrLagDetected',
            path: 'physiology.normalHrLagDetected',
            label: 'Normal HR Lag Detected',
            value: analysisFacts.value.physiology.normalHrLagDetected
          },
          {
            key: 'steadyStateSegmentsAvailable',
            path: 'physiology.steadyStateSegmentsAvailable',
            label: 'Steady-State Segments',
            value: analysisFacts.value.physiology.steadyStateSegmentsAvailable
          },
          {
            key: 'warmupExcludedMinutes',
            path: 'physiology.warmupExcludedMinutes',
            label: 'Warmup Excluded Minutes',
            value: analysisFacts.value.physiology.warmupExcludedMinutes
          },
          {
            key: 'decouplingValid',
            path: 'physiology.decouplingValid',
            label: 'Decoupling Valid',
            value: analysisFacts.value.physiology.decouplingValid
          },
          {
            key: 'decouplingEffective',
            path: 'physiology.decouplingEffective',
            label: 'Decoupling Effective',
            value: analysisFacts.value.physiology.decouplingEffective
          },
          {
            key: 'decouplingDirection',
            path: 'physiology.decouplingDirection',
            label: 'Decoupling Direction',
            value: analysisFacts.value.physiology.decouplingDirection
          },
          {
            key: 'decouplingConfidence',
            path: 'physiology.decouplingConfidence',
            label: 'Decoupling Confidence',
            value: analysisFacts.value.physiology.decouplingConfidence
          }
        ]
      },
      {
        key: 'lrBalance',
        label: 'L/R Balance',
        entries: [
          {
            key: 'sourceSemantics',
            path: 'lrBalance.sourceSemantics',
            label: 'Source Semantics',
            value: analysisFacts.value.lrBalance.sourceSemantics
          },
          {
            key: 'inversionSuspected',
            path: 'lrBalance.inversionSuspected',
            label: 'Inversion Suspected',
            value: analysisFacts.value.lrBalance.inversionSuspected
          },
          {
            key: 'correctedLeftPct',
            path: 'lrBalance.correctedLeftPct',
            label: 'Corrected Left %',
            value: analysisFacts.value.lrBalance.correctedLeftPct
          },
          {
            key: 'correctedRightPct',
            path: 'lrBalance.correctedRightPct',
            label: 'Corrected Right %',
            value: analysisFacts.value.lrBalance.correctedRightPct
          },
          {
            key: 'interpretationMode',
            path: 'lrBalance.interpretationMode',
            label: 'Interpretation Mode',
            value: analysisFacts.value.lrBalance.interpretationMode
          },
          {
            key: 'correctionReason',
            path: 'lrBalance.correctionReason',
            label: 'Correction Reason',
            value: analysisFacts.value.lrBalance.correctionReason
          }
        ]
      },
      {
        key: 'erg',
        label: 'ERG',
        entries: [
          {
            key: 'detected',
            path: 'erg.detected',
            label: 'Detected',
            value: analysisFacts.value.erg.detected
          },
          {
            key: 'confidence',
            path: 'erg.confidence',
            label: 'Confidence',
            value: analysisFacts.value.erg.confidence
          },
          {
            key: 'source',
            path: 'erg.source',
            label: 'Source',
            value: analysisFacts.value.erg.source
          },
          {
            key: 'powerControlMode',
            path: 'erg.powerControlMode',
            label: 'Power Control Mode',
            value: analysisFacts.value.erg.powerControlMode
          },
          {
            key: 'reasons',
            path: 'erg.reasons',
            label: 'Reasons',
            value: analysisFacts.value.erg.reasons
          }
        ]
      },
      {
        key: 'debugMeta',
        label: 'Debug Meta',
        entries: [
          {
            key: 'computedFrom',
            path: 'debugMeta.computedFrom',
            label: 'Computed From',
            value: analysisFacts.value.debugMeta.computedFrom
          },
          {
            key: 'unavailableInputs',
            path: 'debugMeta.unavailableInputs',
            label: 'Unavailable Inputs',
            value: analysisFacts.value.debugMeta.unavailableInputs
          },
          {
            key: 'disabledInterpretations',
            path: 'debugMeta.disabledInterpretations',
            label: 'Disabled Interpretations',
            value: analysisFacts.value.debugMeta.disabledInterpretations
          }
        ]
      }
    ]
  })

  function formatFactValue(value: unknown) {
    if (value === null || value === undefined || value === '') return 'Unavailable'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'None'
    return String(value)
  }

  function getFactBadgeColor(value: boolean) {
    return value ? 'success' : 'warning'
  }

  const promptDecisions = computed(() => analysisFacts.value?.debugMeta?.promptDecisions || {})
  const includedPromptFactsCount = computed(
    () => Object.values(promptDecisions.value).filter((decision: any) => decision.include).length
  )
  const ignoredPromptFactsCount = computed(
    () => Object.values(promptDecisions.value).filter((decision: any) => !decision.include).length
  )

  function getPromptDecision(path: string) {
    return (
      promptDecisions.value[path] || { include: false, reason: 'No prompt decision available.' }
    )
  }

  function getPromptDecisionInclude(path: string) {
    return getPromptDecision(path).include
  }

  function getPromptDecisionReason(path: string) {
    return getPromptDecision(path).reason
  }

  function getPromptDecisionValueClass(path: string) {
    return getPromptDecisionInclude(path)
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-gray-500 dark:text-gray-400'
  }

  const splitWorkoutTags = (tags: unknown) => {
    const values = Array.isArray(tags)
      ? tags.filter((tag): tag is string => typeof tag === 'string')
      : []

    return {
      intervals: values.filter((tag) => tag.startsWith('icu:')),
      local: values.filter((tag) => !tag.startsWith('icu:'))
    }
  }

  const localTagDraft = ref<string[]>([])

  const intervalsSourceTags = computed(() => splitWorkoutTags(workout.value?.tags).intervals)
  const localWorkoutTags = computed(() => splitWorkoutTags(workout.value?.tags).local)
  const normalizedLocalTagDraft = computed(() =>
    Array.from(
      new Set(
        localTagDraft.value
          .map((tag) => tag.trim().replace(/\s+/g, ' ').toLowerCase())
          .filter((tag) => tag.length > 0 && !tag.startsWith('icu:'))
      )
    )
  )
  const hasLocalTagChanges = computed(() => {
    if (normalizedLocalTagDraft.value.length !== localWorkoutTags.value.length) return true

    return normalizedLocalTagDraft.value.some((tag, index) => tag !== localWorkoutTags.value[index])
  })

  const syncLocalTagDraft = () => {
    localTagDraft.value = [...localWorkoutTags.value]
  }

  const resetLocalTags = () => {
    syncLocalTagDraft()
  }

  watch(
    () => workout.value?.tags,
    () => {
      syncLocalTagDraft()
    },
    { immediate: true }
  )

  const isOnboarded = computed(() => {
    // 1. Check if ANY data (Workouts, Nutrition, or Wellness)
    if (
      userStore.dataSyncStatus?.workouts ||
      userStore.dataSyncStatus?.nutrition ||
      userStore.dataSyncStatus?.wellness
    )
      return true

    return false
  })

  const canPublishSummaryToIntervals = computed(() => {
    return (
      workout.value &&
      workout.value.source === 'intervals' &&
      (workout.value.aiAnalysis || workout.value.aiAnalysisJson)
    )
  })

  // Metric modal state
  const isMetricModalOpen = ref(false)
  const activeMetric = ref<{
    key: string
    value: any
    unit?: string
    rating?: number
    ratingColor?: string
  } | null>(null)

  function handleOpenMetric(metric: any) {
    activeMetric.value = metric
    isMetricModalOpen.value = true
  }

  // Stream modal state
  const isStreamModalOpen = ref(false)
  const selectedStream = ref<{
    key: string
    label: string
    color: string
    unit: string
  } | null>(null)

  function openStreamModal(stream: any) {
    selectedStream.value = stream
    isStreamModalOpen.value = true
  }

  const dismissedThresholds = ref<string[]>([])

  const detectedThresholds = computed(() => {
    if (!workout.value || !workout.value.thresholdDetection) return []
    const uniqueThresholds: Record<string, any> = {}

    workout.value.thresholdDetection
      .filter((d: any) => !dismissedThresholds.value.includes(d.type))
      .forEach((detection: any) => {
        const sport = detection.sport || 'General'
        const label = detection.label || detection.type
        const unit = detection.unit || (detection.type === 'LTHR' ? 'bpm' : 'W')
        const key = `${sport}-${detection.type}`

        uniqueThresholds[key] = {
          ...detection,
          sportName: sport,
          label,
          unit,
          peakValue: detection.peakValue || detection.newValue
        }
      })
    return Object.values(uniqueThresholds)
  })

  // Personal Bests State
  const achievements = computed(() => {
    if (!workout.value || !workout.value.personalBests) return []
    return workout.value.personalBests.map((pb: any) => {
      const isPace = pb.unit === 's'
      let displayValue = pb.value.toString()
      if (isPace) {
        const mins = Math.floor(pb.value / 60)
        const secs = Math.floor(pb.value % 60)
        displayValue = `${mins}:${secs.toString().padStart(2, '0')}`
      }

      // Localize common PB types
      let label = pb.type.replace(/_/g, ' ').replace('RUN ', '').replace('POWER ', 'Peak ')
      const typeKey = `achievement_${pb.type.toLowerCase()}`
      if (typeof t.value === 'function' && t.value(typeKey) !== typeKey) {
        label = t.value(typeKey)
      }

      return {
        ...pb,
        displayValue,
        label
      }
    })
  })

  function openThresholdUpdate(detection: any) {
    activeDetection.value = detection
    isThresholdModalOpen.value = true
  }

  async function confirmThresholdUpdate() {
    if (!activeDetection.value) return

    const metricKey = activeDetection.value.type.toLowerCase()
    const success = await userStore.updateUserMetrics(
      {
        [metricKey]: activeDetection.value.newValue
      },
      workout.value?.type
    )

    if (success) {
      isThresholdModalOpen.value = false
      dismissedThresholds.value.push(activeDetection.value.type)
    }
  }

  const isEditModalOpen = ref(false)
  const isDeleteModalOpen = ref(false)

  const onDeleteRequested = () => {
    isEditModalOpen.value = false
    isDeleteModalOpen.value = true
  }

  const isThresholdModalOpen = ref(false)
  const activeDetection = ref<any>(null)

  const extrasMetaData = computed<Record<string, any> | null>(() => {
    const value = workout.value?.streams?.extrasMeta
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, any>
  })

  const fitSessionSummary = computed(() => {
    return extrasMetaData.value?.fitSession || null
  })

  // Available metrics computed property
  const availableMetrics = computed(() => {
    if (!workout.value) return []
    const metrics = []

    // Time & Distance
    if (workout.value.durationSec)
      metrics.push({
        key: 'duration',
        label: t.value('metrics_duration'),
        value: formatDuration(workout.value.durationSec)
      })
    if (workout.value.distance)
      metrics.push({
        key: 'distance',
        label: t.value('metrics_distance'),
        value: formatDistance(workout.value.distance)
      })

    // Intensity & Load
    if (workout.value.tss)
      metrics.push({
        key: 'tss',
        label: t.value('metrics_tss'),
        value: workout.value.tss.toFixed(1)
      })
    if (workout.value.intensity)
      metrics.push({
        key: 'intensity',
        label: 'Intensity (IF)',
        value: workout.value.intensity.toFixed(2)
      })
    if (workout.value.trainingLoad)
      metrics.push({
        key: 'load',
        label: 'Training Load',
        value: workout.value.trainingLoad.toFixed(0)
      })

    // Heart Rate
    if (workout.value.averageHr)
      metrics.push({
        key: 'avgHr',
        label: t.value('metrics_avg_hr'),
        value: `${workout.value.averageHr} bpm`
      })
    if (workout.value.maxHr)
      metrics.push({
        key: 'maxHr',
        label: t.value('metrics_max_hr'),
        value: `${workout.value.maxHr} bpm`
      })

    // Power
    if (workout.value.averageWatts)
      metrics.push({
        key: 'avgWatts',
        label: t.value('metrics_avg_power'),
        value: `${workout.value.averageWatts}W`
      })
    if (workout.value.maxWatts)
      metrics.push({
        key: 'maxWatts',
        label: t.value('metrics_max_power'),
        value: `${workout.value.maxWatts}W`
      })
    if (workout.value.normalizedPower)
      metrics.push({
        key: 'np',
        label: t.value('metrics_np'),
        value: `${workout.value.normalizedPower}W`
      })
    if (workout.value.variabilityIndex)
      metrics.push({
        key: 'vi',
        label: 'Variability Index (VI)',
        value: workout.value.variabilityIndex.toFixed(2)
      })
    if (workout.value.efficiencyFactor)
      metrics.push({
        key: 'ef',
        label: 'Efficiency Factor (EF)',
        value: workout.value.efficiencyFactor.toFixed(2)
      })

    // Others
    if (workout.value.averageCadence)
      metrics.push({
        key: 'cadence',
        label: t.value('metrics_avg_cadence'),
        value: `${workout.value.averageCadence} rpm`
      })
    if (workout.value.calories)
      metrics.push({
        key: 'calories',
        label: t.value('metrics_calories'),
        value: `${workout.value.calories} kcal`
      })
    if (workout.value.elevationGain)
      metrics.push({
        key: 'elevation',
        label: t.value('metrics_elevation'),
        value: `${workout.value.elevationGain} m`
      })
    if (workout.value.kilojoules)
      metrics.push({ key: 'kj', label: 'Work (kJ)', value: `${workout.value.kilojoules} kJ` })
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
        label: t.value('metrics_work') + ' > FTP',
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
      metrics.push({
        key: 'carbs',
        label: t.value('metrics_carbs'),
        value: `${workout.value.carbsUsed} g`
      })

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
        label: t.value('metrics_temp'),
        value: formatTemperature(
          workout.value.avgTemp,
          userStore.profile?.temperatureUnits || 'Celsius'
        )
      })
    if (workout.value.trainer !== null && workout.value.trainer !== undefined)
      metrics.push({
        key: 'trainer',
        label: t.value('trainer_indoor'),
        value: workout.value.trainer ? t.value('trainer_yes') : t.value('trainer_no')
      })

    const sessionSummary = fitSessionSummary.value
    if (sessionSummary) {
      if (sessionSummary.totalElapsedTime !== null && sessionSummary.totalElapsedTime !== undefined)
        metrics.push({
          key: 'fitTotalElapsedTime',
          label: 'Elapsed Time',
          value: formatDuration(Math.round(sessionSummary.totalElapsedTime)),
          source: 'fit'
        })

      if (sessionSummary.totalTimerTime !== null && sessionSummary.totalTimerTime !== undefined)
        metrics.push({
          key: 'fitTotalTimerTime',
          label: 'Timer Time',
          value: formatDuration(Math.round(sessionSummary.totalTimerTime)),
          source: 'fit'
        })

      if (sessionSummary.totalDistance !== null && sessionSummary.totalDistance !== undefined)
        metrics.push({
          key: 'fitTotalDistance',
          label: t.value('metrics_distance'),
          value: formatDistance(sessionSummary.totalDistance),
          source: 'fit'
        })

      if (sessionSummary.totalAscent !== null && sessionSummary.totalAscent !== undefined)
        metrics.push({
          key: 'fitTotalAscent',
          label: 'Total Ascent',
          value: `${Math.round(sessionSummary.totalAscent)} m`,
          source: 'fit'
        })

      if (sessionSummary.totalDescent !== null && sessionSummary.totalDescent !== undefined)
        metrics.push({
          key: 'fitTotalDescent',
          label: 'Total Descent',
          value: `${Math.round(sessionSummary.totalDescent)} m`,
          source: 'fit'
        })

      if (sessionSummary.totalCalories !== null && sessionSummary.totalCalories !== undefined)
        metrics.push({
          key: 'fitTotalCalories',
          label: t.value('metrics_calories'),
          value: `${Math.round(sessionSummary.totalCalories)} kcal`,
          source: 'fit'
        })

      if (
        (workout.value.averageWatts === null || workout.value.averageWatts === undefined) &&
        sessionSummary.avgPower !== null &&
        sessionSummary.avgPower !== undefined
      )
        metrics.push({
          key: 'fitAvgPower',
          label: t.value('metrics_avg_power'),
          value: `${Math.round(sessionSummary.avgPower)}W`,
          source: 'fit'
        })

      if (
        (workout.value.maxWatts === null || workout.value.maxWatts === undefined) &&
        sessionSummary.maxPower !== null &&
        sessionSummary.maxPower !== undefined
      )
        metrics.push({
          key: 'fitMaxPower',
          label: t.value('metrics_max_power'),
          value: `${Math.round(sessionSummary.maxPower)}W`,
          source: 'fit'
        })

      if (
        (workout.value.maxHr === null || workout.value.maxHr === undefined) &&
        sessionSummary.maxHeartRate !== null &&
        sessionSummary.maxHeartRate !== undefined
      )
        metrics.push({
          key: 'fitMaxHr',
          label: t.value('metrics_max_hr'),
          value: `${Math.round(sessionSummary.maxHeartRate)} bpm`,
          source: 'fit'
        })

      if (
        sessionSummary.trainingStressScore !== null &&
        sessionSummary.trainingStressScore !== undefined
      )
        metrics.push({
          key: 'fitTss',
          label: t.value('metrics_tss'),
          value: Number(sessionSummary.trainingStressScore).toFixed(1),
          source: 'fit'
        })
    }

    return metrics
  })

  // Available streams computed property
  const availableStreams = computed(() => {
    if (!workout.value || !workout.value.streams) return []
    const streams = []

    // Define stream metadata
    const streamMetadata: Record<string, { label: string; color: string; unit: string }> = {
      time: { label: 'Time', color: '#9ca3af', unit: 's' },
      distance: {
        label: t.value('metrics_distance'),
        color: '#6b7280',
        unit: userStore.distanceUnitLabel
      },
      velocity: { label: 'Velocity', color: '#3b82f6', unit: 'm/s' },
      heartrate: { label: 'Heart Rate', color: '#ef4444', unit: 'bpm' },
      cadence: { label: 'Cadence', color: '#f59e0b', unit: 'rpm' },
      watts: { label: t.value('metrics_avg_power'), color: '#8b5cf6', unit: 'W' },
      altitude: { label: 'Altitude', color: '#10b981', unit: 'm' },
      latlng: { label: 'GPS', color: '#6366f1', unit: '' },
      grade: { label: 'Grade', color: '#14b8a6', unit: '%' },
      moving: { label: 'Moving', color: '#9ca3af', unit: '' },
      torque: { label: 'Torque', color: '#f97316', unit: 'N-m' },
      temp: {
        label: t.value('metrics_temp'),
        color: '#06b6d4',
        unit: userStore.temperatureUnitLabel
      },
      respiration: { label: 'Respiration', color: '#ec4899', unit: 'brpm' },
      hrv: { label: 'HRV', color: '#84cc16', unit: 'ms' },
      leftRightBalance: { label: 'L/R Balance', color: '#d946ef', unit: '%' },
      targetPower: { label: 'Target Power', color: '#10b981', unit: 'W' }
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

  const hasExtrasMeta = computed(() => {
    return Boolean(extrasMetaData.value && Object.keys(extrasMetaData.value).length > 0)
  })

  const workoutSectionAvailability = computed<Record<WorkoutSectionKey, boolean>>(() => {
    const currentWorkout = workout.value

    return {
      overview: Boolean(currentWorkout),
      'training-impact': hasTrainingMetrics(currentWorkout),
      exercises: shouldShowExercises(currentWorkout),
      nutrition: Boolean(
        nutritionEnabled.value && (currentWorkout?.kilojoules || currentWorkout?.plannedWorkout)
      ),
      analysis: Boolean(currentWorkout),
      'power-curve': shouldShowDetailedPacing(currentWorkout),
      intervals: shouldShowIntervals(currentWorkout),
      advanced: shouldShowDetailedPacing(currentWorkout),
      map: shouldShowMap(currentWorkout),
      pacing: shouldShowDetailedPacing(currentWorkout),
      timeline: shouldShowDetailedPacing(currentWorkout),
      zones: shouldShowPacing(currentWorkout),
      efficiency: hasEfficiencyMetrics(currentWorkout),
      notes: Boolean(currentWorkout),
      metrics: availableMetrics.value.length > 0,
      streams: availableStreams.value.length > 0 || hasExtrasMeta.value,
      duplicates: Boolean(
        currentWorkout?.isDuplicate ||
        currentWorkout?.duplicates?.length ||
        currentWorkout?.plannedWorkout
      ),
      'raw-data': Boolean(currentWorkout?.rawJson)
    }
  })

  const workoutSectionSettings = computed<WorkoutSectionSettings>(() => {
    const saved =
      (userStore.user?.dashboardSettings?.workoutDetailSections as
        | Partial<WorkoutSectionSettings>
        | undefined) || {}

    return workoutSectionCatalog.value.reduce((acc, section) => {
      const fallback = workoutSectionDefaults.value[section.key]
      const sectionSettings = saved[section.key]
      acc[section.key] = {
        visible: sectionSettings?.visible ?? fallback.visible,
        order: typeof sectionSettings?.order === 'number' ? sectionSettings.order : fallback.order
      }
      return acc
    }, {} as WorkoutSectionSettings)
  })

  const workoutSectionsModalOptions = computed(() =>
    workoutSectionCatalog.value.map((section) => ({
      key: section.key,
      label: section.label,
      icon: section.icon,
      available: workoutSectionAvailability.value[section.key],
      defaultVisible: workoutSectionDefaults.value[section.key].visible
    }))
  )

  const workoutNavSections = computed(() =>
    workoutSectionCatalog.value
      .filter((section) => isSectionEnabled(section.key))
      .sort(
        (a, b) =>
          workoutSectionSettings.value[a.key].order - workoutSectionSettings.value[b.key].order
      )
  )

  function isSectionEnabled(sectionKey: WorkoutSectionKey) {
    return (
      workoutSectionSettings.value[sectionKey].visible &&
      workoutSectionAvailability.value[sectionKey]
    )
  }

  function sectionStyle(sectionKey: WorkoutSectionKey) {
    return {
      order: workoutSectionSettings.value[sectionKey].order
    }
  }

  // Fetch workout data
  async function fetchWorkout() {
    loading.value = true
    error.value = null
    try {
      const id = route.params.id
      workout.value = await $fetch(`/api/workouts/${id}`)
    } catch (e: any) {
      error.value = e.data?.message || e.message || t.value('error_failed_to_load')
      console.error('Error fetching workout:', e)
    } finally {
      loading.value = false
    }
  }

  async function saveLocalTags() {
    if (!workout.value || savingTags.value || !hasLocalTagChanges.value) return

    savingTags.value = true
    try {
      const response = await $fetch<{ success: boolean; workout: any }>(
        `/api/workouts/${workout.value.id}`,
        {
          method: 'PATCH',
          body: {
            setLocalTags: normalizedLocalTagDraft.value
          }
        }
      )

      workout.value = response.workout
      syncLocalTagDraft()

      toast.add({
        title: 'Tags updated',
        description: 'Workout tags have been saved.',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
    } catch (e: any) {
      console.error('Error updating workout tags:', e)
      toast.add({
        title: 'Failed to update tags',
        description: e.data?.message || e.message || 'Could not save workout tags.',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    } finally {
      savingTags.value = false
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
          title: t.value('analyzing_ready_title'),
          description: t.value('analyzing_ready_desc'),
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
        title: t.value('analyzing_started_title'),
        description: t.value('analyzing_started_desc'),
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
        title: t.value('analyzing_failed_title'),
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
        title: t.value('analyzing_started_title'),
        description: t.value('analyzing_adherence_started'),
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
        title: t.value('analyzing_failed_title'),
        description: e.data?.message || e.message || 'Failed to start adherence analysis',
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
        title: t.value('analysis_button_publish'),
        description: t.value('publish_summary_success'),
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
      title: t.value('analyzing_ready_title'),
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
        description: t.value('promote_success'),
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
        title: t.value('delete_success_title'),
        description: t.value('delete_success_desc'),
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
    if (source === 'rouvy')
      return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
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
    const supportedSources = ['strava', 'rouvy', 'intervals', 'fit_file']
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
    const supportedSources = ['strava', 'rouvy', 'intervals', 'fit_file']
    return (
      supportedSources.includes(workout.source) &&
      (workout.streams.watts || workout.streams.heartrate || workout.streams.velocity)
    )
  }

  function shouldShowPacing(workout: any) {
    if (!workout) return false
    // Show timeline/zones if workout has stream data (time-series HR, power, velocity, etc.)
    // OR if it has cached zone data in rawJson (fallback for Whoop, etc.)
    const supportedSources = ['strava', 'rouvy', 'intervals', 'fit_file', 'whoop']
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
    if (lower.includes('rouvy')) return 'rouvy'
    if (lower.includes('garmin')) return 'garmin'
    if (lower.includes('apple')) return 'apple_health'
    return undefined
  }

  // Section Catalog Definition
  const workoutSectionCatalog = computed(
    (): Array<{
      key: WorkoutSectionKey
      label: string
      icon: string
      anchorId: string
    }> => {
      const isTReady = typeof t.value === 'function'
      return [
        {
          key: 'overview',
          label: isTReady ? t.value('sections_overview') : 'Overview',
          icon: 'i-lucide-file-text',
          anchorId: 'header'
        },
        {
          key: 'training-impact',
          label: isTReady ? t.value('sections_training_impact') : 'Training Impact',
          icon: 'i-lucide-activity-square',
          anchorId: 'training-impact'
        },
        {
          key: 'exercises',
          label: isTReady ? t.value('sections_exercises') : 'Exercises',
          icon: 'i-lucide-dumbbell',
          anchorId: 'exercises'
        },
        {
          key: 'nutrition',
          label: isTReady ? t.value('sections_nutrition') : 'Nutrition',
          icon: 'i-lucide-beaker',
          anchorId: 'nutrition'
        },
        {
          key: 'analysis',
          label: isTReady ? t.value('sections_analysis') : 'AI Analysis',
          icon: 'i-lucide-sparkles',
          anchorId: 'analysis'
        },
        {
          key: 'power-curve',
          label: isTReady ? t.value('sections_power_curve') : 'Power Curve',
          icon: 'i-lucide-zap',
          anchorId: 'power-curve'
        },
        {
          key: 'intervals',
          label: isTReady ? t.value('sections_intervals') : 'Intervals',
          icon: 'i-lucide-timer',
          anchorId: 'intervals'
        },
        {
          key: 'advanced',
          label: isTReady ? t.value('sections_advanced') : 'Advanced',
          icon: 'i-lucide-microscope',
          anchorId: 'advanced'
        },
        {
          key: 'map',
          label: isTReady ? t.value('sections_map') : 'Map',
          icon: 'i-lucide-map',
          anchorId: 'map'
        },
        {
          key: 'pacing',
          label: isTReady ? t.value('sections_pacing') : 'Pacing',
          icon: 'i-lucide-activity',
          anchorId: 'pacing'
        },
        {
          key: 'timeline',
          label: isTReady ? t.value('sections_timeline') : 'Timeline',
          icon: 'i-lucide-chart-line',
          anchorId: 'timeline'
        },
        {
          key: 'zones',
          label: isTReady ? t.value('sections_zones') : 'Zones',
          icon: 'i-lucide-layers',
          anchorId: 'zones'
        },
        {
          key: 'efficiency',
          label: isTReady ? t.value('sections_efficiency') : 'Efficiency',
          icon: 'i-lucide-gauge',
          anchorId: 'efficiency'
        },
        {
          key: 'notes',
          label: isTReady ? t.value('sections_notes') : 'Notes',
          icon: 'i-lucide-notebook-pen',
          anchorId: 'notes'
        },
        {
          key: 'metrics',
          label: isTReady ? t.value('sections_metrics') : 'Metrics',
          icon: 'i-lucide-bar-chart-3',
          anchorId: 'metrics'
        },
        {
          key: 'streams',
          label: isTReady ? t.value('sections_streams') : 'Streams',
          icon: 'i-lucide-radio',
          anchorId: 'streams'
        },
        {
          key: 'duplicates',
          label: isTReady ? t.value('sections_duplicates') : 'Versions',
          icon: 'i-lucide-copy',
          anchorId: 'duplicates'
        },
        {
          key: 'raw-data',
          label: isTReady ? t.value('sections_raw_data') : 'Raw Data',
          icon: 'i-lucide-code-xml',
          anchorId: 'raw-data'
        }
      ]
    }
  )

  const workoutSectionDefaults = computed(() =>
    workoutSectionCatalog.value.reduce((acc, section, index) => {
      acc[section.key] = { visible: true, order: index }
      return acc
    }, {} as WorkoutSectionSettings)
  )

  function goBack() {
    router.back()
  }

  const plannedKJ = computed(() => {
    if (!workout.value?.plannedWorkout) return null
    const pw = workout.value.plannedWorkout
    return Math.round((pw.tss || 100) * 8.5)
  })

  const kJDelta = computed(() => {
    if (!workout.value?.kilojoules || !plannedKJ.value) return 0
    return Math.round(((workout.value.kilojoules - plannedKJ.value) / plannedKJ.value) * 100)
  })

  const recoveryCarbBump = computed(() => {
    if (kJDelta.value < 10) return 0
    return Math.round((kJDelta.value / 15) * 40)
  })

  const nutritionEstimate = computed(() => {
    const caloriesFromWorkout = Number(workout.value?.calories || 0)
    const kilojoules = Number(workout.value?.kilojoules || 0)
    const estimatedCalories = Math.round(
      caloriesFromWorkout > 0 ? caloriesFromWorkout : kilojoules > 0 ? kilojoules / 4.184 : 0
    )

    if (estimatedCalories <= 0) return null

    const reportedCarbs = Number(workout.value?.carbsUsed || 0)
    const estimatedCarbs = Math.round(
      reportedCarbs > 0 ? reportedCarbs : (estimatedCalories * 0.6) / 4
    )
    const nonCarbCalories = Math.max(estimatedCalories - estimatedCarbs * 4, 0)
    const estimatedFat = Math.round((nonCarbCalories * 0.8) / 9)
    const estimatedProtein = Math.round((nonCarbCalories * 0.2) / 4)

    return [
      {
        label: 'Calories',
        value: `${estimatedCalories} kcal`,
        icon: 'i-tabler-flame',
        iconClass: 'text-orange-500'
      },
      {
        label: 'Carbs',
        value: `${estimatedCarbs} g`,
        icon: 'i-tabler-bread',
        iconClass: 'text-yellow-500'
      },
      {
        label: 'Fat',
        value: `${estimatedFat} g`,
        icon: 'i-tabler-droplet',
        iconClass: 'text-cyan-500'
      },
      {
        label: 'Protein',
        value: `${estimatedProtein} g`,
        icon: 'i-tabler-egg',
        iconClass: 'text-blue-500'
      }
    ]
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
        color: 'success'
      })
    } catch (e) {
      console.error('Failed to save stomach feel:', e)
    }
  }

  // Load data on mount
  onMounted(() => {
    trackWorkoutViewDetail('completed')
    fetchWorkout()

    if (route.query.share === 'true') {
      isShareModalOpen.value = true
    }
  })
</script>
