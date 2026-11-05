import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from '../components/Toaster'
import { ApiError } from '../lib/api'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't hammer the API with retries for errors that won't fix themselves.
        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
        refetchOnWindowFocus: false,
      },
    },
  })
}

const client = createQueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )
}
