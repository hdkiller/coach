import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

async function main() {
  const workoutId = '21ec02ff-b6f6-4c63-999c-b51a287b0c6f'
  const connectionString = process.env.DATABASE_URL_PROD
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const adherence = await prisma.planAdherence.findUnique({
      where: { workoutId }
    })
    console.log('--- PlanAdherence ---')
    console.log(JSON.stringify(adherence, null, 2))

    if (adherence?.plannedWorkoutId) {
      const planned = await prisma.plannedWorkout.findUnique({
        where: { id: adherence.plannedWorkoutId }
      })
      console.log('\n--- PlannedWorkout ---')
      console.log(JSON.stringify(planned, null, 2))
    }

    const workout = await prisma.workout.findUnique({
      where: { id: workoutId }
    })
    console.log('\n--- Workout ---')
    console.log(JSON.stringify({ ...workout, rawJson: undefined }, null, 2))

    const llmUsages = await prisma.llmUsage.findMany({
      where: { entityId: workoutId },
      orderBy: { createdAt: 'desc' }
    })
    console.log('\n--- LlmUsage ---')
    console.log(
      JSON.stringify(
        llmUsages.map((l) => ({
          id: l.id,
          operation: l.operation,
          success: l.success,
          createdAt: l.createdAt
        })),
        null,
        2
      )
    )
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
