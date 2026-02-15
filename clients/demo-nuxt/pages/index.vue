<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
    <!-- Login Screen -->
    <div v-if="!user" class="min-h-screen flex flex-col items-center justify-center p-4">
      <UCard class="w-full max-w-md">
        <template #header>
          <div class="flex items-center gap-3 justify-center">
            <UIcon name="i-heroicons-bolt" class="w-10 h-10 text-primary" />
            <h1 class="text-2xl font-bold">Watts Connect</h1>
          </div>
        </template>

        <div class="py-8 space-y-6 text-center">
          <p class="text-gray-500 dark:text-gray-400 text-lg">
            Experience your training data in a whole new way.
          </p>

          <div class="space-y-3">
            <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <UIcon name="i-heroicons-check-circle" class="text-green-500 w-5 h-5" />
              <span class="text-sm font-medium">Access your athlete profile</span>
            </div>
            <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <UIcon name="i-heroicons-check-circle" class="text-green-500 w-5 h-5" />
              <span class="text-sm font-medium">Analyze recent workouts</span>
            </div>
            <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <UIcon name="i-heroicons-check-circle" class="text-green-500 w-5 h-5" />
              <span class="text-sm font-medium">Sync health metrics</span>
            </div>
          </div>

          <UButton
            block
            size="xl"
            color="primary"
            icon="i-heroicons-arrow-right-on-rectangle"
            class="font-bold mt-6"
            :loading="loading"
            @click="login"
          >
            Connect with Coach Watts
          </UButton>
        </div>

        <template #footer>
          <p class="text-xs text-center text-gray-400">
            Secure OAuth 2.0 connection. No passwords shared.
          </p>
        </template>
      </UCard>
    </div>

    <!-- Dashboard -->
    <div v-else class="pb-20">
      <!-- Navbar -->
      <div
        class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10"
      >
        <div class="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-bolt" class="w-6 h-6 text-primary" />
            <span class="font-bold text-lg hidden sm:block">Watts Connect</span>
          </div>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block">
                <p class="text-sm font-bold text-gray-900 dark:text-white">{{ user.name }}</p>
                <p class="text-xs text-gray-500">{{ user.email }}</p>
              </div>
              <UAvatar :src="user.picture" :alt="user.name" />
            </div>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-arrow-right-on-rectangle"
              @click="logout"
            />
          </div>
        </div>
      </div>

      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <!-- Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <UCard>
            <div class="text-center">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">FTP</p>
              <p class="text-3xl font-black text-primary">
                {{ user.ftp || '-' }} <span class="text-sm font-normal text-gray-500">W</span>
              </p>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Weight</p>
              <p class="text-3xl font-black text-primary">
                {{ user.weight || '-' }} <span class="text-sm font-normal text-gray-500">kg</span>
              </p>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">W/kg</p>
              <p class="text-3xl font-black text-primary">
                {{ wkg }} <span class="text-sm font-normal text-gray-500">W/kg</span>
              </p>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Total Activities
              </p>
              <p class="text-3xl font-black text-primary">{{ workouts.length || '-' }}</p>
            </div>
          </UCard>
        </div>

        <!-- Recent Activity -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Recent Activities</h2>
            <UButton
              icon="i-heroicons-arrow-path"
              color="gray"
              variant="ghost"
              :loading="loadingWorkouts"
              @click="fetchWorkouts"
            >
              Refresh
            </UButton>
          </div>

          <UCard :ui="{ body: { padding: 'p-0' } }">
            <div v-if="loadingWorkouts" class="p-8 space-y-4">
              <USkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
            </div>

            <div v-else-if="workouts.length === 0" class="p-12 text-center">
              <UIcon name="i-heroicons-calendar" class="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p class="text-gray-500">No workouts found.</p>
            </div>

            <UTable
              v-else
              :data="workouts"
              :columns="[
                { accessorKey: 'date', header: 'Date' },
                { accessorKey: 'title', header: 'Activity' },
                { accessorKey: 'metrics', header: 'Stats' },
                { accessorKey: 'overallScore', header: 'Score' }
              ]"
            >
              <template #date-cell="{ row }">
                <span class="text-sm font-medium text-gray-500">
                  {{ new Date(row.original.date).toLocaleDateString() }}
                </span>
              </template>

              <template #title-cell="{ row }">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary">
                    <UIcon :name="getActivityIcon(row.original.type)" class="w-5 h-5" />
                  </div>
                  <span class="font-bold text-gray-900 dark:text-white">{{
                    row.original.title
                  }}</span>
                </div>
              </template>

              <template #metrics-cell="{ row }">
                <div class="flex items-center gap-3 text-xs text-gray-500">
                  <span v-if="row.original.tss" class="flex items-center gap-1">
                    <UIcon name="i-heroicons-bolt" class="w-3 h-3" />
                    {{ Math.round(row.original.tss) }} TSS
                  </span>
                  <span v-if="row.original.durationSec" class="flex items-center gap-1">
                    <UIcon name="i-heroicons-clock" class="w-3 h-3" />
                    {{ Math.round(row.original.durationSec / 60) }}m
                  </span>
                </div>
              </template>

              <template #score-cell="{ row }">
                <UBadge
                  v-if="row.original.overallScore"
                  :color="getScoreColor(row.original.overallScore)"
                  variant="subtle"
                >
                  {{ row.original.overallScore }}/10
                </UBadge>
                <span v-else class="text-gray-400">-</span>
              </template>
            </UTable>
          </UCard>
        </div>

        <!-- Sync Simulator -->
        <div class="space-y-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Developer: Sync Simulator</h2>

          <div class="grid md:grid-cols-2 gap-6">
            <!-- Wellness Sync -->
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-heart" class="text-red-500" />
                  <span class="font-bold">Sync Wellness Data</span>
                </div>
              </template>
              <div class="space-y-4">
                <UFormField label="HRV (ms)">
                  <UInput v-model="wellnessForm.hrv" type="number" />
                </UFormField>
                <UFormField label="Weight (kg)">
                  <UInput v-model="wellnessForm.weight" type="number" step="0.1" />
                </UFormField>
                <UButton block color="neutral" :loading="syncingWellness" @click="syncWellness">
                  Sync to Coach Watts
                </UButton>

                <!-- Recent Wellness Items -->
                <div
                  v-if="wellnessHistory.length > 0"
                  class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2"
                >
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Recently Logged
                  </p>
                  <div
                    v-for="(h, i) in wellnessHistory"
                    :key="i"
                    class="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800/50 p-2 rounded"
                  >
                    <span class="font-medium text-gray-500">{{ h.timestamp }}</span>
                    <span class="font-bold text-primary">{{ h.hrv }}ms / {{ h.weight }}kg</span>
                  </div>
                </div>
              </div>
            </UCard>

            <!-- Nutrition Sync -->
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-shopping-cart" class="text-green-500" />
                  <span class="font-bold">Sync Nutrition Item</span>
                </div>
              </template>
              <div class="space-y-4">
                <UFormField label="Meal/Food Name">
                  <UInput v-model="nutritionForm.name" placeholder="e.g. Pasta Party" />
                </UFormField>
                <UFormField label="Carbs (g)">
                  <UInput v-model="nutritionForm.carbs" type="number" />
                </UFormField>
                <UButton block color="neutral" :loading="syncingNutrition" @click="syncNutrition">
                  Add to Timeline
                </UButton>

                <!-- Recent Nutrition Items -->
                <div
                  v-if="nutritionHistory.length > 0"
                  class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2"
                >
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Recently Logged
                  </p>
                  <div
                    v-for="(h, i) in nutritionHistory"
                    :key="i"
                    class="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800/50 p-2 rounded"
                  >
                    <div class="flex flex-col">
                      <span class="font-bold text-gray-900 dark:text-white">{{ h.name }}</span>
                      <span class="text-[10px] text-gray-400">{{ h.timestamp }}</span>
                    </div>
                    <span class="font-bold text-green-500">{{ h.carbs }}g carbs</span>
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <!-- FIT File Upload -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-cloud-arrow-up" class="text-primary" />
                <span class="font-bold">Upload FIT Activity</span>
              </div>
            </template>
            <div class="flex items-center gap-4">
              <input
                type="file"
                accept=".fit"
                class="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                @change="handleFileChange"
              />
              <UButton :disabled="!selectedFile" :loading="uploadingFit" @click="uploadFitFile">
                Upload File
              </UButton>
            </div>
          </UCard>
        </div>

        <!-- Developer Data -->
        <UAccordion
          color="gray"
          variant="ghost"
          :items="[
            {
              label: 'Developer: Raw Data Payload',
              icon: 'i-heroicons-code-bracket',
              slot: 'debug'
            }
          ]"
        >
          <template #debug>
            <div class="bg-gray-950 p-4 rounded-lg overflow-x-auto">
              <pre class="text-xs font-mono text-green-400">{{
                JSON.stringify({ user, latestWorkout: workouts[0] }, null, 2)
              }}</pre>
            </div>
          </template>
        </UAccordion>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const config = useRuntimeConfig()
  const toast = useToast()

  const loading = ref(false)
  const user = ref<any>(null)
  const accessToken = ref<string | null>(null)
  const workouts = ref<any[]>([])
  const loadingWorkouts = ref(false)

  // Sync Simulator State
  const syncingWellness = ref(false)
  const wellnessForm = ref({ hrv: 70, weight: 75 })

  const syncingNutrition = ref(false)
  const nutritionForm = ref({ name: '', carbs: 40 })

  const wellnessHistory = ref<any[]>([])
  const nutritionHistory = ref<any[]>([])

  const uploadingFit = ref(false)
  const selectedFile = ref<File | null>(null)

  const wkg = computed(() => {
    if (user.value?.ftp && user.value?.weight) {
      return (user.value.ftp / user.value.weight).toFixed(1)
    }
    return '-'
  })

  function login() {
    loading.value = true
    const url = new URL(`${config.public.coachWattsUrl}/api/oauth/authorize`)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', config.public.clientId)
    url.searchParams.set('redirect_uri', config.public.redirectUri)
    url.searchParams.set(
      'scope',
      'profile:read profile:write workout:read workout:write health:read health:write nutrition:read nutrition:write offline_access'
    )
    url.searchParams.set('state', Math.random().toString(36).substring(7))

    // PKCE could be added here for extra security (Client-side generation)

    window.location.href = url.toString()
  }

  function logout() {
    user.value = null
    accessToken.value = null
    localStorage.removeItem('cw_demo_token')
    toast.add({ title: 'Logged out' })
  }

  async function refreshUserInfo() {
    if (!accessToken.value) return

    try {
      const data: any = await $fetch(`${config.public.coachWattsUrl}/api/oauth/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })
      user.value = data
      fetchWorkouts()
    } catch (e: any) {
      console.error(e)
      toast.add({ title: 'Session Expired', description: 'Please login again.', color: 'error' })
      logout()
    }
  }

  async function fetchWorkouts() {
    if (!accessToken.value) return
    loadingWorkouts.value = true

    try {
      const data: any = await $fetch('/api/workouts', {
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })
      workouts.value = data || []
    } catch (e: any) {
      console.error('Failed to fetch workouts', e)
      toast.add({ title: 'Error', description: 'Failed to fetch workouts', color: 'error' })
    } finally {
      loadingWorkouts.value = false
    }
  }

  // --- Sync Simulator Methods ---

  async function syncWellness() {
    if (!accessToken.value) return
    syncingWellness.value = true
    const payload = {
      date: new Date().toISOString().split('T')[0],
      hrv: wellnessForm.value.hrv,
      weight: wellnessForm.value.weight
    }
    try {
      await $fetch('/api/proxy-sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: {
          type: 'wellness',
          payload
        }
      })
      wellnessHistory.value.unshift({ ...payload, timestamp: new Date().toLocaleTimeString() })
      toast.add({ title: 'Wellness Synced', color: 'green' })
      refreshUserInfo()
    } catch (e: any) {
      toast.add({ title: 'Sync Failed', description: e.data?.message, color: 'error' })
    } finally {
      syncingWellness.value = false
    }
  }

  async function syncNutrition() {
    if (!accessToken.value) return
    if (!nutritionForm.value.name) return
    syncingNutrition.value = true
    const item = {
      name: nutritionForm.value.name,
      carbs: nutritionForm.value.carbs,
      logged_at: new Date().toISOString()
    }
    try {
      await $fetch('/api/proxy-sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: {
          type: 'nutrition',
          payload: {
            date: new Date().toISOString().split('T')[0],
            items: [item]
          }
        }
      })
      nutritionHistory.value.unshift({ ...item, timestamp: new Date().toLocaleTimeString() })
      toast.add({ title: 'Nutrition Added', color: 'green' })
      nutritionForm.value.name = ''
    } catch (e: any) {
      toast.add({ title: 'Sync Failed', description: e.data?.message, color: 'error' })
    } finally {
      syncingNutrition.value = false
    }
  }

  function handleFileChange(event: any) {
    selectedFile.value = event.target.files[0]
  }

  async function uploadFitFile() {
    if (!accessToken.value || !selectedFile.value) return
    uploadingFit.value = true
    try {
      const formData = new FormData()
      formData.append('file', selectedFile.value)
      formData.append('metadata', JSON.stringify({ source: 'Demo App' }))

      await $fetch(`${config.public.coachWattsUrl}/api/workouts/upload-fit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: formData
      })

      toast.add({ title: 'File Uploaded', description: 'Processing started...', color: 'green' })
      selectedFile.value = null
      setTimeout(fetchWorkouts, 3000) // Polling fallback
    } catch (e: any) {
      toast.add({ title: 'Upload Failed', description: e.data?.message, color: 'error' })
    } finally {
      uploadingFit.value = false
    }
  }

  function getActivityIcon(type: string) {
    const map: Record<string, string> = {
      Ride: 'i-heroicons-bicycle',
      Run: 'i-heroicons-fire',
      WeightTraining: 'i-heroicons-trophy',
      Swim: 'i-heroicons-lifebuoy',
      Walk: 'i-heroicons-user'
    }
    return map[type] || 'i-heroicons-bolt'
  }

  function getScoreColor(score: number) {
    if (score >= 8) return 'green'
    if (score >= 5) return 'yellow'
    return 'red'
  }

  onMounted(() => {
    const saved = localStorage.getItem('cw_demo_token')
    if (saved) {
      accessToken.value = saved
      refreshUserInfo()
    }
  })
</script>
