import { prisma } from '../db'
import { toPrismaInputJsonValue } from '../prisma-json'

export type NormalizedStream = {
  id: string
  workoutId: string
  time: number[] | null
  distance: number[] | null
  velocity: number[] | null
  heartrate: number[] | null
  cadence: number[] | null
  watts: number[] | null
  altitude: number[] | null
  latlng: [number, number][] | null
  grade: number[] | null
  moving: boolean[] | null
  temp: number[] | null
  torque: number[] | null
  leftRightBalance: number[] | null
  hrv: number[] | null
  respiration: number[] | null
  targetPower: number[] | null
  avgPacePerKm: number | null
  paceVariability: number | null
  lapSplits: unknown
  paceZones: unknown
  pacingStrategy: unknown
  surges: unknown
  hrZoneTimes: unknown
  powerZoneTimes: unknown
  extrasMeta: unknown
  createdAt: Date
  updatedAt: Date
}

function normalizeV2(stream: any): NormalizedStream {
  const { lat, lng, ...rest } = stream
  const latlng: [number, number][] | null =
    Array.isArray(lat) && lat.length > 0
      ? (lat as number[]).map((latVal: number, i: number) => [latVal, (lng as number[])[i] ?? 0])
      : null
  return { ...rest, latlng }
}

function hasUsableStreamData(stream: NormalizedStream | null): stream is NormalizedStream {
  if (!stream) return false
  if (Array.isArray(stream.time) && stream.time.length > 0) return true
  if (Array.isArray(stream.heartrate) && stream.heartrate.length > 0) return true
  if (Array.isArray(stream.watts) && stream.watts.length > 0) return true
  if (Array.isArray(stream.velocity) && stream.velocity.length > 0) return true
  if (Array.isArray(stream.latlng) && stream.latlng.length > 0) return true
  if (stream.hrZoneTimes != null) return true
  if (stream.powerZoneTimes != null) return true
  return false
}

function toNormalizedFromV1(stream: any): NormalizedStream {
  return stream as NormalizedStream
}

export async function attachStreamToWorkout<T extends { id: string }>(
  workout: T
): Promise<T & { streams: NormalizedStream | null }> {
  const streams = await workoutStreamRepository.findByWorkoutId(workout.id)
  return { ...workout, streams }
}

export async function attachStreamsToWorkouts<T extends { id: string }>(
  workouts: T[]
): Promise<Array<T & { streams: NormalizedStream | null }>> {
  const streamMap = await workoutStreamRepository.findManyByWorkoutIds(workouts.map((w) => w.id))
  return workouts.map((workout) => ({
    ...workout,
    streams: streamMap.get(workout.id) ?? null
  }))
}

