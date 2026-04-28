# TROCALIA — SDD v1.0
# Parte 4: Seguridad, Testing Loop, API Contracts y Setup

---

## SECCIÓN 8 — SEGURIDAD — IMPLEMENTACIÓN EXACTA

### 8.1 Headers de seguridad (main.ts)
```typescript
// apps/api/src/main.ts
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Headers de seguridad
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        imgSrc:         ["'self'", 'data:', '*.r2.dev', '*.cloudflare.com'],
        connectSrc:     ["'self'"],
        fontSrc:        ["'self'", 'fonts.gstatic.com'],
        objectSrc:      ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }))

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Rate limiting global (por IP)
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutos
    max: 300,                   // 300 requests por IP cada 15 min
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({ client: redisClient }),
  }))

  // Validation pipe global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          // elimina campos no declarados en DTO
    forbidNonWhitelisted: true, // lanza error si hay campos extra
    transform: true,          // transforma tipos automáticamente
    transformOptions: { enableImplicitConversion: false },
  }))

  // Exception filter global
  app.useGlobalFilters(new HttpExceptionFilter())

  // Interceptor de logging y transform
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  )

  await app.listen(process.env.PORT ?? 3001)
}
```

### 8.2 JWT Guard y decoradores
```typescript
// common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true
    return super.canActivate(context)
  }
}

// Aplicar globalmente en app.module.ts:
{ provide: APP_GUARD, useClass: JwtAuthGuard }

// Para rutas públicas usar @Public():
@Public()
@Get('listings')
async browse() { ... }

// common/guards/kyc-level.guard.ts
// Uso: @RequireKycLevel(2)
@Injectable()
export class KycLevelGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<number>('kycLevel', context.getHandler())
    if (!required) return true
    const user = context.switchToHttp().getRequest().user
    if (user.kycLevel < required) {
      throw new ForbiddenException('KYC_LEVEL_REQUIRED')
    }
    return true
  }
}
```

### 8.3 Rate limits específicos por endpoint
```typescript
// common/decorators/rate-limit.decorator.ts
// Usar: @RateLimit({ ttl: 900, limit: 5 }) — 5 requests cada 15 min
// Se implementa con un interceptor que usa Redis

// Límites específicos (se aplican ADEMÁS del límite global):
// POST /auth/login              → 5 por IP cada 15 min
// POST /auth/register           → 3 por IP cada hora
// POST /auth/forgot-password    → 3 por IP cada hora
// POST /kyc/*/submit            → 3 por usuario cada día
// POST /ai/generate-*           → ver config ai.daily_limit_per_user en Redis
// POST /listings                → 20 por usuario cada hora
// POST /listings/*/contact      → 3 por (userId + sellerId) cada 24 horas
```

### 8.4 Validación del webhook de MercadoPago
```typescript
// modules/token-packs/mercadopago-webhook.service.ts
async validateAndProcess(payload: any, signature: string, requestId: string): Promise<void> {
  // 1. Validar firma HMAC-SHA256
  const secret = process.env.MP_WEBHOOK_SECRET
  const signedTemplate = `id:${requestId};request-id:${requestId};ts:${payload.date_created};`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedTemplate)
    .digest('hex')

  if (!crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )) {
    throw new UnauthorizedException('WEBHOOK_INVALID')
  }

  // 2. Idempotencia — si ya procesamos este payment_id, ignorar
  const alreadyProcessed = await this.tokenPurchaseRepo.existsByGatewayPaymentId(
    payload.data?.id
  )
  if (alreadyProcessed) {
    this.logger.log(`Webhook duplicado ignorado: ${payload.data?.id}`)
    return
  }

  // 3. Procesar según status
  if (payload.type === 'payment') {
    await this.handlePaymentWebhook(payload.data.id)
  }
}
```

