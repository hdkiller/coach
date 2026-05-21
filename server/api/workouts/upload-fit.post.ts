import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import crypto from 'crypto'
import { tasks } from '@trigger.dev/sdk/v3'
import AdmZip from 'adm-zip'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Upload activity file',
    description:
      'Uploads one or more .fit, .gpx, .tcx files, or a .zip archive containing them, for processing and ingestion.',
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
                description: 'A .fit, .gpx, .tcx, or .zip file (multiple allowed)'
              },
              name: {
                type: 'string',
                description:
                  'Optional activity name for the imported workout title. Falls back to the filename.'
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

type ActivityFileType = 'FIT' | 'GPX' | 'TCX'

const ZIP_MAX_ENTRIES = 100
const ZIP_MAX_ENTRY_BYTES = 50 * 1024 * 1024 // 50 MB per entry
const ZIP_MAX_TOTAL_BYTES = 200 * 1024 * 1024 // 200 MB total uncompressed

function detectFileType(filename: string): ActivityFileType | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'fit') return 'FIT'
  if (ext === 'gpx') return 'GPX'
  if (ext === 'tcx') return 'TCX'
  return null
}

interface ActivityFileEntry {
  filename: string
  data: Buffer
  fileType: ActivityFileType
}

/**
 * Extracts activity files from a buffer.
 * For ZIP files, unpacks and returns all .fit/.gpx/.tcx entries.
 * For other supported files, returns a single-entry array.
 */
function extractActivityFiles(filename: string, data: Buffer): ActivityFileEntry[] {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext === 'zip') {
    let zip: AdmZip
    try {
      zip = new AdmZip(data)
    } catch {
      return []
    }

    const allEntries = zip.getEntries()
    if (allEntries.length > ZIP_MAX_ENTRIES) {
      throw new Error(`ZIP archive exceeds maximum of ${ZIP_MAX_ENTRIES} entries`)
    }

    const entries: ActivityFileEntry[] = []
    let totalUncompressedBytes = 0

    for (const entry of allEntries) {
      if (entry.isDirectory) continue
      if (entry.header.encripted) {
        throw new Error('Encrypted ZIP archives are not supported')
      }
      const uncompressedSize = entry.header.size
      if (uncompressedSize > ZIP_MAX_ENTRY_BYTES) {
        throw new Error(
          `ZIP entry "${entry.entryName}" exceeds maximum size of ${Math.round(ZIP_MAX_ENTRY_BYTES / 1024 / 1024)} MB`
        )
      }
      totalUncompressedBytes += uncompressedSize
      if (totalUncompressedBytes > ZIP_MAX_TOTAL_BYTES) {
        throw new Error(
          `ZIP archive total uncompressed size exceeds maximum of ${Math.round(ZIP_MAX_TOTAL_BYTES / 1024 / 1024)} MB`
        )
      }
      const entryName = entry.entryName.split('/').pop() ?? entry.entryName
      const fileType = detectFileType(entryName)
      if (!fileType) continue
      entries.push({
        filename: entryName,
        data: zip.readFile(entry) ?? Buffer.alloc(0),
        fileType
      })
    }
    return entries
  }

  const fileType = detectFileType(filename)
  if (!fileType) return []
  return [{ filename, data, fileType }]
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['workout:write'])

  const body = await readMultipartFormData(event)
  if (!body || body.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const fileParts = body.filter((part) => part.name === 'file')
  if (fileParts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'File field missing' })
  }

  const results = {
    total: 0,
    processed: 0,
    duplicates: 0,
    failed: 0,
    errors: [] as string[]
  }

  const metadataPart = body.find((part) => part.name === 'metadata')
  const nameParts = body
    .filter((part) => part.name === 'name')
    .map((part) => part.data.toString().trim())
    .filter(Boolean)

  let rawJson: any = null
  if (metadataPart) {
    try {
      rawJson = JSON.parse(metadataPart.data.toString())
    } catch {
      // non-fatal
    }
  }

  const oauthAppId = event.context.authType === 'oauth' ? event.context.oauthAppId : undefined

  for (const [index, filePart] of fileParts.entries()) {
    const uploadedFilename = filePart.filename || 'upload.fit'
    const activityName = nameParts[index] || nameParts[0] || undefined

    let entries: ActivityFileEntry[]
    try {
      entries = extractActivityFiles(uploadedFilename, Buffer.from(filePart.data))
    } catch (error: any) {
      results.failed++
      results.errors.push(`${uploadedFilename}: ${error.message}`)
      continue
    }
    results.total += entries.length

    for (const entry of entries) {
      try {
        const hash = crypto.createHash('sha256').update(entry.data).digest('hex')

        const existing = await prisma.fitFile.findFirst({
          where: { userId: user.id, hash }
        })

        if (existing) {
          results.duplicates++
          continue
        }

        const fitFile = await prisma.fitFile.create({
          data: {
            userId: user.id,
            filename: entry.filename,
            fileData: entry.data,
            fileType: entry.fileType,
            hash
          }
        })

        await tasks.trigger(
          'ingest-activity-file',
          {
            userId: user.id,
            fitFileId: fitFile.id,
            activityName,
            rawJson,
            oauthAppId
          },
          {
            concurrencyKey: user.id,
            tags: [`user:${user.id}`]
          }
        )

        results.processed++
      } catch (error: any) {
        results.failed++
        results.errors.push(`${entry.filename}: ${error.message}`)
      }
    }
  }

  return {
    success: results.processed > 0 || results.duplicates > 0,
    message: `Processed ${results.processed} files. ${results.duplicates} duplicates. ${results.failed} failed.`,
    results
  }
})
