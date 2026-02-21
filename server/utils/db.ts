import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prismaGlobalV2: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prismaGlobalV2 ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobalV2 = prisma
