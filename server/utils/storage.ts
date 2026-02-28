import { Storage } from '@google-cloud/storage'

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'coach-wattz-public-assets'

// Initialize storage client
const getStorage = () => {
  const options: any = {
    projectId: process.env.GCLOUD_PROJECT || 'coach-app-481412'
  }

  // In production, we prefer environment variable for secrets
  if (process.env.GCS_KEY_JSON) {
    try {
      options.credentials = JSON.parse(process.env.GCS_KEY_JSON)
    } catch (e) {
      console.error('Failed to parse GCS_KEY_JSON', e)
    }
  } else if (process.env.NODE_ENV === 'development') {
    // In development, try to load from local file
    // The library handles keyFilename resolution relative to cwd
    options.keyFilename = 'gcs-key.json'
  }

  return new Storage(options)
}

const storage = getStorage()

/**
 * Uploads a file to the public assets bucket
 * @param fileBuffer - The file content
 * @param filename - The target filename (e.g. 'logos/my-team.png')
 * @param contentType - MIME type of the file
 * @returns The public URL of the uploaded file
 */
export const uploadPublicAsset = async (
  fileBuffer: Buffer | Uint8Array,
  filename: string,
  contentType?: string
): Promise<string> => {
  try {
    const bucket = storage.bucket(BUCKET_NAME)
    const file = bucket.file(filename)

    await file.save(Buffer.from(fileBuffer), {
      contentType,
      resumable: false, // Disable resumable uploads for small files (faster)
      metadata: {
        cacheControl: 'public, max-age=31536000' // Cache for 1 year
      }
    })

    // Return the public URL
    // Since we granted Storage Object Viewer to allUsers on the bucket,
    // this public URL will be accessible.
    return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`
  } catch (error) {
    console.error('GCS Upload Error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to upload asset'
    })
  }
}
