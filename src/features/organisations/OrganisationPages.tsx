import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Pagination, Select, Spinner } from '../../components/ui'
import { ApiError, api } from '../../lib/api'
import { formatDate, humanise } from '../../lib/format'
import { applyServerErrors, notifyError } from '../../lib/forms'
import { toast } from '../../stores/toast'
import { useWorkspace } from '../../stores/workspace'
import type { Invitation, InvitationPreview, Member, WorkspaceSummary } from '../../types/api'
import { useCurrentOrganisation, useMe } from '../auth/hooks'

/** Roles that can be handed out (organisation-owner never is). */
export const ASSIGNABLE_ROLES = [
  'learner',
  'instructor',
  'teaching-assistant',
  'academic-manager',
  'training-manager',
  'finance-officer',
  'organisation-admin',
] as const

const PRIVILEGED = new Set(['organisation-admin', 'finance-officer'])

/* Create organisation ----------------------------------------------------- */

const orgSchema = z.object({
  name: z.string().min(2, 'Enter a name.').max(150),
  type: z.enum(['school', 'church', 'company', 'training', 'other']),
  email: z.union([z.email('Enter a valid email.'), z.literal('')]).optional(),
  phone: z.string().max(30).optional(),
})

export function CreateOrganisationPage() {
  const navigate = useNavigate()
  const client = useQueryClient()
  const setOrganisation = useWorkspace((s) => s.setOrganisation)
  const { data: me } = useMe()
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof orgSchema>>({
    resolver: zodResolver(orgSchema),
    defaultValues: { type: 'church' },
  })

  const onSubmit = handleSubmit((values) =>
    api.post<{ uuid: string; name: string }>('/organisations', { ...values, email: values.email || null }).then(
      async (res) => {
        await client.invalidateQueries({ queryKey: ['me'] })
        setOrganisation(res.data.uuid)
        toast.success(`${res.data.name} is ready. You're its owner.`)
        navigate('/dashboard')
      },
      (error) => applyServerErrors(error, setError, ['name', 'type', 'email', 'phone']),
    ),
  )

  return (
    <div className="max-w-2xl">
      <PageHeader title="Create an organisation" description="A private workspace for your school, church, company or training team." />
      {me && !me.email_verified && (
        <div className="mb-4">
          <Alert tone="warning">Verify your email address first. The link is in your inbox.</Alert>
        </div>
      )}
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Organisation name" htmlFor="org-name" error={formState.errors.name?.message}>
            <Input id="org-name" placeholder="e.g. Grace Chapel Academy" {...register('name')} />
          </Field>
          <Field label="Type" htmlFor="org-type" error={formState.errors.type?.message}>
            <Select id="org-type" {...register('type')}>
              <option value="church">Church or ministry</option>
              <option value="school">School or university</option>
              <option value="company">Company</option>
              <option value="training">Training provider</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact email (optional)" htmlFor="org-email" error={formState.errors.email?.message}>
              <Input id="org-email" type="email" {...register('email')} />
            </Field>
            <Field label="Phone (optional)" htmlFor="org-phone" error={formState.errors.phone?.message}>
              <Input id="org-phone" {...register('phone')} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={formState.isSubmitting}>
              Create organisation
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

/* Members ----------------------------------------------------------------- */

export function MembersPage() {
  const { organisation, can } = useCurrentOrganisation()
  const { data: me } = useMe()
  const organisationUuid = useWorkspace((s) => s.organisationUuid)
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const members = useQuery({
    queryKey: ['org', organisationUuid, 'members', { search, page }],
    queryFn: () => api.page<Member>('/organisation/members', { search, page }),
    enabled: !!organisation,
  })

  const update = useMutation({
    mutationFn: ({ uuid, body }: { uuid: string; body: Record<string, unknown> }) => api.patch(`/organisation/members/${uuid}`, body),
    onSuccess: () => {
      toast.success('Member updated')
      client.invalidateQueries({ queryKey: ['org', organisationUuid, 'members'] })
    },
    onError: notifyError,
  })

  const remove = useMutation({
    mutationFn: (uuid: string) => api.del(`/organisation/members/${uuid}`),
    onSuccess: () => {
      toast.success('Member removed')
      client.invalidateQueries({ queryKey: ['org', organisationUuid, 'members'] })
    },
    onError: notifyError,
  })

  if (!organisation) return <NoOrganisation />

  const canEdit = can('organisation.members.update')
  const canRoles = can('organisation.roles.manage')
  const canRemove = can('organisation.members.remove')

  return (
    <div>
      <PageHeader
        title="Members"
        description={`People in ${organisation.name}.`}
        actions={
          can('organisation.members.invite') && (
            <Link to="/org/invitations">
              <Button>Invite people</Button>
            </Link>
          )
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          aria-label="Search members"
          placeholder="Search by name or email"
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {members.isLoading ? (
        <Spinner label="Loading members" />
      ) : members.isError ? (
        <ErrorState error={members.error} retry={() => members.refetch()} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.data!.items.map((m) => {
                const isSelf = m.uuid === me?.uuid
                const locked = m.is_owner || isSelf
                return (
                  <tr key={m.uuid}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-900">
                        {m.name} {isSelf && <span className="text-slate-400">(you)</span>}
                      </p>
                      <p className="text-slate-500">{m.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {m.is_owner ? (
                        <Badge tone="navy">Owner</Badge>
                      ) : canRoles && !locked ? (
                        <Select
                          aria-label={`Role for ${m.name}`}
                          value={m.roles[0] ?? ''}
                          className="w-48 py-1.5"
                          onChange={(e) => update.mutate({ uuid: m.uuid, body: { roles: [e.target.value] } })}
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {humanise(r)}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {m.roles.map((r) => (
                            <Badge key={r}>{humanise(r)}</Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={m.status === 'active' ? 'green' : 'amber'}>{humanise(m.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(m.joined_at)}</td>
                    <td className="px-4 py-3">
                      {!locked && (
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => update.mutate({ uuid: m.uuid, body: { status: m.status === 'active' ? 'suspended' : 'active' } })}
                            >
                              {m.status === 'active' ? 'Suspend' : 'Reactivate'}
                            </Button>
                          )}
                          {canRemove && (
                            <Button
                              variant="danger"
                              size="sm"
                              aria-label={`Remove ${m.name}`}
                              onClick={() => {
                                if (window.confirm(`Remove ${m.name} from ${organisation.name}? They lose access straight away.`)) remove.mutate(m.uuid)
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {members.data!.items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No members match that search.</p>}
        </Card>
      )}

      {members.data && <Pagination page={page} lastPage={members.data.meta.last_page} onChange={setPage} />}
    </div>
  )
}

/* Invitations ------------------------------------------------------------- */

const inviteSchema = z.object({
  email: z.email('Enter a valid email address.'),
  role: z.enum(ASSIGNABLE_ROLES),
})

export function InvitationsPage() {
  const { organisation, can } = useCurrentOrganisation()
  const organisationUuid = useWorkspace((s) => s.organisationUuid)
  const client = useQueryClient()
  const { register, handleSubmit, setError, reset, formState } = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'learner' },
  })

  const invitations = useQuery({
    queryKey: ['org', organisationUuid, 'invitations'],
    queryFn: () => api.get<Invitation[]>('/organisation/invitations'),
    enabled: !!organisation,
  })

  const revoke = useMutation({
    mutationFn: (uuid: string) => api.del(`/organisation/invitations/${uuid}`),
    onSuccess: () => {
      toast.success('Invitation revoked')
      client.invalidateQueries({ queryKey: ['org', organisationUuid, 'invitations'] })
    },
    onError: notifyError,
  })

  if (!organisation) return <NoOrganisation />

  const canGrantPrivileged = can('organisation.roles.manage')

  const onSubmit = handleSubmit((values) =>
    api.post('/organisation/invitations', values).then(
      () => {
        toast.success(`Invitation sent to ${values.email}`)
        reset({ email: '', role: values.role })
        client.invalidateQueries({ queryKey: ['org', organisationUuid, 'invitations'] })
      },
      (error) => applyServerErrors(error, setError, ['email', 'role']),
    ),
  )

  return (
    <div>
      <PageHeader title="Invitations" description={`Invite people to ${organisation.name}. Links expire after 7 days.`} />

      <Card className="mb-6 p-6">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_14rem_auto] sm:items-end" noValidate>
          <Field label="Email address" htmlFor="invite-email" error={formState.errors.email?.message}>
            <Input id="invite-email" type="email" placeholder="name@example.com" {...register('email')} />
          </Field>
          <Field label="Role" htmlFor="invite-role" error={formState.errors.role?.message}>
            <Select id="invite-role" {...register('role')}>
              {ASSIGNABLE_ROLES.filter((r) => canGrantPrivileged || !PRIVILEGED.has(r)).map((r) => (
                <option key={r} value={r}>
                  {humanise(r)}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" loading={formState.isSubmitting}>
            Send invitation
          </Button>
        </form>
      </Card>

      <h2 className="mb-3 font-semibold">Pending</h2>
      {invitations.isLoading ? (
        <Spinner />
      ) : invitations.isError ? (
        <ErrorState error={invitations.error} retry={() => invitations.refetch()} />
      ) : invitations.data!.length === 0 ? (
        <EmptyState title="No pending invitations" description="Invitations you send will show here until they're accepted." />
      ) : (
        <Card className="divide-y divide-slate-100">
          {invitations.data!.map((i) => (
            <div key={i.uuid} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="flex-1">
                <p className="font-medium text-navy-900">{i.email}</p>
                <p className="text-slate-500">
                  {humanise(i.role)} · sent by {i.invited_by ?? 'someone'} · expires {formatDate(i.expires_at)}
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => revoke.mutate(i.uuid)} loading={revoke.isPending && revoke.variables === i.uuid}>
                Revoke
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

/* Accept invitation (link from the email) --------------------------------- */

export function AcceptInvitationPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const client = useQueryClient()
  const setOrganisation = useWorkspace((s) => s.setOrganisation)
  const { data: me, isLoading: meLoading } = useMe()

  const preview = useQuery<InvitationPreview, ApiError>({
    queryKey: ['invitation', token],
    queryFn: () => api.get<InvitationPreview>(`/invitations/${token}`),
    enabled: token.length === 64,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: () => api.post<{ uuid: string; name: string }>('/invitations/accept', { token }),
    onSuccess: async (res) => {
      await client.invalidateQueries({ queryKey: ['me'] })
      setOrganisation(res.data.uuid)
      toast.success(res.message)
      navigate('/dashboard')
    },
    onError: notifyError,
  })

  const next = encodeURIComponent(`/invitations/accept?token=${token}`)

  if (token.length !== 64) return <Alert tone="error" title="This invitation link is incomplete">Open the link from your email again.</Alert>
  if (preview.isLoading || meLoading) return <Spinner />
  if (preview.isError) {
    return (
      <Alert tone="error" title="This invitation can't be used">
        It may have been accepted already, revoked, or replaced by a newer one. Ask the person who invited you to send it again.
      </Alert>
    )
  }

  const inv = preview.data!
  const wrongAccount = me && me.email.toLowerCase() !== inv.email.toLowerCase()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Join {inv.organisation.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          You've been invited as <strong>{humanise(inv.role)}</strong>. This invitation is for {inv.email}.
        </p>
      </div>

      {inv.expired ? (
        <Alert tone="error">This invitation expired on {formatDate(inv.expires_at)}. Ask for a new one.</Alert>
      ) : !me ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Log in or create an account with {inv.email} to accept.</p>
          <div className="flex gap-2">
            <Link to={`/login?next=${next}`} className="flex-1">
              <Button variant="secondary" className="w-full">
                Log in
              </Button>
            </Link>
            <Link to={`/register?next=${next}`} className="flex-1">
              <Button className="w-full">Create account</Button>
            </Link>
          </div>
        </div>
      ) : wrongAccount ? (
        <Alert tone="warning" title="You're signed in with a different email">
          You're logged in as {me.email}. Log out and sign in as {inv.email} to accept.
        </Alert>
      ) : !me.email_verified ? (
        <Alert tone="warning">Verify your email address first (check your inbox), then come back to this link.</Alert>
      ) : (
        <Button className="w-full" loading={accept.isPending} onClick={() => accept.mutate()}>
          Accept and join
        </Button>
      )}
    </div>
  )
}

export function NoOrganisation() {
  const { data: me } = useMe()
  const setOrganisation = useWorkspace((s) => s.setOrganisation)

  return (
    <EmptyState
      title="Choose an organisation first"
      description="This page belongs to an organisation workspace. Pick one from the switcher at the top, or create your own."
      action={
        me && me.organisations.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {me.organisations.map((o: WorkspaceSummary) => (
              <Button key={o.uuid} variant="secondary" size="sm" onClick={() => setOrganisation(o.uuid)}>
                {o.name}
              </Button>
            ))}
          </div>
        ) : (
          <Link to="/organisations/new">
            <Button>Create an organisation</Button>
          </Link>
        )
      }
    />
  )
}
