import { getServerSession } from '#auth'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  weight: z.coerce.number().nullable().optional(),
  weightUnits: z.string().nullable().optional(),
  height: z.coerce.number().nullable().optional(),
  heightUnits: z.string().nullable().optional(),
  distanceUnits: z.string().nullable().optional(),
  temperatureUnits: z.string().nullable().optional(),
  restingHr: z.coerce.number().nullable().optional(),
  maxHr: z.coerce.number().nullable().optional(),
  ftp: z.coerce.number().nullable().optional(),
  form: z.string().nullable().optional(),
  visibility: z.string().nullable().optional(),
  sex: z.string().nullable().optional(),
  dob: z.string().nullable().optional(), // Expecting YYYY-MM-DD
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  timezone: z.string().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const result = profileSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.errors
    })
  }

  const data = result.data

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Convert dob string to Date object if present
    let dobDate: Date | null | undefined = undefined
    if (data.dob) {
      dobDate = new Date(data.dob)
    } else if (data.dob === null) {
      dobDate = null
    }

    const updateData: any = {
      ...data,
      dob: dobDate
    }
    
    // Remove dob from spread if it was processed separately to avoid type mismatch if any
    if ('dob' in data) {
      delete updateData.dob
      updateData.dob = dobDate
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData
    })

    return {
      success: true,
      profile: updatedUser
    }
  } catch (error: any) {
    console.error('Error updating profile:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update profile',
      message: error.message
    })
  }
})