import { z } from 'zod'
import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

const updateSettingsSchema = z.object({
  dashboardSettings: z.object({}).passthrough().optional()
  // Can add other settings here later
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const validateResult = updateSettingsSchema.safeParse(body)

  if (!validateResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: validateResult.error.issues
    })
  }

  const validBody = validateResult.data

  // Fetch current user to merge JSON settings
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dashboardSettings: true }
  })

  const currentSettings = (currentUser?.dashboardSettings as any) || {}
  const updateData: any = {}

  if (validBody.dashboardSettings) {
    // Top-level merge of dashboard settings
    updateData.dashboardSettings = {
      ...currentSettings,
      ...validBody.dashboardSettings
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      dashboardSettings: true
    }
  })

  return {
    success: true,
    settings: updatedUser.dashboardSettings
  }
})
