import { prisma } from '../db'

export async function isNutritionTrackingEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { nutritionTrackingEnabled: true }
  })

  return user?.nutritionTrackingEnabled ?? true
}
