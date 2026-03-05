<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Personal Information Card -->
    <UCard>
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Personal Information
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Your basic identity and contact details.
            </p>
          </div>
          <div class="flex shrink-0">
            <UButton
              icon="i-heroicons-arrow-path"
              size="sm"
              variant="soft"
              color="primary"
              :loading="autodetecting"
              label="Auto-detect from Apps"
              class="w-full sm:w-auto justify-center"
              @click="autodetectProfile"
            />
          </div>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormField label="Name" name="name">
          <UInput v-model="localProfile.name" placeholder="Your Name" class="w-full" />
        </UFormField>

        <UFormField label="Email Address" name="email" help="Email cannot be changed here.">
          <UInput :model-value="email" disabled class="w-full bg-gray-50 dark:bg-gray-800" />
        </UFormField>

        <UFormField label="Sex" name="sex">
          <USelectMenu
            v-model="localProfile.sex"
            :items="['Male', 'Female', 'Other']"
            class="w-full"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          />
        </UFormField>

        <UFormField label="Date of Birth" name="dob">
          <UInput
            v-model="dobValue"
            type="date"
            class="w-full"
            @update:model-value="(val) => (localProfile.dob = val)"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Body Metrics Card -->
    <UCard>
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Body Metrics
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Used for BMR calculation and power/weight performance metrics.
            </p>
          </div>
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            class="w-full sm:w-auto justify-center"
            @click="emit('navigate', 'measurements')"
          >
            Measurements
          </UButton>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <UFormField label="Weight" name="weight" class="col-span-2">
              <UInput v-model.number="localProfile.weight" type="number" step="0.1" class="w-full">
                <template #trailing>
                  <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                    localProfile.weightUnits === 'Pounds' ? 'lbs' : 'kg'
                  }}</span>
                </template>
              </UInput>
            </UFormField>
            <UFormField label="Units" name="weightUnits">
              <USelectMenu
                v-model="localProfile.weightUnits"
                :items="['Kilograms', 'Pounds']"
                class="w-full"
                :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
              />
            </UFormField>
          </div>

          <UBadge variant="soft" color="neutral">
            Current effective weight:
            {{ formattedEffectiveWeight }}
            <span v-if="effectiveWeightLabel"> from {{ effectiveWeightLabel }}</span>
            <span v-if="effectiveWeightDate"> on {{ effectiveWeightDate }}</span>
          </UBadge>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <UFormField label="Height" name="height" class="col-span-2">
            <div v-if="localProfile.heightUnits === 'ft/in'" class="flex gap-2">
              <UInput
                v-model.number="heightFt"
                type="number"
                placeholder="ft"
                class="w-full"
                @update:model-value="syncHeightFromFtIn"
              >
                <template #trailing>
                  <span class="text-gray-500 dark:text-gray-400 text-xs">ft</span>
                </template>
              </UInput>
              <UInput
                v-model.number="heightIn"
                type="number"
                placeholder="in"
                class="w-full"
                @update:model-value="syncHeightFromFtIn"
              >
                <template #trailing>
                  <span class="text-gray-500 dark:text-gray-400 text-xs">in</span>
                </template>
              </UInput>
            </div>
            <UInput v-else v-model.number="localProfile.height" type="number" class="w-full">
              <template #trailing>
                <span class="text-gray-500 dark:text-gray-400 text-xs">cm</span>
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Units" name="heightUnits">
            <USelectMenu
              v-model="localProfile.heightUnits"
              :items="['cm', 'ft/in']"
              class="w-full"
              :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
              @update:model-value="handleHeightUnitChange"
            />
          </UFormField>
        </div>
      </div>
    </UCard>

    <!-- Localization & Preferences Card -->
    <UCard>
      <template #header>
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
          Localization & Preferences
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Regional settings and measurement units.
        </p>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormField label="Language" name="language">
          <USelectMenu
            v-model="localProfile.language"
            :items="[
              'English',
              'Spanish',
              'French',
              'German',
              'Italian',
              'Portuguese',
              'Dutch',
              'Danish',
              'Norwegian',
              'Swedish',
              'Finnish',
              'Polish',
              'Turkish',
              'Hungarian',
              'Romanian',
              'Slovak',
              'Czech',
              'Greek',
              'Bulgarian',
              'Croatian',
              'Slovenian',
              'Estonian',
              'Latvian',
              'Lithuanian',
              'Japanese',
              'Chinese',
              'Korean'
            ]"
            class="w-full"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          />
        </UFormField>

        <UFormField label="Timezone" name="timezone">
          <USelectMenu
            v-model="localProfile.timezone"
            :items="timezones"
            class="w-full"
            placeholder="Select timezone"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          />
        </UFormField>

        <UFormField label="Distance Units" name="distanceUnits">
          <USelectMenu
            v-model="localProfile.distanceUnits"
            :items="['Kilometers', 'Miles']"
            class="w-full"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          />
        </UFormField>

        <UFormField label="Temperature Units" name="temperatureUnits">
          <USelectMenu
            v-model="localProfile.temperatureUnits"
            :items="['Celsius', 'Fahrenheit']"
            class="w-full"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Location Card -->
    <UCard>
      <template #header>
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">Location</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Used for weather forecasts and regional insights.
        </p>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormField label="City" name="city">
          <UInput v-model="localProfile.city" placeholder="e.g. London" class="w-full" />
        </UFormField>

        <UFormField label="State/Province" name="state">
          <UInput v-model="localProfile.state" placeholder="e.g. Ontario" class="w-full" />
        </UFormField>

        <UFormField label="Country" name="country">
          <USelectMenu
            v-model="countryModel"
            :items="countriesWithLabel"
            label-key="label"
            :filter-fields="['name', 'code']"
            class="w-full"
            :search-input="{ placeholder: 'Search country...' }"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          />
        </UFormField>

        <UFormField label="Profile Visibility" name="visibility">
          <USelectMenu
            v-model="localProfile.visibility"
            :items="['Private', 'Public', 'Followers Only']"
            class="w-full"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Login Methods Card -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Login Methods
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage how you sign in to Coach Watts.
            </p>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-zinc-500"
              >Internal Athlete ID</span
            >
            <div class="flex items-center gap-2">
              <code
                class="text-xs font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded"
                >{{ modelValue.id }}</code
              >
              <UButton
                icon="i-heroicons-clipboard"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="copyUserId"
              />
            </div>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div
          v-for="method in loginMethods"
          :key="method.id"
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden"
            >
              <img
                v-if="method.id === 'intervals'"
                src="/images/logos/intervals.png"
                alt="Intervals.icu Logo"
                class="w-full h-full object-cover"
              />
              <UIcon v-else :name="method.icon" class="w-6 h-6" :class="method.iconClass" />
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">{{ method.name }}</p>
              <div v-if="method.isConnected" class="flex flex-col">
                <p class="text-xs text-green-500 font-medium">
                  Connected
                  <span v-if="method.linkedAt" class="text-gray-500 dark:text-gray-400 font-normal">
                    on {{ formatDateUTC(method.linkedAt, 'PPP') }}
                  </span>
                </p>
                <p v-if="method.profileId" class="text-[10px] font-mono text-zinc-500 mt-0.5">
                  ID: {{ method.profileId }}
                </p>
              </div>
              <p v-else-if="method.isIntegrated" class="flex flex-col">
                <span class="text-xs text-amber-500 font-medium">Linked for data sync</span>
                <span v-if="method.profileId" class="text-[10px] font-mono text-zinc-500 mt-0.5"
                  >ID: {{ method.profileId }}</span
                >
              </p>
              <p v-else class="text-xs text-gray-500 dark:text-gray-400">Not connected</p>
            </div>
          </div>

          <div class="flex flex-col items-end gap-2">
            <UButton
              v-if="!method.isConnected"
              color="neutral"
              variant="outline"
              size="sm"
              @click="linkAccount(method.id)"
            >
              {{ method.isIntegrated ? 'Link for Login' : 'Link Account' }}
            </UButton>
            <UBadge v-else color="success" variant="subtle" size="sm"> Active </UBadge>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Save Button -->
    <div class="flex justify-end pt-4">
      <UButton
        label="Save Profile Settings"
        color="primary"
        size="lg"
        :loading="loading"
        @click="saveProfile"
      />
    </div>

    <!-- Autodetect Confirmation Modal -->
    <UModal
      v-model:open="showConfirmModal"
      title="Confirm Profile Updates"
      description="We found differences between your current profile and your connected apps. Review the changes below:"
    >
      <template #body>
        <ul
          class="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md"
        >
          <li v-for="(value, key) in pendingDiffs" :key="key" class="p-3 text-sm">
            <div
              class="flex items-center justify-between"
              :class="{ 'mb-2': key === 'sportSettings' }"
            >
              <span class="font-medium text-gray-700 dark:text-gray-200 capitalize">
                {{ formatFieldName(key) }}
              </span>
              <div v-if="key !== 'sportSettings'" class="flex items-center gap-3">
                <div class="text-right">
                  <span class="block text-xs text-gray-500 line-through mr-2">
                    {{ formatValue(key, modelValue[key]) }}
                  </span>
                </div>
                <div class="text-right font-semibold text-primary">
                  {{ formatValue(key, value) }}
                </div>
              </div>
            </div>

            <div v-if="key === 'sportSettings' && Array.isArray(value)" class="pl-4 space-y-2">
              <div
                v-for="sport in value"
                :key="sport.externalId"
                class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
              >
                <UIcon :name="getSportIcon(sport.types)" class="w-3 h-3" />
                <span class="font-medium text-gray-700 dark:text-gray-300">{{
                  sport.types.join(', ')
                }}</span>
                <span v-if="sport.ftp" class="ml-auto">{{ sport.ftp }}W</span>
                <span v-if="sport.lthr" :class="{ 'ml-auto': !sport.ftp }"
                  >{{ sport.lthr }}bpm</span
                >
              </div>
            </div>
          </li>
        </ul>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showConfirmModal = false"
            >Cancel</UButton
          >
          <UButton color="primary" @click="confirmAutodetect">Apply Changes</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  import { countries } from '~/utils/countries'
  import { cmToFtIn, ftInToCm, LBS_TO_KG } from '~/utils/metrics'

  const props = defineProps<{
    modelValue: any
    email: string
    loading?: boolean
  }>()

  const emit = defineEmits(['update:modelValue', 'autodetect', 'navigate'])
  const { formatDateUTC } = useFormat()
  const { signIn } = useAuth()

  const localProfile = ref({ ...props.modelValue })

  const loginMethods = computed(() => {
    const accounts = props.modelValue?.accounts || []
    const integrations = props.modelValue?.integrations || []

    return [
      {
        id: 'google',
        name: 'Google',
        icon: 'i-simple-icons-google',
        iconClass: 'text-gray-900 dark:text-white',
        isConnected: accounts.some((a: any) => a.provider === 'google'),
        isIntegrated: false, // Google is login-only for now
        linkedAt: accounts.find((a: any) => a.provider === 'google')?.createdAt,
        profileId: accounts.find((a: any) => a.provider === 'google')?.providerAccountId
      },
      {
        id: 'strava',
        name: 'Strava',
        icon: 'i-simple-icons-strava',
        iconClass: 'text-[#FC4C02]',
        isConnected: accounts.some((a: any) => a.provider === 'strava'),
        isIntegrated: integrations.some((i: any) => i.provider === 'strava'),
        linkedAt: accounts.find((a: any) => a.provider === 'strava')?.createdAt,
        profileId:
          accounts.find((a: any) => a.provider === 'strava')?.providerAccountId ||
          integrations.find((i: any) => i.provider === 'strava')?.externalUserId
      },
      {
        id: 'intervals',
        name: 'Intervals.icu',
        icon: 'i-heroicons-calendar-days',
        iconClass: 'text-primary',
        isConnected: accounts.some((a: any) => a.provider === 'intervals'),
        isIntegrated: integrations.some((i: any) => i.provider === 'intervals'),
        linkedAt: accounts.find((a: any) => a.provider === 'intervals')?.createdAt,
        profileId:
          accounts.find((a: any) => a.provider === 'intervals')?.providerAccountId ||
          integrations.find((i: any) => i.provider === 'intervals')?.externalUserId
      }
    ]
  })

  function copyUserId() {
    if (import.meta.client) {
      navigator.clipboard.writeText(props.modelValue.id)
      toast.add({
        title: 'Copied',
        description: 'Internal Athlete ID copied to clipboard.',
        color: 'success'
      })
    }
  }

  function linkAccount(provider: string) {
    signIn(provider, { callbackUrl: window.location.href })
  }

  // Initialize weight for display based on units
  if (localProfile.value.weight && localProfile.value.weightUnits === 'Pounds') {
    localProfile.value.weight = Number((localProfile.value.weight / LBS_TO_KG).toFixed(1))
  }

  // Imperial Height state
  const heightFt = ref(0)
  const heightIn = ref(0)

  function initializeHeightInputs() {
    if (localProfile.value.height && localProfile.value.heightUnits === 'ft/in') {
      const { ft, in: inches } = cmToFtIn(localProfile.value.height)
      heightFt.value = ft
      heightIn.value = inches
    }
  }

  function syncHeightFromFtIn() {
    localProfile.value.height = ftInToCm(heightFt.value || 0, heightIn.value || 0)
  }

  function handleHeightUnitChange(newUnits: string) {
    if (newUnits === 'ft/in') {
      initializeHeightInputs()
    }
  }

  // Handle weight unit conversion when user switches units manually
  watch(
    () => localProfile.value.weightUnits,
    (newUnits, oldUnits) => {
      if (!localProfile.value.weight || newUnits === oldUnits) return

      if (newUnits === 'Pounds' && oldUnits === 'Kilograms') {
        localProfile.value.weight = Number((localProfile.value.weight / LBS_TO_KG).toFixed(1))
      } else if (newUnits === 'Kilograms' && oldUnits === 'Pounds') {
        localProfile.value.weight = Number((localProfile.value.weight * LBS_TO_KG).toFixed(1))
      }
    }
  )

  const toDateInputValue = (date: string | Date | null | undefined) => {
    if (!date) return ''
    return formatDateUTC(date, 'yyyy-MM-dd')
  }

  const dobValue = ref(toDateInputValue(props.modelValue.dob))
  const effectiveWeightLabel = computed(() => localProfile.value.effectiveWeightSource?.label || '')
  const effectiveWeightDate = computed(() => {
    const value = localProfile.value.effectiveWeightSource?.date
    return value ? formatDateUTC(value, 'yyyy-MM-dd') : ''
  })
  const formattedEffectiveWeight = computed(() => {
    const effectiveWeight = localProfile.value.effectiveWeight
    if (!effectiveWeight) return 'Not set'

    if (localProfile.value.weightUnits === 'Pounds') {
      return `${(effectiveWeight / LBS_TO_KG).toFixed(1)} lbs`
    }

    return `${effectiveWeight.toFixed(1)} kg`
  })

  watch(
    () => props.modelValue,
    (newVal) => {
      localProfile.value = { ...newVal }
      dobValue.value = toDateInputValue(newVal.dob)
      initializeHeightInputs()
    },
    { deep: true }
  )

  const timezones = Intl.supportedValuesOf('timeZone')
  const autodetecting = ref(false)
  const toast = useToast()

  const countryModel = computed({
    get: () => countriesWithLabel.value.find((c) => c.code === localProfile.value.country),
    set: (val: any) => {
      localProfile.value.country = val?.code
    }
  })

  const countriesWithLabel = computed(() =>
    countries.map((c) => ({
      ...c,
      label: `${c.flag} ${c.name}`
    }))
  )

  const showConfirmModal = ref(false)
  const pendingDiffs = ref<any>({})
  const pendingDetectedProfile = ref<any>({})

  function getSportIcon(types: string[]) {
    if (types.includes('Run') || types.includes('VirtualRun')) return 'i-lucide-footprints'
    if (types.includes('Ride') || types.includes('VirtualRide')) return 'i-lucide-bike'
    if (types.includes('Swim')) return 'i-lucide-waves'
    return 'i-lucide-award'
  }

  async function autodetectProfile() {
    autodetecting.value = true
    try {
      const response: any = await $fetch('/api/profile/autodetect', {
        method: 'POST'
      })

      if (response.success && response.diff && Object.keys(response.diff).length > 0) {
        const { restingHr, ftp, maxHr, lthr, ...otherDiffs } = response.diff
        pendingDiffs.value = otherDiffs

        const { restingHr: _r, ftp: _f, maxHr: _m, lthr: _l, ...otherDetected } = response.detected
        pendingDetectedProfile.value = otherDetected

        if (Object.keys(pendingDiffs.value).length > 0) {
          showConfirmModal.value = true
        } else {
          toast.add({
            title: 'No Updates Found',
            description: 'Your profile is already in sync with connected apps.',
            color: 'neutral'
          })
        }
      } else {
        toast.add({
          title: 'No Updates Found',
          description: response.message || 'Your profile is already in sync with connected apps.',
          color: 'neutral'
        })
      }
    } catch (error: any) {
      toast.add({
        title: 'Autodetect Failed',
        description: error.message || 'Failed to sync with apps.',
        color: 'error'
      })
    } finally {
      autodetecting.value = false
    }
  }

  function confirmAutodetect() {
    Object.assign(localProfile.value, pendingDiffs.value)
    if (pendingDiffs.value.dob) {
      dobValue.value = toDateInputValue(pendingDiffs.value.dob)
    }
    emit('autodetect', pendingDetectedProfile.value)
    showConfirmModal.value = false
  }

  function formatFieldName(key: string | number) {
    const k = String(key)
    if (k === 'hrZones') return 'Heart Rate Zones'
    if (k === 'powerZones') return 'Power Zones'
    if (k === 'sportSettings') return 'Sport Specific Settings'
    return k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1')
  }

  function formatValue(key: string | number, value: any) {
    if (value === null || value === undefined) return 'Not set'
    if (key === 'hrZones' || key === 'powerZones') {
      return `${(value as any[]).length} zones`
    }
    if (key === 'sportSettings') {
      const types = (value as any[]).flatMap((s) => s.types).filter(Boolean)
      const uniqueTypes = [...new Set(types)].slice(0, 3)
      const remainder = types.length - uniqueTypes.length

      let label = uniqueTypes.join(', ')
      if (remainder > 0) label += ` +${remainder} more`

      return `${(value as any[]).length} sports (${label})`
    }
    return value
  }

  function saveProfile() {
    emit('update:modelValue', { ...localProfile.value })
  }
</script>

<style scoped>
  .animate-fade-in {
    animation: fadeIn 0.2s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
