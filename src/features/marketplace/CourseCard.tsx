import { BookOpen, Clock } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui'
import { formatDuration, formatPrice, humanise } from '../../lib/format'
import type { CourseSummary } from '../../types/api'

export function CourseThumb({ course, className = 'h-36' }: { course: CourseSummary; className?: string }) {
  // Placeholder art until media uploads exist: colour picked from the title.
  const hue = [...course.title].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360

  if (course.thumbnail_path) {
    return <img src={course.thumbnail_path} alt="" className={`${className} w-full object-cover`} />
  }

  return (
    <div
      className={`${className} flex w-full items-end p-4`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 28%), hsl(${(hue + 40) % 360} 60% 42%))` }}
      aria-hidden
    >
      <BookOpen className="size-8 text-white/70" />
    </div>
  )
}

export function CourseCard({ course, to }: { course: CourseSummary; to: string }) {
  const lead = course.instructors.find((i) => i.role === 'lead') ?? course.instructors[0]

  return (
    <Link
      to={to}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <CourseThumb course={course} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {course.category && <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{course.category.name}</p>}
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-brand-700">{course.title}</h3>
        {lead && <p className="text-sm text-slate-600">{lead.name}</p>}
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {formatDuration(course.duration_seconds)}
          </span>
          <span>{course.lessons_count} lessons</span>
          <Badge>{humanise(course.level)}</Badge>
        </div>
        <p className="pt-1 font-semibold text-navy-900">{formatPrice(course.price_minor, course.currency)}</p>
      </div>
    </Link>
  )
}
