export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://trocalia.com.ar';

export const PROVINCIAS = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
] as const;

export const CONDITIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'used', label: 'Usado' },
  { value: 'refurbished', label: 'Reacondicionado' },
] as const;

export const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'MercadoPago',
  'Débito',
  'Crédito',
] as const;

export const SHIPPING_OPTIONS = [
  'Envío por correo',
  'Moto mensajero',
  'Encuentro en persona',
  'Sin envío',
] as const;

export const LISTING_DURATION_PRESETS = [
  { days: 7, label: '7 días' },
  { days: 14, label: '14 días' },
  { days: 30, label: '30 días' },
  { days: 60, label: '60 días' },
  { days: 90, label: '90 días' },
] as const;

export const LISTING_DURATION_MIN = 1;
export const LISTING_DURATION_MAX = 90;

export function getDurationMultiplier(days: number): number {
  if (days <= 30) return 1;
  if (days <= 60) return 1.5;
  return 2;
}

export const LISTING_BASE_COST = {
  standard: 1,
  premium: 5,
} as const;

export const NOTIFICATION_ICONS: Record<string, string> = {
  message: 'MessageCircle',
  review: 'Star',
  listing_approved: 'CheckCircle2',
  listing_rejected: 'XCircle',
  listing_expired: 'Clock',
  payment: 'Coins',
  kyc: 'ShieldCheck',
  default: 'Bell',
};
