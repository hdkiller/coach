import { logger, task } from '@trigger.dev/sdk/v3'
import { generateStructuredAnalysis } from '../server/utils/gemini'
import { prisma } from '../server/utils/db'
import { userReportsQueue } from './queues'
import {
  getUserTimezone,
  getStartOfDaysAgoUTC,
  getStartOfDayUTC,
  formatUserDate
} from '../server/utils/date'
import { getCurrentFitnessSummary } from '../server/utils/training-stress'
import { getUserAiSettings } from '../server/utils/ai-settings'

const trainingBlockSchema = {
  type: 'object',
  properties: {
    weeks: {
      type: 'array',
      description: 'List of training weeks in this block',
      items: {
        type: 'object',
        properties: {
          weekNumber: { type: 'integer', description: '1-based index within the block' },
          focus_key: {
            type: 'string',
            description: 'Standardized key (e.g. AEROBIC_ENDURANCE, RECOVERY, VO2_MAX)'
          },
          focus_label: {
            type: 'string',
            description: 'User-facing label (e.g. "Aerobic Endurance & Skills")'
          },
          explanation: {
            type: 'string',
            description: 'Reasoning for this week structure and focus'
          },
          volumeTargetMinutes: { type: 'integer' },
          workouts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dayOfWeek: { type: 'integer', description: '0=Sunday, 1=Monday, ..., 6=Saturday' },
                title: { type: 'string', description: "Workout title (e.g. '3x10m Sweet Spot')" },
                description: {
                  type: 'string',
                  description: 'Brief description of the workout goal'
                },
                type: {
                  type: 'string',
                  enum: ['Ride', 'Run', 'Swim', 'Gym', 'Rest', 'Active Recovery']
                },
                durationMinutes: { type: 'integer' },
                tssEstimate: { type: 'integer' },
                intensity: {
                  type: 'string',
                  enum: ['recovery', 'easy', 'moderate', 'hard', 'very_hard'],
                  description: 'Overall intensity level'
                }
              },
              required: ['dayOfWeek', 'title', 'type', 'durationMinutes', 'intensity']
            }
          }
        },
        required: ['weekNumber', 'workouts']
      }
    }
  },
  required: ['weeks']
}

