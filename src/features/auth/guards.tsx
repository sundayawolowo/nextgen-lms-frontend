import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Spinner } from '../../components/ui'
import { useMe } from './hooks'

/** Only signed-in people. Others go to /login and come back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe()
  const location = useLocation()

  if (isLoading) return <Spinner />
  if (!me) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return <>{children}</>
}

/** Login and register pages: signed-in people go straight to where they were heading. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe()
  const location = useLocation()

  if (isLoading) return <Spinner />
  if (me) return <Navigate to={safeNext(new URLSearchParams(location.search).get('next'))} replace />
  return <>{children}</>
}

/** Only allow redirects back into this app, never to another site. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}
