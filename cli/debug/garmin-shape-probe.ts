import 'dotenv/config'
import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import {
  buildGarminTrainingPayload,
  countStepsInGarminWorkoutResponse,
  toGarminWorkoutId
} from '../../server/utils/garmin-push'

const TEMPO_STEPS = [
  {
    name: 'Progressive Warmup',
    type: 'Warmup',
    power: { range: { end: 0.6, start: 0.5 }, units: '%ftp' },
    cadence: 85,
    durationSeconds: 1200
  },
  {
    name: '3x',
    reps: 3,
    type: 'Active',
    steps: [
      {
        name: 'Tempo Effort',
        type: 'Active',
        power: { range: { end: 0.88, start: 0.8 }, units: '%ftp' },
        cadence: 90,
        durationSeconds: 900
      }
    ]
  },
  {
    name: 'Sweet Spot Interval',
    type: 'Active',
    power: { range: { end: 0.94, start: 0.9 }, units: '%ftp' },
    cadence: 85,
    durationSeconds: 900
  },
  {
    name: 'Cooldown',
    type: 'Cooldown',
    power: { range: { end: 0.4, start: 0.5 }, units: '%ftp' },
    cadence: 80,
    durationSeconds: 600
  }
]

type ShapeName =
  | 'v2-segments-repeat'
  | 'v2-segments-flat'
  | 'v2-segments-no-secondary'
  | 'v2-dual-top-level-steps'
  | 'v1-flat-top-level'

function flattenRepeatSteps(steps: any[]): any[] {
  const out: any[] = []
  const visit = (step: any) => {
    if (!step) return
    if (step.type === 'WorkoutRepeatStep' && Array.isArray(step.steps)) {
      const reps = Number(step.repeatValue) || 1
      for (let i = 0; i < reps; i++) {
        for (const child of step.steps) visit(child)
      }
      return
    }
    out.push(step)
  }
  for (const step of steps) visit(step)
  return out.map((step, index) => ({ ...step, stepOrder: index + 1 }))
}

function stripSecondaryTargets(steps: any[]): any[] {
  return steps.map((step) => {
    const next = { ...step }
    delete next.secondaryTargetType
    delete next.secondaryTargetValue
    delete next.secondaryTargetValueLow
    delete next.secondaryTargetValueHigh
    delete next.secondaryTargetValueType
    if (Array.isArray(next.steps)) next.steps = stripSecondaryTargets(next.steps)
    return next
  })
}

function buildShapePayload(
  shape: ShapeName,
  dateLabel: string,
  ftp: number
): { endpoint: string; payload: Record<string, unknown>; notes: string } {
  const base = buildGarminTrainingPayload(
    {
      title: `[CW SHAPE] ${shape} ${dateLabel}`,
      description: `Coach Watts Garmin payload experiment: ${shape}`,
      type: 'Ride',
      durationSec: 5400,
      steps: TEMPO_STEPS
    },
    { ftp },
    { sourceId: `shape-${shape}-${dateLabel}` }
  ) as Record<string, unknown>

  const segment = (base.segments as any[])[0]
  const segmentSteps = segment.steps as any[]

  switch (shape) {
    case 'v2-segments-repeat':
      return {
        endpoint: 'https://apis.garmin.com/training-api/workout/v2',
        payload: base,
        notes: 'Current production shape: V2 segments + WorkoutRepeatStep + secondary cadence'
      }
    case 'v2-segments-flat': {
      const flat = flattenRepeatSteps(segmentSteps)
      return {
        endpoint: 'https://apis.garmin.com/training-api/workout/v2',
        payload: {
          ...base,
          segments: [{ ...segment, steps: flat }]
        },
        notes: 'V2 segments but repeats unrolled into flat WorkoutSteps'
      }
    }
    case 'v2-segments-no-secondary': {
      return {
        endpoint: 'https://apis.garmin.com/training-api/workout/v2',
        payload: {
          ...base,
          segments: [{ ...segment, steps: stripSecondaryTargets(segmentSteps) }]
        },
        notes: 'V2 segments + repeats, no secondary cadence targets'
      }
    }
    case 'v2-dual-top-level-steps': {
      return {
        endpoint: 'https://apis.garmin.com/training-api/workout/v2',
        payload: {
          ...base,
          steps: segmentSteps
        },
        notes: 'V2 segments PLUS duplicate top-level steps field'
      }
    }
    case 'v1-flat-top-level': {
      const flat = flattenRepeatSteps(segmentSteps)
      const { segments: _segments, isSessionTransitionEnabled: _t, ...rest } = base
      return {
        endpoint: 'https://apis.garmin.com/training-api/workout',
        payload: {
          ...rest,
          steps: stripSecondaryTargets(flat)
        },
        notes: 'Legacy V1 endpoint with top-level flat steps only (no segments)'
      }
    }
  }
}

