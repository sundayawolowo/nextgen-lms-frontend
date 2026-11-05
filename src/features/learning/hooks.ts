import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../../lib/api'
import type { CourseAccessInfo, EnrolmentInfo } from '../../types/learning'
import { useMe } from '../auth/hooks'

/** What the course's main button should do for the signed-in user. */
export function useCourseAccess(courseUuid: string | undefined) {
  const { data: me } = useMe()
  return useQuery<CourseAccessInfo, ApiError>({
    queryKey: ['access', courseUuid],
    queryFn: () => api.get<CourseAccessInfo>(`/courses/${courseUuid}/access`),
    enabled: !!me && !!courseUuid,
  })
}

export function useEnrol(courseUuid: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<EnrolmentInfo>(`/courses/${courseUuid}/enrol`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['access', courseUuid] })
      client.invalidateQueries({ queryKey: ['learn'] })
      client.invalidateQueries({ queryKey: ['org'] })
    },
  })
}