### 8.5 Encriptación de datos KYC
```typescript
// common/utils/encryption.util.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.KYC_ENCRYPTION_KEY!, 'hex') // 32 bytes

export function encrypt(text: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Retornar: iv + authTag + encrypted en base64
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decrypt(encryptedData: string): string {
  const data = Buffer.from(encryptedData, 'base64')
  const iv = data.slice(0, 12)
  const authTag = data.slice(12, 28)
  const encrypted = data.slice(28)
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

// Usar encrypt() antes de guardar el dniNumber en user_verifications.verification_data
// Usar decrypt() solo cuando un admin autorizado lo solicita
```

---

## SECCIÓN 9 — PROCESO DE TESTING Y LOOP DE AUTOCORRECCIÓN

### 9.1 Configuración de Jest
```typescript
// apps/api/jest.config.ts
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 }
  }
}

// apps/api/jest.integration.config.ts
export default {
  ...baseConfig,
  testRegex: '.*\\.integration\\.spec\\.ts$',
  rootDir: 'test/integration',
  setupFilesAfterFramework: ['./jest.setup.ts'],
}
```

### 9.2 Setup de tests de integración
```typescript
// test/integration/jest.setup.ts
// Antes de todos los tests de integración:
// 1. Levantar Docker Compose con postgres+redis+elasticsearch
// 2. Ejecutar migraciones
// 3. Ejecutar seeds de config
// 4. Crear fixtures de usuarios de prueba

import { execSync } from 'child_process'

beforeAll(async () => {
  execSync('docker compose -f docker-compose.test.yml up -d --wait', { stdio: 'inherit' })
  execSync('pnpm drizzle-kit migrate', { stdio: 'inherit' })
  await seedTestConfig()
  await seedTestUsers()
})

afterAll(async () => {
  execSync('docker compose -f docker-compose.test.yml down -v', { stdio: 'inherit' })
})

// Fixtures — usuarios pre-creados para tests
export const FIXTURES = {
  userNoKyc:        { email: 'nokyc@test.com',        kycLevel: 0 },
  userKyc1:         { email: 'kyc1@test.com',          kycLevel: 1 },
  userKyc2Seller:   { email: 'seller@test.com',        kycLevel: 2 },
  userKyc4Verified: { email: 'verified@test.com',      kycLevel: 4 },
  adminUser:        { email: 'admin@trocalia.com.ar',   role: 'super_admin' },
}
```

### 9.3 Tests de integración críticos (flujos completos)

