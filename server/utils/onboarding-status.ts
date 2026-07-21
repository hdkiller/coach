import {
  buildOnboardingSteps,
  deriveCurrentStep,
  deriveMobileActivation,
  deriveSignupMethod,
  resolveOnboardingPresentation,
  type ImportState,
  type OnboardingStatus
} from '../../shared/onboarding-status'
import { prisma } from './db'
import { activityRecommendationRepository } from './repositories/activityRecommendationRepository'
import { nutritionRepository } from './repositories/nutritionRepository'
import { wellnessRepository } from './repositories/wellnessRepository'
import { workoutRepository } from './repositories/workoutRepository'
import { getUserLocalDate, getUserTimezone } from './date'
import { getActiveOnboardingRestart, hasFirstValueViewedSinceRestart } from './onboarding-restart'

const DATA_PROVIDERS = new Set([
  'intervals',
  'strava',
  'whoop',
  'garmin',
  'wahoo',
  'polar',
  'fitbit',
  'oura',
  'withings',
  'yazio',
  'hevy',
  'liftosaur',
  'rouvy',
  'ultrahuman'
])

function deriveImportState(input: {
  hasIntegration: boolean
  hasUsableData: boolean
  failedProviders: string[]
  importingProviders: string[]
}): { importState: ImportState; importErrorMessage: string | null } {
  if (input.failedProviders.length > 0 && !input.hasUsableData) {
    return {
      importState: 'failed',
      importErrorMessage: `Sync failed for ${input.failedProviders.join(', ')}`
    }
  }

  if (!input.hasIntegration) {
    return { importState: 'idle', importErrorMessage: null }
  }

  if (input.hasUsableData) {
    return { importState: 'ready', importErrorMessage: null }
  }

  if (input.importingProviders.length > 0) {
    return { importState: 'importing', importErrorMessage: null }
  }

  return { importState: 'empty', importErrorMessage: null }
}

function derivePrimaryProvider(
  signupMethod: OnboardingStatus['signupMethod'],
  connectedProviders: string[]
): string | null {
  if (connectedProviders.length > 0) {
    return connectedProviders[0] ?? null
  }

  if (signupMethod === 'strava' || signupMethod === 'intervals') {
    return signupMethod
  }

  return 'intervals'
}

export async function resolveOnboardingStatus(
  userId: string,
  options: { connectLater?: boolean } = {}
): Promise<OnboardingStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentFitnessScore: true,
      termsAcceptedAt: true,
      healthConsentAcceptedAt: true,
      accounts: {
        select: { provider: true },
        orderBy: { createdAt: 'asc' }
      },
      integrations: {
        select: {
          provider: true,
          syncStatus: true,
          errorMessage: true
        }
      }
    }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const timezone = await getUserTimezone(userId)
  const today = getUserLocalDate(timezone)

  const [
    workoutCount,
    wellnessCount,
    nutritionCount,
    reportCount,
    todayRecommendation,
    restartLog,
    primaryGoal,
    activePlan
  ] = await Promise.all([
    workoutRepository.count(userId, { includeDuplicates: true }),
    wellnessRepository.count(userId),
    nutritionRepository.count(userId),
    prisma.report.count({
      where: {
        userId,
        status: 'COMPLETED'
      }
    }),
    activityRecommendationRepository.findToday(userId, today),
    getActiveOnboardingRestart(userId),
    prisma.goal.findFirst({
      where: {
        userId,
        status: { not: 'ARCHIVED' }
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      select: { id: true }
    }),
    prisma.trainingPlan.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        isTemplate: false
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true }
    })
  ])

  const activationComplete = await hasFirstValueViewedSinceRestart(userId, restartLog?.createdAt)

  const accountProviders = user.accounts.map((account) => account.provider)
  const signupMethod = deriveSignupMethod(accountProviders)

  const connectedProviders = user.integrations
    .map((integration) => integration.provider)
    .filter((provider) => DATA_PROVIDERS.has(provider))

  const hasIntegration = connectedProviders.length > 0
  const hasAnyData = workoutCount > 0 || wellnessCount > 0 || nutritionCount > 0
  const hasUsableData = workoutCount > 0 || wellnessCount > 0
  const hasFirstInsight = Boolean(
    todayRecommendation ||
    reportCount > 0 ||
    (user.currentFitnessScore !== null && user.currentFitnessScore !== undefined) ||
    activationComplete
  )

  const hasConsent = Boolean(user.termsAcceptedAt && user.healthConsentAcceptedAt)
  const hasPrimaryGoal = Boolean(primaryGoal)
  const hasActivePlan = Boolean(activePlan)

  const failedProviders = user.integrations
    .filter((integration) => integration.syncStatus === 'FAILED')
    .map((integration) => integration.provider)

  const importingProviders = user.integrations
    .filter(
      (integration) =>
        DATA_PROVIDERS.has(integration.provider) && integration.syncStatus === 'SYNCING'
    )
    .map((integration) => integration.provider)

  const { importState, importErrorMessage } = deriveImportState({
    hasIntegration,
    hasUsableData,
    failedProviders,
    importingProviders
  })

  const steps = buildOnboardingSteps({
    hasIntegration,
    hasUsableData,
    hasFirstInsight,
    activationComplete,
    importState
  })

  const currentStep = deriveCurrentStep(steps)
  const primaryProvider = derivePrimaryProvider(signupMethod, connectedProviders)

  let presentation = resolveOnboardingPresentation({
    activationComplete,
    hasIntegration,
    hasAnyData,
    connectLater: options.connectLater ?? false
  })

  if (restartLog && !activationComplete) {
    const restartMode = (restartLog.metadata as { mode?: string } | null)?.mode
    if (restartMode === 'full') {
      presentation = {
        activationComplete: false,
        showFullSetupHub: true,
        showCompactSetupCard: false
      }
    }
  }

  const mobile = deriveMobileActivation({
    hasConsent,
    hasPrimaryGoal,
    hasActivePlan,
    hasFirstInsight,
    activationComplete,
    hasUsableData,
    hasIntegration,
    connectLater: options.connectLater ?? false
  })

  return {
    signupMethod,
    currentStep,
    steps,
    importState,
    connectedProviders,
    hasIntegration,
    hasAnyData,
    hasUsableData,
    hasFirstInsight,
    activationComplete: presentation.activationComplete,
    showFullSetupHub: presentation.showFullSetupHub,
    showCompactSetupCard: presentation.showCompactSetupCard,
    primaryProvider,
    workoutCount,
    wellnessCount,
    nutritionCount,
    importErrorMessage,
    hasConsent,
    hasPrimaryGoal,
    hasActivePlan,
    softActivated: mobile.softActivated,
    fullyActivated: mobile.fullyActivated,
    mobileActivationStep: mobile.mobileActivationStep,
    primaryGoalId: primaryGoal?.id ?? null,
    activePlanId: activePlan?.id ?? null
  }
}
