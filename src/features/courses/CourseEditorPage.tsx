import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, FileText, Pencil, PlayCircle, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Alert, Badge, Button, Card, ErrorState, Field, Input, Select, Spinner, Textarea } from '../../components/ui'
import { ApiError, api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatDuration, formatPrice, humanise, toMinor } from '../../lib/format'
import { notifyError } from '../../lib/forms'
import { toast } from '../../stores/toast'
import type { CourseEditor, InstructorRole, Lesson, LessonType, Section } from '../../types/api'
import { flattenCategories, useCategories } from '../marketplace/useCategories'
import { statusTone } from './CourseListPages'

type Tab = 'details' | 'curriculum' | 'team'

export function CourseEditorPage() {
  const { uuid = '' } = useParams()
  const [tab, setTab] = useState<Tab>('curriculum')

  const course = useQuery<CourseEditor, ApiError>({
    queryKey: ['course', uuid],
    queryFn: () => api.get<CourseEditor>(`/courses/${uuid}`),
  })

  if (course.isLoading) return <Spinner label="Loading course" />
  if (course.isError) {
    if (course.error.status === 403 || course.error.status === 404) {
      return <Alert tone="error" title="You can't open this course">It doesn't exist, or you're not on its teaching team.</Alert>
    }
    return <ErrorState error={course.error} retry={() => course.refetch()} />
  }

  const c = course.data!

  return (
    <div>
      <Link to={c.organisation ? '/org/courses' : '/studio'} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-navy-900">
        <ArrowLeft className="size-4" /> Back to courses
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{c.title}</h1>
            <Badge tone={statusTone[c.status]}>{humanise(c.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {c.organisation ? c.organisation.name : 'Personal course'} · {humanise(c.visibility)} · {c.lessons_count} lessons ·{' '}
            {formatDuration(c.duration_seconds)} · {formatPrice(c.price_minor, c.currency)}
          </p>
        </div>
        <PublishActions course={c} />
      </div>

      {c.review_notes && c.status === 'draft' && (
        <div className="mb-6">
          <Alert tone="warning" title="Changes requested by the reviewer">
            <p className="whitespace-pre-line">{c.review_notes}</p>
          </Alert>
        </div>
      )}
      {c.status === 'in_review' && (
        <div className="mb-6">
          <Alert tone="info" title="Waiting for review">The NextGen team is reviewing this course. It's locked until they respond.</Alert>
        </div>
      )}

      <div className="mb-6 flex gap-1 border-b border-slate-200" role="tablist">
        {(['curriculum', 'details', 'team'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
              tab === t ? 'border-brand-600 text-navy-900' : 'border-transparent text-slate-500 hover:text-navy-900',
            )}
          >
            {t === 'team' ? 'Teaching team' : humanise(t)}
          </button>
        ))}
      </div>

      {tab === 'details' && <DetailsForm course={c} />}
      {tab === 'curriculum' && <Curriculum course={c} />}
      {tab === 'team' && <Team course={c} />}
    </div>
  )
}

/* Shared mutation helper -------------------------------------------------- */

function useCourseMutation<V>(course: CourseEditor, fn: (vars: V) => Promise<unknown>, success?: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (success) toast.success(success)
      client.invalidateQueries({ queryKey: ['course', course.uuid] })
      client.invalidateQueries({ queryKey: ['studio'] })
      client.invalidateQueries({ queryKey: ['org'] })
    },
    onError: notifyError,
  })
}

/* Publishing -------------------------------------------------------------- */

