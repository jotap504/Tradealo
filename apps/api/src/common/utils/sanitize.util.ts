const REDACTED_FIELDS = [
  'password', 'passwordhash', 'token', 'refreshtoken',
  'accesstoken', 'secret', 'dni', 'cuil', 'cvv',
  'cardnumber', 'phone', 'email', 'address',
  'lat', 'lng', 'latitude', 'longitude',
]

export function sanitizeForLog(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      REDACTED_FIELDS.some((f) => k.toLowerCase().includes(f))
        ? '[REDACTED]'
        : sanitizeForLog(v),
    ]),
  )
}
