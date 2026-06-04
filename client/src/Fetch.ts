export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001'

type FetchOptions = {
  method?: string
  token?: string | null
  body?: unknown
}

export class FetchError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'FetchError'
    this.status = status
  }
}

export async function Fetch<T>(path: string, options: FetchOptions = {}) {
  const headers: Record<string, string> = {}

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const payload = await response.json()
      message = payload.error ?? payload.message ?? message
    } catch {
      console.error(message)
    }

    throw new FetchError(message, response.status)
  }

  if (response.status === 204) {
    return null as T
  }

  return response.json() as Promise<T>
}
