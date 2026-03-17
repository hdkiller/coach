import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { z } from 'zod'

const architectPatchSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  difficulty: z.number().int().min(1).max(10).optional(),
  isPublic: z.boolean().optional(),
  blocks: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      type: z.string(),
      primaryFocus: z.string(),
      durationWeeks: z.number().int(),
      order: z.number().int(),
      weeks: z.array(
        z.object({
          id: z.string().optional(),
          weekNumber: z.number().int(),
          volumeTargetMinutes: z.number().int(),
          tssTarget: z.number().int(),
          focus: z.string().nullable().optional(),
          workouts: z.array(
            z.object({
              id: z.string().optional(),
              dayIndex: z.number(),
              weekIndex: z.number(),
              title: z.string(),
              type: z.string().nullable(),
              durationSec: z.number().nullable(),
              tss: z.number().nullable(),
              category: z.string().nullable(),
              structuredWorkout: z.any().nullable()
            })
          )
        })
      )
    })
  )
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const userId = session.user.id
  const body = await readBody(event)

  const validation = architectPatchSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const plan = await (prisma as any).trainingPlan.findUnique({
    where: { id, userId },
    include: {
      blocks: {
        include: { weeks: { include: { workouts: true } } }
      }
    }
  })

  if (!plan) throw createError({ statusCode: 404, message: 'Plan not found' })

  const { name, description, difficulty, isPublic, blocks: incomingBlocks } = validation.data

  return await prisma.$transaction(async (tx) => {
    // 1. Update Plan Level Meta
    await (tx as any).trainingPlan.update({
      where: { id },
      data: { name, description, difficulty, isPublic }
    })

    // 2. Handle Block Deletions
    const incomingBlockIds = incomingBlocks.map((b) => b.id).filter(Boolean)
    const existingBlockIds = plan.blocks.map((b) => b.id)
    const blocksToDelete = existingBlockIds.filter((id) => !incomingBlockIds.includes(id))

    if (blocksToDelete.length > 0) {
      await (tx as any).trainingBlock.deleteMany({
        where: { id: { in: blocksToDelete } }
      })
    }

    // 3. Iterate Blocks
    for (const bData of incomingBlocks) {
      let blockId = bData.id

      if (blockId && !blockId.startsWith('temp-')) {
        // Update existing block
        await (tx as any).trainingBlock.update({
          where: { id: blockId },
          data: {
            name: bData.name,
            type: bData.type,
            primaryFocus: bData.primaryFocus,
            durationWeeks: bData.durationWeeks,
            order: bData.order
          }
        })
      } else {
        // Create new block
        const newBlock = await (tx as any).trainingBlock.create({
          data: {
            trainingPlanId: id,
            name: bData.name,
            type: bData.type,
            primaryFocus: bData.primaryFocus,
            durationWeeks: bData.durationWeeks,
            order: bData.order,
            startDate: new Date(0)
          }
        })
        blockId = newBlock.id
      }

      // 4. Handle Week Deletions for this block
      const existingBlock = plan.blocks.find((b) => b.id === blockId)
      const existingWeekIds = existingBlock?.weeks.map((w) => w.id) || []
      const incomingWeekIds = bData.weeks.map((w) => w.id).filter(Boolean)
      const weeksToDelete = existingWeekIds.filter((wid) => !incomingWeekIds.includes(wid))

      if (weeksToDelete.length > 0) {
        await (tx as any).trainingWeek.deleteMany({
          where: { id: { in: weeksToDelete } }
        })
      }

      // 5. Iterate Weeks
      for (const wData of bData.weeks) {
        let weekId = wData.id

        if (weekId && !weekId.startsWith('temp-')) {
          await (tx as any).trainingWeek.update({
            where: { id: weekId },
            data: {
              weekNumber: wData.weekNumber,
              volumeTargetMinutes: wData.volumeTargetMinutes,
              tssTarget: wData.tssTarget,
              focus: wData.focus
            }
          })
        } else {
          const newWeek = await (tx as any).trainingWeek.create({
            data: {
              blockId: blockId!,
              weekNumber: wData.weekNumber,
              volumeTargetMinutes: wData.volumeTargetMinutes,
              tssTarget: wData.tssTarget,
              focus: wData.focus,
              startDate: new Date(0),
              endDate: new Date(0)
            }
          })
          weekId = newWeek.id
        }

        // 6. Handle Workout Deletions for this week
        const existingWeek = existingBlock?.weeks.find((w) => w.id === weekId)
        const existingWorkoutIds = existingWeek?.workouts.map((wo) => wo.id) || []
        const incomingWorkoutIds = wData.workouts.map((wo) => wo.id).filter(Boolean)
        const workoutsToDelete = existingWorkoutIds.filter(
          (woid) => !incomingWorkoutIds.includes(woid)
        )

        if (workoutsToDelete.length > 0) {
          await (tx as any).plannedWorkout.deleteMany({
            where: { id: { in: workoutsToDelete } }
          })
        }

        // 7. Iterate Workouts
        for (const woData of wData.workouts) {
          if (woData.id && !woData.id.startsWith('temp-')) {
            await tx.plannedWorkout.update({
              where: { id: woData.id },
              data: {
                dayIndex: woData.dayIndex,
                weekIndex: woData.weekIndex,
                title: woData.title,
                type: woData.type,
                durationSec: woData.durationSec,
                tss: woData.tss,
                category: woData.category,
                structuredWorkout: woData.structuredWorkout
              }
            })
          } else {
            await tx.plannedWorkout.create({
              data: {
                userId,
                trainingWeekId: weekId,
                externalId: `tmpl_${id}_${Math.random().toString(36).substr(2, 9)}`,
                date: new Date(woData.dayIndex * 24 * 60 * 60 * 1000),
                dayIndex: woData.dayIndex,
                weekIndex: woData.weekIndex,
                title: woData.title,
                type: woData.type,
                durationSec: woData.durationSec,
                tss: woData.tss,
                category: woData.category,
                structuredWorkout: woData.structuredWorkout,
                managedBy: 'COACH_WATTS'
              }
            })
          }
        }
      }
    }

    return { success: true }
  })
})