function PublishActions({ course }: { course: CourseEditor }) {
  const needsReview = course.visibility === 'public' || course.visibility === 'unlisted'
  const action = useCourseMutation(course, (path: string) => api.post(`/courses/${course.uuid}/${path}`))
  const archive = useCourseMutation(course, () => api.del(`/courses/${course.uuid}`), 'Course archived')

  const run = (path: string, message: string) => action.mutate(path, { onSuccess: () => toast.success(message) })

  return (
    <div className="flex flex-wrap gap-2">
      {course.status === 'published' && needsReview && (
        <Link to={`/marketplace/${course.slug}`} target="_blank">
          <Button variant="secondary">
            <ExternalLink className="size-4" /> View page
          </Button>
        </Link>
      )}
      {course.permissions.publish && course.status === 'draft' && needsReview && (
        <Button loading={action.isPending} onClick={() => run('submit', 'Submitted for review')}>
          Submit for review
        </Button>
      )}
      {course.permissions.publish && course.status === 'draft' && !needsReview && (
        <Button loading={action.isPending} onClick={() => run('publish', 'Course published')}>
          Publish
        </Button>
      )}
      {course.permissions.publish && (course.status === 'published' || course.status === 'in_review') && (
        <Button variant="secondary" loading={action.isPending} onClick={() => run('unpublish', 'Moved back to draft')}>
          {course.status === 'in_review' ? 'Withdraw from review' : 'Unpublish'}
        </Button>
      )}
      {course.permissions.archive && course.status !== 'archived' && (
        <Button
          variant="danger"
          loading={archive.isPending}
          onClick={() => window.confirm('Archive this course? It becomes read-only.') && archive.mutate(undefined)}
        >
          Archive
        </Button>
      )}
    </div>
  )
}

/* Details ----------------------------------------------------------------- */

function DetailsForm({ course }: { course: CourseEditor }) {
  const categories = useCategories()
  const editable = course.permissions.update && course.status !== 'in_review' && course.status !== 'archived'

  const [form, setForm] = useState(() => toForm(course))
  const [errors, setErrors] = useState<Record<string, string>>({})
  useEffect(() => setForm(toForm(course)), [course])

  const save = useCourseMutation(course, (body: Record<string, unknown>) => api.patch(`/courses/${course.uuid}`, body), 'Details saved')

  function submit(e: FormEvent) {
    e.preventDefault()
    const price = toMinor(form.price)
    if (price === null) {
      setErrors({ price_minor: 'Enter a price in naira, e.g. 2500 or 0 for free.' })
      return
    }
    setErrors({})
    save.mutate(
      {
        title: form.title,
        subtitle: form.subtitle || null,
        description: form.description || null,
        category: form.category || null,
        level: form.level,
        visibility: form.visibility,
        price_minor: price,
        promo_video_url: form.promo_video_url || null,
        objectives: lines(form.objectives),
        requirements: lines(form.requirements),
      },
      {
        onError: (error) => {
          if (error instanceof ApiError) setErrors(Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v[0]])))
        },
      },
    )
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

  return (
    <Card className="p-6">
      {!editable && (
        <div className="mb-4">
          <Alert>You can view these details but not change them right now.</Alert>
        </div>
      )}
      <form onSubmit={submit} className="space-y-5" noValidate>
        <fieldset disabled={!editable} className="space-y-5">
          <Field label="Title" htmlFor="d-title" error={errors.title}>
            <Input id="d-title" value={form.title} onChange={set('title')} />
          </Field>
          <Field label="Subtitle" htmlFor="d-subtitle" error={errors.subtitle} hint="One sentence that sells the course.">
            <Input id="d-subtitle" value={form.subtitle} onChange={set('subtitle')} />
          </Field>
          <Field label="Description" htmlFor="d-description" error={errors.description} hint="At least 50 characters before publishing.">
            <Textarea id="d-description" rows={7} value={form.description} onChange={set('description')} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Category" htmlFor="d-category" error={errors.category}>
              <Select id="d-category" value={form.category} onChange={set('category')}>
                <option value="">None yet</option>
                {flattenCategories(categories.data ?? []).map((c) => (
                  <option key={c.uuid} value={c.uuid}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Level" htmlFor="d-level" error={errors.level}>
              <Select id="d-level" value={form.level} onChange={set('level')}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="all">All levels</option>
              </Select>
            </Field>
            <Field label={`Price (${course.currency})`} htmlFor="d-price" error={errors.price_minor} hint="0 for a free course.">
              <Input id="d-price" inputMode="decimal" value={form.price} onChange={set('price')} />
            </Field>
          </div>
          <Field
            label="Visibility"
            htmlFor="d-visibility"
            error={errors.visibility}
            hint="Public and unlisted courses are reviewed before going live. Organisation and private courses publish straight away."
          >
            <Select id="d-visibility" value={form.visibility} onChange={set('visibility')}>
              <option value="public">Public: listed on the marketplace</option>
              <option value="unlisted">Unlisted: anyone with the link</option>
              {course.organisation && <option value="organisation">Organisation: members of {course.organisation.name}</option>}
              <option value="private">Private: only people given access</option>
            </Select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="What learners will learn" htmlFor="d-objectives" error={errors.objectives} hint="One per line.">
              <Textarea id="d-objectives" rows={5} value={form.objectives} onChange={set('objectives')} />
            </Field>
            <Field label="Requirements" htmlFor="d-requirements" error={errors.requirements} hint="One per line.">
              <Textarea id="d-requirements" rows={5} value={form.requirements} onChange={set('requirements')} />
            </Field>
          </div>
          <Field label="Promo video URL (optional)" htmlFor="d-promo" error={errors.promo_video_url}>
            <Input id="d-promo" type="url" placeholder="https://" value={form.promo_video_url} onChange={set('promo_video_url')} />
          </Field>
        </fieldset>
        {editable && (
          <div className="flex justify-end">
            <Button type="submit" loading={save.isPending}>
              Save details
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}

function toForm(c: CourseEditor) {
  return {
    title: c.title,
    subtitle: c.subtitle ?? '',
    description: c.description ?? '',
    category: c.category?.uuid ?? '',
    level: c.level,
    visibility: c.visibility,
    price: c.price_minor ? String(c.price_minor / 100) : '0',
    promo_video_url: c.promo_video_url ?? '',
    objectives: c.objectives.join('\n'),
    requirements: c.requirements.join('\n'),
  }
}

function lines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean)
}

/* Curriculum -------------------------------------------------------------- */

function Curriculum({ course }: { course: CourseEditor }) {
  const editable = course.permissions.update && course.status !== 'in_review' && course.status !== 'archived'
  const [title, setTitle] = useState('')

  const addSection = useCourseMutation(course, (t: string) => api.post(`/courses/${course.uuid}/sections`, { title: t }), 'Section added')
  const reorder = useCourseMutation(course, (order: string[]) => api.put(`/courses/${course.uuid}/sections/order`, { order }))

  function move(index: number, delta: number) {
    const order = course.sections.map((s) => s.uuid)
    const [item] = order.splice(index, 1)
    order.splice(index + delta, 0, item)
    reorder.mutate(order)
  }

  return (
    <div className="space-y-4">
      {course.sections.length === 0 && (
        <Alert title="Start with a section">Group lessons into sections, like "Getting started" or "Week 1".</Alert>
      )}

      {course.sections.map((section, index) => (
        <SectionCard
          key={section.uuid}
          course={course}
          section={section}
          editable={editable}
          canMoveUp={index > 0}
          canMoveDown={index < course.sections.length - 1}
          onMove={(delta) => move(index, delta)}
        />
      ))}

      {editable && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (title.trim().length < 2) return
            addSection.mutate(title.trim(), { onSuccess: () => setTitle('') })
          }}
          className="flex gap-2"
        >
          <Input aria-label="New section title" placeholder="New section title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit" variant="secondary" loading={addSection.isPending}>
            <Plus className="size-4" /> Add section
          </Button>
        </form>
      )}
    </div>
  )
}

