import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Pagination, Select, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { formatDate, formatPrice, humanise } from '../../lib/format'
import { applyServerErrors } from '../../lib/forms'
import { toast } from '../../stores/toast'
import { useWorkspace } from '../../stores/workspace'
import type { CourseEditor, CourseStatus, CourseSummary } from '../../types/api'
import { useCurrentOrganisation, useMe } from '../auth/hooks'
import { flattenCategories, useCategories } from '../marketplace/useCategories'
import { NoOrganisation } from '../organisations/OrganisationPages'

export const statusTone: Record<CourseStatus, 'slate' | 'amber' | 'green' | 'red'> = {
  draft: 'slate',
  in_review: 'amber',
  published: 'green',
  archived: 'red',
}

function CourseTable({ courses }: { courses: CourseSummary[] }) {
  return (
    <Card className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Course</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Visibility</th>
            <th className="px-4 py-3">Lessons</th>
            <th className="px-4 py-3">Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {courses.map((c) => (
            <tr key={c.uuid} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link to={`/courses/${c.uuid}/edit`} className="font-medium text-navy-900 hover:text-brand-700">
                  {c.title}
                </Link>
                <p className="text-slate-500">
                  {c.organisation ? c.organisation.name : 'Personal'}
                  {c.published_at && ` · published ${formatDate(c.published_at)}`}
                </p>
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone[c.status]}>{humanise(c.status)}</Badge>
              </td>
              <td className="px-4 py-3 text-slate-600">{humanise(c.visibility)}</td>
              <td className="px-4 py-3 text-slate-600">{c.lessons_count}</td>
              <td className="px-4 py-3 text-slate-600">{formatPrice(c.price_minor, c.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function useCourseList(key: unknown[], url: string, enabled: boolean) {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: [...key, { status, page }],
    queryFn: () => api.page<CourseSummary>(url, { status, page }),
    enabled,
  })
  return { query, status, setStatus, page, setPage }
}

function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select aria-label="Filter by status" value={value} onChange={(e) => onChange(e.target.value)} className="mb-4 w-48">
      <option value="">All statuses</option>
      <option value="draft">Draft</option>
      <option value="in_review">In review</option>
      <option value="published">Published</option>
      <option value="archived">Archived</option>
    </Select>
  )
}

export function StudioPage() {
  const { data: me } = useMe()
  const { query, status, setStatus, page, setPage } = useCourseList(['studio', 'courses'], '/studio/courses', !!me?.email_verified)

  return (
    <div>
      <PageHeader
        title="My teaching"
        description="Every course you teach, personal or for an organisation."
        actions={
          <Link to="/studio/new">
            <Button>New personal course</Button>
          </Link>
        }
      />
      {!me?.email_verified ? (
        <EmptyState title="Verify your email to start teaching" description="Use the link we sent when you signed up." />
      ) : (
        <>
          <StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
          {query.isLoading ? (
            <Spinner label="Loading courses" />
          ) : query.isError ? (
            <ErrorState error={query.error} retry={() => query.refetch()} />
          ) : query.data!.items.length === 0 ? (
            <EmptyState
              title="No courses yet"
              description="Create your first course. You can keep it as a draft until it's ready."
              action={<Link to="/studio/new"><Button>Create a course</Button></Link>}
            />
          ) : (
            <>
              <CourseTable courses={query.data!.items} />
              <Pagination page={page} lastPage={query.data!.meta.last_page} onChange={setPage} />
            </>
          )}
        </>
      )}
    </div>
  )
}

export function OrganisationCoursesPage() {
  const { organisation, can } = useCurrentOrganisation()
  const organisationUuid = useWorkspace((s) => s.organisationUuid)
  const { query, status, setStatus, page, setPage } = useCourseList(['org', organisationUuid, 'courses'], '/organisation/courses', !!organisation)

  if (!organisation) return <NoOrganisation />

  return (
    <div>
      <PageHeader
        title="Courses"
        description={`Courses owned by ${organisation.name}.`}
        actions={
          can('organisation.courses.create') && (
            <Link to="/org/courses/new">
              <Button>New course</Button>
            </Link>
          )
        }
      />
      <StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
      {query.isLoading ? (
        <Spinner label="Loading courses" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : query.data!.items.length === 0 ? (
        <EmptyState title="No courses yet" description="Internal courses are only visible to members of this organisation." />
      ) : (
        <>
          <CourseTable courses={query.data!.items} />
          <Pagination page={page} lastPage={query.data!.meta.last_page} onChange={setPage} />
        </>
      )}
    </div>
  )
}

const newCourseSchema = z.object({
  title: z.string().min(3, 'Give the course a title (at least 3 characters).').max(180),
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'all']),
})

export function NewCoursePage({ scope }: { scope: 'personal' | 'organisation' }) {
  const navigate = useNavigate()
  const { organisation } = useCurrentOrganisation()
  const categories = useCategories()
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof newCourseSchema>>({
    resolver: zodResolver(newCourseSchema),
    defaultValues: { level: 'beginner' },
  })

  if (scope === 'organisation' && !organisation) return <NoOrganisation />

  const onSubmit = handleSubmit((values) => {
    const url = scope === 'organisation' ? '/organisation/courses' : '/studio/courses'
    return api.post<CourseEditor>(url, { ...values, category: values.category || null }).then(
      (res) => {
        toast.success('Course created. Add sections and lessons next.')
        navigate(`/courses/${res.data.uuid}/edit`)
      },
      (error) => applyServerErrors(error, setError, ['title', 'category', 'level']),
    )
  })

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={scope === 'organisation' ? `New course for ${organisation!.name}` : 'New personal course'}
        description={
          scope === 'organisation'
            ? 'Starts as a draft, visible only to members of this organisation once published.'
            : 'Starts as a draft. Public courses are reviewed by the NextGen team before they appear on the marketplace.'
        }
      />
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Course title" htmlFor="title" error={formState.errors.title?.message}>
            <Input id="title" placeholder="e.g. Site Safety for New Workers" {...register('title')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="category" error={formState.errors.category?.message}>
              <Select id="category" {...register('category')}>
                <option value="">Choose later</option>
                {flattenCategories(categories.data ?? []).map((c) => (
                  <option key={c.uuid} value={c.uuid}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Level" htmlFor="level">
              <Select id="level" {...register('level')}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="all">All levels</option>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={formState.isSubmitting}>
              Create course
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
