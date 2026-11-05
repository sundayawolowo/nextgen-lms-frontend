import { cn } from '../../lib/cn'

export function ProgressBar({ percent, className, label = true }: { percent: number; className?: string; label?: boolean }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Course progress"
      >
        <div className={cn('h-full rounded-full transition-all', value === 100 ? 'bg-brand-600' : 'bg-brand-500')} style={{ width: `${value}%` }} />
      </div>
      {label && <span className="w-10 text-right text-xs font-medium text-slate-600">{value}%</span>}
    </div>
  )
}
