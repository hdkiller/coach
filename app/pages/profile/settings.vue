<template>
  <UDashboardPanel id="profile-settings">
    <template #header>
      <UDashboardNavbar :title="t('settings_title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <div class="flex gap-2 overflow-x-auto pb-1 w-full no-scrollbar">
          <UButton
            v-for="tab in tabs"
            :key="tab.id"
            :variant="activeTab === tab.id ? 'solid' : 'ghost'"
            :color="activeTab === tab.id ? 'primary' : 'neutral'"
            class="whitespace-nowrap"
            @click="activeTab = tab.id"
          >
            <UIcon :name="tab.icon" class="w-4 h-4 mr-2" />
            {{ tab.label }}
          </UButton>
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex-1 overflow-y-auto p-4 sm:p-6">
        <div class="max-w-4xl mx-auto space-y-8">
          <ProfileBasicSettings
            v-if="activeTab === 'basic'"
            :model-value="profile"
            :email="user?.email || ''"
            :loading="savingProfile"
            @update:model-value="handleProfileUpdate"
            @autodetect="handleAutodetect"
            @navigate="(tab) => (activeTab = tab)"
          />

          <template v-if="activeTab === 'availability'">
            <div class="space-y-4">
              <UCard :ui="{ body: 'p-0 sm:p-0' }">
                <template #header>
                  <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    {{ t('availability_header_title') }}
                  </h3>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {{ t('availability_header_desc') }}
                  </p>
                </template>

                <SettingsAvailabilitySettings
                  v-if="availability"
                  :initial-availability="availability"
                  :loading="savingAvailability"
                  @save="handleAvailabilitySave"
                />
                <div v-else class="p-4 sm:p-6 space-y-4">
                  <div
                    v-for="i in 7"
                    :key="i"
                    class="h-48 w-full bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-800 animate-pulse"
                  />
                </div>
              </UCard>
            </div>
          </template>

          <template v-if="activeTab === 'sports'">
            <div class="space-y-4">
              <UAlert
                v-if="showSportOverlapAlert"
                color="warning"
                variant="soft"
                icon="i-heroicons-exclamation-triangle"
                title="Overlapping sport profiles detected"
                :close="{ color: 'warning', variant: 'link', label: 'Dismiss' }"
                @update:open="dismissSportOverlapAlert"
              >
                <template #description>
                  <p>
                    More than one sport-specific profile matches the same activity types:
                    <span class="font-semibold">{{ sportOverlapSummary }}</span
                    >. This can lead to unexpected zone or targeting choices during workout
                    generation and sync.
                  </p>
                </template>
              </UAlert>

              <ProfileSportSettings
                :settings="sportSettings"
                :profile="profile"
                @update:settings="updateSportSettings"
                @autodetect="handleAutodetect"
              />
            </div>
          </template>

          <ProfileMeasurementsSettings v-if="activeTab === 'measurements'" />

          <ProfileNutritionSettings
            v-if="activeTab === 'nutrition'"
            :settings="nutritionSettings"
            :profile="profile"
            @update:settings="(val) => (nutritionSettings = val)"
            @navigate="(tab) => (activeTab = tab)"
            @saved="refreshProfile"
          />

          <ProfilePublicAuthorSettings
            v-if="activeTab === 'public-author'"
            :model-value="profile"
            :loading="savingPublicAuthor"
            @update:model-value="handlePublicAuthorUpdate"
          />

          <ProfileCommunicationSettings v-if="activeTab === 'communication'" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import { useStorage } from '@vueuse/core'
  import ProfileBasicSettings from '~/components/profile/BasicSettings.vue'
  import ProfileSportSettings from '~/components/profile/SportSettings.vue'
  import ProfileNutritionSettings from '~/components/profile/NutritionSettings.vue'
  import ProfileCommunicationSettings from '~/components/profile/CommunicationSettings.vue'
  import ProfileMeasurementsSettings from '~/components/profile/MeasurementsSettings.vue'
  import ProfilePublicAuthorSettings from '~/components/profile/PublicAuthorProfileSettings.vue'

  const { t } = useTranslate('profile')
  const { data } = useAuth()
  const user = computed(() => data.value?.user)
  const toast = useToast()
  const userStore = useUserStore()

  definePageMeta({
    middleware: 'auth'
  })

  function tr(key: string, fallback: string) {
    if (typeof t.value !== 'function') return fallback
    const translated = t.value(key)
    return translated === key ? fallback : translated
  }

  const tabs = computed(() => [
    {
      id: 'basic',
      label: tr('settings_tabs_basic', 'Basic Settings'),
      icon: 'i-heroicons-user-circle'
    },
    {
      id: 'sports',
      label: tr('settings_tabs_sports', 'Sport Settings'),
      icon: 'i-heroicons-bolt'
    },
    {
      id: 'measurements',
      label: tr('settings_tabs_measurements', 'Measurements'),
      icon: 'i-heroicons-scale'
    },
    {
      id: 'availability',
      label: tr('settings_tabs_availability', 'Availability'),
      icon: 'i-lucide-calendar-clock'
    },
    {
      id: 'nutrition',
      label: tr('settings_tabs_nutrition', 'Nutrition'),
      icon: 'i-heroicons-fire'
    },
    {
      id: 'public-author',
      label: tr('settings_tabs_public_author', 'Public Profile'),
      icon: 'i-heroicons-megaphone'
    },
    {
      id: 'communication',
      label: tr('settings_tabs_communication', 'Communication'),
      icon: 'i-heroicons-envelope'
    }
  ])

  const route = useRoute()
  const activeTab = ref((route.query.tab as string) || 'basic')

  watch(
    () => route.query.tab,
    (newTab) => {
      if (newTab && tabs.value.some((t) => t.id === newTab)) {
        activeTab.value = newTab as string
      }
    }
  )

  // Profile Data
  const profile = ref<any>({
    name: user.value?.name || 'Athlete',
    nickname: '',
    language: 'English',
    uiLanguage: 'en',
    weight: 0,
    weightUnits: 'Kilograms',
    height: 0,
    heightUnits: 'cm',
    distanceUnits: 'Kilometers',
    temperatureUnits: 'Celsius',
    visibility: 'Private',
    sex: 'Male',
    dob: '',
    city: '',
    state: '',
    country: '',
    timezone: '',
    weightSourceMode: 'AUTO'
  })

  const sportSettings = ref<any[]>([])
  const dismissedSportOverlapAlerts = useStorage<string[]>('profile:sport-overlap-alerts', [])
  const nutritionSettings = ref<any>(null)
  const savingProfile = ref(false)
  const savingPublicAuthor = ref(false)

  // Availability Logic
  const { data: availability, refresh: refreshAvailability } = await useFetch('/api/availability')
  const savingAvailability = ref(false)

  async function handleAvailabilitySave(updatedAvailability: any[]) {
    savingAvailability.value = true
    try {
      await $fetch('/api/availability', {
        method: 'POST',
        body: { availability: updatedAvailability }
      })
      toast.add({
        title: 'Schedule Saved',
        description: 'Your training availability has been updated',
        color: 'success'
      })
      await refreshAvailability()
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to save availability',
        color: 'error'
      })
    } finally {
      savingAvailability.value = false
    }
  }

  // Fetch profile data
  const { data: profileData, refresh: refreshProfile } = await useFetch('/api/profile', {
    key: 'user-profile'
  })

  // Fetch nutrition settings separately for now (or could merge into /api/profile later)
  const { data: nutritionData } = await useFetch('/api/profile/nutrition', {
    key: 'user-nutrition-settings'
  })

  async function handleProfileUpdate(newProfile: any) {
    // Use Object.assign to update the existing reactive object
    Object.assign(profile.value, newProfile)
    savingProfile.value = true

    try {
      await $fetch('/api/profile', {
        method: 'PATCH',
        body: newProfile
      })

      await userStore.fetchProfile(true)

      toast.add({
        title: 'Profile Updated',
        description: 'Your settings have been saved.',
        color: 'success'
      })
    } catch (error: any) {
      console.error('Profile update failed:', {
        status: error.statusCode,
        statusText: error.statusMessage,
        data: error.data,
        payload: newProfile
      })

      const errorMessage =
        error.data?.statusMessage || error.message || 'Failed to save profile settings.'
      const validationErrors = error.data?.data
        ?.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')

      toast.add({
        title: 'Update Failed',
        description: validationErrors ? `Invalid input: ${validationErrors}` : errorMessage,
        color: 'error'
      })
    } finally {
      savingProfile.value = false
    }
  }

  async function handleAutodetect(updatedProfile: any) {
    if (updatedProfile) {
      // 1. Update local reactive state
      if (updatedProfile.sportSettings) {
        sportSettings.value = updatedProfile.sportSettings
      }

      // 2. Prepare payload for backend update
      const updatePayload = { ...updatedProfile }

      // Merge into local profile ref
      Object.assign(profile.value, updatePayload)

      try {
        await $fetch('/api/profile', {
          method: 'PATCH',
          body: updatePayload
        })

        toast.add({
          title: 'Profile Updated',
          description: 'Your settings and sport-specific zones have been synced.',
          color: 'success'
        })
      } catch (error: any) {
        console.error('Autodetect sync failed:', {
          status: error.statusCode,
          statusText: error.statusMessage,
          data: error.data,
          payload: updatePayload
        })
        toast.add({
          title: 'Update Failed',
          description: 'Failed to save synced settings.',
          color: 'error'
        })
      }

      // Refresh full profile to ensure all derived state is correct
      await refreshProfile()
    }
  }

  async function handlePublicAuthorUpdate(newProfile: any) {
    savingPublicAuthor.value = true
    try {
      await $fetch('/api/profile/public', {
        method: 'PATCH',
        body: newProfile
      })

      Object.assign(profile.value, newProfile)
      await refreshProfile()

      toast.add({
        title: 'Public Profile Updated',
        description: 'Your public profile settings have been saved.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Update Failed',
        description: error.data?.message || 'Failed to save public profile.',
        color: 'error'
      })
    } finally {
      savingPublicAuthor.value = false
    }
  }

  watchEffect(() => {
    const pData = profileData.value as any
    if (pData?.profile) {
      profile.value = { ...profile.value, ...pData.profile }

      if (pData.profile.sportSettings) {
        sportSettings.value = pData.profile.sportSettings as any[]
      }
    }

    // Sync nutrition settings
    if (nutritionData.value && (nutritionData.value as any).settings) {
      nutritionSettings.value = (nutritionData.value as any).settings
    }
  })

  const sportOverlapGroups = computed(() => {
    const exactTypeMatches = new Map<string, any[]>()

    for (const setting of sportSettings.value || []) {
      if (setting?.isDefault) continue
      const types = Array.isArray(setting?.types) ? setting.types : []
      for (const type of types) {
        if (!type) continue
        const current = exactTypeMatches.get(type) || []
        current.push(setting)
        exactTypeMatches.set(type, current)
      }
    }

    return Array.from(exactTypeMatches.entries())
      .filter(([, settings]) => settings.length > 1)
      .map(([type, settings]) => ({
        type,
        settings
      }))
  })

  const sportOverlapSignature = computed(() =>
    sportOverlapGroups.value
      .map(
        (group) =>
          `${group.type}:${group.settings
            .map((setting: any) => setting.id || setting.externalId || setting.name)
            .sort()
            .join(',')}`
      )
      .sort()
      .join('|')
  )

  const showSportOverlapAlert = computed(
    () =>
      activeTab.value === 'sports' &&
      sportOverlapGroups.value.length > 0 &&
      !dismissedSportOverlapAlerts.value.includes(sportOverlapSignature.value)
  )

  const sportOverlapSummary = computed(() =>
    sportOverlapGroups.value
      .map((group) => {
        const profileNames = group.settings
          .map((setting: any) => setting.name || 'Unnamed profile')
          .join(', ')
        return `${group.type} (${profileNames})`
      })
      .join('; ')
  )

  function dismissSportOverlapAlert() {
    if (!sportOverlapSignature.value) return
    if (!dismissedSportOverlapAlerts.value.includes(sportOverlapSignature.value)) {
      dismissedSportOverlapAlerts.value = [
        ...dismissedSportOverlapAlerts.value,
        sportOverlapSignature.value
      ]
    }
  }

  // Save updated sport settings manually
  async function updateSportSettings(updatedSettings: any[]) {
    sportSettings.value = updatedSettings
    try {
      await $fetch('/api/profile', {
        method: 'PATCH',
        body: { sportSettings: updatedSettings }
      })
      toast.add({
        title: 'Settings Saved',
        description: 'Sport settings updated successfully.',
        color: 'success'
      })
    } catch (error: any) {
      console.error('Sport settings update failed:', {
        status: error.statusCode,
        statusText: error.statusMessage,
        data: error.data,
        payload: { sportSettings: updatedSettings }
      })
      toast.add({
        title: 'Update Failed',
        description: 'Failed to save sport settings.',
        color: 'error'
      })
    }
  }

  useHead({
    title: 'Profile Settings',
    meta: [
      {
        name: 'description',
        content: 'Manage your personal details, physical metrics, and custom training zones.'
      }
    ]
  })
</script>
