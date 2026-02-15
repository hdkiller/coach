import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import crypto from 'crypto'
import { tasks } from '@trigger.dev/sdk/v3'

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
                    errors: { type: 'array', items: { type: 'string' } }
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
    errors: [] as string[]
  }

  // Extract metadata if present
  const metadataPart = body.find((part) => part.name === 'metadata')
  let rawJson: any = null
  if (metadataPart) {
    try {
      rawJson = JSON.parse(metadataPart.data.toString())
    } catch (e) {
      console.warn('Failed to parse metadata JSON', e)
    }
  }

  // Calculate source attribution
  const source =
    event.context.authType === 'oauth' ? `oauth:${event.context.oauthAppId}` : 'manual_upload'

  // Process each file
  for (const filePart of fileParts) {
    try {
      // ... (existing code for hash and file creation)

      // Trigger ingestion task
      await tasks.trigger(
        'ingest-fit-file',
        {
          userId: user.id,
          fitFileId: fitFileId!,
          rawJson,
          source // Pass the source attribution
        },
        {
          concurrencyKey: user.id,
          tags: [`user:${user.id}`]
        }
      )

      results.processed++
    } catch (error: any) {
      results.failed++
      results.errors.push(`${filePart.filename}: ${error.message}`)
    }
  }

  return {
    success: results.processed > 0 || results.duplicates > 0,
    message: `Processed ${results.processed} files. ${results.duplicates} duplicates. ${results.failed} failed.`,
    results
  }
})
