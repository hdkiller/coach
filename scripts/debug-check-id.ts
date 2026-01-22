import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const id = 'cad4eecb-491d-4086-94c3-7a89befa7228'
const isProd = true // The user said "in prod"

async function main() {
  const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
  if (!connectionString) {
    console.error('No connection string found')
    return
  }

  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    console.log(`Checking ID: ${id}`)

    const planned = await prisma.plannedWorkout.findUnique({ where: { id } })
    if (planned) {
      console.log('Found in PlannedWorkout:', planned)
    } else {
      console.log('Not found in PlannedWorkout')
    }

    const workout = await prisma.workout.findUnique({ where: { id } })
    if (workout) {
      console.log('Found in Workout:', workout)
    } else {
      console.log('Not found in Workout')
    }

    // Check if it's referenced by any ActivityRecommendation
    const rec = await prisma.activityRecommendation.findFirst({
      where: {
        OR: [{ workoutId: id }, { plannedWorkoutId: id }]
      }
    })
    if (rec) {
      console.log('Referenced in ActivityRecommendation:', rec)
    } else {
      console.log('Not found in ActivityRecommendation references')
    }
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