export const generateTrainingBlockTask = task({
  id: 'generate-training-block',
  queue: userReportsQueue,
  maxDuration: 300, // 5 minutes
  run: async (payload: { userId: string; blockId: string }) => {
    const { userId, blockId } = payload

    logger.log('Starting training block generation', { userId, blockId })

    const timezone = await getUserTimezone(userId)
    const aiSettings = await getUserAiSettings(userId)
    const now = new Date()
    const localDate = formatUserDate(now, timezone)

    // 1. Fetch Context
    const block = await prisma.trainingBlock.findUnique({
      where: { id: blockId },
      include: {
        plan: {
          include: {
            goal: {
              include: { events: true }
            },
            blocks: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                order: true,
                name: true,
                type: true,
                durationWeeks: true,
                primaryFocus: true
              }
            }
          }
        },
        weeks: {
          select: {
            weekNumber: true,
            volumeTargetMinutes: true,
            tssTarget: true
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    })

    if (!block) throw new Error('Block not found')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ftp: true, weight: true, maxHr: true, aiPersona: true }
    })

    // Fetch latest athlete profile
    const athleteProfileReport = await prisma.report.findFirst({
      where: {
        userId,
        type: 'ATHLETE_PROFILE',
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' },
      select: { analysisJson: true, createdAt: true }
    })

    let athleteProfileContext = ''
    if (athleteProfileReport?.analysisJson) {
      const profile = athleteProfileReport.analysisJson as any
      athleteProfileContext = `
DETAILED ATHLETE ANALYSIS (Generated ${new Date(athleteProfileReport.createdAt).toLocaleDateString()}):
Training Characteristics:
${profile.training_characteristics?.training_style || 'No data'}
Strengths: ${profile.training_characteristics?.strengths?.join(', ') || 'None listed'}
Areas for Development: ${profile.training_characteristics?.areas_for_development?.join(', ') || 'None listed'}

Recovery Profile: ${profile.recovery_profile?.recovery_pattern || 'Unknown'}
${profile.recovery_profile?.key_observations ? profile.recovery_profile.key_observations.map((o: string) => `- ${o}`).join('\n') : ''}

Recent Performance Trend: ${profile.recent_performance?.trend || 'Unknown'}

Planning Context:
${profile.planning_context?.current_focus ? `Current Focus: ${profile.planning_context.current_focus}` : ''}
${profile.planning_context?.limitations?.length ? `Limitations: ${profile.planning_context.limitations.join(', ')}` : ''}
${profile.planning_context?.opportunities?.length ? `Opportunities: ${profile.planning_context.opportunities.join(', ')}` : ''}
`
    }

    const currentFitness = await getCurrentFitnessSummary(userId)

    // 2. Prepare Context Data
    // Map existing weeks to get volume targets before we delete them
    const volumeTargets = block.weeks
      .map((w) => `Week ${w.weekNumber}: ${w.volumeTargetMinutes} mins (TSS ~${w.tssTarget})`)
      .join('\n')

    // Calculate Global Week Context
    let globalWeekStart = 1
    for (const b of block.plan.blocks) {
      if (b.id === block.id) break
      globalWeekStart += b.durationWeeks
    }
    const globalWeekEnd = globalWeekStart + block.durationWeeks - 1
    const totalPlanWeeks = block.plan.blocks.reduce((sum, b) => sum + b.durationWeeks, 0)

    const planOverview = block.plan.blocks
      .map(
        (b) =>
          `${b.order}. ${b.name} (${b.type}): ${b.durationWeeks} weeks - Focus: ${b.primaryFocus}${b.id === block.id ? ' [CURRENT]' : ''}`
      )
      .join('\n')

    // Calculate Explicit Calendar for Prompt
    // This prevents the AI from generating extra days or misaligning weeks
    let calendarContext = ''
    for (let i = 0; i < block.durationWeeks; i++) {
      const weekStart = new Date(block.startDate)
      weekStart.setDate(weekStart.getDate() + i * 7)

      const daysInWeek = []
      for (let j = 0; j < 7; j++) {
        const dayDate = new Date(weekStart)
        dayDate.setDate(dayDate.getDate() + j)
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone })
        const dateStr = formatUserDate(dayDate, timezone)
        daysInWeek.push(`${dayName} (${dateStr})`)
      }

      calendarContext += `Week ${i + 1}: ${daysInWeek.join(', ')}\n`
    }

    // 3. Build Prompt
    const eventsList =
      block.plan.goal.events && block.plan.goal.events.length > 0
        ? block.plan.goal.events
            .map(
              (e: any) => `- ${e.title}: ${formatUserDate(e.date, timezone)} (${e.type || 'Race'})`
            )
            .join('\n')
        : `- Primary Event Date: ${formatUserDate(block.plan.goal.eventDate || block.plan.targetDate || new Date(), timezone)}`

    // NEW: Get activity types from plan
    const allowedTypes = (block.plan as any).activityTypes || ['Ride'] // Default to Ride if missing
    const allowedTypesString = Array.isArray(allowedTypes) ? allowedTypes.join(', ') : 'Ride'

    // NEW: Get custom instructions from plan
    const customInstructions = (block.plan as any).customInstructions || ''

    const prompt = `You are a **${aiSettings.aiPersona}** expert endurance coach designing a specific mesocycle (training block) for an athlete.
Adapt your tone and structure reasoning to match your **${aiSettings.aiPersona}** persona.

CURRENT CONTEXT:
- Date: ${localDate}
- Timezone: ${timezone}

ATHLETE PROFILE:
- FTP: ${user?.ftp || 'Unknown'} W
- Weight: ${user?.weight || 'Unknown'} kg
- Coach Persona: ${aiSettings.aiPersona}
- Allowed Workout Types: ${allowedTypesString} (ONLY schedule these types + Rest/Recovery)
${athleteProfileContext}

CURRENT FITNESS STATUS (Source of Truth):
- CTL (Fitness): ${currentFitness.ctl.toFixed(1)}
- ATL (Fatigue): ${currentFitness.atl.toFixed(1)}
- TSB (Form): ${currentFitness.tsb.toFixed(1)}
- Status: ${currentFitness.formStatus.description}

${
  customInstructions
    ? `ATHLETE CUSTOM INSTRUCTIONS & CONSTRAINTS (IMPORTANT):
