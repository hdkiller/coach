<template>
  <div class="space-y-6">
    <!-- Training Data Management -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-warning" />
          <h2 class="text-xl font-semibold">{{ t('danger_schedule_header') }}</h2>
        </div>
      </template>

      <div class="space-y-4">
        <div>
          <h3 class="font-medium mb-1">{{ t('danger_schedule_clear_title') }}</h3>
          <p class="text-sm text-muted mb-3">
            {{ t('danger_schedule_clear_desc') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              color="warning"
              variant="soft"
              :loading="clearingSchedule"
              @click="isClearScheduleModalOpen = true"
            >
              {{ t('danger_button_clear_future') }}
            </UButton>
            <UButton
              color="warning"
              variant="soft"
              :loading="clearingPastSchedule"
              @click="isClearPastScheduleModalOpen = true"
            >
              {{ t('danger_button_clear_past') }}
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Athlete Profile Management -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-warning" />
          <h2 class="text-xl font-semibold">{{ t('danger_athlete_header') }}</h2>
        </div>
      </template>

      <div class="space-y-4">
        <div>
          <h3 class="font-medium mb-1">{{ t('danger_athlete_wipe_title') }}</h3>
          <p class="text-sm text-muted mb-3">
            {{ t('danger_athlete_wipe_desc') }}
          </p>
          <UButton
            color="warning"
            variant="soft"
            :loading="wipingProfiles"
            @click="isWipeProfilesModalOpen = true"
          >
            {{ t('danger_button_wipe_profiles') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- AI Analysis Management -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-warning" />
          <h2 class="text-xl font-semibold">{{ t('danger_ai_header') }}</h2>
        </div>
      </template>

      <div class="space-y-4">
        <div>
          <h3 class="font-medium mb-1">{{ t('danger_ai_wipe_title') }}</h3>
          <p class="text-sm text-muted mb-3">
            {{ t('danger_ai_wipe_desc') }}
          </p>
          <UButton
            color="warning"
            variant="soft"
            :loading="wipingAnalysis"
            @click="isWipeAnalysisModalOpen = true"
          >
            {{ t('danger_button_wipe_ai') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Imported Data Management (New) -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-circle-stack" class="w-5 h-5 text-warning" />
          <h2 class="text-xl font-semibold">{{ t('danger_imported_header') }}</h2>
        </div>
      </template>

      <div class="space-y-6">
        <div>
          <h3 class="font-medium mb-1">{{ t('danger_activities_wipe_title') }}</h3>
          <p class="text-sm text-muted mb-3">
            {{ t('danger_activities_wipe_desc') }}
          </p>
          <UButton
            color="warning"
            variant="soft"
            :loading="wipingSyncedActivities"
            @click="isWipeSyncedActivitiesModalOpen = true"
          >
            {{ t('danger_button_wipe_activities') }}
          </UButton>
        </div>

        <UDivider />

        <div>
          <h3 class="font-medium mb-1">{{ t('danger_wellness_wipe_title') }}</h3>
          <p class="text-sm text-muted mb-3">
            {{ t('danger_wellness_wipe_desc') }}
          </p>
          <UButton
            color="warning"
            variant="soft"
            :loading="wipingWellness"
            @click="isWipeWellnessModalOpen = true"
          >
            {{ t('danger_button_wipe_wellness') }}
          </UButton>
        </div>

        <UDivider />

        <div>
          <h3 class="font-medium mb-1">{{ t('danger_nutrition_wipe_title') }}</h3>
          <p class="text-sm text-muted mb-3">
            {{ t('danger_nutrition_wipe_desc') }}
          </p>
          <UButton
            color="warning"
            variant="soft"
            :loading="wipingNutrition"
            @click="isWipeNutritionModalOpen = true"
          >
            {{ t('danger_button_wipe_nutrition') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Account Deletion -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-error" />
          <h2 class="text-xl font-semibold text-error">{{ t('danger_account_header') }}</h2>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-muted">
          {{ t('danger_account_desc') }}
        </p>
        <p v-if="accountDeletionBlocked" class="text-sm text-warning">
          {{ accountDeletionBlockReason }}
        </p>
        <UButton
          color="error"
          variant="outline"
          :loading="deletingAccount"
          :disabled="accountDeletionBlocked"
          @click="openDeleteAccountModal"
        >
          {{ t('danger_button_delete_account') }}
        </UButton>
      </div>
    </UCard>

    <!-- Clear Schedule Confirmation Modal -->
    <UModal
      v-model:open="isClearScheduleModalOpen"
      :title="t('danger_modal_clear_future_title')"
      :description="t('danger_modal_clear_future_desc')"
    >
      <template #body>
        <p>
          {{ t('danger_modal_clear_future_body') }}
        </p>
      </template>

      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton color="neutral" variant="ghost" @click="isClearScheduleModalOpen = false">{{
            t('banner_exit')
          }}</UButton>
          <UButton color="warning" :loading="clearingSchedule" @click="executeClearSchedule">{{
            t('danger_button_clear_future')
          }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Clear Past Schedule Confirmation Modal -->
    <UModal
      v-model:open="isClearPastScheduleModalOpen"
      :title="t('danger_modal_clear_past_title')"
      :description="t('danger_modal_clear_past_desc')"
    >
      <template #body>
        <p>
          {{ t('danger_modal_clear_past_body') }}
        </p>
      </template>

      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton color="neutral" variant="ghost" @click="isClearPastScheduleModalOpen = false">{{
            t('banner_exit')
          }}</UButton>
          <UButton
            color="warning"
            :loading="clearingPastSchedule"
            @click="executeClearPastSchedule"
            >{{ t('danger_button_clear_past') }}</UButton
          >
        </div>
      </template>
    </UModal>

    <!-- Wipe Profiles Confirmation Modal -->
    <UModal
      v-model:open="isWipeProfilesModalOpen"
      :title="t('danger_modal_wipe_profiles_title')"
      :description="t('danger_modal_wipe_profiles_desc')"
    >
      <template #body>
        <p>
          {{ t('danger_modal_wipe_profiles_body') }}
        </p>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton color="neutral" variant="ghost" @click="isWipeProfilesModalOpen = false">{{
            t('banner_exit')
          }}</UButton>
          <UButton color="warning" :loading="wipingProfiles" @click="executeWipeProfiles">{{
            t('danger_button_wipe_profiles')
          }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Wipe AI Analysis Confirmation Modal -->
    <UModal
      v-model:open="isWipeAnalysisModalOpen"
      :title="t('danger_modal_wipe_ai_title')"
      :description="t('danger_modal_wipe_ai_desc')"
    >
      <template #body>
        <p>
          {{ t('danger_modal_wipe_ai_body') }}
        </p>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton color="neutral" variant="ghost" @click="isWipeAnalysisModalOpen = false">{{
            t('banner_exit')
          }}</UButton>
          <UButton color="warning" :loading="wipingAnalysis" @click="executeWipeAnalysis">{{
            t('danger_button_wipe_ai')
          }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Wipe Synced Activities Confirmation Modal -->
    <UModal
      v-model:open="isWipeSyncedActivitiesModalOpen"
      :title="t('danger_modal_wipe_activities_title')"
      :description="t('danger_modal_wipe_activities_desc')"
    >
      <template #body>
        <div class="space-y-2">
          <p class="text-error font-semibold">{{ t('danger_modal_warning_irreversible') }}</p>
          <p>
            {{ t('danger_modal_wipe_activities_body') }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="isWipeSyncedActivitiesModalOpen = false"
            >{{ t('banner_exit') }}</UButton
          >
          <UButton
            color="warning"
            :loading="wipingSyncedActivities"
            @click="executeWipeSyncedActivities"
            >{{ t('danger_button_wipe_activities') }}</UButton
          >
        </div>
      </template>
    </UModal>

    <!-- Wipe Wellness Confirmation Modal -->
    <UModal
      v-model:open="isWipeWellnessModalOpen"
      :title="t('danger_modal_wipe_wellness_title')"
      :description="t('danger_modal_wipe_wellness_desc')"
    >
      <template #body>
        <div class="space-y-2">
          <p class="text-error font-semibold">{{ t('danger_modal_warning_irreversible') }}</p>
          <p>
            {{ t('danger_modal_wipe_wellness_body') }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton color="neutral" variant="ghost" @click="isWipeWellnessModalOpen = false">{{
            t('banner_exit')
          }}</UButton>
          <UButton color="warning" :loading="wipingWellness" @click="executeWipeWellness">{{
            t('danger_button_wipe_wellness')
          }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Wipe Nutrition Confirmation Modal -->
    <UModal
      v-model:open="isWipeNutritionModalOpen"
      :title="t('danger_modal_wipe_nutrition_title')"
      :description="t('danger_modal_wipe_nutrition_desc')"
    >
      <template #body>
        <div class="space-y-2">
          <p class="text-error font-semibold">{{ t('danger_modal_warning_irreversible') }}</p>
          <p>
            {{ t('danger_modal_wipe_nutrition_body') }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton color="neutral" variant="ghost" @click="isWipeNutritionModalOpen = false">{{
            t('banner_exit')
          }}</UButton>
          <UButton color="warning" :loading="wipingNutrition" @click="executeWipeNutrition">{{
            t('danger_button_wipe_nutrition')
          }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Account Confirmation Modal -->
    <UModal
      v-model:open="isDeleteAccountModalOpen"
      :title="t('danger_modal_delete_account_title')"
      :description="t('danger_modal_delete_account_desc')"
    >
      <template #body>
        <p v-if="accountDeletionBlocked" class="text-warning font-semibold mb-2">
          {{ accountDeletionBlockReason }}
        </p>
        <template v-else>
          <p class="text-error font-semibold mb-2">{{ t('danger_modal_warning_irreversible') }}</p>
          <p>{{ t('danger_modal_delete_account_body') }}</p>
        </template>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton color="neutral" variant="ghost" @click="isDeleteAccountModalOpen = false">{{
            t('banner_exit')
          }}</UButton>
          <UButton
            color="error"
            :loading="deletingAccount"
            :disabled="accountDeletionBlocked"
            @click="executeDeleteAccount"
          >
            {{ t('danger_button_delete_account') }}</UButton
          >
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('settings')
  const toast = useToast()
  const { signOut } = useAuth()
  const coachingStore = useCoachingStore()
  const clearingSchedule = ref(false)
  const clearingPastSchedule = ref(false)
  const wipingProfiles = ref(false)
  const wipingAnalysis = ref(false)
  const wipingSyncedActivities = ref(false)
  const wipingWellness = ref(false)
  const wipingNutrition = ref(false)
  const deletingAccount = ref(false)
  const isClearScheduleModalOpen = ref(false)
  const isClearPastScheduleModalOpen = ref(false)
  const isWipeProfilesModalOpen = ref(false)
  const isWipeAnalysisModalOpen = ref(false)
  const isWipeSyncedActivitiesModalOpen = ref(false)
  const isWipeWellnessModalOpen = ref(false)
  const isWipeNutritionModalOpen = ref(false)
  const isDeleteAccountModalOpen = ref(false)
  const impersonationMeta = useCookie<{
    adminId: string
    adminEmail: string
    impersonatedUserId: string
    impersonatedUserEmail: string
  }>('auth.impersonation_meta')

  const accountDeletionBlockReason = computed(() => {
    if (impersonationMeta.value) {
      return t.value('danger_error_impersonating')
    }

    if (coachingStore.isCoachingMode) {
      return t.value('danger_error_coaching')
    }

    return null
  })

  const accountDeletionBlocked = computed(() => !!accountDeletionBlockReason.value)

  function openDeleteAccountModal() {
    if (accountDeletionBlocked.value) {
      toast.add({
        title: 'Account deletion unavailable',
        description:
          accountDeletionBlockReason.value || 'You cannot delete this account right now.',
        color: 'warning'
      })
      return
    }

    isDeleteAccountModalOpen.value = true
  }

  async function executeClearSchedule() {
    clearingSchedule.value = true
    try {
      const result: any = await $fetch('/api/plans/workouts/future', {
        method: 'DELETE'
      })

      toast.add({
        title: t.value('danger_toast_schedule_cleared_title'),
        description: t.value('danger_toast_schedule_cleared_desc', { count: result.count }),
        color: 'success'
      })
      isClearScheduleModalOpen.value = false
    } catch (error) {
      console.error('Failed to clear schedule', error)
      toast.add({
        title: 'Action Failed',
        description: 'Could not clear future workouts.',
        color: 'error'
      })
    } finally {
      clearingSchedule.value = false
    }
  }

  async function executeClearPastSchedule() {
    clearingPastSchedule.value = true
    try {
      const result: any = await $fetch('/api/plans/workouts/past', {
        method: 'DELETE'
      })

      toast.add({
        title: t.value('danger_toast_schedule_cleared_title'),
        description: t.value('danger_toast_schedule_cleared_desc', { count: result.count }),
        color: 'success'
      })
      isClearPastScheduleModalOpen.value = false
    } catch (error) {
      console.error('Failed to clear past schedule', error)
      toast.add({
        title: 'Action Failed',
        description: 'Could not clear past workouts.',
        color: 'error'
      })
    } finally {
      clearingPastSchedule.value = false
    }
  }

  async function executeWipeAnalysis() {
    wipingAnalysis.value = true
    try {
      const result: any = await $fetch('/api/profile/ai-analysis', {
        method: 'DELETE'
      })

      toast.add({
        title: t.value('danger_toast_ai_wiped_title'),
        description: t.value('danger_toast_ai_wiped_desc', {
          workouts: result.counts.workouts,
          recommendations: result.counts.recommendations
        }),
        color: 'success'
      })
      isWipeAnalysisModalOpen.value = false
    } catch (error) {
      console.error('Failed to wipe AI data', error)
      toast.add({
        title: 'Action Failed',
        description: 'Could not wipe AI analysis data.',
        color: 'error'
      })
    } finally {
      wipingAnalysis.value = false
    }
  }

  async function executeWipeProfiles() {
    wipingProfiles.value = true
    try {
      const result: any = await $fetch('/api/profile/athlete-profiles', {
        method: 'DELETE'
      })

      toast.add({
        title: t.value('danger_toast_profiles_wiped_title'),
        description: t.value('danger_toast_profiles_wiped_desc', { count: result.count }),
        color: 'success'
      })
      isWipeProfilesModalOpen.value = false
    } catch (error) {
      console.error('Failed to wipe profiles', error)
      toast.add({
        title: 'Action Failed',
        description: 'Could not wipe athlete profiles.',
        color: 'error'
      })
    } finally {
      wipingProfiles.value = false
    }
  }

  async function executeWipeSyncedActivities() {
    wipingSyncedActivities.value = true
    try {
      const result: any = await $fetch('/api/profile/synced-activities', {
        method: 'DELETE'
      })

      toast.add({
        title: t.value('danger_toast_activities_wiped_title'),
        description: t.value('danger_toast_activities_wiped_desc', {
          workouts: result.counts.workouts,
          fitFiles: result.counts.fitFiles
        }),
        color: 'success'
      })
      isWipeSyncedActivitiesModalOpen.value = false
    } catch (error) {
      console.error('Failed to wipe synced activities', error)
      toast.add({
        title: 'Action Failed',
        description: 'Could not wipe synced activities.',
        color: 'error'
      })
    } finally {
      wipingSyncedActivities.value = false
    }
  }

  async function executeWipeWellness() {
    wipingWellness.value = true
    try {
      const result: any = await $fetch('/api/profile/wellness', {
        method: 'DELETE'
      })

      toast.add({
        title: t.value('danger_toast_wellness_wiped_title'),
        description: t.value('danger_toast_wellness_wiped_desc', { count: result.counts.wellness }),
        color: 'success'
      })
      isWipeWellnessModalOpen.value = false
    } catch (error) {
      console.error('Failed to wipe wellness data', error)
      toast.add({
        title: 'Action Failed',
        description: 'Could not wipe wellness data.',
        color: 'error'
      })
    } finally {
      wipingWellness.value = false
    }
  }

  async function executeWipeNutrition() {
    wipingNutrition.value = true
    try {
      const result: any = await $fetch('/api/profile/nutrition', {
        method: 'DELETE'
      })

      toast.add({
        title: t.value('danger_toast_nutrition_wiped_title'),
        description: t.value('danger_toast_nutrition_wiped_desc', {
          nutrition: result.counts.nutrition,
          plans: result.counts.plans
        }),
        color: 'success'
      })
      isWipeNutritionModalOpen.value = false
    } catch (error) {
      console.error('Failed to wipe nutrition logs', error)
      toast.add({
        title: 'Action Failed',
        description: 'Could not wipe nutrition logs.',
        color: 'error'
      })
    } finally {
      wipingNutrition.value = false
    }
  }

  async function executeDeleteAccount() {
    if (accountDeletionBlocked.value) {
      toast.add({
        title: 'Account deletion unavailable',
        description:
          accountDeletionBlockReason.value || 'You cannot delete this account right now.',
        color: 'warning'
      })
      return
    }

    deletingAccount.value = true
    try {
      await $fetch('/api/profile', {
        method: 'DELETE'
      })

      toast.add({
        title: t.value('danger_toast_account_deleted_title'),
        description: t.value('danger_toast_account_deleted_desc'),
        color: 'success'
      })

      await signOut({ callbackUrl: '/login' })
    } catch (error) {
      console.error('Failed to delete account', error)
      toast.add({
        title: 'Action Failed',
        description: 'Could not delete account. Please try again.',
        color: 'error'
      })
      deletingAccount.value = false
    }
  }
</script>
