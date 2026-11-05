import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../app/providers'
import { ApiError } from '../../lib/api'
import { LoginPage } from './AuthPages'
import { RequireAuth, safeNext } from './guards'

// Keep the real ApiError class, replace the network calls.
const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('../../lib/api', async (original) => {
  const actual = await original<typeof import('../../lib/api')>()
  return { ...actual, api: { ...actual.api, ...apiMock }, csrf: vi.fn().mockResolvedValue(undefined) }
})

function renderAt(path: string, routes: Parameters<typeof createMemoryRouter>[0]) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

beforeEach(() => {
  apiMock.get.mockReset()
  apiMock.post.mockReset()
})

describe('safeNext', () => {
  it('only allows paths inside the app', () => {
    expect(safeNext('/org/members')).toBe('/org/members')
    expect(safeNext('https://evil.example')).toBe('/dashboard')
    expect(safeNext('//evil.example')).toBe('/dashboard')
    expect(safeNext(null)).toBe('/dashboard')
  })
})

describe('RequireAuth', () => {
  it('sends signed-out visitors to login and remembers where they were going', async () => {
    apiMock.get.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Unauthenticated.'))

    const router = renderAt('/org/members', [
      { path: '/org/members', element: <RequireAuth><p>secret</p></RequireAuth> },
      { path: '/login', element: <p>login page</p> },
    ])

    await screen.findByText('login page')
    expect(router.state.location.search).toBe('?next=%2Forg%2Fmembers')
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('shows the page to signed-in users', async () => {
    apiMock.get.mockResolvedValue({ uuid: 'u1', name: 'Ada', organisations: [] })

    renderAt('/studio', [{ path: '/studio', element: <RequireAuth><p>studio</p></RequireAuth> }])

    expect(await screen.findByText('studio')).toBeInTheDocument()
  })
})

describe('LoginPage', () => {
  const routes = [
    { path: '/login', element: <LoginPage /> },
    { path: '/dashboard', element: <p>dashboard</p> },
    { path: '/org/members', element: <p>members</p> },
  ]

  it('checks the form before calling the API', async () => {
    renderAt('/login', routes)

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(apiMock.post).not.toHaveBeenCalled()
  })

  it('shows server errors under the right field', async () => {
    apiMock.post.mockRejectedValue(
      new ApiError(422, 'VALIDATION_FAILED', 'The given data was invalid.', { email: ['These credentials do not match our records.'] }),
    )
    renderAt('/login', routes)

    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass1')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('These credentials do not match our records.')).toBeInTheDocument()
  })

  it('goes to the page the user came from after logging in', async () => {
    apiMock.post.mockResolvedValue({ success: true, message: 'Logged in', data: { uuid: 'u1', name: 'Ada', organisations: [] }, meta: {} })
    renderAt('/login?next=%2Forg%2Fmembers', routes)

    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(screen.getByText('members')).toBeInTheDocument())
    expect(apiMock.post).toHaveBeenCalledWith('/auth/login', { email: 'ada@example.com', password: 'secret123', remember: false })
  })
})
