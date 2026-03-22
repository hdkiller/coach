import { z } from 'zod'
import { requireAuth } from '../../../../utils/auth-guard'

const createFieldSchema = z.object({
  entityType: z.enum(['WELLNESS', 'WORKOUT']),
  fieldKey: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/),
  label: z.string().min(1).max(100),
  dataType: z.enum(['NUMBER', 'BOOLEAN', 'STRING']),
  unit: z.string().max(20).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  
  const result = createFieldSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid field definition'
    })
  }

  try {
    return await prisma.customFieldDefinition.create({
      data: {
        ...result.data,
        ownerId: user.id
      }
    })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'A metric with this key already exists for this scope'
      })
    }

    throw error
  }
})
