import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const tiers = [
    { email: 'free@coachwatts.test', name: 'Free Athlete', role: Role.FREE },
    { email: 'uncover@coachwatts.test', name: 'Uncover Athlete', role: Role.UNCOVER },
    { email: 'unlock@coachwatts.test', name: 'Unlock Athlete', role: Role.UNLOCK },
    { email: 'unleash@coachwatts.test', name: 'Unleash Athlete', role: Role.UNLEASH }
  ]

  for (const tier of tiers) {
    const user = await prisma.user.upsert({
      where: { email: tier.email },
      update: { role: tier.role },
      create: {
        email: tier.email,
        name: tier.name,
        role: tier.role
      }
    })
    console.log(`Seeded user ${user.email} with role ${user.role}`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
