export default defineNitroPlugin((nitroApp) => {
  const authOrigin = process.env.NUXT_AUTH_ORIGIN || 'http://localhost:3099/api/auth'
  const callbackUrl = `${authOrigin}/callback/google`
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔐 Google OAuth Callback URL:')
  console.log(`   ${callbackUrl}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})