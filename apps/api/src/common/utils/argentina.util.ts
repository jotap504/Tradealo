import { AR } from '../constants/argentina.constants'

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

export function buildWhatsAppUrl(
  phone: string,
  listingTitle: string,
  listingId: string,
): string {
  const formatted = formatArgentinePhone(phone)
  const number = formatted.replace('+', '')
  const message = encodeURIComponent(
    `Hola! Te consulto por tu publicación en Tradealo: "${listingTitle}" ` +
      `https://tradealo.com.ar/p/${listingId}`,
  )
  return `https://wa.me/${number}?text=${message}`
}

export function isValidProvince(province: string): boolean {
  return (AR.PROVINCES as readonly string[]).includes(province)
}
