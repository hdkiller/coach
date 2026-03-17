import { Command } from 'commander'
import { prisma } from '../../server/utils/db'

const backfillPlanIndicesCommand = new Command('plan-indices')
  .description('Backfill dayIndex and weekIndex for existing training plan templates')
  .action(async () => {
    console.log('Starting backfill of plan indices...')

    const plans = await (prisma as any).trainingPlan.findMany({
      where: { isTemplate: true },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
              include: {
                workouts: true
              }
            }
          }
        }
      }
    })

    console.log(`Found ${plans.length} template plans to process.`)

    for (const plan of plans) {
      console.log(`Processing plan: ${plan.name} (${plan.id})`)
      let globalWeekCounter = 1

      for (const block of plan.blocks) {
        for (const week of block.weeks) {
          for (const workout of week.workouts) {
            if (workout.dayIndex === null || workout.weekIndex === null) {
              const date = new Date(workout.date)
              const jsDay = date.getUTCDay()
              const dayIndex = jsDay === 0 ? 6 : jsDay - 1

              await prisma.plannedWorkout.update({
                where: { id: workout.id },
                data: {
                  dayIndex,
                  weekIndex: globalWeekCounter
                }
              })
            }
          }
          globalWeekCounter++
        }
      }
    }

    console.log('Backfill complete.')
    await prisma.$disconnect()
  })

export default backfillPlanIndicesCommand