export const workoutStreamRepository = {
  async findByWorkoutId(workoutId: string): Promise<NormalizedStream | null> {
    const v2 = await (prisma as any).workoutStreamV2
      .findUnique({ where: { workoutId } })
      .catch(() => null)
    if (v2) {
      const normalized = normalizeV2(v2)
      if (hasUsableStreamData(normalized)) return normalized
    }

    const v1 = await prisma.workoutStream.findUnique({ where: { workoutId } }).catch(() => null)
    if (!v1) return null
    const normalized = toNormalizedFromV1(v1)
    return hasUsableStreamData(normalized) ? normalized : null
  },

  async existsByWorkoutId(workoutId: string): Promise<boolean> {
    const stream = await this.findByWorkoutId(workoutId)
    return stream !== null
  },

  async findManyByWorkoutIds(workoutIds: string[]): Promise<Map<string, NormalizedStream>> {
    const result = new Map<string, NormalizedStream>()
    if (workoutIds.length === 0) return result

    const v2Records: any[] = await (prisma as any).workoutStreamV2
      .findMany({ where: { workoutId: { in: workoutIds } } })
      .catch(() => [])

    const missingIds: string[] = []
    for (const r of v2Records) {
      const normalized = normalizeV2(r)
      if (hasUsableStreamData(normalized)) {
        result.set(r.workoutId, normalized)
      } else {
        missingIds.push(r.workoutId)
      }
    }

    const coveredIds = new Set(v2Records.map((r: any) => r.workoutId))
    for (const id of workoutIds) {
      if (!coveredIds.has(id)) missingIds.push(id)
    }

    if (missingIds.length > 0) {
      const v1Records = await prisma.workoutStream
        .findMany({ where: { workoutId: { in: missingIds } } })
        .catch(() => [])
      for (const r of v1Records) {
        const normalized = toNormalizedFromV1(r)
        if (hasUsableStreamData(normalized)) {
          result.set(r.workoutId, normalized)
        }
      }
    }

    return result
  },

  async updateMetadata(
    workoutId: string,
    data: { hrZoneTimes?: unknown; powerZoneTimes?: unknown }
  ): Promise<void> {
    const v2 = await (prisma as any).workoutStreamV2
      .findUnique({ where: { workoutId }, select: { id: true } })
      .catch(() => null)

    if (v2) {
      await (prisma as any).workoutStreamV2.update({
        where: { workoutId },
        data: { ...data, updatedAt: new Date() }
      })
      return
    }

    const v1 = await prisma.workoutStream.findUnique({
      where: { workoutId },
      select: { id: true }
    })
    if (v1) {
      const updateData: {
        updatedAt: Date
        hrZoneTimes?: ReturnType<typeof toPrismaInputJsonValue>
        powerZoneTimes?: ReturnType<typeof toPrismaInputJsonValue>
      } = { updatedAt: new Date() }
      if (data.hrZoneTimes !== undefined) {
        updateData.hrZoneTimes = toPrismaInputJsonValue(data.hrZoneTimes)
      }
      if (data.powerZoneTimes !== undefined) {
        updateData.powerZoneTimes = toPrismaInputJsonValue(data.powerZoneTimes)
      }
      await prisma.workoutStream.update({
        where: { workoutId },
        data: updateData
      })
    }
  },

  async upsert(
    workoutId: string,
    data: {
      time?: number[]
      distance?: number[]
      velocity?: number[]
      heartrate?: number[] | null
      cadence?: number[] | null
      watts?: number[] | null
      altitude?: number[] | null
      latlng?: [number, number][] | null
      grade?: number[] | null
      moving?: boolean[] | null
      temp?: number[] | null
      torque?: number[] | null
      leftRightBalance?: number[] | null
      hrv?: number[] | null
      respiration?: number[] | null
      targetPower?: number[] | null
      avgPacePerKm?: number | null
      paceVariability?: number | null
      lapSplits?: unknown
      paceZones?: unknown
      pacingStrategy?: unknown
      surges?: unknown
      hrZoneTimes?: unknown
      powerZoneTimes?: unknown
      extrasMeta?: unknown
    }
  ) {
    const { latlng, ...rest } = data
    const lat = latlng?.map(([latVal]) => latVal) ?? []
    const lng = latlng?.map(([, lngVal]) => lngVal) ?? []

    const writeData: any = {
      ...rest,
      lat,
      lng,
      time: rest.time ?? [],
      distance: rest.distance ?? [],
      velocity: rest.velocity ?? [],
      heartrate: rest.heartrate ?? [],
      cadence: rest.cadence ?? [],
      watts: rest.watts ?? [],
      altitude: rest.altitude ?? [],
      grade: rest.grade ?? [],
      moving: rest.moving ?? [],
      temp: rest.temp ?? [],
      torque: rest.torque ?? [],
      leftRightBalance: rest.leftRightBalance ?? [],
      hrv: rest.hrv ?? [],
      respiration: rest.respiration ?? [],
      targetPower: rest.targetPower ?? []
    }

    return (prisma as any).workoutStreamV2.upsert({
      where: { workoutId },
      create: {
        workout: { connect: { id: workoutId } },
        ...writeData
      },
      update: { ...writeData, updatedAt: new Date() }
    })
  }
}
