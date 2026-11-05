import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Pagination, Spinner } from '../../components/ui'
import { ApiError, api } from '../../lib/api'
import { formatDate, humanise } from '../../lib/format'
import { notifyError } from '../../lib/forms'
import { toast } from '../../stores/toast'
import type { CourseEditor } from '../../types/api'
import type { CourseLearner } from '../../types/learning'
import { ProgressBar } from './ProgressBar'

/** Course editor tab: who's enrolled, their progress, and giving or removing access. */
export function LearnersTab({ course, canManage }: { course: CourseEditor; canManage: boolean }) {
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [email, setEmail] = useState('')

  const learners = useQuery<{ items: CourseLearner[]; meta: { total: number; last_page: number } }, ApiError>({
    queryKey: ['course', course.uuid, 'learners', page],
    queryFn: () => api.page<CourseLearner>(`/courses/${course.uuid}/learners`, { page }),
  })

  const add = useMutation({
    mutationFn: (value: string) => api.post(`/courses/${course.uuid}/learners`, { email: value }),
    onSuccess: () => {
      toast.success('Learner added')
      setEmail('')
      client.invalidateQueries({ queryKey: ['course', course.uuid, 'learners'] })
    },
    onError: notifyError,
  })

  const remove = useMutation({
    mutationFn: (userUuid: string) => api.del(`/courses/${course.uuid}/learners/${userUuid}`),
    onSuccess: () => {
      toast.success('Access removed')
      client.invalidateQueries({ queryKey: ['course', course.uuid, 'learners'] })
    },
    onError: notifyError,
  })

  return (
    <div className="space-y-6">
      {canManage && course.status !== 'archived' && (
        <Card className="p-6">
          <h3 className="font-semibold">Give someone access</h3>
          <p className="mt-1 text-sm text-slate-600">
            {course.organisation
              ? `They must be a member of ${course.organisation.name}. Members can also enrol themselves from the library.`
              : 'They need a NextGen account with this email. Useful for private courses.'}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (email) add.mutate(email)
            }}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <Field label="Email" htmlFor="learner-email" className="flex-1">
              <Input id="learner-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Button type="submit" loading={add.isPending}>
              Add learner
            </Button>
          </form>
        </Card>
      )}

      {learners.isLoading ? (
        <Spinner label="Loading learners" />
      ) : learners.isError ? (
        <ErrorState error={learners.error} retry={() => learners.refetch()} />
      ) : learners.data!.items.length === 0 ? (
        <EmptyState title="No learners yet" description="People who enrol, or whom you add, will show here with their progress." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Learner</th>
                <th className="w-56 px-4 py-3">Progress</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Enrolled</th>
                <th className="px-4 py-3">Last active</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {learners.data!.items.map(({ user, enrolment, access }) => (
                <tr key={user.uuid}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-900">{user.name}</p>
                    <p className="text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar percent={enrolment.progress_percent} />
                    {enrolment.status === 'completed' && <p className="mt-1 text-xs text-brand-700">Completed {formatDate(enrolment.completed_at)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {access.map((a) => (
                        <Badge key={a}>{humanise(a)}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(enrolment.enrolled_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(enrolment.last_accessed_at)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        aria-label={`Remove ${user.name}`}
                        onClick={() => window.confirm(`Remove ${user.name}'s access? Their progress is kept if you add them back.`) && remove.mutate(user.uuid)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {learners.data && <Pagination page={page} lastPage={learners.data.meta.last_page} onChange={setPage} />}
    </div>
  )
}
