export type OnboardingStepId =
  'account_ready' | 'connect_data' | 'import_data' | 'analysis' | 'first_value'

/** Mobile activation wizard step (UX order; connect last). */
export type MobileActivationStepId = 'consent' | 'goal' | 'plan' | 'insight' | 'connect' | 'done'

export type OnboardingStepStatus = 'complete' | 'active' | 'pending' | 'failed'

export type ImportState = 'idle' | 'importing' | 'ready' | 'empty' | 'failed'

export type SignupMethod = 'google' | 'strava' | 'intervals' | 'unknown'

export interface OnboardingStep {
  id: OnboardingStepId
  status: OnboardingStepStatus
}

export interface OnboardingStatus {
  signupMethod: SignupMethod
  currentStep: OnboardingStepId
  steps: OnboardingStep[]
  importState: ImportState
  connectedProviders: string[]
  hasIntegration: boolean
  hasAnyData: boolean
  hasUsableData: boolean
  hasFirstInsight: boolean
  activationComplete: boolean
  showFullSetupHub: boolean
  showCompactSetupCard: boolean
  primaryProvider: string | null
  workoutCount: number
  wellnessCount: number
  nutritionCount: number
  importErrorMessage: string | null
  /** Legal + health consent accepted */
  hasConsent: boolean
  /** At least one non-archived goal */
  hasPrimaryGoal: boolean
  /** Active (non-template) training plan */
  hasActivePlan: boolean
  /**
   * Soft-activated: consent + goal + plan + insight (first value).
   * May enter companion tabs before data connects.
   */
  softActivated: boolean
  /**
   * Fully activated: soft + usable training/wellness data.
   */
  fullyActivated: boolean
  /** Next mobile wizard step (consent → … → connect → done) */
  mobileActivationStep: MobileActivationStepId
  primaryGoalId: string | null
  activePlanId: string | null
}

export const ONBOARDING_STEP_ORDER: OnboardingStepId[] = [
  'account_ready',
  'connect_data',
  'import_data',
  'analysis',
  'first_value'
]

const TRAINING_SIGNUP_PROVIDERS = new Set(['google', 'strava', 'intervals'])

export function deriveSignupMethod(accountProviders: string[]): SignupMethod {
  const signupAccount = accountProviders.find((provider) => TRAINING_SIGNUP_PROVIDERS.has(provider))
  if (signupAccount === 'google' || signupAccount === 'strava' || signupAccount === 'intervals') {
    return signupAccount
  }
  return 'unknown'
}

export function buildOnboardingSteps(input: {
  hasIntegration: boolean
  hasUsableData: boolean
  hasFirstInsight: boolean
  activationComplete: boolean
  importState: ImportState
}): OnboardingStep[] {
  const connectComplete = input.hasIntegration || input.hasUsableData
  const importComplete =
    input.importState === 'ready' || input.hasUsableData || input.importState === 'empty'
  const analysisComplete = input.hasUsableData && input.hasFirstInsight
  const firstValueComplete = input.activationComplete

  const statuses: Record<OnboardingStepId, OnboardingStepStatus> = {
    account_ready: 'complete',
    connect_data: connectComplete ? 'complete' : 'active',
    import_data: !connectComplete
      ? 'pending'
      : input.importState === 'failed'
        ? 'failed'
        : importComplete
          ? 'complete'
          : 'active',
    analysis: !importComplete
      ? 'pending'
      : analysisComplete
        ? 'complete'
        : input.hasUsableData
          ? 'active'
          : 'pending',
    first_value: firstValueComplete ? 'complete' : analysisComplete ? 'active' : 'pending'
  }

  if (input.activationComplete) {
    for (const stepId of ONBOARDING_STEP_ORDER) {
      statuses[stepId] = 'complete'
    }
  }

  return ONBOARDING_STEP_ORDER.map((id) => ({ id, status: statuses[id] }))
}

export function deriveCurrentStep(steps: OnboardingStep[]): OnboardingStepId {
  return (
    steps.find((step) => step.status === 'active' || step.status === 'failed')?.id ?? 'first_value'
  )
}

export function resolveOnboardingPresentation(input: {
  activationComplete: boolean
  hasIntegration: boolean
  hasAnyData: boolean
  connectLater: boolean
}): Pick<OnboardingStatus, 'showFullSetupHub' | 'showCompactSetupCard' | 'activationComplete'> {
  if (input.activationComplete) {
    return {
      activationComplete: true,
      showFullSetupHub: false,
      showCompactSetupCard: false
    }
  }

  const showFullSetupHub = !input.hasIntegration && !input.hasAnyData && !input.connectLater
  const showCompactSetupCard = !showFullSetupHub

  return {
    activationComplete: false,
    showFullSetupHub,
    showCompactSetupCard
  }
}

export function deriveMobileActivation(input: {
  hasConsent: boolean
  hasPrimaryGoal: boolean
  hasActivePlan: boolean
  hasFirstInsight: boolean
  activationComplete: boolean
  hasUsableData: boolean
  hasIntegration: boolean
  connectLater: boolean
}): Pick<OnboardingStatus, 'softActivated' | 'fullyActivated' | 'mobileActivationStep'> {
  // Existing companion athletes with data: do not force the new goal/plan wizard.
  if (input.hasConsent && input.hasUsableData) {
    return {
      softActivated: true,
      fullyActivated: true,
      mobileActivationStep: 'done'
    }
  }

  const insightDone = input.hasFirstInsight || input.activationComplete
  const softActivated =
    input.hasConsent && input.hasPrimaryGoal && input.hasActivePlan && insightDone
  const fullyActivated = softActivated && input.hasUsableData

  let mobileActivationStep: MobileActivationStepId
  if (!input.hasConsent) {
    mobileActivationStep = 'consent'
  } else if (!input.hasPrimaryGoal) {
    mobileActivationStep = 'goal'
  } else if (!input.hasActivePlan) {
    mobileActivationStep = 'plan'
  } else if (!insightDone) {
    mobileActivationStep = 'insight'
  } else if (!fullyActivated && !input.connectLater) {
    mobileActivationStep = 'connect'
  } else {
    mobileActivationStep = 'done'
  }

  return { softActivated, fullyActivated, mobileActivationStep }
}
