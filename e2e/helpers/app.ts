export async function waitForApp(baseUrl: string, attempts = 90) {
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/api/health`

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(healthUrl)
      if (response.ok) {
        return
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(
    `E2E app not reachable at ${healthUrl} after ${attempts}s. Run pnpm e2e:setup (or pnpm e2e:up) first.`
  )
}

export function getE2eBaseUrl() {
  const port = Number(process.env.E2E_PORT ?? 3199)
  return process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`
}
