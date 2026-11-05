import { useLocation, useNavigate } from 'react-router'
import { Button } from '../../components/ui'
import { notifyError } from '../../lib/forms'
import { toast } from '../../stores/toast'
import type { EnrolOption } from '../../types/learning'
import { useMe } from '../auth/hooks'
import { useCourseAccess, useEnrol } from './hooks'

/**
 * The main call to action on a course: Log in to enrol / Enrol free / Continue / Buy.
 * `knownOption` lets lists that already have the option skip the extra request.
 */
export function EnrolButton({
  courseUuid,
  isFree,
  knownOption,
  className = 'w-full',
}: {
  courseUuid: string
  isFree: boolean
  knownOption?: EnrolOption
  className?: string
}) {
  const { data: me, isLoading: meLoading } = useMe()
  const access = useCourseAccess(knownOption ? undefined : courseUuid)
  const enrol = useEnrol(courseUuid)
  const navigate = useNavigate()
  const location = useLocation()

  const option = knownOption ?? access.data?.option
  const goToPlayer = () => navigate(`/learn/${courseUuid}`)

  if (meLoading || (me && !knownOption && access.isLoading)) {
    return <Button className={className} loading disabled>Checking…</Button>
  }

  if (!me) {
    return (
      <Button className={className} onClick={() => navigate(`/login?next=${encodeURIComponent(location.pathname)}`)}>
        Log in to enrol
      </Button>
    )
  }

  if (access.data?.is_staff && option !== 'enrolled') {
    return (
      <Button variant="secondary" className={className} onClick={goToPlayer}>
        Preview as instructor
      </Button>
    )
  }

  switch (option) {
    case 'enrolled':
      return (
        <Button className={className} onClick={goToPlayer}>
          {access.data?.enrolment?.progress_percent ? 'Continue learning' : 'Start learning'}
        </Button>
      )
    case 'free':
    case 'organisation':
      return (
        <Button
          className={className}
          loading={enrol.isPending}
          disabled={!me.email_verified}
          title={!me.email_verified ? 'Verify your email address first' : undefined}
          onClick={() =>
            enrol.mutate(undefined, {
              onSuccess: () => {
                toast.success("You're enrolled. Enjoy the course!")
                goToPlayer()
              },
              onError: notifyError,
            })
          }
        >
          {option === 'organisation' && !isFree ? 'Enrol (included for members)' : 'Enrol for free'}
        </Button>
      )
    case 'payment_required':
      return (
        <Button className={className} disabled title="Payments open in the next release">
          Buy course (coming soon)
        </Button>
      )
    case 'invite_only':
      return (
        <Button variant="secondary" className={className} disabled>
          By invitation only
        </Button>
      )
    default:
      return (
        <Button variant="secondary" className={className} disabled>
          Not available
        </Button>
      )
  }
}