function SectionCard({
  course,
  section,
  editable,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  course: CourseEditor
  section: Section
  editable: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (delta: number) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(section.title)
  const [adding, setAdding] = useState(false)

  const rename = useCourseMutation(course, (t: string) => api.patch(`/sections/${section.uuid}`, { title: t }), 'Section renamed')
  const remove = useCourseMutation(course, () => api.del(`/sections/${section.uuid}`), 'Section deleted')
  const reorderLessons = useCourseMutation(course, (order: string[]) => api.put(`/sections/${section.uuid}/lessons/order`, { order }))

  function moveLesson(index: number, delta: number) {
    const order = section.lessons.map((l) => l.uuid)
    const [item] = order.splice(index, 1)
    order.splice(index + delta, 0, item)
    reorderLessons.mutate(order)
  }

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        {renaming ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              rename.mutate(name, { onSuccess: () => setRenaming(false) })
            }}
          >
            <Input aria-label="Section title" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Button type="submit" size="sm" loading={rename.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <>
            <h3 className="flex-1 font-semibold">{section.title}</h3>
            <span className="text-xs text-slate-500">{section.lessons.length} lessons</span>
            {editable && (
              <div className="flex items-center gap-1">
                <IconButton label="Move section up" disabled={!canMoveUp} onClick={() => onMove(-1)} icon={<ArrowUp className="size-4" />} />
                <IconButton label="Move section down" disabled={!canMoveDown} onClick={() => onMove(1)} icon={<ArrowDown className="size-4" />} />
                <IconButton label="Rename section" onClick={() => setRenaming(true)} icon={<Pencil className="size-4" />} />
                <IconButton
                  label="Delete section"
                  onClick={() => window.confirm(`Delete "${section.title}" and its lessons?`) && remove.mutate(undefined)}
                  icon={<Trash2 className="size-4" />}
                />
              </div>
            )}
          </>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {section.lessons.map((lesson, index) => (
          <LessonRow
            key={lesson.uuid}
            course={course}
            lesson={lesson}
            editable={editable}
            canMoveUp={index > 0}
            canMoveDown={index < section.lessons.length - 1}
            onMove={(delta) => moveLesson(index, delta)}
          />
        ))}
      </ul>

      {editable && (
        <div className="border-t border-slate-100 px-4 py-3">
          {adding ? (
            <LessonForm course={course} sectionUuid={section.uuid} onDone={() => setAdding(false)} />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Add lesson
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

function LessonRow({
  course,
  lesson,
  editable,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  course: CourseEditor
  lesson: Lesson
  editable: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (delta: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const remove = useCourseMutation(course, () => api.del(`/lessons/${lesson.uuid}`), 'Lesson deleted')
  const Icon = lesson.content_type === 'text' || lesson.content_type === 'pdf' || lesson.content_type === 'document' ? FileText : PlayCircle

  if (editing) {
    return (
      <li className="bg-slate-50 px-4 py-3">
        <LessonForm course={course} lesson={lesson} onDone={() => setEditing(false)} />
      </li>
    )
  }

  const missing = lesson.content_type === 'text' ? !lesson.body : lesson.content_type !== 'live' && !lesson.media_url

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <Icon className="size-4 text-slate-400" aria-hidden />
      <span className="flex-1">{lesson.title}</span>
      {missing && <Badge tone="amber">Needs content</Badge>}
      {lesson.is_preview && <Badge tone="green">Preview</Badge>}
      <span className="text-xs text-slate-500">{humanise(lesson.content_type)}</span>
      <span className="w-12 text-right text-xs text-slate-500">{formatDuration(lesson.duration_seconds)}</span>
      {editable && (
        <div className="flex items-center gap-1">
          <IconButton label="Move lesson up" disabled={!canMoveUp} onClick={() => onMove(-1)} icon={<ArrowUp className="size-4" />} />
          <IconButton label="Move lesson down" disabled={!canMoveDown} onClick={() => onMove(1)} icon={<ArrowDown className="size-4" />} />
          <IconButton label="Edit lesson" onClick={() => setEditing(true)} icon={<Pencil className="size-4" />} />
          <IconButton
            label="Delete lesson"
            onClick={() => window.confirm(`Delete "${lesson.title}"?`) && remove.mutate(undefined)}
            icon={<Trash2 className="size-4" />}
          />
        </div>
      )}
    </li>
  )
}

const LESSON_TYPES: LessonType[] = ['video', 'text', 'pdf', 'audio', 'document', 'embed', 'live']

function LessonForm({ course, sectionUuid, lesson, onDone }: { course: CourseEditor; sectionUuid?: string; lesson?: Lesson; onDone: () => void }) {
  const [form, setForm] = useState({
    title: lesson?.title ?? '',
    content_type: lesson?.content_type ?? ('video' as LessonType),
    media_url: lesson?.media_url ?? '',
    body: lesson?.body ?? '',
    minutes: lesson ? String(Math.round(lesson.duration_seconds / 60)) : '',
    is_preview: lesson?.is_preview ?? false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useCourseMutation(
    course,
    (body: Record<string, unknown>) => (lesson ? api.patch(`/lessons/${lesson.uuid}`, body) : api.post(`/sections/${sectionUuid}/lessons`, body)),
    lesson ? 'Lesson saved' : 'Lesson added',
  )

  function submit(e: FormEvent) {
    e.preventDefault()
    const isText = form.content_type === 'text'
    const minutes = Number(form.minutes || 0)
    save.mutate(
      {
        title: form.title,
        content_type: form.content_type,
        body: isText ? form.body || null : null,
        media_url: !isText && form.content_type !== 'live' ? form.media_url || null : null,
        media_provider: !isText && form.media_url ? guessProvider(form.media_url) : null,
        duration_seconds: Number.isFinite(minutes) ? Math.round(minutes * 60) : 0,
        is_preview: form.is_preview,
      },
      {
        onSuccess: onDone,
        onError: (error) => {
          if (error instanceof ApiError) setErrors(Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v[0]])))
        },
      },
    )
  }

  const id = lesson?.uuid ?? `new-${sectionUuid}`

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_7rem]">
        <Field label="Lesson title" htmlFor={`${id}-title`} error={errors.title}>
          <Input id={`${id}-title`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
        </Field>
        <Field label="Type" htmlFor={`${id}-type`} error={errors.content_type}>
          <Select id={`${id}-type`} value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value as LessonType })}>
            {LESSON_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanise(t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Minutes" htmlFor={`${id}-minutes`} error={errors.duration_seconds}>
          <Input id={`${id}-minutes`} inputMode="numeric" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
        </Field>
      </div>

      {form.content_type === 'text' ? (
        <Field label="Lesson content (Markdown)" htmlFor={`${id}-body`} error={errors.body}>
          <Textarea id={`${id}-body`} rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>
      ) : form.content_type !== 'live' ? (
        <Field label="Media URL" htmlFor={`${id}-url`} error={errors.media_url} hint="YouTube, Vimeo, Cloudflare Stream, Mux or a direct https link.">
          <Input id={`${id}-url`} type="url" placeholder="https://" value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} />
        </Field>
      ) : (
        <p className="text-sm text-slate-500">Live class scheduling arrives in a later release. You can add the lesson now as a placeholder.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.is_preview} onChange={(e) => setForm({ ...form, is_preview: e.target.checked })} className="rounded border-slate-300" />
          Free preview (visible on the course page before purchase)
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={save.isPending}>
            {lesson ? 'Save lesson' : 'Add lesson'}
          </Button>
        </div>
      </div>
    </form>
  )
}

function guessProvider(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/vimeo\.com/.test(url)) return 'vimeo'
  if (/cloudflarestream\.com|videodelivery\.net/.test(url)) return 'cloudflare'
  if (/mux\.com/.test(url)) return 'mux'
  return 'url'
}

function IconButton({ label, icon, onClick, disabled }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy-900 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {icon}
    </button>
  )
}

/* Teaching team ----------------------------------------------------------- */

function Team({ course }: { course: CourseEditor }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InstructorRole>('instructor')

  const add = useCourseMutation(course, (body: { email: string; role: InstructorRole }) => api.post(`/courses/${course.uuid}/instructors`, body), 'Instructor added')
  const remove = useCourseMutation(course, (userUuid: string) => api.del(`/courses/${course.uuid}/instructors/${userUuid}`), 'Instructor removed')

  return (
    <div className="space-y-6">
      <Card className="divide-y divide-slate-100">
        {course.instructors.map((i) => (
          <div key={i.uuid} className="flex items-center gap-3 px-4 py-3 text-sm">
            <div className="flex-1">
              <p className="font-medium text-navy-900">{i.name}</p>
              <p className="text-slate-500">{i.email}</p>
            </div>
            <Badge tone={i.role === 'lead' ? 'navy' : 'slate'}>{humanise(i.role)}</Badge>
            {course.permissions.manage_instructors && (
              <Button variant="danger" size="sm" aria-label={`Remove ${i.name}`} onClick={() => remove.mutate(i.uuid)}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </Card>

      {course.permissions.manage_instructors ? (
        <Card className="p-6">
          <h3 className="font-semibold">Add someone to the teaching team</h3>
          <p className="mt-1 text-sm text-slate-600">
            {course.organisation
              ? `They must already be a member of ${course.organisation.name}.`
              : 'They need a NextGen account with this email.'}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              add.mutate({ email, role }, { onSuccess: () => setEmail('') })
            }}
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
          >
            <Field label="Email" htmlFor="team-email">
              <Input id="team-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Role" htmlFor="team-role">
              <Select id="team-role" value={role} onChange={(e) => setRole(e.target.value as InstructorRole)}>
                <option value="lead">Lead: full control</option>
                <option value="instructor">Instructor: edits content</option>
                <option value="assistant">Assistant: view only</option>
              </Select>
            </Field>
            <Button type="submit" loading={add.isPending}>
              Add
            </Button>
          </form>
        </Card>
      ) : (
        <p className="text-sm text-slate-500">Only a lead instructor or an organisation admin can change the teaching team.</p>
      )}
    </div>
  )
}