${customInstructions}
NOTE: These instructions take precedence over "Allowed Workout Types" or standard scheduling rules. If the athlete asks for a specific workout type not listed above, include it.
`
    : ''
}
TRAINING GOAL:
- Goal Title: ${block.plan.goal.title}
- Events:
${eventsList}
- Strategy: ${block.plan.strategy}

TRAINING PLAN OVERVIEW (Macrocycle):
Total Duration: ${totalPlanWeeks} weeks
${planOverview}

CURRENT BLOCK CONTEXT:
- Block Name: "${block.name}"
- Phase Type: ${block.type} (e.g. Base, Build, Peak)
- Primary Focus: ${block.primaryFocus}
- Duration: ${block.durationWeeks} weeks
- Global Timeline: Weeks ${globalWeekStart}-${globalWeekEnd} of ${totalPlanWeeks}
- Start Date: ${formatUserDate(block.startDate, timezone)}
- Progression Logic: ${block.progressionLogic || 'Standard linear progression'}
- Recovery Week: Week ${block.recoveryWeekIndex || 4} is a recovery week.

VOLUME TARGETS (Baseline from Plan Wizard):
${volumeTargets}
*Use these targets as a guide. You may adjust slightly (+/- 10%) based on the phase and progression needs, but aim to hit these durations.*

WEEKLY SCHEDULE CONSTRAINTS (Explicit Dates):
${calendarContext}
*Strictly follow this schedule. Only generate workouts for the days listed above for each week.*

INSTRUCTIONS:
Generate a detailed daily training plan for each week in this block (${block.durationWeeks} weeks).
- ONLY use the "Allowed Workout Types" listed above, UNLESS the athlete's custom instructions explicitly request otherwise (Custom Instructions take precedence).
- Ensure progressive overload from week 1 to ${block.durationWeeks - 1}.
- Ensure the recovery week (if applicable) has significantly reduced volume and intensity.
- For "Ride" workouts, provide realistic TSS estimates based on duration and intensity.
- Workout types: ${allowedTypesString}, Rest, Active Recovery.
- Start each week on a Monday.
- Provide a summary for each week explaining the focus and volume.
- **Weekly Focus Details:**
  - focus_key: A standardized, uppercase key (e.g., AEROBIC_ENDURANCE, TEMPO, THRESHOLD, VO2_MAX, RECOVERY, TAPER, RACE).
  - focus_label: A friendly, descriptive title for the week (e.g., "Base Building 1", "High Intensity Interval Week").
  - explanation: A clear "Why it works" explanation for the athlete, describing the physiological goal of the week's structure.

OUTPUT FORMAT:
Return valid JSON matching the schema provided.`

    // 4. Generate with Gemini
    logger.log(`Prompting Gemini (${aiSettings.aiModelPreference})...`)
    const result = await generateStructuredAnalysis<any>(
      prompt,
      trainingBlockSchema,
      aiSettings.aiModelPreference,
      {
        userId,
        operation: 'generate_training_block',
        entityType: 'TrainingBlock',
        entityId: blockId
      }
    )

    // 5. Persist Results
    logger.log('Persisting generated plan...', { weeksCount: result.weeks.length })

    await prisma.$transaction(
      async (tx) => {
        // Clear existing generated weeks for this block to avoid duplicates if re-running
        // First, find existing weeks to delete their workouts
        const existingWeeks = await tx.trainingWeek.findMany({
          where: { blockId },
          select: { id: true }
        })

        const weekIds = existingWeeks.map((w) => w.id)

        if (weekIds.length > 0) {
          // Delete workouts attached to these weeks to prevent orphans
          await tx.plannedWorkout.deleteMany({
            where: { trainingWeekId: { in: weekIds } }
          })

          // Delete the weeks themselves
          await tx.trainingWeek.deleteMany({
            where: { blockId }
          })
        }

        for (const weekData of result.weeks) {
          // Calculate dates
          const weekStartDate = new Date(block.startDate)
          weekStartDate.setDate(weekStartDate.getDate() + (weekData.weekNumber - 1) * 7)
          const weekEndDate = new Date(weekStartDate)
          weekEndDate.setDate(weekEndDate.getDate() + 6)

          // Create Week
          const createdWeek = await tx.trainingWeek.create({
            data: {
              blockId,
              weekNumber: weekData.weekNumber,
              startDate: weekStartDate,
              endDate: weekEndDate,
              focus: weekData.focus_label || weekData.focus_key || 'Training Week',
              focusKey: weekData.focus_key,
              focusLabel: weekData.focus_label,
              explanation: weekData.explanation,
              volumeTargetMinutes: weekData.volumeTargetMinutes || 0,
              tssTarget: weekData.workouts.reduce(
                (acc: number, w: any) => acc + (w.tssEstimate || 0),
                0
              ),
              isRecovery: weekData.focus?.toLowerCase().includes('recovery') || false
            }
          })

          // Create Workouts
          const workoutsData = weekData.workouts.map((workout: any, index: number) => {
            // Logic assuming Block Start is ALWAYS aligned to start of week (e.g. Monday)
            // Mon=1 -> offset 0
            // Sun=0 -> offset 6

            // Validate dayOfWeek (0-6)
            let dayOfWeek = workout.dayOfWeek
            if (dayOfWeek < 0 || dayOfWeek > 6) {
              logger.warn('Invalid dayOfWeek from AI, clamping', {
                dayOfWeek,
                weekNumber: weekData.weekNumber
              })
              dayOfWeek = Math.max(0, Math.min(6, dayOfWeek))
            }

            const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
            const workoutDate = new Date(weekStartDate)
            workoutDate.setDate(workoutDate.getDate() + offset)

            return {
              userId,
              trainingWeekId: createdWeek.id,
              date: workoutDate,
              title: workout.title,
              description: workout.description,
              type: workout.type,
              durationSec: (workout.durationMinutes || 0) * 60,
              tss: workout.tssEstimate,
              workIntensity: getIntensityScore(workout.intensity),
              externalId: `ai-gen-${createdWeek.id}-${dayOfWeek}-${index}-${Date.now()}`,
              category: 'WORKOUT',
              managedBy: 'COACH_WATTS'
            }
          })

          if (workoutsData.length > 0) {
            await tx.plannedWorkout.createMany({
              data: workoutsData
            })
          }
        }
      },
      {
        timeout: 20000 // Increase timeout to 20s to handle larger blocks/slower db
      }
    )

    return { success: true, blockId }
  }
})

function getIntensityScore(intensity: string): number {
  switch (intensity) {
    case 'recovery':
      return 0.3
    case 'easy':
      return 0.5
    case 'moderate':
      return 0.7
    case 'hard':
      return 0.85
    case 'very_hard':
      return 0.95
    default:
      return 0.5
  }
}
