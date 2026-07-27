import { z } from 'zod'
import {
  bearerAuthChallengeResponse,
  createMcpHandler,
  verifyBearerToken
} from '@modelcontextprotocol/server'
import { toWebRequest } from '@modelcontextprotocol/node'
import { createCoachWattsMcpServerFactory } from '../utils/mcp/server'
import { createMcpTokenVerifier } from '../utils/mcp/auth'
import { getProtectedResourceMetadataUrl } from '../utils/oauth/metadata'
import { mcpMetrics } from '../utils/mcp/metrics'

let cachedHandler: ReturnType<typeof createMcpHandler> | null = null
let cachedSiteUrl: string | null = null

function getMcpHandler(config: ReturnType<typeof useRuntimeConfig>) {
  const siteUrl = config.public.siteUrl
  if (cachedHandler && cachedSiteUrl === siteUrl) {
    return cachedHandler
  }

  const factory = createCoachWattsMcpServerFactory(config)
  cachedHandler = createMcpHandler(factory, { legacy: 'stateless' })
  cachedSiteUrl = siteUrl
  return cachedHandler
}

async function sendWebResponse(event: any, response: Response) {
  setResponseStatus(event, response.status, response.statusText)
  response.headers.forEach((value, key) => {
    appendHeader(event, key, value)
  })

  if (response.body) {
    return sendStream(event, response.body)
  }

  if (response.status === 204) return null
  return await response.text()
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (config.mcpEnabled !== true) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const method = event.method.toUpperCase()
  if (!['GET', 'POST', 'DELETE'].includes(method)) {
    throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }

  const siteUrl = config.public.siteUrl
  const resourceMetadataUrl = getProtectedResourceMetadataUrl(siteUrl)
  const verifier = createMcpTokenVerifier(siteUrl)

  const req = event.node.req
  const parsedBody = method === 'POST' ? await readBody(event).catch(() => undefined) : undefined

  let authInfo
  try {
    authInfo = await verifyBearerToken(req.headers.authorization, {
      verifier,
      resourceMetadataUrl
    })
  } catch (error) {
    const reason =
      error && typeof error === 'object' && 'error' in error
        ? String((error as { error?: string }).error || 'invalid_token')
        : 'invalid_token'
    mcpMetrics.recordAuthFailure(reason)
    return sendWebResponse(event, bearerAuthChallengeResponse(error, { resourceMetadataUrl }))
  }

  const webRequest = await toWebRequest(req, parsedBody)
  const handler = getMcpHandler(config)
  const response = await handler.fetch(webRequest, { authInfo, parsedBody })
  return sendWebResponse(event, response)
})
