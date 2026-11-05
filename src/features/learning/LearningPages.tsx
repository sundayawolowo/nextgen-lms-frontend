import { useQuery } from '@tanstack/react-query'
import { Award, BookOpen, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Badge, Button, EmptyState, ErrorState, PageHeader, Pagination, Select, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { formatDate, formatDuration } from '../../lib/format'
import { useWorkspace } from '../../stores/workspace'
import type { CatalogueCourse, MyCourse, PlayerLesson } from '../../types/learning'
import { useCurrentOrganisation } from '../auth/hooks'
import { CourseThumb } from '../marketplace/CourseCard'
import { NoOrganisation } from '../organisations/OrganisationPages'
import { EnrolButton } from './EnrolButton'
import { LessonContent } from './LessonContent'
import { ProgressBar } from './ProgressBar'

/* My learning ------------------------------------------------------------- */

export function MyLearningPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const courses = useQuery({
    queryKey: ['learn', 'courses', { status, page }],
    queryFn: () => api.page<MyCourse>('/learn/courses', { status, page }),
  })

  return (
    <div>
      <PageHeader
        title="My learning"
        description="Courses you're taking, most recent first."
        actions={
          <Link to="/marketplace">
            <Button variant="secondary">Find a course</Button>
          </Link>
        }
      />

      <Select aria-label="Filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="mb-4 w-48">
        <option value="">In progress and completed</option>
        <option value="active">In progress</option>
        <option value="completed">Completed</option>
      </Select>

      {courses.isLoading ? (
        <Spinner label="Loading your courses" />
      ) : courses.isError ? (
        <ErrorState error={courses.error} retry={() => courses.refetch()} />
      ) : courses.data!.items.length === 0 ? (
        <EmptyState
          title={status === 'completed' ? 'No completed courses yet' : "You're not taking any courses yet"}
          description="Browse the marketplace or your organisation's library and enrol in something."
          action={<Link to="/marketplace"><Button>Browse courses</Button></Link>}
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.data!.items.map((item) => (
              <MyCourseCard key={item.enrolment.uuid} item={item} />
            ))}
          </div>
          <Pagination page={page} lastPage={courses.data!.meta.last_page} onChange={setPage} />
        </>
      )}
    </div>
  )
}

export function MyCourseCard({ item }: { item: MyCourse }) {
  const { course, enrolment } = item
  const done = enrolment.status === 'completed'

  return (
    <Link
      to={`/learn/${course.uuid}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <CourseThumb course={course} className="h-28" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-brand-700">{course.title}</h3>
        <p className="text-xs text-slate-500">
          {course.organisation?.name ?? course.instructors.map((i) => i.name).join(', ')}
        </p>
        <div className="mt-auto space-y-2 pt-2">
          <ProgressBar percent={enrolment.progress_percent} />
          <div className="flex items-center justify-between text-xs text-slate-500">
            {done ? (
              <span className="flex items-center gap-1 font-medium text-brand-700">
                <Award className="size-3.5" aria-hidden /> Completed {formatDate(enrolment.completed_at)}
              </span>
            ) : (
              <span>
                {enrolment.completed_lessons_count} of {course.lessons_count} lessons
              </span>
            )}
            <span className="font-medium text-brand-700">{enrolment.progress_percent > 0 ? 'Continue' : 'Start'} →</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* Organisation library ---------------------------------------------------- */

export function LibraryPage() {
  const { organisation } = useCurrentOrganisation()
  const organisationUuid = useWorkspace((s) => s.organisationUuid)

  const catalogue = useQuery({
    queryKey: ['org', organisationUuid, 'catalogue'],
    queryFn: () => api.get<CatalogueCourse[]>('/organisation/catalogue'),
    enabled: !!organisation,
  })

  if (!organisation) return <NoOrganisation />

  return (
    <div>
      <PageHeader title="Library" description={`Courses ${organisation.name} offers its members.`} />
      {catalogue.isLoading ? (
        <Spinner label="Loading the library" />
      ) : catalogue.isError ? (
        <ErrorState error={catalogue.error} retry={() => catalogue.refetch()} />
      ) : catalogue.data!.length === 0 ? (
        <EmptyState title="Nothing here yet" description="When the organisation publishes courses for members, they'll appear here." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {catalogue.data!.map((c) => (
            <div key={c.uuid} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <CourseThumb course={c} className="h-28" />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="font-semibold leading-snug">{c.title}</h3>
                {c.subtitle && <p className="line-clamp-2 text-sm text-slate-600">{c.subtitle}</p>}
                <p className="text-xs text-slate-500">
                  {c.lessons_count} lessons · {formatDuration(c.duration_seconds)}
                </p>
                <div className="mt-auto space-y-3 pt-2">
                  {c.enrolment && c.enrolment.status !== 'cancelled' && <ProgressBar percent={c.enrolment.progress_percent} />}
                  <EnrolButton courseUuid={c.uuid} isFree={c.is_free} knownOption={c.option} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* Public preview lesson --------------------------------------------------- */

export function PreviewLessonPage() {
  const { slug = '', lesson = '' } = useParams()

  const preview = useQuery({
    queryKey: ['preview', slug, lesson],
    queryFn: () => api.get<PlayerLesson>(`/marketplace/courses/${slug}/lessons/${lesson}`),
  })

  if (preview.isLoading) return <Spinner label="Loading preview" />
  if (preview.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState title="This preview isn't available" action={<Link to={`/marketplace/${slug}`}><Button variant="secondary">Back to the course</Button></Link>} />
      </div>
    )
  }

  const l = preview.data!

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link to={`/marketplace/${slug}`} className="text-sm text-slate-600 hover:text-navy-900">
        ← {l.course.title}
      </Link>
      <div className="mt-3 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{l.title}</h1>
        <Badge tone="green">Free preview</Badge>
      </div>
      <p className="mb-6 text-sm text-slate-500">{l.section.title}</p>
      <LessonContent lesson={l} />
      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 text-center">
        <BookOpen className="mx-auto size-6 text-brand-600" aria-hidden />
        <p className="mt-2 font-medium text-navy-900">Like what you see?</p>
        <p className="text-sm text-slate-600">Enrol to unlock every lesson and track your progress.</p>
        <Link to={`/marketplace/${slug}`} className="mt-4 inline-block">
          <Button>See the full course</Button>
        </Link>
      </div>
    </div>
  )
}

export function CompletedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
      <CheckCircle2 className="size-4" aria-hidden /> Completed
    </span>
  )
}
