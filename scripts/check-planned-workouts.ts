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
    console.log(`Checking planned workouts for ${userId} on ${date.toISOString()}...`)

    const workouts = await prisma.plannedWorkout.findMany({
      where: {
        userId,
        date
      }
    })

    console.log(`Found ${workouts.length} workouts.`)
    workouts.forEach((w) => {
      console.log(
        `- Title: ${w.title} | Type: ${w.type} | Date: ${w.date.toISOString()} | StartTime: ${w.startTime}`
      )
    })
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
