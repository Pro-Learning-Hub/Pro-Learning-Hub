import { ZodSchema } from 'zod'
import { store } from '@/store/store'
import { logout } from '@/store/slices/authSlice'
import { clearSync } from '@/store/slices/syncSlice'
import { api } from '@/lib/api'

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export class HttpError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
    if (Array.isArray(message)) {
      return message.join(', ')
    }
  }
  return fallback
}

export async function http<T>(
  path: string,
  init: RequestInit = {},
  schema?: ZodSchema<T>,
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status === 204) {
    return undefined as T
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    if (response.status === 401) {
      store.dispatch(api.util.resetApiState())
      store.dispatch(clearSync())
      store.dispatch(logout())
    }
    throw new HttpError(errorMessage(body, response.statusText), response.status, body)
  }

  if (schema) {
    return schema.parse(body)
  }
  return body as T
}
