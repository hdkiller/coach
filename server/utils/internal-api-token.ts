export function getInternalApiToken() {
  return process.env.INTERNAL_API_TOKEN || process.env.NUXT_AUTH_SECRET || null
}
