import { Readable } from 'node:stream'

import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { UserUniverseCollector } from '../../utils/data-management/collector'

function* serializeJsonChunks(value: unknown): Generator<string> {
  if (value === null || typeof value !== 'object') {
    yield JSON.stringify(value)
    return
  }

  if (Array.isArray(value)) {
    yield '['

    for (const [index, item] of value.entries()) {
      if (index > 0) {
        yield ','
      }

      yield* serializeJsonChunks(item)
    }

    yield ']'
    return
  }

  if (typeof (value as { toJSON?: () => unknown }).toJSON === 'function') {
    yield* serializeJsonChunks((value as { toJSON: () => unknown }).toJSON())
    return
  }

  yield '{'

  let isFirstProperty = true

  for (const [key, propertyValue] of Object.entries(value)) {
    if (propertyValue === undefined || typeof propertyValue === 'function') {
      continue
    }

    if (!isFirstProperty) {
      yield ','
    }

    isFirstProperty = false
    yield JSON.stringify(key)
    yield ':'
    yield* serializeJsonChunks(propertyValue)
  }

  yield '}'
}

async function* createExportJsonStream(userId: string) {
  const collector = new UserUniverseCollector(prisma, userId)

  yield '{'
  yield '"metadata":'
  yield* serializeJsonChunks({
    userId,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  })
  yield ',"profile":'
  yield* serializeJsonChunks(await collector.collectProfile())
  yield ',"plans":'
  yield* serializeJsonChunks(await collector.collectPlans())
  yield ',"activities":'
  yield* serializeJsonChunks(await collector.collectActivities())
  yield ',"health":'
  yield* serializeJsonChunks(await collector.collectHealth())
  yield ',"nutrition":'
  yield* serializeJsonChunks(await collector.collectNutrition())
  yield ',"ai":'
  yield* serializeJsonChunks(await collector.collectAI())
  yield ',"system":'
  yield* serializeJsonChunks(await collector.collectSystem())
  yield '}'
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Set headers for file download
  const filename = `watts_export_${user.email.replace(/[@.]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`

  setHeaders(event, {
    'Content-Type': 'application/json',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  })

  return sendStream(event, Readable.from(createExportJsonStream(user.id)))
})
