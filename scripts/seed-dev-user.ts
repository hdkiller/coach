import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const email = process.env.AUTH_BYPASS_USER || 'dev@coachwatts.test'
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: process.env.AUTH_BYPASS_NAME || 'Dev Athlete',
      emailVerified: new Date(),
      isAdmin: true,
      ftp: 250,
      maxHr: 190,
      weight: 72,
      uiLanguage: 'en',
      timezone: 'UTC'
    }
  })
  console.log('Seeded dev user:', { id: user.id, email: user.email, isAdmin: user.isAdmin })
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
