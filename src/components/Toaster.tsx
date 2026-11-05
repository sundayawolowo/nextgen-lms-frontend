import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '../lib/cn'
import { useToasts } from '../stores/toast'

export function Toaster() {
  const { toasts, dismiss } = useToasts()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? XCircle : Info
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg',
              t.kind === 'error' ? 'border-red-200' : t.kind === 'success' ? 'border-brand-100' : 'border-slate-200',
            )}
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            <Icon
              className={cn('mt-0.5 size-4 shrink-0', t.kind === 'error' ? 'text-red-600' : t.kind === 'success' ? 'text-brand-600' : 'text-navy-500')}
              aria-hidden
            />
            <p className="flex-1 text-slate-700">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
