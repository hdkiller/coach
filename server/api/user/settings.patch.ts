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

  // Fetch current user to merge settings if needed (though Prisma's logic usually replaces usage of set)
  // For JSON columns, simple update works but if we want deep merge we might need logic.
  // For now, we assume the frontend sends the *complete* dashboardSettings object or we treat top-level keys.
  // Actually, standard practice for simple JSON prefs is "replace" the object or "merge" top level.
  // Let's do a top-level merge in JS before saving to be safe, or just trust frontend state.
  // Given the store does `user.value.dashboardSettings = { ...old, ...new }`, sending the full object is safer.

  // However, to be robust against concurrent edits (rare for single user settings), we can fetch-merge-save.
  // For this simple case, we'll assume the body.dashboardSettings IS the new desired state or a patch.
  // Let's try to update.

  const updateData: any = {}

  if (validBody.dashboardSettings) {
    updateData.dashboardSettings = validBody.dashboardSettings
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
