import type { CourseSummary, LessonType } from './api'

export type EnrolOption = 'enrolled' | 'free' | 'organisation' | 'payment_required' | 'invite_only' | 'unavailable'

export interface EnrolmentInfo {
  uuid: string
  status: 'active' | 'completed' | 'cancelled'
  progress_percent: number
  completed_lessons_count: number
  last_lesson: string | null
  enrolled_at: string | null
  last_accessed_at: string | null
  completed_at: string | null
}

export interface CourseAccessInfo {
  option: EnrolOption
  can_learn: boolean
  is_staff: boolean
  enrolment: EnrolmentInfo | null
}

export interface MyCourse {
  course: CourseSummary
  enrolment: EnrolmentInfo
}

export interface OutlineLesson {
  uuid: string
  title: string
  content_type: LessonType
  duration_seconds: number
  completed: boolean
}

export interface CourseOutline {
  course: CourseSummary
  enrolment: EnrolmentInfo | null
  is_staff_preview: boolean
  next_lesson: string | null
  sections: { uuid: string; title: string; lessons: OutlineLesson[] }[]
}

export interface PlayerLesson {
  uuid: string
  title: string
  summary: string | null
  content_type: LessonType
  body: string | null
  media_provider: string | null
  media_url: string | null
  duration_seconds: number
  is_preview: boolean
  section: { uuid: string; title: string }
  course: { uuid: string; title: string; slug: string }
  previous_lesson: string | null
  next_lesson: string | null
  progress: { position_seconds: number; completed: boolean } | null
}

export interface CatalogueCourse extends CourseSummary {
  option: EnrolOption
  enrolment: EnrolmentInfo | null
}

export interface CourseLearner {
  user: { uuid: string; name: string; email: string }
  enrolment: EnrolmentInfo
  access: string[]
}
