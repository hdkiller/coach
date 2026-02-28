import { v4 as uuidv4 } from 'uuid'
import { getServerSession } from '#auth'
import { uploadPublicAsset } from '../../utils/storage'

function normalizeMediaType(mediaType?: string) {
  if (!mediaType) return ''
  return mediaType.split(';')[0]?.trim().toLowerCase() || ''
}

export default defineEventHandler(async (event) => {
  // 1. Check Auth
  const session = await getServerSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // 2. Read Multipart Data
  const files = await readMultipartFormData(event)
  if (!files || files.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  // Assume single file upload
  const file = files[0]
  if (!file || !file.filename) {
    throw createError({ statusCode: 400, message: 'Invalid file' })
  }

  // 3. Validation (Basic)
  const validTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/avif',
    'image/bmp',
    'image/tiff',
    'video/webm',
    'video/mp4',
    'video/ogg',
    'video/quicktime'
  ]
  const mediaType = normalizeMediaType(file.type)

  if (!mediaType || !validTypes.includes(mediaType)) {
    throw createError({
      statusCode: 400,
      message: `Invalid file type: ${file.type}. Only supported image and video files are allowed.`
    })
  }

  const isVideo = mediaType.startsWith('video/')
  const MAX_SIZE = isVideo ? 40 * 1024 * 1024 : 15 * 1024 * 1024
  if (file.data.length > MAX_SIZE) {
    throw createError({
      statusCode: 400,
      message: isVideo
        ? 'File too large. Max 40MB for video.'
        : 'File too large. Max 15MB.'
    })
  }

  // 4. Generate unique filename to prevent collisions
  // Extract extension or default to bin if unknown
  const ext = file.filename.split('.').pop() || 'bin'
  const userId = (session.user as any)?.id || 'anonymous'
  const uniqueFilename = `uploads/${userId}/${uuidv4()}.${ext}`

  // 5. Upload
  try {
    const url = await uploadPublicAsset(file.data, uniqueFilename, mediaType)

    return {
      success: true,
      url,
      filename: uniqueFilename
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Upload failed'
    })
  }
})
