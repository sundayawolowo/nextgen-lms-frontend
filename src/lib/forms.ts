import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './api'
import { toast } from '../stores/toast'

/**
 * Put server validation errors under the matching inputs.
 * Anything that isn't a field error becomes a toast.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[]) {
  if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
    let placed = false
    for (const [field, messages] of Object.entries(error.errors)) {
      if (fields.includes(field)) {
        setError(field as Path<T>, { type: 'server', message: messages[0] })
        placed = true
      }
    }
    if (placed) return
  }

  toast.error(error instanceof Error ? error.message : 'Something went wrong.')
}

/** Toast any error from a mutation. */
export function notifyError(error: unknown) {
  if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
    const first = Object.values(error.errors)[0]?.[0]
    toast.error(first ?? error.message)
    return
  }
  toast.error(error instanceof Error ? error.message : 'Something went wrong.')
}
