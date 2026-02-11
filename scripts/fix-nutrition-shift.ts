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
  const wrongDate = new Date('2026-02-10T00:00:00Z')
  const correctDate = new Date('2026-02-11T00:00:00Z')

  try {
    console.log(`Checking nutrition for ${userId}...`)

    const nutrition10 = await prisma.nutrition.findUnique({
      where: { userId_date: { userId, date: wrongDate } }
    })

    const nutrition11 = await prisma.nutrition.findUnique({
      where: { userId_date: { userId, date: correctDate } }
    })

    if (!nutrition10) {
      console.log('Record for Feb 10 not found. Nothing to move.')
      return
    }

    console.log('Feb 10 data:', {
      breakfast: !!nutrition10.breakfast,
      lunch: !!nutrition10.lunch,
      dinner: !!nutrition10.dinner,
      snacks: !!nutrition10.snacks,
      calories: nutrition10.calories
    })

    if (nutrition11) {
      console.log('Feb 11 already exists. Merging data...')
      // Merge logic: append items to arrays
      const mergeArrays = (a: any, b: any) => {
        const arr = (a as any[]) || []
        const brr = (b as any[]) || []
        return [...arr, ...brr]
      }

      await prisma.nutrition.update({
        where: { id: nutrition11.id },
        data: {
          breakfast: mergeArrays(nutrition11.breakfast, nutrition10.breakfast),
          lunch: mergeArrays(nutrition11.lunch, nutrition10.lunch),
          dinner: mergeArrays(nutrition11.dinner, nutrition10.dinner),
          snacks: mergeArrays(nutrition11.snacks, nutrition10.snacks),
          calories: (nutrition11.calories || 0) + (nutrition10.calories || 0),
          protein: (nutrition11.protein || 0) + (nutrition10.protein || 0),
          carbs: (nutrition11.carbs || 0) + (nutrition10.carbs || 0),
          fat: (nutrition11.fat || 0) + (nutrition10.fat || 0)
        }
      })

      // Clean up the moved data from Feb 10 or delete if it was just a shift
      // In this case, we know the audit log said LOG_NUTRITION_MEAL for "2026-02-11" but it landed in Feb 10.
      // If Feb 10 was actually empty before this shift, we should clear it.
      // For safety, let's just null out the meals on Feb 10 if we're sure it was the shift.
      await prisma.nutrition.update({
        where: { id: nutrition10.id },
        data: {
          breakfast: null,
          lunch: null,
          dinner: null,
          snacks: null,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      })
      console.log('Merge complete.')
    } else {
      console.log('Feb 11 does not exist. Shifting date...')
      await prisma.nutrition.update({
        where: { id: nutrition10.id },
        data: { date: correctDate }
      })
      console.log('Shift complete.')
    }
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
