import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

async function main() {
  const connectionString = process.env.DATABASE_URL
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const userId = '67583aa2-5efc-49b4-8240-796f048caa4f' // lracz@newpush.com
  const date = new Date('2026-02-11T00:00:00Z')

  try {
    console.log(`Inspecting Nutrition record for ${userId} on ${date.toISOString()}...`)

    const nutrition = await prisma.nutrition.findUnique({
      where: { userId_date: { userId, date } }
    })

    if (!nutrition) {
      console.log('No nutrition record found.')
      return
    }

    console.log('Nutrition Record ID:', nutrition.id)
    console.log('Fueling Plan:', JSON.stringify(nutrition.fuelingPlan, null, 2))

    console.log('\nChecking Planned Workouts for same day...')
    const workouts = await prisma.plannedWorkout.findMany({
      where: { userId, date }
    })
    workouts.forEach((w) => {
      console.log(`- ID: ${w.id} | Title: ${w.title} | StartTime: ${w.startTime}`)
    })
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
