import { Link, Outlet } from 'react-router'
import { Logo } from '../components/Logo'
import { useMe } from '../features/auth/hooks'

/** Marketplace and other public pages. */
export function PublicLayout() {
  const { data: me } = useMe()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link to="/marketplace" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-navy-900">
              Courses
            </Link>
            {me ? (
              <Link to="/dashboard" className="rounded-lg bg-navy-900 px-3 py-2 text-white hover:bg-navy-800">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-navy-900">
                  Log in
                </Link>
                <Link to="/register" className="rounded-lg bg-brand-600 px-3 py-2 text-white hover:bg-brand-700">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} NextGen LMS
      </footer>
    </div>
  )
}

/** Centred card for login, register and password pages. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-navy-50 to-slate-50 px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Outlet />
      </div>
    </div>
  )
}
