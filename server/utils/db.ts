import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prismaClientSingleton = () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobalV2: undefined | ReturnType<typeof prismaClientSingleton>
}

const internalPrisma = globalThis.prismaGlobalV2 ?? prismaClientSingleton()

// Use a Proxy to allow the prisma export to always point to the "current" global instance.
// This is critical for CLI tools that switch between development and production databases
// after modules have already been loaded.
export const prisma = new Proxy({} as typeof internalPrisma, {
  get(target, prop) {
    const activePrisma = globalThis.prismaGlobalV2 ?? internalPrisma
    const value = (activePrisma as any)[prop]
    if (typeof value === 'function') {
      return value.bind(activePrisma)
    }
    return value
  }
})

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobalV2 = internalPrisma
