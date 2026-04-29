export const AR_PROVINCES = [
  'CABA', 'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut',
  'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy',
  'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén',
  'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz',
  'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
] as const

export type ArgentineProvince = (typeof AR_PROVINCES)[number]

export function validateDNI(dni: string): boolean {
  const cleaned = dni.replace(/\D/g, '')
  return /^[0-9]{7,8}$/.test(cleaned)
}

export function formatArgentinePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('54')) return `+${cleaned}`
  if (cleaned.startsWith('0')) return `+54${cleaned.slice(1)}`
  return `+54${cleaned}`
}
