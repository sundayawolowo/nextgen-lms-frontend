import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { useWorkspace } from '../stores/workspace'
import { ApiError, http, toApiError } from './api'

function axiosError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  })
}

describe('toApiError', () => {
  it('reads the error envelope', () => {
    const error = toApiError(
      axiosError(422, {
        success: false,
        message: 'The given data was invalid.',
        code: 'VALIDATION_FAILED',
        errors: { email: ['These credentials do not match our records.'] },
      }),
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(422)
    expect(error.code).toBe('VALIDATION_FAILED')
    expect(error.field('email')).toBe('These credentials do not match our records.')
  })

  it('treats an empty errors object from PHP ([]) as no field errors', () => {
    const error = toApiError(axiosError(403, { success: false, message: 'Nope', code: 'FORBIDDEN', errors: [] }))
    expect(error.errors).toEqual({})
    expect(error.message).toBe('Nope')
  })

  it('explains network failures', () => {
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK', config))
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.message).toMatch(/backend/)
  })
})

describe('organisation header', () => {
  const run = (url: string) => {
    const handlers = (http.interceptors.request as unknown as { handlers: { fulfilled: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig }[] }).handlers
    return handlers[0].fulfilled({ url, headers: new AxiosHeaders() } as InternalAxiosRequestConfig)
  }

  it('is sent only on organisation routes, when a workspace is chosen', () => {
    useWorkspace.setState({ organisationUuid: 'org-123' })

    expect(run('/organisation/members').headers.get('X-Organisation')).toBe('org-123')
    expect(run('/me').headers.get('X-Organisation')).toBeUndefined()
  })

  it('is not sent in the personal workspace', () => {
    useWorkspace.setState({ organisationUuid: null })
    expect(run('/organisation/members').headers.get('X-Organisation')).toBeUndefined()
  })
})