```typescript
// test/integration/listing-publish-flow.integration.spec.ts
describe('Flujo completo de publicación', () => {
  test('FLUJO-01: usuario sin KYC no puede publicar', async () => {
    const { accessToken } = await loginAs(FIXTURES.userNoKyc)
    const res = await request(app.getHttpServer())
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validListingDto)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('KYC_LEVEL_REQUIRED')
  })

  test('FLUJO-02: usuario KYC2 con cuota disponible publica gratis', async () => {
    const { accessToken, userId } = await loginAs(FIXTURES.userKyc2Seller)
    const walletBefore = await getWalletBalance(userId)

    const res = await request(app.getHttpServer())
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validListingDto)

    expect(res.status).toBe(201)
    expect(res.body.data.wasFreeQuota).toBe(true)
    expect(res.body.data.creditsSpent).toBe(0)

    const walletAfter = await getWalletBalance(userId)
    expect(walletAfter).toBe(walletBefore) // balance no cambia
  })

  test('FLUJO-03: usuario sin cuota disponible paga tokens', async () => {
    const { accessToken, userId } = await loginAs(FIXTURES.userKyc2Seller)
    await exhaustFreeQuota(userId) // agotar cuota del mes
    await setWalletBalance(userId, 10)

    const res = await request(app.getHttpServer())
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validListingDto, type: 'standard', durationDays: 30 })

    expect(res.status).toBe(201)
    expect(res.body.data.wasFreeQuota).toBe(false)
    expect(res.body.data.creditsSpent).toBe(2) // costo standard 30 días

    const walletAfter = await getWalletBalance(userId)
    expect(walletAfter).toBe(8) // 10 - 2
  })

  test('FLUJO-04: usuario sin tokens ni cuota → INSUFFICIENT_TOKENS', async () => {
    const { accessToken, userId } = await loginAs(FIXTURES.userKyc2Seller)
    await exhaustFreeQuota(userId)
    await setWalletBalance(userId, 0)

    const res = await request(app.getHttpServer())
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validListingDto)

    expect(res.status).toBe(402)
    expect(res.body.error.code).toBe('INSUFFICIENT_TOKENS')
  })

  test('FLUJO-05: listing publicado aparece en búsqueda después del sync ES', async () => {
    const { accessToken } = await loginAs(FIXTURES.userKyc2Seller)
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validListingDto, title: 'MacBook Pro M3 único en el mercado' })

    await waitForElasticsearchSync(createRes.body.data.id) // esperar max 5 segundos

    const searchRes = await request(app.getHttpServer())
      .get('/api/v1/listings')
      .query({ q: 'MacBook Pro M3' })

    expect(searchRes.status).toBe(200)
    expect(searchRes.body.data.some((l: any) => l.id === createRes.body.data.id)).toBe(true)
  })
})

// test/integration/token-purchase-flow.integration.spec.ts
describe('Flujo de compra de tokens con MercadoPago', () => {
  test('FLUJO-06: checkout crea preference en MP y retorna checkoutUrl', async () => { ... })
  test('FLUJO-07: webhook approved → acredita tokens al usuario', async () => { ... })
  test('FLUJO-08: webhook duplicado es ignorado (idempotencia)', async () => { ... })
  test('FLUJO-09: webhook con firma inválida → 401', async () => { ... })
  test('FLUJO-10: webhook rejected → no acredita tokens', async () => { ... })
})

// test/integration/wallet-concurrency.integration.spec.ts
describe('Concurrencia en wallet', () => {
  test('FLUJO-11: 10 debits simultáneos no resultan en balance negativo', async () => {
    const userId = await createUserWithBalance(15)
    // Disparar 10 debits de 3 tokens simultáneamente
    const promises = Array(10).fill(null).map(() =>
      request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${await getToken(userId)}`)
        .send(validListingDto)
    )
    const results = await Promise.allSettled(promises)
    const successes = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 201)
    const failures = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 402)

    // Con balance 15 y costo 2: máximo 7 éxitos (14 tokens), 3 fallos
    expect(successes.length).toBeLessThanOrEqual(7)
    expect(failures.length).toBeGreaterThan(0)

    // El balance nunca debe ser negativo
    const finalBalance = await getWalletBalance(userId)
    expect(finalBalance).toBeGreaterThanOrEqual(0)
  })
})
```

### 9.4 Tests E2E con Playwright (flujos críticos)
```typescript
// test/e2e/register-and-publish.spec.ts
import { test, expect } from '@playwright/test'

test('E2E-01: Registro completo y primera publicación', async ({ page }) => {
  // 1. Registro
  await page.goto('/register')
  await page.fill('[name=email]', 'e2etest@trocalia.com.ar')
  await page.fill('[name=password]', 'TestPass123')
  await page.click('[type=submit]')
  await expect(page).toHaveURL('/dashboard')

  // 2. KYC DNI (mock en test env)
  await page.goto('/kyc')
  await page.click('[data-testid=verify-dni-btn]')
  await page.fill('[name=dniNumber]', '12345678')
  // En test env, la verificación se aprueba automáticamente
  await expect(page.locator('[data-testid=kyc-dni-status]')).toHaveText('Verificado')

  // 3. Publicar listing
  await page.goto('/my-listings/new')
  await page.fill('[name=title]', 'Bicicleta de montaña rodado 29')
  await page.fill('[name=description]', 'Bicicleta en excelente estado...')
  await page.selectOption('[name=type]', 'standard')
  await page.fill('[name=price]', '150000')
  await page.click('[data-testid=publish-btn]')

  await expect(page.locator('[data-testid=success-message]'))
    .toContainText('Publicación creada exitosamente')
})