async function createWorkout(
  accessToken: string,
  endpoint: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Create failed ${response.status}: ${text.slice(0, 800)}`)
  }
  return text ? JSON.parse(text) : {}
}

async function scheduleWorkout(accessToken: string, workoutId: number, date: string) {
  const response = await fetch('https://apis.garmin.com/training-api/schedule', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ workoutId, date })
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Schedule failed ${response.status}: ${text.slice(0, 800)}`)
  }
  return text ? JSON.parse(text) : {}
}

async function retrieveWorkout(accessToken: string, workoutId: number, v2: boolean) {
  const url = v2
    ? `https://apis.garmin.com/training-api/workout/v2/${workoutId}`
    : `https://apis.garmin.com/training-api/workout/${workoutId}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const text = await response.text()
  if (!response.ok) {
    return { status: response.status, error: text.slice(0, 500) }
  }
  const workout = JSON.parse(text)
  return {
    status: response.status,
    workoutId: workout.workoutId ?? workout.id,
    sport: workout.sport,
    segmentCount: Array.isArray(workout.segments) ? workout.segments.length : 0,
    topLevelStepCount: Array.isArray(workout.steps) ? workout.steps.length : 0,
    leafStepCount: countStepsInGarminWorkoutResponse(workout),
    firstStep: (workout.segments?.[0]?.steps || workout.steps || [])[0] || null
  }
}

function datePlusDays(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const garminShapeProbeCommand = new Command('garmin-shape-probe')
  .description(
    'Create Garmin Training API payload-shape experiments for visual Connect verification'
  )
  .argument('<userIdentifier>', 'User ID or email')
  .option('--prod', 'Use production database')
  .option('--ftp <watts>', 'FTP used for absolute power conversion', '229')
  .option(
    '--shapes <list>',
    'Comma-separated shapes',
    'v2-segments-repeat,v2-segments-flat,v2-segments-no-secondary,v2-dual-top-level-steps,v1-flat-top-level'
  )
  .option('--start-offset-days <n>', 'Schedule first shape N days from today (UTC)', '1')
  .action(async (userIdentifier, options) => {
    const isProd = Boolean(options.prod)
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(chalk.red('Missing DATABASE_URL or DATABASE_URL_PROD'))
      process.exit(1)
    }
    if (isProd) {
      process.env.DATABASE_URL = process.env.DATABASE_URL_PROD
      console.log(chalk.yellow('⚠️  Using PRODUCTION database / Garmin token.'))
    }

    const pool = new pg.Pool({ connectionString })
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
    ;(globalThis as any).prismaGlobalV2 = prisma

    try {
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: userIdentifier }, { email: userIdentifier }] }
      })
      if (!user) throw new Error('User not found')

      const integration = await prisma.integration.findFirst({
        where: { userId: user.id, provider: 'garmin' }
      })
      if (!integration?.accessToken) throw new Error('Garmin integration/token missing')

      const expiresAt = integration.expiresAt?.getTime() || 0
      if (expiresAt && Date.now() >= expiresAt) {
        throw new Error(
          `Garmin access token expired at ${integration.expiresAt?.toISOString()}. Reconnect Garmin in Coach Watts.`
        )
      }

      const shapes = String(options.shapes)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean) as ShapeName[]
      const ftp = Number(options.ftp) || 229
      const startOffset = Number(options.startOffsetDays) || 1

      console.log(chalk.green(`✓ ${user.email}`))
      console.log(chalk.gray(`Creating ${shapes.length} shape experiments (ftp=${ftp})...`))
      console.log('')

      const results: any[] = []
      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i]!
        const date = datePlusDays(startOffset + i)
        const built = buildShapePayload(shape, date, ftp)
        process.stdout.write(chalk.blue(`[${i + 1}/${shapes.length}] ${shape} → ${date} ... `))

        try {
          const created = await createWorkout(
            integration.accessToken,
            built.endpoint,
            built.payload
          )
          const workoutId = toGarminWorkoutId(created?.workoutId ?? created?.id)
          if (workoutId == null) {
            throw new Error(
              `No workoutId in create response: ${JSON.stringify(created).slice(0, 300)}`
            )
          }
          const scheduled = await scheduleWorkout(integration.accessToken, workoutId, date)
          const retrieved = await retrieveWorkout(
            integration.accessToken,
            workoutId,
            built.endpoint.includes('/v2')
          )
          const row = {
            shape,
            date,
            endpoint: built.endpoint,
            notes: built.notes,
            workoutId,
            scheduleId: scheduled?.scheduleId ?? scheduled?.id ?? null,
            retrieved
          }
          results.push(row)
          console.log(chalk.green(`ok workoutId=${workoutId}`))
        } catch (error: any) {
          results.push({
            shape,
            date,
            endpoint: built.endpoint,
            notes: built.notes,
            error: error?.message || String(error)
          })
          console.log(chalk.red('FAILED'))
          console.log(chalk.red(error?.message || String(error)))
        }
      }

      console.log('\n' + chalk.bold('=== LOOK FOR THESE IN GARMIN CONNECT ==='))
      console.log(
        chalk.gray('Calendar dates (UTC) and workout library names starting with [CW SHAPE]')
      )
      console.log(JSON.stringify(results, null, 2))
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default garminShapeProbeCommand
