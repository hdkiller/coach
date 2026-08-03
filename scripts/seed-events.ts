import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { v4 as uuidv4 } from 'uuid'
import { addDays, subDays } from 'date-fns'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  console.log('Seeding mock users and events...')

  // Create an admin user/owner
  const owner = await prisma.user.upsert({
    where: { email: 'coach@coachwatts.test' },
    update: {},
    create: {
      email: 'coach@coachwatts.test',
      name: 'Coach Nick',
      role: 'ADMIN',
      isAdmin: true
    }
  })

  // Create mock participants
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: { email: 'alice@example.com', name: 'Alice A.', role: 'ONE_ON_ONE' }
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: { email: 'bob@example.com', name: 'Bob B.', role: 'GROUP' }
    }),
    prisma.user.upsert({
      where: { email: 'charlie@example.com' },
      update: {},
      create: { email: 'charlie@example.com', name: 'Charlie C.', role: 'BASIC' }
    })
  ])

  // Create mock events
  const today = new Date()

  await prisma.event.create({
    data: {
      userId: owner.id,
      title: 'Ironman 70.3 Oceanside',
      description: 'The classic season opener in SoCal.',
      date: addDays(today, 30),
      type: 'Triathlon',
      location: 'Oceanside, CA',
      participants: {
        connect: [{ id: users[0].id }, { id: users[1].id }]
      }
    }
  })

  await prisma.event.create({
    data: {
      userId: owner.id,
      title: 'Local 5K Fun Run',
      description: 'A quick tune-up race.',
      date: addDays(today, 10),
      type: 'Running',
      location: 'City Park',
      participants: {
        connect: [{ id: users[2].id }]
      }
    }
  })

  await prisma.event.create({
    data: {
      userId: owner.id,
      title: 'Gravel Grinder 100',
      description: '100 miles of brutal gravel.',
      date: addDays(today, 60),
      type: 'Cycling',
      location: 'Emporia, KS',
      participants: {
        connect: [{ id: users[0].id }, { id: users[1].id }, { id: users[2].id }]
      }
    }
  })

  await prisma.event.create({
    data: {
      userId: owner.id,
      title: 'Tri Nerds Post-Race Social',
      description: 'Beers and burgers after the race.',
      date: addDays(today, 31),
      type: 'Social',
      location: 'Brewery'
    }
  })

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
