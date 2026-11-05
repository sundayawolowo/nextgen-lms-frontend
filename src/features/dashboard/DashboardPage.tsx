import { useQuery } from '@tanstack/react-query'
import { BookOpen, Building2, GraduationCap, Store, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import { NewOrganisationLink } from '../../layouts/AppLayout'
import { api } from '../../lib/api'
import { humanise } from '../../lib/format'
import { useWorkspace } from '../../stores/workspace'
import type { CourseSummary, Member } from '../../types/api'
import { useCurrentOrganisation, useMe } from '../auth/hooks'

export function DashboardPage() {
  const { data: me } = useMe()
  const { organisation, can } = useCurrentOrganisation()
  const setOrganisation = useWorkspace((s) => s.setOrganisation)
  const organisationUuid = useWorkspace((s) => s.organisationUuid)

  const teaching = useQuery({
    queryKey: ['studio', 'courses', 'count'],
    queryFn: () => api.page<CourseSummary>('/studio/courses'),
    enabled: !!me?.email_verified,
  })

  const members = useQuery({
    queryKey: ['org', organisationUuid, 'members', 'count'],
    queryFn: () => api.page<Member>('/organisation/members'),
    enabled: !!organisation && can('organisation.members.view'),
  })

  const orgCourses = useQuery({
    queryKey: ['org', organisationUuid, 'courses', 'count'],
    queryFn: () => api.page<CourseSummary>('/organisation/courses'),
    enabled: !!organisation && can('organisation.courses.view'),
  })

  if (!me) return null
  const firstName = me.name.split(' ')[0]

  return (
    <div>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={organisation ? `You're working in ${organisation.name}.` : 'This is your personal space.'}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {organisation ? (
          <>
            {can('organisation.members.view') && (
              <Stat icon={<Users className="size-5" />} label="Members" value={members.data?.meta.total} to="/org/members" />
            )}
            {can('organisation.courses.view') && (
              <Stat icon={<BookOpen className="size-5" />} label="Organisation courses" value={orgCourses.data?.meta.total} to="/org/courses" />
            )}
          </>
        ) : null}
        <Stat icon={<GraduationCap className="size-5" />} label="Courses I teach" value={teaching.data?.meta.total} to="/studio" />
        <Stat icon={<Store className="size-5" />} label="Marketplace" value="Browse" to="/marketplace" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your workspaces</h2>
            <NewOrganisationLink />
          </div>
          {me.organisations.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              You're not part of an organisation yet. Create one for your school, church or company, or accept an invitation.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {me.organisations.map((o) => (
                <li key={o.uuid} className="flex items-center gap-3 py-3">
                  <Building2 className="size-5 text-slate-400" aria-hidden />
                  <div className="flex-1">
                    <p className="font-medium text-navy-900">{o.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {o.roles.map((r) => (
                        <Badge key={r} tone={o.is_owner ? 'navy' : 'slate'}>
                          {humanise(r)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {organisationUuid === o.uuid ? (
                    <Badge tone="green">Current</Badge>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setOrganisation(o.uuid)}>
                      Switch
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold">Get started</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link to="/studio/new" className="font-medium text-brand-700 hover:underline">
                Create a course
              </Link>{' '}
              <span className="text-slate-600">and publish it on the marketplace.</span>
            </li>
            {organisation && can('organisation.members.invite') && (
              <li>
                <Link to="/org/invitations" className="font-medium text-brand-700 hover:underline">
                  Invite people
                </Link>{' '}
                <span className="text-slate-600">to {organisation.name}.</span>
              </li>
            )}
            {organisation && can('organisation.courses.create') && (
              <li>
                <Link to="/org/courses/new" className="font-medium text-brand-700 hover:underline">
                  Add an internal course
                </Link>{' '}
                <span className="text-slate-600">only {organisation.name} members can see.</span>
              </li>
            )}
            <li>
              <Link to="/marketplace" className="font-medium text-brand-700 hover:underline">
                Browse the marketplace
              </Link>{' '}
              <span className="text-slate-600">for courses to take.</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Stat({ icon, label, value, to }: { icon: ReactNode; label: string; value: number | string | undefined; to: string }) {
  return (
    <Link to={to} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-3 text-slate-500">
        <span className="rounded-lg bg-brand-50 p-2 text-brand-700">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-navy-900">{value ?? '—'}</p>
    </Link>
  )
}
