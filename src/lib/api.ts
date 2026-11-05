import axios, { AxiosError } from 'axios'
import { useWorkspace } from '../stores/workspace'
import type { Envelope, PageMeta, Paged } from '../types/api'

/** Every failed API call becomes one of these, built from the error envelope. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly errors: Record<string, string[]>

  constructor(status: number, code: string, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }

  /** First message for a field, for showing under an input. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0]
  }
}

export const http = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Requests "inside an organisation" carry the chosen workspace.
http.interceptors.request.use((config) => {
  const organisation = useWorkspace.getState().organisationUuid
  if (organisation && config.url?.startsWith('/organisation')) {
    config.headers.set('X-Organisation', organisation)
  }
  return config
})

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0
    const body = error.response?.data as Partial<Envelope<unknown>> & { code?: string; errors?: Record<string, string[]> } | undefined

    if (status === 0) {
      return new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check that the backend is running.')
    }

    return new ApiError(
      status,
      body?.code ?? `HTTP_${status}`,
      body?.message ?? 'Something went wrong.',
      Array.isArray(body?.errors) ? {} : (body?.errors ?? {}),
    )
  }

  return new ApiError(0, 'UNKNOWN', error instanceof Error ? error.message : 'Something went wrong.')
}

async function envelope<T>(request: Promise<{ data: Envelope<T> }>): Promise<Envelope<T>> {
  try {
    return (await request).data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Sanctum: fetch the CSRF cookie before register / login. */
export async function csrf(): Promise<void> {
  try {
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
  } catch (error) {
    throw toApiError(error)
  }
}

type Params = Record<string, string | number | boolean | undefined | null>

function clean(params?: Params) {
  if (!params) return undefined
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

export const api = {
  async get<T>(url: string, params?: Params): Promise<T> {
    return (await envelope<T>(http.get(url, { params: clean(params) }))).data
  },

  async page<T>(url: string, params?: Params): Promise<Paged<T>> {
    const res = await envelope<T[]>(http.get(url, { params: clean(params) }))
    return { items: res.data, meta: res.meta as unknown as PageMeta }
  },

  async post<T = unknown>(url: string, body?: unknown): Promise<Envelope<T>> {
    return envelope<T>(http.post(url, body))
  },

  async patch<T = unknown>(url: string, body?: unknown): Promise<Envelope<T>> {
    return envelope<T>(http.patch(url, body))
  },

  async put<T = unknown>(url: string, body?: unknown): Promise<Envelope<T>> {
    return envelope<T>(http.put(url, body))
  },

  async del<T = unknown>(url: string): Promise<Envelope<T>> {
    return envelope<T>(http.delete(url))
  },
}
