export const AR = {
  COUNTRY_CODE: 'AR',
  DEFAULT_CURRENCY: 'ARS' as const,
  ALLOWED_CURRENCIES: ['ARS', 'USD'] as const,
  PHONE_PREFIX: '+54',
  TIMEZONE: 'America/Argentina/Buenos_Aires',
  LOCALE: 'es-AR',

  PROVINCES: [
    'CABA', 'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut',
    'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy',
    'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén',
    'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz',
    'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
  ] as const,
} as const
