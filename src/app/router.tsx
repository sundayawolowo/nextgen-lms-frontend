import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { EmptyState } from '../components/ui'
import { ReviewQueuePage } from '../features/admin/ReviewQueuePage'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from '../features/auth/AuthPages'
import { GuestOnly, RequireAuth } from '../features/auth/guards'
import { useMe } from '../features/auth/hooks'
import { CourseEditorPage } from '../features/courses/CourseEditorPage'
import { NewCoursePage, OrganisationCoursesPage, StudioPage } from '../features/courses/CourseListPages'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { LibraryPage, MyLearningPage, PreviewLessonPage } from '../features/learning/LearningPages'
import { PlayerPage } from '../features/learning/PlayerPage'
import { CourseDetailPage, MarketplacePage } from '../features/marketplace/MarketplacePages'
import {
  AcceptInvitationPage,
  CreateOrganisationPage,
  InvitationsPage,
  MembersPage,
} from '../features/organisations/OrganisationPages'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout, PublicLayout } from '../layouts/PublicLayout'

function Home() {
  const { data: me, isLoading } = useMe()
  if (isLoading) return null
  return <Navigate to={me ? '/dashboard' : '/marketplace'} replace />
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24">
      <EmptyState title="Page not found" description="The link may be old, or the page has moved." />
    </div>
  )
}

export const routes = [
  { path: '/', element: <Home /> },

  // Public pages
  {
    element: <PublicLayout />,
    children: [
      { path: '/marketplace', element: <MarketplacePage /> },
      { path: '/marketplace/:slug', element: <CourseDetailPage /> },
      { path: '/marketplace/:slug/preview/:lesson', element: <PreviewLessonPage /> },
    ],
  },

  // Login, registration, password and invitation links
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: '/register', element: <GuestOnly><RegisterPage /></GuestOnly> },
      { path: '/forgot-password', element: <GuestOnly><ForgotPasswordPage /></GuestOnly> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/invitations/accept', element: <AcceptInvitationPage /> },
    ],
  },

  // Signed-in app
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/learn', element: <MyLearningPage /> },
      { path: '/org/library', element: <LibraryPage /> },
      { path: '/organisations/new', element: <CreateOrganisationPage /> },
      { path: '/studio', element: <StudioPage /> },
      { path: '/studio/new', element: <NewCoursePage scope="personal" /> },
      { path: '/courses/:uuid/edit', element: <CourseEditorPage /> },
      { path: '/org/courses', element: <OrganisationCoursesPage /> },
      { path: '/org/courses/new', element: <NewCoursePage scope="organisation" /> },
      { path: '/org/members', element: <MembersPage /> },
      { path: '/org/invitations', element: <InvitationsPage /> },
      { path: '/admin/reviews', element: <ReviewQueuePage /> },
    ],
  },

  // Full-screen course player
  { path: '/learn/:courseUuid', element: <RequireAuth><PlayerPage /></RequireAuth> },
  { path: '/learn/:courseUuid/:lessonUuid', element: <RequireAuth><PlayerPage /></RequireAuth> },

  { element: <Outlet />, children: [{ path: '*', element: <NotFound /> }] },
]

export const router = createBrowserRouter(routes)
