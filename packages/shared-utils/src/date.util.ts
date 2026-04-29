const TIMEZONE = 'America/Argentina/Buenos_Aires'

export function toArgentineDate(date: Date | string): Date {
  return new Date(new Date(date).toLocaleString('en-US', { timeZone: TIMEZONE }))
}

export function formatArgentineDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function daysUntil(date: Date | string): number {
  const now = new Date()
  const target = new Date(date)
  const diffMs = target.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}
