import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Award, CheckCircle2, Circle, FileText, Menu, PlayCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { Alert, Button, ErrorState, Spinner } from '../../components/ui'
import { ApiError, api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatDuration } from '../../lib/format'
import { notifyError } from '../../lib/forms'
import { toast } from '../../stores/toast'
import type { CourseOutline, EnrolmentInfo, PlayerLesson } from '../../types/learning'
import { LessonContent } from './LessonContent'
import { ProgressBar } from './ProgressBar'

/** Full-screen course player: outline on the left, lesson on the right. */
export function PlayerPage() {
  const { courseUuid = '', lessonUuid } = useParams()
  const [menuOpen, setMenuOpen] = useState(false)

  const outline = useQuery<CourseOutline, ApiError>({
    queryKey: ['learn', 'outline', courseUuid],
    queryFn: () => api.get<CourseOutline>(`/learn/courses/${courseUuid}`),
  })

  useEffect(() => setMenuOpen(false), [lessonUuid])

  if (outline.isLoading) return <Spinner label="Opening the course" />

  if (outline.isError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        {outline.error.code === 'NOT_ENROLLED' ? (
          <Alert tone="warning" title="You're not enrolled in this course">
            <Link to="/learn" className="font-medium underline">Back to my learning</Link>
          </Alert>
        ) : (
          <ErrorState error={outline.error} retry={() => outline.refetch()} />
        )}
      </div>
    )
  }

  const o = outline.data!
  const firstLesson = o.sections.flatMap((s) => s.lessons)[0]

  if (!lessonUuid) {
    const target = o.next_lesson ?? firstLesson?.uuid
    if (target) return <Navigate to={`/learn/${courseUuid}/${target}`} replace />
  }

  const sidebar = (
    <nav aria-label="Course contents" className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-4">
        <Link to="/learn" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="size-3.5" /> My learning
        </Link>
        <h2 className="mt-2 font-semibold leading-snug">{o.course.title}</h2>
        {o.enrolment ? (
          <ProgressBar percent={o.enrolment.progress_percent} className="mt-3" />
        ) : (
          o.is_staff_preview && <p className="mt-2 text-xs font-medium text-amber-700">Instructor preview. Progress isn't recorded.</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {o.sections.map((section) => (
          <div key={section.uuid} className="mb-2">
            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{section.title}</p>
            <ul>
              {section.lessons.map((l) => (
                <li key={l.uuid}>
                  <Link
                    to={`/learn/${courseUuid}/${l.uuid}`}
                    aria-current={l.uuid === lessonUuid ? 'page' : undefined}
                    className={cn(
                      'flex items-start gap-3 px-4 py-2 text-sm',
                      l.uuid === lessonUuid ? 'bg-brand-50 font-medium text-navy-900' : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {l.completed ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" aria-label="Completed" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-slate-300" aria-label="Not completed" />
                    )}
                    <span className="flex-1">{l.title}</span>
                    <span className="text-xs text-slate-400">{formatDuration(l.duration_seconds)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-white lg:flex">
      <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen">{sidebar}</aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/40" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl">
            <button type="button" onClick={() => setMenuOpen(false)} className="absolute right-3 top-3 text-slate-500" aria-label="Close contents">
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="flex-1">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} className="flex items-center gap-2 text-sm font-medium text-navy-900">
            <Menu className="size-5" /> Contents
          </button>
          {o.enrolment && <ProgressBar percent={o.enrolment.progress_percent} className="ml-auto w-32" />}
        </div>

        {o.enrolment?.status === 'completed' && (
          <div className="border-b border-brand-100 bg-brand-50 px-6 py-3 text-sm text-brand-700">
            <Award className="mr-2 inline size-4" aria-hidden />
            You've completed this course. Certificates arrive in a coming release.
          </div>
        )}

        {lessonUuid ? (
          <LessonView key={lessonUuid} courseUuid={courseUuid} lessonUuid={lessonUuid} enrolled={!!o.enrolment} />
        ) : (
          <div className="p-8">
            <Alert>This course has no lessons yet.</Alert>
          </div>
        )}
      </main>
    </div>
  )
}

function LessonView({ courseUuid, lessonUuid, enrolled }: { courseUuid: string; lessonUuid: string; enrolled: boolean }) {
  const client = useQueryClient()
  const navigate = useNavigate()

  const lesson = useQuery<PlayerLesson, ApiError>({
    queryKey: ['learn', 'lesson', lessonUuid],
    queryFn: () => api.get<PlayerLesson>(`/learn/lessons/${lessonUuid}`),
  })

  // Opening a lesson updates "last opened", so refresh the outline and My learning.
  useEffect(() => {
    if (lesson.isSuccess) client.invalidateQueries({ queryKey: ['learn', 'courses'] })
  }, [lesson.isSuccess, client])

  const toggle = useMutation({
    mutationFn: (done: boolean) => api.post<EnrolmentInfo>(`/learn/lessons/${lessonUuid}/${done ? 'complete' : 'incomplete'}`),
    onSuccess: (res, done) => {
      client.invalidateQueries({ queryKey: ['learn'] })
      client.invalidateQueries({ queryKey: ['access', courseUuid] })
      if (done && res.data.status === 'completed' && res.data.progress_percent === 100) {
        toast.success('Course complete. Well done!')
      } else if (done && lesson.data?.next_lesson) {
        navigate(`/learn/${courseUuid}/${lesson.data.next_lesson}`)
      }
    },
    onError: notifyError,
  })

  if (lesson.isLoading) return <Spinner label="Loading lesson" />
  if (lesson.isError) return <div className="p-8"><ErrorState error={lesson.error} retry={() => lesson.refetch()} /></div>

  const l = lesson.data!
  const done = l.progress?.completed ?? false
  const Icon = l.content_type === 'text' || l.content_type === 'pdf' || l.content_type === 'document' ? FileText : PlayCircle

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Icon className="size-4" aria-hidden /> {l.section.title}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{l.title}</h1>

      <div className="mt-6">
        <LessonContent lesson={l} />
      </div>

      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {l.previous_lesson && (
            <Link to={`/learn/${courseUuid}/${l.previous_lesson}`}>
              <Button variant="secondary">
                <ArrowLeft className="size-4" /> Previous
              </Button>
            </Link>
          )}
          {l.next_lesson && (
            <Link to={`/learn/${courseUuid}/${l.next_lesson}`}>
              <Button variant="ghost">
                Next <ArrowRight className="size-4" />
              </Button>
            </Link>
          )}
        </div>
        {enrolled && (
          <Button variant={done ? 'secondary' : 'primary'} loading={toggle.isPending} onClick={() => toggle.mutate(!done)}>
            {done ? (
              <>
                <CheckCircle2 className="size-4 text-brand-600" /> Completed · undo
              </>
            ) : l.next_lesson ? (
              'Mark complete and continue'
            ) : (
              'Mark complete'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
