export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'development') return

  const config = useRuntimeConfig()
  const authOrigin = config.authOrigin
  const callbackUrl = `${authOrigin}/callback/google`

  console.log(`🔐 Google OAuth Callback URL: ${callbackUrl}`)
})
