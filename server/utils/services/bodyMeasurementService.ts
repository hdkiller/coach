import { prisma } from '../db'
import { LBS_TO_KG, roundToTwoDecimals } from '../number'

type BodyMeasurementInput = {
  userId: string
  recordedAt: Date
  metricKey: string
  value: number
  unit: string
  displayName?: string | null
  source: string
  sourceRefType?: string | null
  sourceRefId?: string | null
  notes?: string | null
}

const CM_PER_INCH = 2.54

function normalizeUnit(unit: string) {
  return unit.trim().toLowerCase()
}

function normalizeMetricUnit(value: number, unit: string) {
  const normalizedUnit = normalizeUnit(unit)

  if (['kg', 'kilogram', 'kilograms'].includes(normalizedUnit)) {
    return { value: roundToTwoDecimals(value), unit: 'kg' }
  }

  if (['lb', 'lbs', 'pound', 'pounds'].includes(normalizedUnit)) {
    return { value: roundToTwoDecimals(value * LBS_TO_KG), unit: 'kg' }
  }

  if (['cm', 'centimeter', 'centimeters'].includes(normalizedUnit)) {
    return { value: roundToTwoDecimals(value), unit: 'cm' }
  }

  if (['in', 'inch', 'inches'].includes(normalizedUnit)) {
    return { value: roundToTwoDecimals(value * CM_PER_INCH), unit: 'cm' }
  }

  if (['pct', '%', 'percent', 'percentage'].includes(normalizedUnit)) {
    return { value: roundToTwoDecimals(value), unit: 'pct' }
  }

  throw new Error(`Unsupported measurement unit: ${unit}`)
}

function buildReferenceWhere(input: BodyMeasurementInput) {
  if (!input.sourceRefType || !input.sourceRefId) return null

  return {
    userId: input.userId,
    metricKey: input.metricKey,
    source: input.source,
    sourceRefType: input.sourceRefType,
    sourceRefId: input.sourceRefId
  }
}

export const bodyMeasurementService = {
  normalizeMetricUnit,

  async recordEntry(input: BodyMeasurementInput) {
    const normalized = normalizeMetricUnit(input.value, input.unit)
    const referenceWhere = buildReferenceWhere(input)

    if (referenceWhere) {
      const existing = await prisma.bodyMeasurementEntry.findFirst({
        where: referenceWhere
      })

      if (existing) {
        return prisma.bodyMeasurementEntry.update({
          where: { id: existing.id },
          data: {
            recordedAt: input.recordedAt,
            value: normalized.value,
            unit: normalized.unit,
            displayName: input.displayName ?? existing.displayName,
            notes: input.notes ?? existing.notes,
            isDeleted: false
          }
        })
      }
    }

    return prisma.bodyMeasurementEntry.create({
      data: {
        userId: input.userId,
        recordedAt: input.recordedAt,
        metricKey: input.metricKey,
        displayName: input.displayName ?? null,
        value: normalized.value,
        unit: normalized.unit,
        source: input.source,
        sourceRefType: input.sourceRefType ?? null,
        sourceRefId: input.sourceRefId ?? null,
        notes: input.notes ?? null
      }
    })
  },

  async recordProfileMetrics(
    userId: string,
    metrics: {
      weight?: number | null
      height?: number | null
    },
    recordedAt: Date = new Date()
  ) {
    const writes: Promise<unknown>[] = []

    if (metrics.weight != null) {
      writes.push(
        this.recordEntry({
          userId,
          recordedAt,
          metricKey: 'weight',
          value: metrics.weight,
          unit: 'kg',
          source: 'profile_manual'
        })
      )
    }

    if (metrics.height != null) {
      writes.push(
        this.recordEntry({
          userId,
          recordedAt,
          metricKey: 'height',
          value: metrics.height,
          unit: 'cm',
          source: 'profile_manual'
        })
      )
    }

    await Promise.all(writes)
  },

  async recordWellnessMetrics(
    userId: string,
    wellness: {
      id: string
      date: Date
      weight?: number | null
      bodyFat?: number | null
    },
    source: string
  ) {
    const recordedAt = wellness.date
    const writes: Promise<unknown>[] = []

    if (wellness.weight != null) {
      writes.push(
        this.recordEntry({
          userId,
          recordedAt,
          metricKey: 'weight',
          value: wellness.weight,
          unit: 'kg',
          source,
          sourceRefType: 'wellness',
          sourceRefId: wellness.id
        })
      )
    }

    if (wellness.bodyFat != null) {
      writes.push(
        this.recordEntry({
          userId,
          recordedAt,
          metricKey: 'body_fat_pct',
          value: wellness.bodyFat,
          unit: 'pct',
          source,
          sourceRefType: 'wellness',
          sourceRefId: wellness.id
        })
      )
    }

    await Promise.all(writes)
  }
}
