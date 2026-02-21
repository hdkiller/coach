import { config } from '@vue-email/compiler'
import { resolve } from 'path'
import fs from 'fs'
import { getInternalApiToken } from '../../utils/internal-api-token'

/**
 * Internal API to render Vue email templates to HTML/Text.
 */
export default defineEventHandler(async (event) => {
  const internalToken = getInternalApiToken()
  const incomingToken = getRequestHeader(event, 'x-internal-api-token')

  if (!internalToken || incomingToken !== internalToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readBody(event)

  const templateKey = body?.templateKey
  const props = body?.props || {}

  if (!templateKey || typeof templateKey !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: templateKey is required'
    })
  }

  const rootDir = process.cwd()
  const emailDir = resolve(rootDir, 'app/emails')
  const templateFileName = `${templateKey}.vue`
  const fullPath = resolve(emailDir, templateFileName)

  if (!fs.existsSync(fullPath)) {
    throw createError({
      statusCode: 404,
      statusMessage: `Template file not found at ${fullPath}`
    })
  }

  try {
    const vueEmail = config(emailDir)

    // Attempt rendering
    const result = await vueEmail.render(templateFileName, { props })

    return {
      html: result.html,
      text: result.text
    }
  } catch (err: any) {
    console.error(`[InternalRender] Error rendering ${templateKey}:`, err)
    throw createError({
      statusCode: 500,
      statusMessage: `Rendering failed: ${err.message}`
    })
  }
})