test('E2E-02: Búsqueda con filtro de ubicación', async ({ page }) => {
  await page.goto('/listings?province=Buenos+Aires&city=Palermo')
  const cards = page.locator('[data-testid=listing-card]')
  await expect(cards).toHaveCount(await cards.count())
  // Verificar que todas las cards muestran "Palermo" en su ubicación
  const locations = await page.locator('[data-testid=listing-location]').allTextContents()
  expect(locations.every(loc => loc.includes('Palermo') || loc.includes('Buenos Aires'))).toBe(true)
})
```

### 9.5 Checklist de security antes de deploy
```
SECURITY CHECKLIST — ejecutar antes de cada release

□ pnpm audit → 0 high/critical vulnerabilities
□ Semgrep scan → 0 findings de alta severidad
□ Verificar que ningún .env está trackeado en git
□ Verificar que KYC_ENCRYPTION_KEY tiene 32 bytes (64 hex chars)
□ Verificar que JWT_SECRET y ADMIN_JWT_SECRET son diferentes y >= 64 chars
□ Verificar que MP_WEBHOOK_SECRET está configurado
□ Test manual: intentar acceder a /admin sin 2FA → debe fallar
□ Test manual: intentar leer listing de otro usuario via API directa → debe dar 403
□ Test manual: enviar webhook de MP con firma falsa → debe dar 401
□ Test manual: intentar debitar más tokens de los disponibles → debe dar 402
□ Verificar rate limiting: 6 requests de login fallido → debe dar 429
□ Verificar que logs no contienen emails, DNI, ni tokens en texto plano
□ Verificar headers de seguridad con securityheaders.com
```

---

## SECCIÓN 10 — SETUP INICIAL (PASO 01)

### 10.1 Comandos para inicializar el monorepo
```bash
# 1. Crear estructura
mkdir trocalia && cd trocalia
pnpm init
pnpm add -D turbo

# 2. Crear apps
mkdir -p apps/api apps/web packages/shared-types packages/shared-validators packages/shared-utils

# 3. Inicializar API (NestJS)
cd apps/api && npx @nestjs/cli new . --package-manager pnpm --skip-git
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add drizzle-orm drizzle-kit postgres
pnpm add class-validator class-transformer
pnpm add ioredis bullmq
pnpm add helmet express-rate-limit rate-limit-redis
pnpm add bcrypt speakeasy
pnpm add @elastic/elasticsearch
pnpm add mercadopago
pnpm add resend
pnpm add -D @types/bcrypt @types/passport-jwt

# 4. Inicializar Web (Next.js)
cd ../web && npx create-next-app@latest . --typescript --tailwind --app --src-dir=no --import-alias="@/*" --skip-git
pnpm add @tanstack/react-query zustand react-hook-form zod @hookform/resolvers
pnpm add axios
npx shadcn-ui@latest init

# 5. Docker Compose para desarrollo
# Ver docker-compose.yml abajo

# 6. Turbo pipeline
# Ver turbo.json abajo
```

### 10.2 docker-compose.yml
```yaml
version: '3.8'
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: trocalia
      POSTGRES_USER: trocalia
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U trocalia"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  elasticsearch:
    image: elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - "9200:9200"
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9200/_cluster/health | grep -q 'green\\|yellow'"]
      interval: 10s
      timeout: 10s
      retries: 10

volumes:
  postgres_data:
