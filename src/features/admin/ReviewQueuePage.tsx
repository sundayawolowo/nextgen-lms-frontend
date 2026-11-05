import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Textarea } from '../../components/ui'
import { api } from '../../lib/api'
import { formatDate, formatDuration, formatPrice, humanise } from '../../lib/format'
import { notifyError } from '../../lib/forms'
import { toast } from '../../stores/toast'
import type { CourseEditor, CourseSummary } from '../../types/api'

/** Platform staff approve or send back public courses. */
export function ReviewQueuePage() {
  const queue = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: () => api.get<CourseSummary[]>('/admin/course-reviews'),
  })

  return (
    <div>
      <PageHeader title="Course reviews" description="Public and unlisted courses waiting for approval before they go live." />
      {queue.isLoading ? (
        <Spinner />
      ) : queue.isError ? (
        <ErrorState error={queue.error} retry={() => queue.refetch()} />
      ) : queue.data!.length === 0 ? (
        <EmptyState title="Nothing to review" description="New submissions will appear here." />
      ) : (
        <div className="space-y-4">
          {queue.data!.map((c) => (
            <ReviewItem key={c.uuid} course={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewItem({ course }: { course: CourseSummary }) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [notes, setNotes] = useState('')

  const detail = useQuery({
    queryKey: ['admin', 'reviews', course.uuid],
    queryFn: () => api.get<CourseEditor>(`/admin/course-reviews/${course.uuid}`),
    enabled: open,
  })

  const decide = useMutation({
    mutationFn: (decision: 'approve' | 'reject') =>
      api.post(`/admin/course-reviews/${course.uuid}/${decision}`, decision === 'reject' ? { notes } : undefined),
    onSuccess: (_, decision) => {
      toast.success(decision === 'approve' ? `"${course.title}" is live` : 'Sent back to the instructor')
      client.invalidateQueries({ queryKey: ['admin', 'reviews'] })
    },
    onError: notifyError,
  })

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h2 className="font-semibold">{course.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {course.instructors.map((i) => i.name).join(', ')} · {course.category?.name ?? 'No category'} · {course.lessons_count} lessons ·{' '}
            {formatDuration(course.duration_seconds)} · {formatPrice(course.price_minor, course.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Submitted {formatDate(course.submitted_at)} · <Badge>{humanise(course.visibility)}</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
            {open ? 'Hide' : 'Inspect'}
          </Button>
          <Button size="sm" loading={decide.isPending && decide.variables === 'approve'} onClick={() => decide.mutate('approve')}>
            Approve
          </Button>
          <Button variant="danger" size="sm" onClick={() => setRejecting(!rejecting)}>
            Request changes
          </Button>
        </div>
      </div>

      {rejecting && (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            decide.mutate('reject')
          }}
        >
          <label htmlFor={`notes-${course.uuid}`} className="text-sm font-medium text-slate-700">
            What needs to change? The instructor sees this.
          </label>
          <Textarea id={`notes-${course.uuid}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex justify-end">
            <Button type="submit" variant="danger" size="sm" disabled={notes.trim().length < 10} loading={decide.isPending && decide.variables === 'reject'}>
              Send back
            </Button>
          </div>
        </form>
      )}

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4 text-sm">
          {detail.isLoading ? (
            <Spinner />
          ) : detail.data ? (
            <div className="space-y-4">
              {detail.data.subtitle && <p className="font-medium">{detail.data.subtitle}</p>}
              <p className="whitespace-pre-line text-slate-700">{detail.data.description}</p>
              {detail.data.sections.map((s) => (
                <div key={s.uuid}>
                  <p className="font-semibold">{s.title}</p>
                  <ul className="mt-1 space-y-1 pl-4 text-slate-600">
                    {s.lessons.map((l) => (
                      <li key={l.uuid}>
                        {l.title} · {humanise(l.content_type)}
                        {l.media_url && (
                          <>
                            {' · '}
                            <a href={l.media_url} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                              open media
                            </a>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}
