<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            v-if="integrationStore?.intervalsConnected"
            @click="integrationStore.syncAllData"
            :loading="integrationStore.syncingData"
            :disabled="integrationStore.syncingData"
            size="sm"
          >
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
            {{ integrationStore.syncingData ? 'Syncing...' : 'Sync Data' }}
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ClientOnly>
        <div class="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <h2 class="text-2xl font-bold">Welcome to Coach Watts!</h2>
            <p class="mt-2 text-muted">Your AI-powered endurance coach is ready to help you optimize your training.</p>
          </div>
        
          <!-- Row 1: Athlete Profile / Today's Training / Performance Overview -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            <!-- Athlete Profile Card - shown when connected -->
            <UCard v-if="integrationStore?.intervalsConnected" class="flex flex-col">
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-user-circle" class="w-5 h-5" />
                    <h3 class="font-semibold">Athlete Profile</h3>
                  </div>
                  <UButton
                    to="/profile/settings"
                    icon="i-heroicons-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                  />
                </div>
              </template>
              
              <!-- Loading skeleton -->
              <div v-if="userStore?.loading && !userStore?.profile" class="space-y-3 text-sm animate-pulse flex-grow">
                <div>
                  <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                  <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                </div>
                <div class="pt-2 border-t space-y-2">
                  <div class="flex justify-between">
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  </div>
                  <div class="flex justify-between">
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                  <div class="flex justify-between">
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
              </div>
              
              <!-- Actual profile data -->
              <div v-else-if="userStore?.profile" class="space-y-3 text-sm flex-grow">
                <div class="flex items-center gap-2">
                  <p class="font-medium text-base">{{ userStore.profile.name || 'Athlete' }}</p>
                  <p v-if="userStore.profile.age" class="text-muted text-xs">
                    {{ userStore.profile.age }} years old
                  </p>
                </div>
                
                <!-- Performance Section - Clickable -->
                <NuxtLink
                  to="/performance"
                  class="block w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                >
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-medium text-yellow-600 dark:text-yellow-400">Performance</p>
                    <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
                  </div>
                  <div class="grid grid-cols-3 gap-2 text-xs">
                    <div class="flex items-center gap-1">
                      <UIcon name="i-heroicons-bolt-solid" class="w-3 h-3 text-yellow-500" />
                      <span class="text-muted">FTP:</span>
                      <span class="font-medium">{{ userStore.profile.ftp ? `${userStore.profile.ftp}W` : 'N/A' }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <UIcon name="i-heroicons-scale" class="w-3 h-3 text-yellow-500" />
                      <span class="text-muted">Weight:</span>
                      <span class="font-medium">{{ userStore.profile.weight ? `${userStore.profile.weight}kg` : 'N/A' }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <UIcon name="i-heroicons-chart-bar-square" class="w-3 h-3 text-yellow-500" />
                      <span class="text-muted">W/kg:</span>
                      <span class="font-medium">{{ userStore.profile.ftp && userStore.profile.weight ? (userStore.profile.ftp / userStore.profile.weight).toFixed(2) : 'N/A' }}</span>
                    </div>
                  </div>
                </NuxtLink>
                
                <!-- Wellness Section - Clickable -->
                <button
                  v-if="userStore.profile.recentHRV || userStore.profile.restingHR || userStore.profile.recentSleep || userStore.profile.recentRecoveryScore"
                  @click="openWellnessModal"
                  class="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                >
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-medium text-indigo-600 dark:text-indigo-400">Latest Wellness</p>
                    <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
                  </div>
                  <div class="grid grid-cols-3 gap-2 text-xs">
                    <div v-if="userStore.profile.recentSleep" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-moon" class="w-3 h-3 text-indigo-500" />
                      <span class="text-muted">Sleep:</span>
                      <span class="font-medium">{{ userStore.profile.recentSleep.toFixed(1) }}h</span>
                    </div>
                    <div v-if="userStore.profile.recentHRV" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-chart-bar" class="w-3 h-3 text-indigo-500" />
                      <span class="text-muted">HRV:</span>
                      <span class="font-medium">{{ Math.round(userStore.profile.recentHRV) }}</span>
                      <span v-if="userStore.profile.avgRecentHRV" class="text-[10px] text-muted">(7d: {{ Math.round(userStore.profile.avgRecentHRV) }})</span>
                    </div>
                    <div v-if="userStore.profile.restingHR" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-heart" class="w-3 h-3 text-indigo-500" />
                      <span class="text-muted">RHR:</span>
                      <span class="font-medium">{{ userStore.profile.restingHR }}</span>
                    </div>
                    <div v-if="userStore.profile.recentRecoveryScore" class="flex items-center gap-1 col-span-2">
                      <UIcon name="i-heroicons-bolt" class="w-3 h-3 text-indigo-500" />
                      <span class="text-muted">Recovery:</span>
                      <span class="font-medium">{{ userStore.profile.recentRecoveryScore }}/100</span>
                    </div>
                  </div>
                  <p v-if="userStore.profile.latestWellnessDate" class="text-[10px] text-muted mt-1">
                    Updated {{ formatWellnessDate(userStore.profile.latestWellnessDate) }}
                  </p>
                </button>
              </div>
              
              <template #footer>
                <div class="flex gap-2">
                  <UButton to="/profile/athlete" block variant="outline">
                    View Details
                  </UButton>
                  <UButton
                    variant="outline"
                    @click="userStore?.generateProfile"
                    :loading="userStore?.generating"
                    :disabled="userStore?.generating"
                    icon="i-heroicons-arrow-path"
                  >
                    Regenerate
                  </UButton>
                </div>
              </template>
            </UCard>
            
            <!-- Today's Recommendation Card -->
            <UCard v-if="integrationStore.intervalsConnected" class="flex flex-col">
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-light-bulb" class="w-5 h-5" />
                    <h3 class="font-semibold">Today's Training</h3>
                  </div>
                  <UBadge v-if="recommendationStore.todayRecommendation" :color="getRecommendationColor(recommendationStore.todayRecommendation.recommendation)">
                    {{ getRecommendationLabel(recommendationStore.todayRecommendation.recommendation) }}
                  </UBadge>
                </div>
              </template>
              
              <div v-if="recommendationStore.loading || recommendationStore.generating" class="text-sm text-muted py-4 text-center flex-grow">
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin inline" />
                <p class="mt-2">{{ recommendationStore.generating ? 'Generating recommendation...' : 'Loading...' }}</p>
                <p v-if="recommendationStore.generating" class="text-xs mt-1">This may take up to 60 seconds</p>
              </div>
              
              <div v-else-if="!recommendationStore.todayRecommendation" class="flex-grow">
                <p class="text-sm text-muted">
                  Get AI-powered guidance for today's training based on your recovery and planned workout.
                </p>
              </div>
              
              <div v-else class="flex-grow">
                <p class="text-sm">{{ recommendationStore.todayRecommendation.reasoning }}</p>
                
                <div v-if="recommendationStore.todayRecommendation.analysisJson?.suggested_modifications" class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-3">
                  <p class="text-sm font-medium mb-2">Suggested Modification:</p>
                  <p class="text-sm">{{ recommendationStore.todayRecommendation.analysisJson.suggested_modifications.description }}</p>
                </div>
              </div>
              
              <template #footer>
                <div class="flex gap-2">
                  <UButton
                    v-if="recommendationStore.todayRecommendation && !recommendationStore.generating"
                    variant="outline"
                    @click="openRecommendationModal"
                    block
                  >
                    View Details
                  </UButton>
                  <UButton
                    variant="outline"
                    @click="recommendationStore.generateTodayRecommendation"
                    :loading="recommendationStore.generating"
                    :disabled="recommendationStore.generating"
                    :block="!recommendationStore.todayRecommendation || recommendationStore.generating"
                    icon="i-heroicons-arrow-path"
                  >
                    {{ recommendationStore.generating ? 'Running...' : (recommendationStore.todayRecommendation ? 'Refresh' : 'Get Recommendation') }}
                  </UButton>
                </div>
              </template>
            </UCard>
            
            <!-- Performance Overview Card -->
            <UCard v-if="integrationStore.intervalsConnected" class="flex flex-col">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-chart-bar" class="w-5 h-5" />
                  <h3 class="font-semibold">Performance Overview</h3>
                </div>
              </template>
              
              <!-- Loading skeleton -->
              <div v-if="loadingScores" class="space-y-3 animate-pulse flex-grow">
                <div v-for="i in 4" :key="i" class="flex justify-between items-center">
                  <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                </div>
              </div>
              
              <!-- Actual scores data -->
              <div v-else-if="profileScores" class="space-y-3 flex-grow">
                <div
                  class="flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 transition-colors"
                  @click="openScoreModal('currentFitness')"
                >
                  <span class="text-sm text-muted">Current Fitness</span>
                  <UBadge :color="getScoreColor(profileScores.currentFitness)" size="lg">
                    {{ profileScores.currentFitness || 'N/A' }}
                  </UBadge>
                </div>
                <div
                  class="flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 transition-colors"
                  @click="openScoreModal('recoveryCapacity')"
                >
                  <span class="text-sm text-muted">Recovery Capacity</span>
                  <UBadge :color="getScoreColor(profileScores.recoveryCapacity)" size="lg">
                    {{ profileScores.recoveryCapacity || 'N/A' }}
                  </UBadge>
                </div>
                <div
                  class="flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 transition-colors"
                  @click="openScoreModal('nutritionCompliance')"
                >
                  <span class="text-sm text-muted">Nutrition Compliance</span>
                  <UBadge :color="getScoreColor(profileScores.nutritionCompliance)" size="lg">
                    {{ profileScores.nutritionCompliance || 'N/A' }}
                  </UBadge>
                </div>
                <div
                  class="flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 transition-colors"
                  @click="openScoreModal('trainingConsistency')"
                >
                  <span class="text-sm text-muted">Training Consistency</span>
                  <UBadge :color="getScoreColor(profileScores.trainingConsistency)" size="lg">
                    {{ profileScores.trainingConsistency || 'N/A' }}
                  </UBadge>
                </div>

                <div v-if="profileScores.lastUpdated" class="pt-2 border-t">
                  <p class="text-xs text-muted text-center">
                    Updated {{ formatScoreDate(profileScores.lastUpdated) }}
                  </p>
                </div>
              </div>
              
              <!-- No scores yet -->
              <div v-else class="text-center py-4 flex-grow">
                <p class="text-sm text-muted">
                  Generate your athlete profile to see performance scores.
                </p>
              </div>
              
              <template #footer>
                <UButton to="/performance" block variant="outline">
                  View Details
                </UButton>
              </template>
            </UCard>
            
            <!-- Getting Started Card - shown when not connected -->
            <UCard v-if="!integrationStore.intervalsConnected" class="flex flex-col">
              <template #header>
                <h3 class="font-semibold">Getting Started</h3>
              </template>
              <p class="text-sm text-muted flex-grow">
                Connect your Intervals.icu account to start analyzing your training data.
              </p>
              <template #footer>
                <UButton to="/settings" block>
                  Connect Intervals.icu
                </UButton>
              </template>
            </UCard>
          </div>
          
          <!-- Row 2: Recent Activity / Next Steps / Connection Status -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Recent Activity Card -->
            <UCard class="lg:col-span-2">
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold">Recent Activity</h3>
                  <UBadge v-if="activityStore.recentActivity && activityStore.recentActivity.items.length > 0" color="neutral" variant="subtle">
                    Past 5 days
                  </UBadge>
                </div>
              </template>
              
              <!-- Loading state -->
              <div v-if="activityStore.loading" class="text-center py-8">
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin inline text-primary" />
                <p class="text-sm text-muted mt-2">Loading activity...</p>
              </div>
              
              <!-- No connection -->
              <div v-else-if="!integrationStore.intervalsConnected" class="text-center py-8">
                <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 mx-auto text-muted mb-3" />
                <p class="text-sm text-muted">
                  Connect your Intervals.icu account to see your recent activity.
                </p>
                <UButton to="/settings" color="primary" class="mt-4">
                  Connect Now
                </UButton>
              </div>
              
              <!-- No activity -->
              <div v-else-if="!activityStore.recentActivity || activityStore.recentActivity.items.length === 0" class="text-center py-8">
                <UIcon name="i-heroicons-calendar" class="w-12 h-12 mx-auto text-muted mb-3" />
                <p class="text-sm text-muted">
                  No recent activity found. Your data is syncing...
                </p>
              </div>
              
              <!-- Timeline -->
              <UTimeline v-else :items="activityStore.recentActivity.items" class="max-h-96 overflow-y-auto">
                <template #default="{ item }">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <NuxtLink
                        v-if="item.link"
                        :to="item.link"
                        class="font-medium text-sm hover:text-primary transition-colors"
                      >
                        {{ item.title }}
                      </NuxtLink>
                      <p v-else class="font-medium text-sm">{{ item.title }}</p>
                      
                      <p v-if="item.description" class="text-xs text-muted mt-0.5">
                        {{ item.description }}
                      </p>
                    </div>
                    <time class="text-xs text-muted whitespace-nowrap">
                      {{ formatActivityDate(item.date) }}
                    </time>
                  </div>
                </template>
              </UTimeline>
            </UCard>
            
            <!-- Next Steps Card - hidden when reports exist -->
            <UCard v-if="!hasReports">
              <template #header>
                <h3 class="font-semibold">Next Steps</h3>
              </template>
              <ul class="space-y-2 text-sm text-muted">
                <li class="flex items-center gap-2">
                  <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-success" />
                  Account created successfully
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    :name="integrationStore.intervalsConnected ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-path'"
                    :class="integrationStore.intervalsConnected ? 'w-5 h-5 text-success' : 'w-5 h-5'"
                  />
                  Connect Intervals.icu
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    :name="integrationStore.intervalsConnected ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-path'"
                    :class="integrationStore.intervalsConnected ? 'w-5 h-5 text-success' : 'w-5 h-5'"
                  />
                  Sync your training data
                </li>
                <li class="flex items-center gap-2">
                  <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" />
                  Get your first AI coaching report
                </li>
              </ul>
            </UCard>
            
            <!-- Connection Status Card - shown when connected -->
            <UCard v-if="integrationStore.intervalsConnected">
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold">Data Sync</h3>
                  <UBadge color="success" variant="subtle">
                    <UIcon name="i-heroicons-check-circle" class="w-3 h-3" />
                    Connected
                  </UBadge>
                </div>
              </template>
              
              <div class="space-y-3" v-if="integrationStore.dataSyncStatus">
                <!-- Workouts -->
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-bolt" class="w-4 h-4 text-primary" />
                      <span class="text-sm font-medium">Workouts</span>
                    </div>
                    <UBadge
                      :color="integrationStore.dataSyncStatus.workouts ? 'success' : 'neutral'"
                      variant="subtle"
                      size="sm"
                    >
                      {{ integrationStore.dataSyncStatus.workoutCount || 0 }} synced
                    </UBadge>
                  </div>
                  <p v-if="integrationStore.dataSyncStatus.workoutProviders?.length" class="text-xs text-muted mt-1 ml-6">
                    via {{ integrationStore.dataSyncStatus.workoutProviders.join(', ') }}
                  </p>
                </div>
                
                <!-- Nutrition -->
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-cake" class="w-4 h-4 text-primary" />
                      <span class="text-sm font-medium">Nutrition</span>
                    </div>
                    <UBadge
                      :color="integrationStore.dataSyncStatus.nutrition ? 'success' : 'neutral'"
                      variant="subtle"
                      size="sm"
                    >
                      {{ integrationStore.dataSyncStatus.nutritionCount || 0 }} days
                    </UBadge>
                  </div>
                  <p v-if="integrationStore.dataSyncStatus.nutritionProviders?.length" class="text-xs text-muted mt-1 ml-6">
                    via {{ integrationStore.dataSyncStatus.nutritionProviders.join(', ') }}
                  </p>
                </div>
                
                <!-- Wellness -->
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-heart" class="w-4 h-4 text-primary" />
                      <span class="text-sm font-medium">Wellness</span>
                    </div>
                    <UBadge
                      :color="integrationStore.dataSyncStatus.wellness ? 'success' : 'neutral'"
                      variant="subtle"
                      size="sm"
                    >
                      {{ integrationStore.dataSyncStatus.wellnessCount || 0 }} days
                    </UBadge>
                  </div>
                  <p v-if="integrationStore.dataSyncStatus.wellnessProviders?.length" class="text-xs text-muted mt-1 ml-6">
                    via {{ integrationStore.dataSyncStatus.wellnessProviders.join(', ') }}
                  </p>
                </div>
                
                <!-- Last Sync Info -->
                <div v-if="integrationStore.lastSyncTime" class="text-xs text-muted text-center pt-2 border-t">
                  Last synced {{ formatRelativeTime(integrationStore.lastSyncTime) }}
                </div>
              </div>
              
              <template #footer>
                <UButton to="/settings" block variant="outline" size="sm">
                  Manage Connections
                </UButton>
              </template>
            </UCard>
          </div>
        </div>
      </ClientOnly>
    </template>

  </UDashboardPanel>
  
  <!-- Wellness Modal -->
  <WellnessModal
    v-model:open="showWellnessModal"
    :date="wellnessModalDate"
  />

  <!-- Recommendation Modal -->
  <UModal v-model:open="showRecommendationModal" title="Today's Training Recommendation">
    <template #body>
      <div v-if="recommendationStore.todayRecommendation" class="space-y-4">
        <!-- Recommendation Badge -->
        <div class="text-center">
          <UBadge
            :color="getRecommendationColor(recommendationStore.todayRecommendation.recommendation)"
            size="lg"
            class="text-lg px-4 py-2"
          >
            {{ getRecommendationLabel(recommendationStore.todayRecommendation.recommendation) }}
          </UBadge>
          <p class="text-sm text-muted mt-2">Confidence: {{ (recommendationStore.todayRecommendation.confidence * 100).toFixed(0) }}%</p>
        </div>

        <!-- Reasoning -->
        <div>
          <h4 class="font-medium mb-2">Why?</h4>
          <p class="text-sm text-muted">{{ recommendationStore.todayRecommendation.reasoning }}</p>
        </div>

        <!-- Key Factors -->
        <div v-if="recommendationStore.todayRecommendation?.analysisJson?.key_factors">
          <h4 class="font-medium mb-2">Key Factors:</h4>
          <ul class="space-y-1">
            <li v-for="(factor, idx) in recommendationStore.todayRecommendation.analysisJson.key_factors" :key="idx" class="text-sm flex gap-2">
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 mt-0.5" />
              <span>{{ factor }}</span>
            </li>
          </ul>
        </div>

        <!-- Planned Workout -->
        <div v-if="recommendationStore.todayRecommendation?.analysisJson?.planned_workout">
          <h4 class="font-medium mb-2">Original Plan:</h4>
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <p class="font-medium">{{ recommendationStore.todayRecommendation.analysisJson.planned_workout.original_title }}</p>
            <p class="text-sm text-muted">
              {{ recommendationStore.todayRecommendation.analysisJson.planned_workout.original_duration_min }} min •
              {{ recommendationStore.todayRecommendation.analysisJson.planned_workout.original_tss }} TSS
            </p>
          </div>
        </div>

        <!-- Suggested Modifications -->
        <div v-if="recommendationStore.todayRecommendation?.analysisJson?.suggested_modifications">
          <h4 class="font-medium mb-2">Suggested Changes:</h4>
          <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <p class="font-medium">{{ recommendationStore.todayRecommendation.analysisJson.suggested_modifications.new_title }}</p>
            <p class="text-sm text-muted mb-2">
              {{ recommendationStore.todayRecommendation.analysisJson.suggested_modifications.new_duration_min }} min •
              {{ recommendationStore.todayRecommendation.analysisJson.suggested_modifications.new_tss }} TSS
            </p>
            <p class="text-sm">{{ recommendationStore.todayRecommendation.analysisJson.suggested_modifications.description }}</p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton color="neutral" variant="outline" @click="showRecommendationModal = false">
          Close
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Score Detail Modal -->
  <ScoreDetailModal
    v-if="showScoreModal"
    v-model="showScoreModal"
    :title="scoreModalData.title"
    :score="scoreModalData.score"
    :explanation="scoreModalData.explanation"
    :analysis-data="scoreModalData.analysisData"
    :color="scoreModalData.color"
  />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

useHead({
  title: 'Dashboard',
  meta: [
    { name: 'description', content: 'Your daily athlete dashboard. Monitor your recovery, check today\'s training recommendation, and review your performance trends.' }
  ]
})

const { formatRelativeTime } = useFormat()
const { getScoreColor: getScoreBadgeColor } = useScoreColor()

const integrationStore = useIntegrationStore()
const userStore = useUserStore()
const recommendationStore = useRecommendationStore()
const activityStore = useActivityStore()

// Initial data fetch
onMounted(async () => {
    await integrationStore.fetchStatus()
    if (integrationStore.intervalsConnected) {
        await Promise.all([
            userStore.fetchProfile(),
            recommendationStore.fetchTodayRecommendation(),
            activityStore.fetchRecentActivity()
        ])
    }
})

// Watch for connection changes
watch(() => integrationStore.intervalsConnected, async (connected) => {
    if (connected) {
        await Promise.all([
            userStore.fetchProfile(),
            recommendationStore.fetchTodayRecommendation(),
            activityStore.fetchRecentActivity()
        ])
    }
})

// Recommendation state
const showRecommendationModal = ref(false)

// Wellness modal state
const showWellnessModal = ref(false)
const wellnessModalDate = ref<Date | null>(null)

// Score detail modal state
const showScoreModal = ref(false)
const scoreModalData = ref<{
  title: string
  score: number | null
  explanation: string | null
  analysisData?: any
  color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan'
}>({
  title: '',
  score: null,
  explanation: null,
  analysisData: undefined,
  color: undefined
})

const hasReports = computed(() => userStore.profile?.hasReports ?? false)

// Fetch athlete profile scores
const { data: scoresData, pending: loadingScores } = useFetch('/api/scores/athlete-profile', {
  lazy: true,
  server: false,
  watch: [() => integrationStore.intervalsConnected]
})

const profileScores = computed(() => scoresData.value?.scores || null)

function openRecommendationModal() {
  showRecommendationModal.value = true
}

function getRecommendationColor(rec: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    'proceed': 'success',
    'modify': 'warning',
    'reduce_intensity': 'warning',
    'rest': 'error'
  }
  return colors[rec] || 'neutral'
}

function getRecommendationLabel(rec: string) {
  const labels: Record<string, string> = {
    'proceed': '✓ Proceed as Planned',
    'modify': '⟳ Modify Workout',
    'reduce_intensity': '↓ Reduce Intensity',
    'rest': '⏸ Rest Day'
  }
  return labels[rec] || rec
}

// Format date for timeline display
function formatActivityDate(date: string | Date): string {
  const activityDate = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - activityDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return activityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

// Wellness modal handlers
function openWellnessModal() {
  // Use today's date or the latest wellness date
  wellnessModalDate.value = userStore.profile?.latestWellnessDate
    ? new Date(userStore.profile.latestWellnessDate)
    : new Date()
  showWellnessModal.value = true
}

function formatWellnessDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper to get score color
function getScoreColor(score: number | null): 'error' | 'warning' | 'success' | 'neutral' {
  return getScoreBadgeColor(score)
}

// Helper to format score date
function formatScoreDate(date: string | Date): string {
  const scoreDate = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - scoreDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'today'
  } else if (diffDays === 1) {
    return 'yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return scoreDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}


// Function to open score detail modal
function openScoreModal(scoreType: 'currentFitness' | 'recoveryCapacity' | 'nutritionCompliance' | 'trainingConsistency') {
  if (!profileScores.value) return

  const scoreConfig = {
    currentFitness: {
      title: 'Current Fitness',
      score: profileScores.value.currentFitness,
      explanation: profileScores.value.currentFitnessExplanation,
      analysisData: profileScores.value.currentFitnessExplanationJson,
      color: 'blue' as const
    },
    recoveryCapacity: {
      title: 'Recovery Capacity',
      score: profileScores.value.recoveryCapacity,
      explanation: profileScores.value.recoveryCapacityExplanation,
      analysisData: profileScores.value.recoveryCapacityExplanationJson,
      color: 'green' as const
    },
    nutritionCompliance: {
      title: 'Nutrition Compliance',
      score: profileScores.value.nutritionCompliance,
      explanation: profileScores.value.nutritionComplianceExplanation,
      analysisData: profileScores.value.nutritionComplianceExplanationJson,
      color: 'purple' as const
    },
    trainingConsistency: {
      title: 'Training Consistency',
      score: profileScores.value.trainingConsistency,
      explanation: profileScores.value.trainingConsistencyExplanation,
      analysisData: profileScores.value.trainingConsistencyExplanationJson,
      color: 'orange' as const
    },
  }

  const config = scoreConfig[scoreType]

  scoreModalData.value = {
    title: config.title,
    score: config.score ?? null,
    explanation: config.analysisData ? null : config.explanation ?? null,
    analysisData: config.analysisData || undefined,
    color: config.color
  }

  showScoreModal.value = true
}
</script>
