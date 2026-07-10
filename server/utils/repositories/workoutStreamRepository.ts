import { prisma } from '../db'

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

export const workoutStreamRepository = {
  async findByWorkoutId(workoutId: string): Promise<NormalizedStream | null> {
    const v2 = await (prisma as any).workoutStreamV2
      .findUnique({ where: { workoutId } })
      .catch(() => null)
    if (v2 && Array.isArray(v2.time) && v2.time.length > 0) {
      return normalizeV2(v2)
    }
    const v1 = await prisma.workoutStream.findUnique({ where: { workoutId } }).catch(() => null)
    return v1 as NormalizedStream | null
  },

  async findManyByWorkoutIds(workoutIds: string[]): Promise<Map<string, NormalizedStream>> {
    const result = new Map<string, NormalizedStream>()
    if (workoutIds.length === 0) return result

    const v2Records: any[] = await (prisma as any).workoutStreamV2
      .findMany({ where: { workoutId: { in: workoutIds } } })
      .catch(() => [])

    const missingIds: string[] = []
    for (const r of v2Records) {
      if (Array.isArray(r.time) && r.time.length > 0) {
        result.set(r.workoutId, normalizeV2(r))
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
        result.set(r.workoutId, r as unknown as NormalizedStream)
      }
    }

    return result
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
