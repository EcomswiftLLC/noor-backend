import { env, isQfConfigured } from "../config/env.js"

interface CachedToken {
  accessToken: string
  expiresAt: number // epoch ms
}

let cachedToken: CachedToken | null = null

class QfUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "QfUnavailableError"
  }
}

async function getAccessToken(): Promise<string> {
  if (!isQfConfigured()) {
    throw new QfUnavailableError("Quran Foundation credentials are not configured")
  }
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt - 30_000 > now) {
    return cachedToken.accessToken
  }

  const basicAuth = Buffer.from(`${env.qfClientId}:${env.qfClientSecret}`).toString("base64")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(env.qfTokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=content",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new QfUnavailableError(`Token request failed with status ${response.status}`)
    }

    const data = (await response.json()) as { access_token: string; expires_in: number }
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
    return cachedToken.accessToken
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Proxies a single GET request to the Quran Foundation Content API.
 * Never throws a generic error - callers get either the parsed JSON or a
 * QfUnavailableError, which routes translate into a clean "unavailable"
 * response instead of a 500, matching the app's graceful-degradation contract.
 */
export async function qfGet<T>(path: string, searchParams?: Record<string, string>): Promise<T> {
  const token = await getAccessToken()

  const url = new URL(`${env.qfContentBaseUrl}${path}`)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) url.searchParams.set(key, value)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, {
      headers: {
        "x-auth-token": token,
        "x-client-id": env.qfClientId as string,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new QfUnavailableError(`Quran Foundation API returned status ${response.status} for ${path}`)
    }

    return (await response.json()) as T
  } catch (err) {
    if (err instanceof QfUnavailableError) throw err
    throw new QfUnavailableError(`Quran Foundation API request failed: ${(err as Error).message}`)
  } finally {
    clearTimeout(timeout)
  }
}

export { QfUnavailableError }
