import { prisma } from '../../utils/db'
import { z } from 'zod'
import { getServerSession } from '../../utils/session'
import { getUserTimezone, getUserLocalDate } from '../../utils/date'
import { generateStructuredAnalysis } from '../../utils/gemini'

import { trainingPlanRepository } from '../../utils/repositories/trainingPlanRepository'

const initializePlanSchema = z.object({
  goalId: z.string(),
  startDate: z.string().datetime(), // ISO string
  endDate: z.string().datetime().optional(), // ISO string
  volumePreference: z.enum(['LOW', 'MID', 'HIGH']).default('MID'),
  volumeHours: z.number().optional(),
  strategy: z
    .enum(['LINEAR', 'UNDULATING', 'BLOCK', 'POLARIZED', 'REVERSE', 'MAINTENANCE'])
    .default('LINEAR'),
  preferredActivityTypes: z.array(z.string()).default(['Ride']),
  customInstructions: z.string().optional(),
  recoveryRhythm: z.number().int().min(2).max(5).default(4), // 4 = 3:1 ratio, 3 = 2:1 ratio
  startingPhase: z.enum(['BASE', 'BUILD', 'PEAK']).default('BASE')
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const validation = initializePlanSchema.safeParse(body)

  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const {
    goalId,
    startDate,
    endDate,
    volumePreference,
    volumeHours,
    strategy,
    preferredActivityTypes,
    customInstructions,
    recoveryRhythm,
    startingPhase
  } = validation.data
  const userId = (session.user as any).id

  // 1. Fetch Goal to get target date
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { events: true } // If linked to an event
  })

  if (!goal) {
    throw createError({ statusCode: 404, message: 'Goal not found' })
  }

  // Fetch User Profile for Age context
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  const age = user?.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : 30

  let targetDate = endDate ? new Date(endDate) : goal.targetDate || goal.eventDate
  if (!targetDate && goal.events.length > 0 && goal.events[0] && !endDate) {
    targetDate = goal.events[0].date
  }

  if (!targetDate) {
    throw createError({ statusCode: 400, message: 'Goal must have a target date' })
  }

  // 0. Clean up any existing DRAFT plans for this user
  // This prevents multiple overlapping draft plans from cluttering the calendar
  // We first fetch them to manually delete AI-managed workouts because of SetNull cascade
  const existingDrafts = await prisma.trainingPlan.findMany({
    where: { userId, status: 'DRAFT' },
    select: { id: true }
  })

  if (existingDrafts.length > 0) {
    const draftIds = existingDrafts.map((d) => d.id)

    // Delete AI-managed workouts for these drafts
    await prisma.plannedWorkout.deleteMany({
      where: {
        userId,
        trainingWeek: {
          block: {
            trainingPlanId: { in: draftIds }
          }
        },
        managedBy: 'COACH_WATTS'
      }
    })

    // Delete the plans themselves (cascades to blocks/weeks)
    await prisma.trainingPlan.deleteMany({
      where: { id: { in: draftIds } }
    })
  }

  // 2. Calculate Timeline
  // Force start date to UTC midnight of the calendar day
  const timezone = await getUserTimezone(userId)
  const start = getUserLocalDate(timezone, new Date(startDate))

  const end = new Date(targetDate)
  const totalWeeks = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))

  if (totalWeeks < 4) {
    throw createError({ statusCode: 400, message: 'Plan duration too short (min 4 weeks)' })
  }

  // 3. AI Structural Decision (Gemini)
  // We ask Gemini to determine the macro-structure details based on the user context.
  const allEventsContext =
    goal.events.length > 0
      ? goal.events
          .map((e) => {
            const dateStr = e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date
            return `- [Priority ${e.priority || 'B'}] ${e.title} (${e.subType || e.type || 'General'}) on ${dateStr}. Distance: ${e.distance || 'N/A'}`
          })
          .join('\n    ')
      : 'No specific events linked (General Fitness Goal).'

  const structurePrompt = `
    Design the complete periodization block structure for a ${age}-year-old athlete.
    
    Context:
    - Goal: ${goal.title}
    - Total Duration Available: ${totalWeeks} weeks
    - Strategy: ${strategy}
    - Current Readiness (Start Phase): ${startingPhase}
    - Recovery Rhythm Preference: ${recoveryRhythm === 3 ? 'High Recovery (2:1)' : 'Standard (3:1)'}

    Scheduled Events:
    ${allEventsContext}

    Custom Instructions: ${customInstructions || 'None'}

    Task:
    Generate a list of Training Blocks that sum up EXACTLY to ${totalWeeks} weeks.
    
    Rules:
    1. Total Duration MUST be ${totalWeeks} weeks.
    2. If Starting Readiness is 'BUILD', do NOT schedule BASE blocks. Start immediately with BUILD.
    3. If Starting Readiness is 'PEAK', schedule only a short Build/Sharpening phase + Taper.
    4. Align blocks so that "Race" or "Peak" blocks coincide with the A-Priority events if possible.
    5. Block Types: [BASE, BUILD, PEAK, RACE, TRANSITION].
    6. Focus: [AEROBIC_ENDURANCE, SWEET_SPOT, TEMPO, THRESHOLD, VO2_MAX, ANAEROBIC_CAPACITY, RACE_SPECIFIC].
    
    Output a JSON object with a 'rationale' string and a 'blocks' array.
  `

  const aiStructureSchema = {
    type: 'object',
    properties: {
      rationale: { type: 'string', description: 'Explanation of the structure and strategy' },
      blocks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'e.g. Base 1, Build 2' },
            type: { type: 'string', enum: ['BASE', 'BUILD', 'PEAK', 'RACE', 'TRANSITION'] },
            focus: { type: 'string', description: 'Primary physiological focus' },
            durationWeeks: { type: 'integer', minimum: 1, maximum: 12 }
          },
          required: ['name', 'type', 'focus', 'durationWeeks']
        }
      }
    },
    required: ['rationale', 'blocks']
  }

  let aiStructure
  try {
    aiStructure = await generateStructuredAnalysis<any>(
      structurePrompt,
      aiStructureSchema,
      'flash',
      {
        userId,
        operation: 'plan_structure',
        entityType: 'goal',
        entityId: goalId
      }
    )
  } catch (e) {
    console.error('Gemini structure generation failed, falling back to algorithmic generation', e)
    // Fallback to empty structure, causing calculateBlocks to use legacy logic if we kept it,
    // OR we can implement a basic fallback here.
    // For now, let's just throw or handle it in the block mapper.
  }

  // 4. Define Blocks
  // If AI succeeded, use its blocks. If not (or if logic fails), we could fallback.
  // Ideally, we implement the duration normalization here.

  const finalBlocksConfig = aiStructure?.blocks || []

  // FALLBACK: If AI failed or returned no blocks, use a simple linear generator
  if (!finalBlocksConfig.length) {
    // Simple linear fallback
    const taper = 2
    const training = Math.max(0, totalWeeks - taper)
    const base = Math.floor(training * 0.6)
    const build = training - base

    if (base > 0)
      finalBlocksConfig.push({
        name: 'Base Phase',
        type: 'BASE',
        focus: 'SWEET_SPOT',
        durationWeeks: base
      })
    if (build > 0)
      finalBlocksConfig.push({
        name: 'Build Phase',
        type: 'BUILD',
        focus: 'THRESHOLD',
        durationWeeks: build
      })
    finalBlocksConfig.push({
      name: 'Peak & Taper',
      type: 'PEAK',
      focus: 'RACE_SPECIFIC',
      durationWeeks: taper
    })
  }

  // NORMALIZE DURATION (AI Math Safety)
  const currentTotal = finalBlocksConfig.reduce((sum: number, b: any) => sum + b.durationWeeks, 0)
  const diff = totalWeeks - currentTotal

  if (diff !== 0 && finalBlocksConfig.length > 0) {
    // We need to adjust. Find the best block to adjust (Longest Base or Build)
    const adjustIdx = finalBlocksConfig.findIndex(
      (b: any) => b.type === 'BASE' || b.type === 'BUILD'
    )
    // If no Base/Build, just adjust the first block
    const targetIdx = adjustIdx >= 0 ? adjustIdx : 0

    // Apply adjustment
    finalBlocksConfig[targetIdx].durationWeeks += diff

    // Safety: If we reduced it to <= 0, remove it or set to 1 and borrow from elsewhere (simplification: ensure min 1)
    if (finalBlocksConfig[targetIdx].durationWeeks < 1) {
      finalBlocksConfig[targetIdx].durationWeeks = 1
      // Recalculate and brute force trim from end if needed, but this is an edge case.
    }
  }

  // 5. Create Plan Skeleton
  const plan = await trainingPlanRepository.create(
    {
      userId,
      goalId,
      startDate: start,
      targetDate: end,
      strategy,
      status: 'DRAFT',
      activityTypes: preferredActivityTypes,
      customInstructions: customInstructions,
      recoveryRhythm,
      description: aiStructure?.rationale || 'Generated Training Plan',
      blocks: {
        create: finalBlocksConfig.map((blockConfig: any, index: number) => {
          // Calculate Start Date for this block
          const blockStartDate = new Date(start)
          let weeksPrior = 0
          for (let i = 0; i < index; i++) {
            weeksPrior += finalBlocksConfig[i].durationWeeks
          }
          blockStartDate.setUTCDate(blockStartDate.getUTCDate() + weeksPrior * 7)

          return {
            order: index + 1,
            name: blockConfig.name,
            type: blockConfig.type,
            primaryFocus: blockConfig.focus,
            startDate: blockStartDate,
            durationWeeks: blockConfig.durationWeeks,
            recoveryWeekIndex: recoveryRhythm, // Still use user pref for micro-cycles within the block
            weeks: {
              create: Array.from({ length: blockConfig.durationWeeks }).map((_, i) => {
                const weekStart = new Date(blockStartDate)
                weekStart.setUTCDate(weekStart.getUTCDate() + i * 7)
                const weekEnd = new Date(weekStart)
                weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

                // Determine recovery week based on rhythm
                // e.g. Rhythm 4 (3:1) -> Weeks 4, 8, 12 are recovery
                // But specifically for Taper/Race blocks, usually the whole thing is recovery/taper logic handled by workout generator
                const isRecovery =
                  (i + 1) % recoveryRhythm === 0 &&
                  blockConfig.type !== 'PEAK' &&
                  blockConfig.type !== 'RACE'

                // Determine target volume
                let targetMinutes = 450 // Default MID
                if (volumeHours) {
                  targetMinutes = volumeHours * 60
                  if (isRecovery) targetMinutes = Math.round(targetMinutes * 0.6)
                } else {
                  if (volumePreference === 'LOW') targetMinutes = 240
                  else if (volumePreference === 'HIGH') targetMinutes = 600
                  if (isRecovery) targetMinutes = Math.round(targetMinutes * 0.6)
                }

                // Taper volume reduction
                if (blockConfig.type === 'PEAK') {
                  // Progressive reduction: Week 1 (70%), Week 2 (50%)
                  const taperFactor = 1 - ((i + 1) / blockConfig.durationWeeks) * 0.5
                  targetMinutes = Math.round(targetMinutes * taperFactor)
                }

                const tssTarget = Math.round((targetMinutes / 60) * 50)

                return {
                  weekNumber: i + 1,
                  startDate: weekStart,
                  endDate: weekEnd,
                  isRecovery,
                  volumeTargetMinutes: targetMinutes,
                  tssTarget: tssTarget
                }
              })
            }
          }
        })
      }
    },
    {
      blocks: {
        include: {
          weeks: true
        }
      }
    }
  )

  return {
    success: true,
    planId: plan.id,
    plan
  }
})

// Removed calculateBlocks function as logic is now inline/AI-driven
