import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import crypto from 'crypto'
import { dispatchTask } from '../../utils/task-dispatcher'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Upload FIT file',
    description: 'Uploads a .fit file for processing and ingestion.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'The .fit file to upload'
              },
              name: {
                type: 'string',
                description:
                  'Optional activity name to use for the imported workout title. Falls back to the uploaded filename.'
              },
              metadata: {
                type: 'string',
                description: 'Optional JSON string containing raw development data (rawJson)'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                results: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    processed: { type: 'integer' },
                    duplicates: { type: 'integer' },
                    failed: { type: 'integer' },
                    errors: { type: 'array', items: { type: 'string' } },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          filename: { type: 'string' },
                          state: { type: 'string', enum: ['queued', 'stored', 'failed'] },
                          fitFileId: { type: 'string' },
                          workoutId: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      400: { description: 'Invalid file or missing upload' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Check authentication (supports Session, API Key, and OAuth Token)
  const user = await requireAuth(event, ['workout:write'])

  // Read multipart form data
  const body = await readMultipartFormData(event)
  if (!body || body.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file uploaded'
    })
  }

  // Find all file parts
  const fileParts = body.filter((part) => part.name === 'file')
  if (fileParts.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File field missing'
    })
  }

  const results = {
    total: fileParts.length,
    processed: 0,
    duplicates: 0,
    failed: 0,
    errors: [] as string[],
    items: [] as Array<{
      filename: string
      state: 'queued' | 'stored' | 'failed'
      fitFileId?: string
      workoutId?: string
      jobId?: string
    }>
  }

  // Extract metadata if present
  const metadataPart = body.find((part) => part.name === 'metadata')
  const nameParts = body
    .filter((part) => part.name === 'name')
    .map((part) => part.data.toString().trim())
    .filter(Boolean)

  let rawJson: any = null
  if (metadataPart) {
    try {
      rawJson = JSON.parse(metadataPart.data.toString())
    } catch (e) {
      console.warn('Failed to parse metadata JSON', e)
    }
  }

  const oauthAppId = event.context.authType === 'oauth' ? event.context.oauthAppId : undefined
  const healthSource =
    rawJson?.source === 'healthkit' || rawJson?.source === 'health_connect'
      ? rawJson.source
      : undefined
  const platformSessionId =
    typeof rawJson?.platformSessionId === 'string' && rawJson.platformSessionId.trim()
      ? rawJson.platformSessionId.trim()
      : undefined
  const stableExternalId =
    healthSource && platformSessionId
      ? `health_${healthSource}_${platformSessionId}`.slice(0, 500)
      : undefined

  // Process each file
  for (const [index, filePart] of fileParts.entries()) {
    try {
      const activityName = nameParts[index] || nameParts[0] || undefined
      const filename = filePart.filename || 'upload.fit'

      if (stableExternalId) {
        const existingWorkout = await prisma.workout.findUnique({
          where: {
            userId_source_externalId: {
              userId: user.id,
              source: 'fit_file',
              externalId: stableExternalId
            }
          },
          select: { id: true }
        })
        if (existingWorkout) {
          results.duplicates++
          results.items.push({ filename, state: 'stored', workoutId: existingWorkout.id })
          continue
        }
      }

      // Calculate hash to detect duplicates
      const hash = crypto.createHash('sha256').update(filePart.data).digest('hex')

      // Check if file already exists for this user
      const existing = await prisma.fitFile.findFirst({
        where: {
          userId: user.id,
          hash: hash
        }
      })

      if (existing) {
        if (existing.workoutId && stableExternalId) {
          // Backfill durable platform identity for a hash duplicate created by
          // an older client/server version that used a filename-derived id.
          await prisma.workout.updateMany({
            where: { id: existing.workoutId, userId: user.id, source: 'fit_file' },
            data: { externalId: stableExternalId }
          })
        } else if (!existing.workoutId) {
          await dispatchTask(
            'ingest-fit-file',
            {
              userId: user.id,
              fitFileId: existing.id,
              activityName,
              rawJson,
              oauthAppId,
              externalId: stableExternalId
            },
            { concurrencyKey: user.id, tags: [`user:${user.id}`] }
          )
        }
        results.duplicates++
        results.items.push({
          filename,
          state: existing.workoutId ? 'stored' : 'queued',
          fitFileId: existing.id,
          workoutId: existing.workoutId || undefined
        })
        continue
      }

      // Create fit file record
      const fitFile = await prisma.fitFile.create({
        data: {
          userId: user.id,
          filename,
          fileData: Buffer.from(filePart.data),
          hash: hash
        }
      })

      const fitFileId = fitFile.id

      // Trigger ingestion task
      const taskRun = await dispatchTask(
        'ingest-fit-file',
        {
          userId: user.id,
          fitFileId: fitFileId,
          activityName,
          rawJson,
          oauthAppId,
          externalId: stableExternalId
        },
        {
          concurrencyKey: user.id,
          tags: [`user:${user.id}`]
        }
      )

      results.processed++
      results.items.push({ filename, state: 'queued', fitFileId, jobId: taskRun.id })
    } catch (error: any) {
      results.failed++
      results.errors.push(`${filePart.filename}: ${error.message}`)
      results.items.push({
        filename: filePart.filename || 'upload.fit',
        state: 'failed'
      })
    }
  }

  return {
    success: results.processed > 0 || results.duplicates > 0,
    message: `Processed ${results.processed} files. ${results.duplicates} duplicates. ${results.failed} failed.`,
    results
  }
})
