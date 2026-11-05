// Shapes returned by the NextGen API (see backend docs/milestone-*.md).

export interface Envelope<T> {
  success: boolean
  message: string
  data: T
  meta: Record<string, unknown>
}

export interface PageMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface Paged<T> {
  items: T[]
  meta: PageMeta
}

export type OrganisationType = 'school' | 'church' | 'company' | 'training' | 'other'

export interface WorkspaceSummary {
  uuid: string
  name: string
  slug: string
  type: OrganisationType
  is_owner: boolean
  roles: string[]
}

export interface Me {
  uuid: string
  name: string
  email: string
  phone: string | null
  timezone: string
  email_verified: boolean
  is_platform_admin: boolean
  platform_permissions: string[]
  organisations: WorkspaceSummary[]
}

export interface CurrentOrganisation {
  uuid: string
  name: string
  slug: string
  type: OrganisationType
  status: string
  roles: string[]
  permissions: string[]
}

export type MemberStatus = 'invited' | 'active' | 'suspended' | 'left'

export interface Member {
  uuid: string
  name: string
  email: string
  status: MemberStatus
  is_owner: boolean
  department: { uuid: string; name: string } | null
  roles: string[]
  joined_at: string | null
}

export interface Invitation {
  uuid: string
  email: string
  role: string
  invited_by: string | null
  expires_at: string
  created_at: string
}

export interface InvitationPreview {
  organisation: { name: string; type: OrganisationType }
  email: string
  role: string
  expires_at: string
  expired: boolean
}

export interface Category {
  uuid: string
  name: string
  slug: string
  icon: string | null
  description: string | null
  courses_count: number
  children: Category[]
}

export type CourseStatus = 'draft' | 'in_review' | 'published' | 'archived'
export type CourseVisibility = 'public' | 'organisation' | 'private' | 'unlisted'
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all'
export type InstructorRole = 'lead' | 'instructor' | 'assistant'
export type LessonType = 'video' | 'text' | 'pdf' | 'audio' | 'document' | 'embed' | 'live'

export interface CourseSummary {
  uuid: string
  title: string
  slug: string
  subtitle: string | null
  thumbnail_path: string | null
  level: CourseLevel
  language: string
  price_minor: number
  currency: string
  is_free: boolean
  category: { uuid: string; name: string; slug: string } | null
  organisation: { uuid: string; name: string } | null
  ownership: 'organisation' | 'instructor' | 'platform'
  status: CourseStatus
  visibility: CourseVisibility
  lessons_count: number
  duration_seconds: number
  instructors: { uuid: string; name: string; role: InstructorRole; email?: string }[]
  published_at: string | null
  submitted_at?: string | null
}

export interface PublicLesson {
  uuid: string
  title: string
  content_type: LessonType
  duration_seconds: number
  is_preview: boolean
}

export interface CoursePublic extends CourseSummary {
  description: string | null
  objectives: string[]
  requirements: string[]
  promo_video_url: string | null
  curriculum: { uuid: string; title: string; lessons: PublicLesson[] }[]
}

export interface Lesson {
  uuid: string
  title: string
  summary: string | null
  content_type: LessonType
  body: string | null
  media_provider: string | null
  media_url: string | null
  duration_seconds: number
  is_preview: boolean
  position: number
}

export interface Section {
  uuid: string
  title: string
  description: string | null
  position: number
  lessons: Lesson[]
}

export interface CourseEditor extends CourseSummary {
  description: string | null
  objectives: string[]
  requirements: string[]
  promo_video_url: string | null
  submitted_at: string | null
  reviewed_at: string | null
  review_notes: string | null
  sections: Section[]
  permissions: {
    update: boolean
    publish: boolean
    archive: boolean
    manage_instructors: boolean
  }
}
