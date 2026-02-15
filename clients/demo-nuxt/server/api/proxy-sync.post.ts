export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'Authorization')
  const body = await readBody(event)

  if (!authHeader) {
    throw createError({ statusCode: 401, message: 'Missing Authorization header' })
  }

  const { type, payload } = body
  const endpoint = type === 'wellness' ? '/api/wellness' : '/api/nutrition'

  try {
    const response = await $fetch(`${config.public.coachWattsUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader
      },
      body: payload
    })

    return response
  } catch (error: any) {
    console.error(`Proxy sync error [${type}]:`, error.data || error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.data?.message || `Failed to sync ${type} data`
    })
  }
})
