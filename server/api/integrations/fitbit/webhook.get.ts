defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Fitbit webhook verification',
    description: 'Verifies the Fitbit subscriber endpoint.',
    inputSchema: [{ name: 'verify', in: 'query', schema: { type: 'string' }, required: true }],
    responses: {
      204: { description: 'Verified' },
      404: { description: 'Not Found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const verifyCode = query.verify
  const expectedCode = process.env.FITBIT_SUBSCRIBER_VERIFICATION_CODE

  console.log('[Fitbit Webhook] Verification request:', {
    received: verifyCode,
    expected: expectedCode ? '***' + expectedCode.slice(-4) : 'NOT_SET'
  })

  if (!expectedCode) {
    console.warn('[Fitbit Webhook] FITBIT_SUBSCRIBER_VERIFICATION_CODE not set')
    throw createError({ statusCode: 404 })
  }

  if (verifyCode === expectedCode) {
    setResponseStatus(event, 204)
    return
  }

  throw createError({ statusCode: 404 })
})
