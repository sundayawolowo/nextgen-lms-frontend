import { Link } from 'react-router'

export function Logo({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2" aria-label="NextGen LMS home">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#ffffff' : '#0f1f3d'} fillOpacity={light ? 0.1 : 1} />
        <path d="M9 22V10l7 7 7-7v12" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={light ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-navy-900'}>
        NextGen <span className="text-brand-600">LMS</span>
      </span>
    </Link>
  )
}
