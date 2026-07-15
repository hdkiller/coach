import { useLocalStorage } from '@vueuse/core'
import type { OnboardingStatus } from '../../shared/onboarding-status'

const CONNECT_LATER_KEY = 'cw-onboarding-connect-later'

export function useOnboardingStatus() {
  const status = useState<OnboardingStatus | null>('onboarding-status', () => null)
  const isLoading = useState('onboarding-status-loading', () => false)
  const connectLater = useLocalStorage(CONNECT_LATER_KEY, false)

  async function refresh() {
    isLoading.value = true
    try {
      status.value = (await ($fetch as any)('/api/user/onboarding-status', {
        query: connectLater.value ? { connectLater: '1' } : undefined
      })) as OnboardingStatus
    } catch (error) {
      console.error('Failed to fetch onboarding status:', error)
    } finally {
      isLoading.value = false
    }
  }

  function deferConnection() {
    connectLater.value = true
    return refresh()
  }

  async function completeActivation(valueType = 'dashboard_insight') {
    await ($fetch as any)('/api/user/onboarding/complete', {
      method: 'POST',
      body: { valueType }
    })
    connectLater.value = false
    await refresh()
  }

  const activationComplete = computed(() => status.value?.activationComplete ?? false)
  const showFullSetupHub = computed(() => status.value?.showFullSetupHub ?? false)
  const showCompactSetupCard = computed(() => status.value?.showCompactSetupCard ?? false)
  const hasUsableData = computed(() => status.value?.hasUsableData ?? false)

  return {
    status,
    isLoading,
    connectLater,
    activationComplete,
    showFullSetupHub,
    showCompactSetupCard,
    hasUsableData,
    refresh,
    deferConnection,
    completeActivation
  }
}
