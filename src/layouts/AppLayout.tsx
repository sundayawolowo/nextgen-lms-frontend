import { useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  Building2,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Plus,
  Store,
  Users,
  X,
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { Logo } from '../components/Logo'
import { Alert } from '../components/ui'
import { useCurrentOrganisation, useLogout, useMe, usePlatformCan } from '../features/auth/hooks'
import { api } from '../lib/api'
import { cn } from '../lib/cn'
import { humanise } from '../lib/format'
import { notifyError } from '../lib/forms'
import { toast } from '../stores/toast'
import { useWorkspace } from '../stores/workspace'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

export function AppLayout() {
  const { data: me } = useMe()
  const { organisation, can } = useCurrentOrganisation()
  const platformCan = usePlatformCan()
  const [open, setOpen] = useState(false)

  const personal: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/marketplace', label: 'Browse courses', icon: Store },
    { to: '/studio', label: 'My teaching', icon: GraduationCap },
  ]

  const organisationItems: NavItem[] = organisation
    ? [
        ...(can('organisation.courses.view') ? [{ to: '/org/courses', label: 'Courses', icon: BookOpen }] : []),
        ...(can('organisation.members.view') ? [{ to: '/org/members', label: 'Members', icon: Users }] : []),
        ...(can('organisation.members.invite') ? [{ to: '/org/invitations', label: 'Invitations', icon: Mail }] : []),
      ]
    : []

  const platformItems: NavItem[] = platformCan('platform.marketplace.manage')
    ? [{ to: '/admin/reviews', label: 'Course reviews', icon: ClipboardCheck }]
    : []

  const sidebar = (
    <nav className="flex h-full flex-col gap-6 px-3 py-5">
      <div className="px-2">
        <Logo to="/dashboard" light />
      </div>
      <NavGroup items={personal} onNavigate={() => setOpen(false)} />
      {organisation && organisationItems.length > 0 && (
        <NavGroup title={organisation.name} items={organisationItems} onNavigate={() => setOpen(false)} />
      )}
      {platformItems.length > 0 && <NavGroup title="Platform" items={platformItems} onNavigate={() => setOpen(false)} />}
    </nav>
  )

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-navy-900 lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 bg-navy-900">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-5 text-navy-200" aria-label="Close menu">
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button type="button" onClick={() => setOpen(true)} className="text-slate-600 lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <WorkspaceSwitcher />
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-slate-600 sm:inline">{me?.name}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {me && !me.email_verified && <VerifyEmailBanner />}
        <Outlet />
      </main>
    </div>
  )
}

function NavGroup({ title, items, onNavigate }: { title?: string; items: NavItem[]; onNavigate: () => void }) {
  return (
    <div>
      {title && <p className="mb-2 truncate px-3 text-xs font-semibold uppercase tracking-wide text-navy-200/70">{title}</p>}
      <ul className="space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-white/10 text-white' : 'text-navy-100 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function WorkspaceSwitcher() {
  const { data: me } = useMe()
  const organisationUuid = useWorkspace((s) => s.organisationUuid)
  const setOrganisation = useWorkspace((s) => s.setOrganisation)
  const navigate = useNavigate()

  if (!me) return null

  return (
    <div className="flex items-center gap-2">
      <Building2 className="hidden size-4 text-slate-400 sm:block" aria-hidden />
      <label htmlFor="workspace" className="sr-only">
        Workspace
      </label>
      <select
        id="workspace"
        value={organisationUuid ?? ''}
        onChange={(e) => {
          if (e.target.value === '__new') {
            navigate('/organisations/new')
            return
          }
          setOrganisation(e.target.value || null)
          navigate('/dashboard')
        }}
        className="max-w-[14rem] rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-navy-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
      >
        <option value="">Personal</option>
        {me.organisations.map((o) => (
          <option key={o.uuid} value={o.uuid}>
            {o.name} · {humanise(o.roles[0] ?? 'member')}
          </option>
        ))}
        <option value="__new">+ Create organisation</option>
      </select>
    </div>
  )
}

function LogoutButton() {
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-navy-900"
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">Log out</span>
    </button>
  )
}

function VerifyEmailBanner() {
  const [sending, setSending] = useState(false)
  const client = useQueryClient()

  return (
    <div className="mb-6">
      <Alert tone="warning" title="Please verify your email address">
        <p>
          We sent you a link. Some actions, like creating an organisation or publishing a course, need a verified email.{' '}
          <button
            type="button"
            disabled={sending}
            className="font-medium underline"
            onClick={async () => {
              setSending(true)
              try {
                await api.post('/auth/email/verification-notification')
                toast.success('A new verification link is on its way.')
              } catch (e) {
                notifyError(e)
              } finally {
                setSending(false)
              }
            }}
          >
            Resend the link
          </button>{' '}
          ·{' '}
          <button type="button" className="font-medium underline" onClick={() => client.invalidateQueries({ queryKey: ['me'] })}>
            I've verified it
          </button>
        </p>
      </Alert>
    </div>
  )
}

export function NewOrganisationLink() {
  return (
    <Link to="/organisations/new" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
      <Plus className="size-4" /> Create an organisation
    </Link>
  )
}
