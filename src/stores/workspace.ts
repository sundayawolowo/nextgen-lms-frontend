import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The organisation the user is working in, or null for their personal space.
 * Remembered per browser. Sent as the X-Organisation header by lib/api.
 */
interface WorkspaceState {
  organisationUuid: string | null
  setOrganisation: (uuid: string | null) => void
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      organisationUuid: null,
      setOrganisation: (uuid) => set({ organisationUuid: uuid }),
    }),
    { name: 'nextgen.workspace' },
  ),
)
