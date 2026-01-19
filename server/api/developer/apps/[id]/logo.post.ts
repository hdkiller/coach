import { oauthRepository } from '../../../../utils/repositories/oauthRepository'
import { getEffectiveUserId } from '../../../../utils/coaching'
import { uploadPublicAsset } from '../../../../utils/storage'
import { logAction } from '../../../../utils/audit'
import { Jimp } from 'jimp'

defineRouteMeta({
  openAPI: {
    tags: ['Developer'],
    summary: 'Upload App Logo',
    description:
      'Uploads a logo for the application. The image will be cropped/resized to a 512x512 square.',
    requestBody: {
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              logo: { type: 'string', format: 'binary' }
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
                logoUrl: { type: 'string', format: 'uri' }
              }
            }
          }
        }
      },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not Found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing app ID' })
  }

  // Verify ownership before upload
  const app = await oauthRepository.getApp(id)
  if (!app) {
    throw createError({ statusCode: 404, message: 'Application not found' })
  }
  if (app.ownerId !== userId) {
    throw createError({ statusCode: 403, message: 'You do not own this application' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'No form data provided' })
  }

  const logoFile = formData.find((item) => item.name === 'logo')
  if (!logoFile || !logoFile.data) {
    throw createError({ statusCode: 400, message: 'No logo file provided' })
  }

  // Validate file type
  const allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/bmp',
    'image/tiff',
    'image/gif'
  ]
  if (!logoFile.type || !allowedMimeTypes.includes(logoFile.type)) {
    throw createError({
      statusCode: 400,
      message: 'Unsupported file type. Please upload a PNG, JPG, GIF, BMP, or TIFF image.'
    })
  }

  try {
    // Process image with Jimp
    const image = await Jimp.read(logoFile.data)

    // Resize and crop to cover 512x512
    image.cover(512, 512)

    // Convert to PNG buffer
    const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG)

    // Generate a unique filename
    const filename = `oauth/apps/${id}/logo-${Date.now()}.png`

    // Upload to storage
    const logoUrl = await uploadPublicAsset(processedBuffer, filename, 'image/png')

    // Update DB
    await oauthRepository.updateApp(id, userId, { logoUrl })

    await logAction({
      userId,
      action: 'OAUTH_APP_LOGO_UPDATED',
      resourceType: 'OAuthApp',
      resourceId: id,
      metadata: { logoUrl },
      event
    })

    return { logoUrl }
  } catch (error: any) {
    console.error('Logo upload error:', error)

    // Handle Jimp specific errors or generic ones
    const errorMessage = error.message?.includes('Unsupported MIME type')
      ? 'The image format is not supported by our processor.'
      : 'Failed to process and upload logo'

    throw createError({
      statusCode: 400,
      message: errorMessage,
      cause: error
    })
  }
})
