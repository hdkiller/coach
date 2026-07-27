import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { auditLogRepository } from '../../../utils/repositories/auditLogRepository'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event).catch(() => ({}))
  const valueType = typeof body?.valueType === 'string' ? body.valueType : 'dashboard_insight'

  const existing = await prisma.auditLog.findFirst({
    where: {
      userId: user.id,
      action: 'FIRST_VALUE_VIEWED'
    },
    select: { id: true }
  })

  if (!existing) {
    await auditLogRepository.log({
      userId: user.id,
      action: 'FIRST_VALUE_VIEWED',
      metadata: { value_type: valueType }
    })
  }

  return { success: true }
})
