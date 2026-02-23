export function getInternalApiToken() {
  return (
    process.env.INTERNAL_API_TOKEN ||
    (process.env.NODE_ENV === 'development' ? 'dev-internal-token' : null)
  )
}
