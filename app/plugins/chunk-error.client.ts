export default defineNuxtPlugin((nuxtApp) => {
  // Only run on client-side
  if (import.meta.server) return

  const handleReload = (error: any) => {
    // Check if we already tried to reload in the last 10 seconds to avoid infinite loops
    const lastReload = sessionStorage.getItem('chunk-error-reload')
    const now = Date.now()

    if (lastReload && now - parseInt(lastReload) < 10000) {
      console.error(
        '[ChunkError] Chunk failed to load after reload. Stopping to avoid infinite loop.',
        error
      )
      return
    }

    sessionStorage.setItem('chunk-error-reload', now.toString())

    console.warn(
      '[ChunkError] Chunk failed to load. Reloading page to get latest version...',
      error
    )

    // A hard reload is the most reliable way to fix chunk loading issues after a deployment
    // We use a query parameter to bypass the browser cache, which is especially aggressive on Safari
    const url = new URL(window.location.href)
    // Remove any existing reload param to avoid stacking
    if (url.searchParams.has('reload')) {
      url.searchParams.delete('reload')
    }
    url.searchParams.set('reload', now.toString())
    window.location.href = url.toString()
  }

  // Hook into Nuxt's chunk error handling
  nuxtApp.hook('app:chunkError', ({ error }) => {
    handleReload(error)
  })

  // Fallback for generic module script errors not caught by Nuxt
  window.addEventListener(
    'error',
    (event) => {
      const errorText = event.message || ''
      if (
        errorText.includes('Importing a module script failed') ||
        errorText.includes('Failed to fetch dynamically imported module') ||
        errorText.includes('loading chunk')
      ) {
        handleReload(event.error || errorText)
      }
    },
    true
  )
})
