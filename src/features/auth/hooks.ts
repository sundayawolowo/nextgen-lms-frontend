import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ApiError, api, csrf } from '../../lib/api'
import { useWorkspace } from '../../stores/workspace'
import type { CurrentOrganisation, Me } from '../../types/api'

/** The signed-in user. `data` is undefined while loading or when signed out. */
export function useMe() {
  return useQuery<Me, ApiError>({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/me'),
    retry: (count, error) => error.status !== 401 && count < 2,
    staleTime: 60_000,
  })
}

/**
 * The organisation the user is working in, with their permissions there.
 * Clears a remembered workspace the user no longer belongs to.
 */
export function useCurrentOrganisation() {
  const { data: me } = useMe()
  const organisationUuid = useWorkspace((s) => s.organisationUuid)
  const setOrganisation = useWorkspace((s) => s.setOrganisation)

  const belongs = !!me && !!organisationUuid && me.organisations.some((o) => o.uuid === organisationUuid)

  useEffect(() => {
    if (me && organisationUuid && !belongs) setOrganisation(null)
  }, [me, organisationUuid, belongs, setOrganisation])

  const query = useQuery<CurrentOrganisation, ApiError>({
    queryKey: ['org', organisationUuid, 'current'],
    queryFn: () => api.get<CurrentOrganisation>('/organisation/current'),
    enabled: belongs,
    staleTime: 60_000,
  })

  const permissions = new Set(query.data?.permissions ?? [])

  return {
    organisation: belongs ? query.data : undefined,
    isLoading: belongs && query.isLoading,
    can: (permission: string) => me?.is_platform_admin === true || permissions.has(permission),
  }
}

export function usePlatformCan() {
  const { data: me } = useMe()
  return (permission: string) => !!me && (me.is_platform_admin || me.platform_permissions.includes(permission))
}

export function useLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; password: string; remember?: boolean }) => {
      await csrf()
      return api.post<Me>('/auth/login', input)
    },
    onSuccess: (res) => client.setQueryData(['me'], res.data),
  })
}

export function useRegister() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string; password_confirmation: string }) => {
      await csrf()
      return api.post<Me>('/auth/register', input)
    },
    onSuccess: (res) => client.setQueryData(['me'], res.data),
  })
}

export function useLogout() {
  const client = useQueryClient()
  const setOrganisation = useWorkspace((s) => s.setOrganisation)
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      setOrganisation(null)
      client.clear()
    },
  })
}
