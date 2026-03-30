import { z } from 'zod'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { toPrismaNullableJsonValue } from '../../../../utils/prisma-json'

const importPlanSchema = z.object({
  folderId: z.string().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Plan ID is required.' })
  }

  const body = importPlanSchema.parse((await readBody(event)) || {})
  const userId = session.user.id

  const memberships = await prisma.teamMember.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { teamId: true }
  })
  const teamIds = memberships.map((membership) => membership.teamId)

  const sourcePlan = await prisma.trainingPlan.findFirst({
    where: {
      id,
      isTemplate: true,
      OR: [{ userId }, { visibility: 'PUBLIC' }, { visibility: 'TEAM', teamId: { in: teamIds } }]
    },
    include: {
      sampleWeeks: {
        select: { weekId: true }
      },
      blocks: {
        orderBy: { order: 'asc' },
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            include: {
              workouts: {
                orderBy: [{ weekIndex: 'asc' }, { dayIndex: 'asc' }]
              }
            }
          }
        }
      }
    }
  })

  if (!sourcePlan) {
    throw createError({ statusCode: 404, message: 'Plan not found.' })
  }

  if (sourcePlan.userId === userId) {
    return {
      imported: false,
      alreadyOwned: true,
      planId: sourcePlan.id
    }
  }

  const importedPlan = await prisma.$transaction(async (tx) => {
    const createdPlan = await tx.trainingPlan.create({
      data: {
        userId,
        goalId: sourcePlan.goalId,
        startDate: sourcePlan.startDate,
        targetDate: sourcePlan.targetDate,
        strategy: sourcePlan.strategy,
        status: 'ACTIVE',
        description: sourcePlan.description,
        fromTemplateId: sourcePlan.id,
        isTemplate: true,
        isPublic: false,
        slug: null,
        visibility: 'PRIVATE',
        accessState: 'PRIVATE',
        primarySport: sourcePlan.primarySport,
        sportSubtype: sourcePlan.sportSubtype,
        difficulty: sourcePlan.difficulty,
        skillLevel: sourcePlan.skillLevel,
        planLanguage: sourcePlan.planLanguage,
        daysPerWeek: sourcePlan.daysPerWeek,
        weeklyVolumeBand: sourcePlan.weeklyVolumeBand,
        goalLabel: sourcePlan.goalLabel,
        equipmentTags: sourcePlan.equipmentTags || [],
        publicHeadline: sourcePlan.publicHeadline,
        publicDescription: sourcePlan.publicDescription,
        methodology: sourcePlan.methodology,
        whoItsFor: sourcePlan.whoItsFor,
        faq: sourcePlan.faq,
        extraContent: sourcePlan.extraContent,
        name: sourcePlan.name,
        coachNotes: sourcePlan.coachNotes,
        athleteNotes: sourcePlan.athleteNotes,
        activityTypes: toPrismaNullableJsonValue(sourcePlan.activityTypes),
        customInstructions: sourcePlan.customInstructions as string | null,
        recoveryRhythm: sourcePlan.recoveryRhythm,
        hasBeenSavedAsTemplate: true,
        folderId: body.folderId ?? null,
        teamId: null,
        blocks: {
          create: sourcePlan.blocks.map((block) => ({
            order: block.order,
            name: block.name,
            description: block.description as string | null,
            type: block.type,
            primaryFocus: block.primaryFocus,
            startDate: block.startDate,
            durationWeeks: block.durationWeeks,
            recoveryWeekIndex: block.recoveryWeekIndex,
            progressionLogic: block.progressionLogic,
            weeks: {
              create: block.weeks.map((week) => ({
                weekNumber: week.weekNumber,
                startDate: week.startDate,
                endDate: week.endDate,
                volumeTargetMinutes: week.volumeTargetMinutes,
                tssTarget: week.tssTarget,
                isRecovery: week.isRecovery,
                focus: week.focus,
                explanation: week.explanation,
                focusKey: week.focusKey,
                focusLabel: week.focusLabel,
                workouts: {
                  create: week.workouts.map((workout) => ({
                    user: { connect: { id: userId } },
                    externalId: `import_${sourcePlan.id}_${crypto.randomUUID()}`,
                    date: workout.date,
                    dayIndex: workout.dayIndex,
                    weekIndex: workout.weekIndex,
                    title: workout.title,
                    description: workout.description,
                    type: workout.type,
                    category: workout.category,
                    durationSec: workout.durationSec,
                    distanceMeters: workout.distanceMeters,
                    tss: workout.tss,
                    workIntensity: workout.workIntensity,
                    rawJson: toPrismaNullableJsonValue(workout.rawJson),
                    modifiedLocally: true,
                    structuredWorkout: toPrismaNullableJsonValue(workout.structuredWorkout),
                    targetArea: workout.targetArea,
                    managedBy: 'COACH_WATTS',
                    fuelingStrategy: workout.fuelingStrategy,
                    startTime: workout.startTime,
                    createdFromSettingsSnapshot: toPrismaNullableJsonValue(
                      workout.createdFromSettingsSnapshot
                    ),
                    lastGenerationSettingsSnapshot: toPrismaNullableJsonValue(
                      workout.lastGenerationSettingsSnapshot
                    ),
                    lastGenerationContext: toPrismaNullableJsonValue(workout.lastGenerationContext)
                  }))
                }
              }))
            }
          }))
        }
      },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
              select: { id: true, weekNumber: true }
            }
          }
        }
      }
    })

    const sourceWeekToImportedWeekId = new Map<string, string>()

    sourcePlan.blocks.forEach((sourceBlock, blockIndex) => {
      const createdBlock = (createdPlan as any).blocks[blockIndex]
      sourceBlock.weeks.forEach((sourceWeek, weekIndex) => {
        const createdWeek = createdBlock?.weeks?.[weekIndex]
        if (createdWeek) {
          sourceWeekToImportedWeekId.set(sourceWeek.id, createdWeek.id)
        }
      })
    })

    const importedSampleWeekIds = sourcePlan.sampleWeeks
      .map((sampleWeek) => sourceWeekToImportedWeekId.get(sampleWeek.weekId))
      .filter((weekId): weekId is string => !!weekId)

    if (importedSampleWeekIds.length > 0) {
      await tx.trainingPlanPublicSampleWeek.createMany({
        data: importedSampleWeekIds.map((weekId) => ({
          planId: createdPlan.id,
          weekId
        }))
      })
    }

    return createdPlan
  })

  return {
    imported: true,
    alreadyOwned: false,
    planId: importedPlan.id
  }
})