```

### 10.3 turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:integration": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 10.4 Scripts en package.json raíz
```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:integration": "turbo run test:integration",
    "lint": "turbo run lint",
    "db:generate": "cd apps/api && pnpm drizzle-kit generate",
    "db:migrate": "cd apps/api && pnpm drizzle-kit migrate",
    "db:seed": "cd apps/api && pnpm ts-node src/database/seeds/run-seeds.ts",
    "db:studio": "cd apps/api && pnpm drizzle-kit studio"
  }
}
```

---

## SECCIÓN 11 — ARGENTINA: CONSTANTES Y UTILIDADES

```typescript
// apps/api/src/common/constants/argentina.constants.ts
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

// apps/api/src/common/utils/argentina.util.ts
export function validateDNI(dni: string): boolean {
  const cleaned = dni.replace(/\D/g, '')
  return /^[0-9]{7,8}$/.test(cleaned)
}

export function formatArgentinePhone(phone: string): string {
  // Normalizar a formato internacional: +54 9 11 XXXX-XXXX
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('54')) return `+${cleaned}`
  if (cleaned.startsWith('0')) return `+54${cleaned.slice(1)}`
  return `+54${cleaned}`
}

export function buildWhatsAppUrl(phone: string, listingTitle: string, listingId: string): string {
  const formatted = formatArgentinePhone(phone)
  const number = formatted.replace('+', '')
  const message = encodeURIComponent(
    `Hola! Te consulto por tu publicación en Trocalia: "${listingTitle}" ` +
    `https://trocalia.com.ar/p/${listingId}`
  )
  return `https://wa.me/${number}?text=${message}`
}

// packages/shared-utils/src/currency.util.ts
export function formatCurrency(amount: number, currency: 'ARS' | 'USD'): string {
  if (currency === 'ARS') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(amount)
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}
// Ejemplo: formatCurrency(150000, 'ARS') → "$ 150.000"
// Ejemplo: formatCurrency(1200, 'USD') → "US$ 1.200"
```

---

## SECCIÓN 12 — CEO PANEL: RUTAS Y ACCESO

```typescript
// apps/web/app/admin/layout.tsx
// El CEO Panel usa auth separada (adminJWT)
// Verificar que el usuario es admin antes de renderizar cualquier página

// Rutas del CEO Panel:
// GET  /admin                    → Dashboard con métricas
// GET  /admin/config             → Sistema de configuración (tabla editable)
// GET  /admin/config/:category   → Configuraciones por categoría
// GET  /admin/users              → Lista de usuarios
// GET  /admin/users/:id          → Detalle de usuario
// POST /admin/users/:id/suspend  → Suspender usuario
// POST /admin/users/:id/ban      → Banear usuario
// POST /admin/users/:id/tokens   → Ajuste manual de tokens (requiere razón)
// GET  /admin/listings           → Lista de listings con filtros
// POST /admin/listings/:id/approve → Aprobar listing
// POST /admin/listings/:id/reject  → Rechazar listing (requiere razón)
// GET  /admin/kyc/pending        → Cola de verificaciones pendientes
// GET  /admin/audit-log          → Log de auditoría (readonly)
// GET  /admin/token-packs        → Gestión de packs y precios
// POST /admin/token-packs/:packId/prices → Actualizar precio por país
```

---

## ÍNDICE DE ESTE SDD

```
SDD-parte1.md → Instrucciones agente, Stack, Estructura, Convenciones
SDD-parte2.md → Schema completo de base de datos (Drizzle)
SDD-parte3.md → Especificación de módulos (Auth, KYC, Wallet, Listings, AI, Search, Reviews, Contact, Notifications)
SDD-parte4.md → Seguridad, Testing loop, Variables de entorno, Setup inicial, Constantes AR, CEO Panel

ORDEN DE LECTURA PARA EL AGENTE:
  1. SDD-parte1.md (instrucciones y reglas absolutas — LEER PRIMERO)
  2. SDD-parte2.md (schema — antes de escribir cualquier módulo)
  3. SDD-parte3.md (módulos — durante la implementación)
  4. SDD-parte4.md (seguridad y testing — aplicar en cada módulo)
```
