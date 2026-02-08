import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import crypto from 'crypto'
import { tasks } from '@trigger.dev/sdk/v3'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Upload FIT file',
    description: 'Uploads a .fit file for processing and ingestion.',
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
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Check authentication (using NuxtAuth session)
  const session = await getServerSession(event)
  if (!session || !session.user?.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

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

  // Process each file
  for (const filePart of fileParts) {
    try {
      // Validate filename
      const filename = filePart.filename || 'upload.fit'
      if (!filename.toLowerCase().endsWith('.fit')) {
        results.failed++
        results.errors.push(`${filename}: Invalid file type`)
        continue
      }

      const fileData = filePart.data

      // Calculate hash
      const hash = crypto.createHash('sha256').update(fileData).digest('hex')

      // Check for duplicates
      const existingFile = await prisma.fitFile.findFirst({
        where: { hash },
        include: { workout: true }
      })

      let fitFileId = existingFile?.id

      if (existingFile) {
        // If the file exists and is linked to a workout, it's a real duplicate
        if (existingFile.workoutId) {
          results.duplicates++
          continue
        }

        // If the file exists but has no workout, it's "orphaned"
        // We can reuse/re-adopt it by updating its metadata if needed, 
        // but primarily we just need to proceed to trigger ingestion.
        console.info(`Adopting orphaned FIT file: ${existingFile.id}`)
        await prisma.fitFile.update({
          where: { id: existingFile.id },
          data: {
            userId: user.id,
            filename,
            // fileData stays the same
          }
        })
      } else {
        // Store new file in DB
        const newFitFile = await prisma.fitFile.create({
          data: {
            userId: user.id,
            filename,
            fileData: Buffer.from(fileData),
            hash
          }
        })
        fitFileId = newFitFile.id
      }

      // Trigger ingestion task
      await tasks.trigger(
        'ingest-fit-file',
        {
          userId: user.id,
          fitFileId: fitFileId!
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
