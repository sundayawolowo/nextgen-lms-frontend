import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, FileText, Lock, PlayCircle, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Badge, EmptyState, ErrorState, Input, Pagination, Select, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { formatDuration, formatPrice, humanise } from '../../lib/format'
import type { CoursePublic, CourseSummary } from '../../types/api'
import { EnrolButton } from '../learning/EnrolButton'
import { CourseCard, CourseThumb } from './CourseCard'
import { flattenCategories, useCategories } from './useCategories'

export function MarketplacePage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const categories = useCategories()

  const filters = {
    search: params.get('search') ?? '',
    category: params.get('category') ?? '',
    level: params.get('level') ?? '',
    price: params.get('price') ?? '',
    sort: params.get('sort') ?? 'newest',
    page: Number(params.get('page') ?? 1),
  }

  // Debounce the search box into the URL.
  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== filters.search) update({ search, page: '' })
    }, 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const courses = useQuery({
    queryKey: ['marketplace', filters],
    queryFn: () => api.page<CourseSummary>('/marketplace/courses', { ...filters, per_page: 12 }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <section className="bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Learn something useful today</h1>
          <p className="mt-2 max-w-xl text-navy-100">Courses from independent instructors and organisations, for work, ministry and life.</p>
          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <label htmlFor="search" className="sr-only">
              Search courses
            </label>
            <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses" className="py-3 pl-9" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Select aria-label="Category" value={filters.category} onChange={(e) => update({ category: e.target.value, page: '' })}>
            <option value="">All categories</option>
            {flattenCategories(categories.data ?? []).map((c) => (
              <option key={c.uuid} value={c.slug}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select aria-label="Level" value={filters.level} onChange={(e) => update({ level: e.target.value, page: '' })}>
            <option value="">Any level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="all">All levels</option>
          </Select>
          <Select aria-label="Price" value={filters.price} onChange={(e) => update({ price: e.target.value, page: '' })}>
            <option value="">Free and paid</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </Select>
          <Select aria-label="Sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value, page: '' })}>
            <option value="newest">Newest</option>
            <option value="title">Title A–Z</option>
            <option value="price_low">Price: low to high</option>
            <option value="price_high">Price: high to low</option>
          </Select>
        </div>

        {courses.isLoading ? (
          <Spinner label="Loading courses" />
        ) : courses.isError ? (
          <ErrorState error={courses.error} retry={() => courses.refetch()} />
        ) : courses.data!.items.length === 0 ? (
          <EmptyState title="No courses match" description="Try a different search or clear the filters." />
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-600">{courses.data!.meta.total} courses</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.data!.items.map((c) => (
                <CourseCard key={c.uuid} course={c} to={`/marketplace/${c.slug}`} />
              ))}
            </div>
            <Pagination page={filters.page} lastPage={courses.data!.meta.last_page} onChange={(p) => update({ page: String(p) })} />
          </>
        )}
      </div>
    </div>
  )
}

const lessonIcon = { video: PlayCircle, audio: PlayCircle, live: PlayCircle, text: FileText, pdf: FileText, document: FileText, embed: FileText }

export function CourseDetailPage() {
  const { slug = '' } = useParams()
  const course = useQuery({
    queryKey: ['marketplace', 'course', slug],
    queryFn: () => api.get<CoursePublic>(`/marketplace/courses/${slug}`),
  })

  if (course.isLoading) return <Spinner label="Loading course" />
  if (course.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        {course.error && (course.error as { status?: number }).status === 404 ? (
          <EmptyState title="Course not found" description="It may have been unpublished." action={<Link to="/marketplace" className="font-medium text-brand-700">Browse courses</Link>} />
        ) : (
          <ErrorState error={course.error} retry={() => course.refetch()} />
        )}
      </div>
    )
  }

  const c = course.data!

  return (
    <div>
      <section className="bg-navy-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {c.category && (
              <Link to={`/marketplace?category=${c.category.slug}`} className="text-sm font-medium text-brand-500 hover:underline">
                {c.category.name}
              </Link>
            )}
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{c.title}</h1>
            {c.subtitle && <p className="mt-3 text-lg text-navy-100">{c.subtitle}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-navy-100">
              <span>By {c.instructors.map((i) => i.name).join(', ')}</span>
              {c.organisation && <span>· {c.organisation.name}</span>}
              <span className="flex items-center gap-1">
                <Clock className="size-4" aria-hidden /> {formatDuration(c.duration_seconds)}
              </span>
              <span>{c.lessons_count} lessons</span>
              <span>{humanise(c.level)}</span>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl bg-white text-slate-800 shadow-lg">
            <CourseThumb course={c} className="h-40" />
            <div className="space-y-3 p-5">
              <p className="text-2xl font-semibold text-navy-900">{formatPrice(c.price_minor, c.currency)}</p>
              <EnrolButton courseUuid={c.uuid} isFree={c.is_free} />
              <p className="text-xs text-slate-500">{c.lessons_count} lessons · {formatDuration(c.duration_seconds)} · learn at your own pace</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {c.objectives.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold">What you'll learn</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {c.objectives.map((o) => (
                  <li key={o} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden /> {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold">Course content</h2>
            <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {c.curriculum.map((s) => (
                <div key={s.uuid}>
                  <p className="bg-slate-50 px-5 py-3 text-sm font-semibold text-navy-900">{s.title}</p>
                  <ul>
                    {s.lessons.map((l) => {
                      const Icon = lessonIcon[l.content_type]
                      return (
                        <li key={l.uuid} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                          <Icon className="size-4 text-slate-400" aria-hidden />
                          {l.is_preview ? (
                            <Link to={`/marketplace/${c.slug}/preview/${l.uuid}`} className="flex-1 text-brand-700 hover:underline">
                              {l.title}
                            </Link>
                          ) : (
                            <span className="flex-1">{l.title}</span>
                          )}
                          {l.is_preview ? <Badge tone="green">Preview</Badge> : <Lock className="size-3.5 text-slate-300" aria-label="Locked" />}
                          <span className="w-12 text-right text-slate-500">{formatDuration(l.duration_seconds)}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {c.description && (
            <section>
              <h2 className="text-lg font-semibold">Description</h2>
              <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{c.description}</div>
            </section>
          )}
        </div>

        {c.requirements.length > 0 && (
          <aside>
            <h2 className="text-lg font-semibold">Requirements</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {c.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  )
}
