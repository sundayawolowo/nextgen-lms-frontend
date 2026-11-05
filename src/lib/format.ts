const SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$' }

/** 250000 kobo -> "₦2,500.00". Free courses read "Free". */
export function formatPrice(minor: number, currency = 'NGN'): string {
  if (minor === 0) return 'Free'
  const major = minor / 100
  const symbol = SYMBOLS[currency] ?? `${currency} `
  return symbol + major.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 3725 seconds -> "1h 2m"; 300 -> "5m"; 45 -> "1m". */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.max(1, Math.round((seconds % 3600) / 60))
  if (hours === 0) return `${minutes}m`
  return minutes === 60 ? `${hours + 1}h` : `${hours}h ${minutes % 60}m`
}

/** "teaching-assistant" -> "Teaching assistant" */
export function humanise(value: string): string {
  const text = value.replace(/[-_]/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Naira typed by a person ("2,500.50") -> kobo (250050). Returns null when it isn't a number. */
export function toMinor(input: string): number | null {
  const cleaned = input.replace(/[,\s₦$]/g, '')
  if (cleaned === '') return 0
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}
