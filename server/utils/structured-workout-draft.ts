export const workoutPlanDraftSchema = {
  type: 'object',
  properties: {
    description: {
      type: 'string',
      description: 'Overall workout strategy in complete sentences.'
    },
    coachInstructions: {
      type: 'string',
      description: 'Personalized coaching cues in 2-3 sentences.'
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['Warmup', 'Active', 'Rest', 'Cooldown'] },
          name: { type: 'string' },
          intent: {
            type: 'string',
            enum: [
              'warmup',
              'recovery',
              'easy',
              'endurance',
              'tempo',
              'threshold',
              'vo2',
              'anaerobic',
              'sprint',
              'cooldown',
              'drills',
              'strides'
            ]
          },
          durationSeconds: { type: 'integer', minimum: 1 },
          distanceMeters: { type: 'integer', minimum: 1 },
          reps: { type: 'integer', minimum: 1, maximum: 50 },
          cadence: { type: 'integer', minimum: 1 },
          notes: { type: 'string' },
          target: {
            type: 'object',
            properties: {
              metric: { type: 'string', enum: ['power', 'heartRate', 'pace', 'rpe'] },
              value: { type: 'number', minimum: 0 },
              range: {
                type: 'object',
                properties: {
                  start: { type: 'number', minimum: 0 },
                  end: { type: 'number', minimum: 0 }
                },
                required: ['start', 'end']
              },
              units: {
                type: 'string',
                enum: ['%', 'w', 'bpm', 'LTHR', 'Pace', '/km']
              }
            },
            required: ['metric']
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['Warmup', 'Active', 'Rest', 'Cooldown'] },
                name: { type: 'string' },
                intent: {
                  type: 'string',
                  enum: [
                    'warmup',
                    'recovery',
                    'easy',
                    'endurance',
                    'tempo',
                    'threshold',
                    'vo2',
                    'anaerobic',
                    'sprint',
                    'cooldown',
                    'drills',
                    'strides'
                  ]
                },
                durationSeconds: { type: 'integer', minimum: 1 },
                distanceMeters: { type: 'integer', minimum: 1 },
                cadence: { type: 'integer', minimum: 1 },
                notes: { type: 'string' },
                target: {
                  type: 'object',
                  properties: {
                    metric: { type: 'string', enum: ['power', 'heartRate', 'pace', 'rpe'] },
                    value: { type: 'number', minimum: 0 },
                    range: {
                      type: 'object',
                      properties: {
                        start: { type: 'number', minimum: 0 },
                        end: { type: 'number', minimum: 0 }
                      },
                      required: ['start', 'end']
                    },
                    units: {
                      type: 'string',
                      enum: ['%', 'w', 'bpm', 'LTHR', 'Pace', '/km']
                    }
                  },
                  required: ['metric']
                }
              },
              required: ['type', 'name']
            }
          }
        },
        required: ['type', 'name']
      }
    }
  },
  required: ['coachInstructions', 'steps']
}

export type WorkoutPlanDraftTarget = {
  metric: 'power' | 'heartRate' | 'pace' | 'rpe'
  value?: number
  range?: { start: number; end: number }
  units?: '%' | 'w' | 'bpm' | 'LTHR' | 'Pace' | '/km'
}

export type WorkoutPlanDraftStep = {
  type: 'Warmup' | 'Active' | 'Rest' | 'Cooldown'
  name?: string
  intent?: string
  durationSeconds?: number
  distanceMeters?: number
  reps?: number
  cadence?: number
  notes?: string
  target?: WorkoutPlanDraftTarget
  steps?: WorkoutPlanDraftStep[]
}

export type WorkoutPlanDraft = {
  description?: string
  coachInstructions: string
  steps: WorkoutPlanDraftStep[]
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function compileDraftTarget(target: WorkoutPlanDraftTarget | undefined) {
  if (!target || !target.metric) return {}

  if (target.metric === 'rpe') {
    return {
      primaryTarget: 'rpe',
      rpe:
        typeof target.value === 'number'
          ? Math.max(1, Math.min(10, Number(target.value)))
          : undefined
    }
  }

  const compiledTarget: Record<string, any> = {}
  if (target.range) {
    compiledTarget.range = {
      start: Number(target.range.start),
      end: Number(target.range.end)
    }
  } else if (typeof target.value === 'number') {
    compiledTarget.value = Number(target.value)
  }
  if (target.units) compiledTarget.units = target.units

  return {
    primaryTarget: target.metric,
    [target.metric]: compiledTarget
  }
}

function compileDraftStep(step: WorkoutPlanDraftStep): any {
  const compiled: Record<string, any> = {
    type: step.type,
    name: step.name || step.type
  }

  if (step.intent) compiled.intent = step.intent
  if (typeof step.durationSeconds === 'number' && step.durationSeconds > 0) {
    compiled.durationSeconds = Math.round(step.durationSeconds)
  }
  if (typeof step.distanceMeters === 'number' && step.distanceMeters > 0) {
    compiled.distance = Math.round(step.distanceMeters)
  }
  if (typeof step.reps === 'number' && step.reps > 1) compiled.reps = Math.round(step.reps)
  if (typeof step.cadence === 'number' && step.cadence > 0)
    compiled.cadence = Math.round(step.cadence)

  Object.assign(compiled, compileDraftTarget(step.target))

  if (Array.isArray(step.steps) && step.steps.length > 0) {
    compiled.steps = step.steps.map((child) => compileDraftStep(child))
  }

  return compiled
}

export function compileWorkoutPlanDraftToStructure(draft: WorkoutPlanDraft) {
  const safeDraft = clone(draft || { coachInstructions: '', steps: [] })
  return {
    description: typeof safeDraft.description === 'string' ? safeDraft.description : undefined,
    coachInstructions: safeDraft.coachInstructions || '',
    steps: Array.isArray(safeDraft.steps)
      ? safeDraft.steps.map((step) => compileDraftStep(step))
      : []
  }
}

export function isDraftStructuredWorkoutSupported(workoutType: unknown) {
  const normalized = String(workoutType || '')
    .trim()
    .toLowerCase()
  return normalized.includes('ride') || normalized.includes('run')
}
