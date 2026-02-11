import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

async function main() {
  const connectionString = process.env.DATABASE_URL
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const recentNutrition = await prisma.nutrition.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    })

    console.log('Recent Nutrition Updates:')
    recentNutrition.forEach((n) => {
      console.log(
        `- User: ${n.user.name} (${n.user.email}) | Date: ${n.date.toISOString().split('T')[0]} | Updated: ${n.updatedAt.toISOString()}`
      )
      console.log(`  Breakfast: ${JSON.stringify(n.breakfast)?.substring(0, 100)}`)
      console.log(`  Lunch: ${JSON.stringify(n.lunch)?.substring(0, 100)}`)
      console.log(`  Dinner: ${JSON.stringify(n.dinner)?.substring(0, 100)}`)
      console.log(`  Snacks: ${JSON.stringify(n.snacks)?.substring(0, 100)}`)
    })
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
