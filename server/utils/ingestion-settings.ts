import { isAutoDeduplicateWorkoutsEnabled } from '../../app/utils/ingestion-settings'
import { prisma } from './db'

export async function shouldAutoDeduplicateWorkoutsAfterIngestion(
  userId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dashboardSettings: true }
  })

  return isAutoDeduplicateWorkoutsEnabled(user?.dashboardSettings)
}
