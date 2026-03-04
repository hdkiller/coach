import { prisma } from '../db'
import { bodyMeasurementRepository } from '../repositories/bodyMeasurementRepository'

type WeightSourceInfo = {
  type: 'profile' | 'wellness'
  source: string
  label: string
  date: string | null
}

type ResolverUser = {
  weight?: number | null
  weightSourceMode?: string | null
  weightUnits?: string | null
  dashboardSettings?: any
}

function normalizeSourceKey(source: string | null | undefined) {
  if (!source) return 'unknown'
  if (source === 'profile_manual' || source === 'profile_locked') return 'profile'
  if (source === 'manual_measurement' || source === 'manual' || source === 'manual_edit')
    return 'manual'
  if (source.startsWith('oauth:')) return 'oauth'
  return source
}

function buildSourceLabel(source: string) {
  if (normalizeSourceKey(source) === 'profile') return 'Profile'
  if (normalizeSourceKey(source) === 'manual') return 'Manual'
  if (source === 'manual' || source === 'manual_edit') return 'Manual wellness'
  if (source.startsWith('oauth:')) return 'Connected app'

  return source
    .split(/[:_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getPreferredSourceForMetric(user: ResolverUser | null | undefined, metricKey: string) {
  return user?.dashboardSettings?.bodyMetrics?.preferredSources?.[metricKey] || null
}

async function loadResolverUser(userId: string, userOverride?: ResolverUser) {
  if (userOverride?.dashboardSettings !== undefined) return userOverride

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      weight: true,
      weightSourceMode: true,
      weightUnits: true,
      dashboardSettings: true
    }
  })

  return {
    weight: userOverride?.weight ?? user?.weight,
    weightSourceMode: userOverride?.weightSourceMode ?? user?.weightSourceMode,
    weightUnits: userOverride?.weightUnits ?? user?.weightUnits,
    dashboardSettings: user?.dashboardSettings
  }
}

async function getPreferredMeasurementEntry(
  userId: string,
  metricKey: string,
  preferredSource: string
) {
  const entries = await prisma.bodyMeasurementEntry.findMany({
    where: {
      userId,
      metricKey,
      isDeleted: false
    },
    orderBy: { recordedAt: 'desc' }
  })

  return entries.find((entry) => normalizeSourceKey(entry.source) === preferredSource) || null
}

export const bodyMetricResolver = {
  async resolveEffectiveWeight(userId: string, userOverride?: ResolverUser) {
    const user = await loadResolverUser(userId, userOverride)
    const preferredSource = getPreferredSourceForMetric(user, 'weight')

    const preferredWeightEntry =
      preferredSource && preferredSource !== 'profile'
        ? await getPreferredMeasurementEntry(userId, 'weight', preferredSource)
        : null
    const latestWeightEntry = await bodyMeasurementRepository.getLatestForMetric(userId, 'weight')
    const latestWellnessWeight = latestWeightEntry
      ? {
          weight: latestWeightEntry.value,
          date: latestWeightEntry.recordedAt,
          lastSource: latestWeightEntry.source
        }
      : null

    let value = user?.weight ?? null
    let source: WeightSourceInfo = {
      type: 'profile',
      source: 'profile_manual',
      label: 'Profile',
      date: null
    }

    if (user?.weightSourceMode === 'PROFILE_LOCK' && user?.weight != null) {
      value = user.weight
      source = {
        type: 'profile',
        source: 'profile_locked',
        label: 'Profile',
        date: null
      }
    } else if (preferredSource === 'profile' && user?.weight != null) {
      value = user.weight
      source = {
        type: 'profile',
        source: 'profile_manual',
        label: 'Profile',
        date: null
      }
    } else if (preferredWeightEntry) {
      value = preferredWeightEntry.value
      source = {
        type: 'wellness',
        source: preferredWeightEntry.source,
        label: buildSourceLabel(preferredWeightEntry.source),
        date: preferredWeightEntry.recordedAt.toISOString()
      }
    } else if (latestWellnessWeight?.weight != null) {
      value = latestWellnessWeight.weight
      source = {
        type: 'wellness',
        source: latestWellnessWeight.lastSource || 'wellness',
        label: buildSourceLabel(latestWellnessWeight.lastSource || 'wellness'),
        date: latestWellnessWeight.date.toISOString()
      }
    } else if (user?.weight != null) {
      value = user.weight
      source = {
        type: 'profile',
        source: 'profile_manual',
        label: 'Profile',
        date: null
      }
    }

    return {
      value,
      source,
      latestWellnessWeight: latestWellnessWeight?.weight ?? null,
      latestWellnessWeightDate: latestWellnessWeight?.date.toISOString() ?? null,
      profileWeight: user?.weight ?? null,
      weightSourceMode: user?.weightSourceMode || 'AUTO',
      preferredSource
    }
  },

  async resolveLatestMeasurement(userId: string, metricKey: string, userOverride?: ResolverUser) {
    const user = await loadResolverUser(userId, userOverride)
    const preferredSource = getPreferredSourceForMetric(user, metricKey)
    const entry =
      preferredSource && preferredSource !== 'profile'
        ? await getPreferredMeasurementEntry(userId, metricKey, preferredSource)
        : await bodyMeasurementRepository.getLatestForMetric(userId, metricKey)

    if (!entry) return null

    return {
      value: entry.value,
      unit: entry.unit,
      source: entry.source,
      preferredSource,
      sourceLabel: buildSourceLabel(entry.source),
      date: entry.recordedAt.toISOString(),
      entry
    }
  }
}
