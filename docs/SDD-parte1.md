# TROCALIA — SOFTWARE DESIGN DOCUMENT v1.0
# Parte 1: Instrucciones, Stack, Estructura y Convenciones

---

## SECCIÓN 0 — INSTRUCCIONES PARA EL AGENTE IA

### 0.1 Cómo usar este documento

Este SDD es la única fuente de verdad. Ante cualquier decisión de código:
1. Buscar la regla explícita en este documento
2. Si no existe → preguntar, NO inventar
3. Nunca romper un patrón establecido en este documento para "simplificar"
4. Implementar exactamente lo especificado, ni más ni menos

### 0.2 Orden de implementación obligatorio

Implementar en este orden exacto. No avanzar al siguiente paso sin que los tests del paso actual pasen al 100%.

```
PASO 01 → Setup monorepo (Turborepo + estructura de carpetas)
PASO 02 → Schema de base de datos (Drizzle) + migraciones
PASO 03 → Módulo: System Config (base de todo lo configurable)
PASO 04 → Módulo: Auth (registro, login, JWT, refresh)
PASO 05 → Módulo: Users & Profiles
PASO 06 → Módulo: KYC & Verification
PASO 07 → Módulo: Token Wallet
PASO 08 → Módulo: Token Packs & MercadoPago
PASO 09 → Módulo: Listings (CRUD completo)
PASO 10 → Módulo: AI Generation (DeepSeek)
PASO 11 → Módulo: Search (Elasticsearch)
PASO 12 → Módulo: Reputation & Reviews
PASO 13 → Módulo: Contact (WhatsApp/Email)
PASO 14 → Módulo: Notifications
PASO 15 → Módulo: Moderation
PASO 16 → CEO Panel (frontend admin)
PASO 17 → Frontend web (Next.js) — por pantallas
PASO 18 → Tests E2E (Playwright)
PASO 19 → Security audit checklist
PASO 20 → Performance testing
```

### 0.3 Loop de autocorrección de tests — ALGORITMO OBLIGATORIO

El agente DEBE seguir este algoritmo en cada paso:

```
INICIO_PASO(n):
  1. Leer especificación completa del módulo en este SDD
  2. Leer contratos de los módulos de los que depende
  3. Escribir el código del módulo
  4. Escribir los tests unitarios especificados en la sección de tests
  5. Ejecutar: pnpm test --filter=<módulo>

  SI tests pasan (100%):
    6. Ejecutar: pnpm test:integration --filter=<módulo>
    SI integration tests pasan:
      7. git commit -m "feat(<módulo>): implementación completa paso N"
      8. AVANZAR AL PASO N+1
    SI integration tests fallan:
      GOTO LOOP_INTEGRATION_FIX

  SI tests unitarios fallan:
    LOOP_UNIT_FIX:
      a. Leer el error exacto del test
      b. Identificar qué regla de negocio de este SDD está siendo violada
      c. Corregir SOLO el código que causa el fallo (no el test)
         EXCEPCIÓN: si el test está mal escrito respecto al SDD, corregir el test
      d. Ejecutar tests nuevamente
      e. SI siguen fallando → GOTO LOOP_UNIT_FIX (máximo 5 iteraciones)
      f. SI 5 iteraciones sin resolver → documentar el bloqueante y DETENER

  LOOP_INTEGRATION_FIX:
      a. Leer el error de integración
      b. Identificar qué contrato de módulo no se está cumpliendo
      c. Verificar que ambos módulos implementan el contrato según el SDD
      d. Corregir el módulo que viola el contrato
      e. Ejecutar integration tests
      f. SI siguen fallando → GOTO LOOP_INTEGRATION_FIX (máximo 5 iteraciones)
      g. SI 5 iteraciones sin resolver → documentar y DETENER
```

### 0.4 Reglas absolutas — nunca violar

```
REGLA-001: Nunca exponer datos de un usuario a otro sin verificar ownership
REGLA-002: Nunca permitir balance negativo en el wallet
REGLA-003: Nunca guardar PII (DNI, fotos de documentos) en texto plano
REGLA-004: Nunca hardcodear 'AR', 'ARS' o '+54' en lógica de negocio — usar constantes
REGLA-005: Nunca hacer SELECT sin WHERE en tablas de listings, users, transactions
REGLA-006: Nunca usar OFFSET para paginación — usar cursor-based siempre
REGLA-007: Nunca loguear passwords, tokens, DNI, teléfonos o emails completos
REGLA-008: Nunca procesar un webhook de pago sin validar su firma HMAC
REGLA-009: Nunca modificar el wallet sin generar un credit_transaction correspondiente
REGLA-010: Nunca leer system_config de la DB directamente — siempre via ConfigService (con caché Redis)
```

---

## SECCIÓN 1 — VISIÓN Y ALCANCE MVP

### 1.1 Descripción
Trocalia es un marketplace argentino donde usuarios pueden publicar productos para vender. Los vendedores usan tokens (créditos) para publicar. La plataforma cobra solo por la venta de tokens, no por las transacciones entre usuarios.

### 1.2 Alcance MVP — Argentina únicamente

**INCLUIDO en MVP:**
- Registro y login de usuarios
- Verificación KYC: email, teléfono, DNI
- Sistema de tokens/créditos (wallet)
- Compra de tokens via MercadoPago
- 3 tipos de publicación: Standard, Premium, Coleccionable
- Publicaciones con duración: 30, 60, 90 días
- Generación de texto con IA (DeepSeek)
- Búsqueda con filtros y geolocalización (PostGIS)
- Reputación básica (rating post-venta)
- Contacto vía WhatsApp y email (sin chat en tiempo real)
- CEO Panel con configuración dinámica
- Notificaciones por email y push

**EXCLUIDO del MVP (no implementar, no preparar UI):**
- Subastas
- Canje / Trueque
- Chat en tiempo real
- App mobile
- Multi-país
- Escrow / pagos intermediados
- Envíos integrados
- Landing pages IA (builder visual)

### 1.3 Usuarios del sistema

```
TIPO            DESCRIPCIÓN                          KYC MÍNIMO
user            Comprador — puede ver y contactar    nivel 0
verified_user   Vendedor — puede publicar            nivel 2 (DNI)
moderator       Modera listings y usuarios           —
support         Ve usuarios y disputas               —
finance         Ve transacciones y tokens            —
partner         CEO Panel sin sección financiera     —
super_admin     Acceso total                         —
```

---

## SECCIÓN 2 — STACK TECNOLÓGICO DEFINITIVO

### 2.1 Backend
```
Runtime:          Node.js 20 LTS
Framework:        NestJS 10 (TypeScript strict)
ORM:              Drizzle ORM 0.30+
Validación:       class-validator + class-transformer
Autenticación:    @nestjs/jwt + bcrypt
Queue:            BullMQ 5+ (Redis)
WebSockets:       — (no en MVP)
Testing:          Jest + Supertest
Linting:          ESLint + Prettier
```

### 2.2 Frontend
```
Framework:        Next.js 14 (App Router)
Lenguaje:         TypeScript strict
Estilos:          TailwindCSS + configuración custom (ver SDD-parte1)
Componentes:      shadcn/ui + Radix UI
Fuentes:          Lato (body) + Plus Jakarta Sans (display) — Google Fonts
Colores base:     #EFEFEF página, #FFFFFF cards/nav, #222222 footer, #333333 texto
Data fetching:    TanStack Query v5
Estado global:    Zustand
Forms:            React Hook Form + Zod
HTTP client:      Axios con interceptors
```

### 2.3 Bases de datos
```
Principal:        PostgreSQL 16 + extensión PostGIS
Caché:            Redis 7 (Stack)
Búsqueda:         Elasticsearch 8
Archivos:         Cloudflare R2 (compatible S3)
```

### 2.4 Infraestructura
```
Monorepo:         Turborepo
Package manager:  pnpm 9
CI/CD:            GitHub Actions
Contenedores:     Docker + Docker Compose (dev y test)
CDN/WAF:          Cloudflare
Cloud:            AWS (ap-southeast-1 São Paulo → migrar cuando escale)
Secrets:          AWS Secrets Manager (prod) / .env (dev)
Monitoreo:        Sentry (errores) + Datadog (métricas)
```

### 2.5 Servicios externos
```
Pagos:            MercadoPago (SDK oficial Node.js)
IA texto:         DeepSeek API (deepseek-chat)
IA visión:        Qwen-VL-Max (Alibaba DashScope)
IA imágenes:      Tongyi Wanx 2.1 (Alibaba DashScope) — Fase 2
Email:            Resend (transaccional)
SMS/Push:         OneSignal
```

---

## SECCIÓN 3 — ESTRUCTURA DE CARPETAS COMPLETA

```
trocalia/
├── package.json                    (root — Turborepo config)
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── .gitignore
├── docker-compose.yml              (dev: postgres, redis, elasticsearch)
├── docker-compose.test.yml         (test: mismos servicios, puertos distintos)
│
├── apps/
│   ├── api/                        (NestJS backend)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── constants/
│   │   │   │   │   ├── argentina.constants.ts
│   │   │   │   │   ├── listing.constants.ts
│   │   │   │   │   └── token.constants.ts
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   └── public.decorator.ts
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   ├── roles.guard.ts
│   │   │   │   │   └── kyc-level.guard.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── logging.interceptor.ts
│   │   │   │   │   └── transform.interceptor.ts
│   │   │   │   ├── pipes/
│   │   │   │   │   └── validation.pipe.ts
│   │   │   │   └── utils/
│   │   │   │       ├── cursor.util.ts
│   │   │   │       ├── sanitize.util.ts
│   │   │   │       └── argentina.util.ts
│   │   │   ├── database/
│   │   │   │   ├── database.module.ts
│   │   │   │   ├── database.provider.ts
│   │   │   │   └── schema/
│   │   │   │       ├── index.ts            (exporta todo)
│   │   │   │       ├── users.schema.ts
│   │   │   │       ├── listings.schema.ts
│   │   │   │       ├── tokens.schema.ts
│   │   │   │       ├── reviews.schema.ts
│   │   │   │       ├── config.schema.ts
│   │   │   │       └── notifications.schema.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.repository.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── register.dto.ts
│   │   │   │   │   │   ├── login.dto.ts
│   │   │   │   │   │   └── refresh-token.dto.ts
│   │   │   │   │   └── strategies/
│   │   │   │   │       └── jwt.strategy.ts
│   │   │   │   ├── users/
│   │   │   │   ├── kyc/
│   │   │   │   ├── wallet/
│   │   │   │   ├── token-packs/
│   │   │   │   ├── listings/
│   │   │   │   ├── ai/
│   │   │   │   ├── search/
│   │   │   │   ├── reviews/
│   │   │   │   ├── contact/
│   │   │   │   ├── notifications/
│   │   │   │   ├── moderation/
│   │   │   │   └── config/
│   │   │   └── jobs/
│   │   │       ├── jobs.module.ts
│   │   │       ├── listing-expiry.job.ts
│   │   │       └── token-expiry.job.ts
│   │   └── test/
│   │       ├── unit/               (un archivo por service)
│   │       ├── integration/        (un archivo por módulo)
│   │       └── fixtures/           (datos de prueba)
│   │
│   └── web/                        (Next.js frontend)
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx            (home)
│       │   ├── (public)/
│       │   │   ├── listings/
│       │   │   │   └── page.tsx    (browse)
│       │   │   └── listing/
│       │   │       └── [id]/
│       │   │           └── page.tsx
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   └── register/
│       │   ├── (dashboard)/
│       │   │   ├── my-listings/
│       │   │   ├── wallet/
│       │   │   ├── profile/
│       │   │   └── kyc/
│       │   └── admin/
│       │       ├── layout.tsx
│       │       ├── page.tsx        (dashboard CEO)
│       │       ├── config/
│       │       ├── users/
│       │       └── moderation/
│       └── components/
│           ├── ui/                 (shadcn/ui generados)
│           ├── listing/
│           ├── wallet/
│           ├── auth/
│           └── admin/
│
└── packages/
    ├── shared-types/               (interfaces TypeScript)
    │   ├── package.json
    │   └── src/
    │       ├── index.ts
    │       ├── listing.types.ts
    │       ├── user.types.ts
    │       ├── token.types.ts
    │       └── api.types.ts
    ├── shared-validators/          (schemas Zod compartidos)
    │   └── src/
    │       ├── listing.schema.ts
    │       └── user.schema.ts
    └── shared-utils/               (funciones puras)
        └── src/
            ├── currency.util.ts
            ├── date.util.ts
            └── argentina.util.ts
```

---

## SECCIÓN 4 — CONVENCIONES OBLIGATORIAS DE CÓDIGO

### 4.1 TypeScript
```typescript
// tsconfig.json — strict mode obligatorio
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}

// NUNCA usar 'any'. Usar 'unknown' si el tipo no se conoce.
// NUNCA usar non-null assertion (!) salvo en tests.
// SIEMPRE tipar los retornos de funciones públicas.
```

### 4.2 Patrón de módulo NestJS (seguir EXACTAMENTE)
```typescript
// Cada módulo tiene: module, controller, service, repository, dto/
// El controller SOLO llama al service. NUNCA lógica en el controller.
// El service contiene la lógica de negocio.
// El repository contiene TODAS las queries a la DB.
// Los DTOs validan TODA entrada de datos.

// Ejemplo de estructura de un service method:
async createListing(dto: CreateListingDto, userId: string): Promise<ListingResponseDto> {
  // 1. Verificar precondiciones de negocio
  const user = await this.userRepo.findById(userId)
  if (!user) throw new NotFoundException('USER_NOT_FOUND')
  if (user.kycLevel < 2) throw new ForbiddenException('KYC_LEVEL_REQUIRED')

  // 2. Obtener configuración del sistema
  const cost = await this.configService.get<number>('listing.cost.standard')

  // 3. Ejecutar operación principal en transacción si toca múltiples tablas
  const result = await this.db.transaction(async (tx) => {
    const listing = await this.listingRepo.create(tx, { ...dto, userId })
    await this.walletService.debit(tx, userId, cost, 'listing_publish', listing.id)
    return listing
  })

  // 4. Efectos secundarios (fuera de la transacción)
  await this.searchService.indexListing(result.id)
  await this.notificationService.send(userId, 'listing_published', { listingId: result.id })

  // 5. Retornar DTO de respuesta (nunca la entidad de DB directa)
  return ListingResponseDto.fromEntity(result)
}
```

### 4.3 Manejo de errores estándar

```typescript
// http-exception.filter.ts — formato único de error en toda la API
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_TOKENS",      // código legible por máquina
    "message": "Saldo insuficiente",    // mensaje en español para el usuario
    "statusCode": 402,
    "timestamp": "2026-04-28T10:00:00Z",
    "path": "/api/v1/listings"
  }
}

// Códigos de error definidos (no inventar nuevos sin agregarlos aquí):
USER_NOT_FOUND          → 404
LISTING_NOT_FOUND       → 404
UNAUTHORIZED            → 401
FORBIDDEN               → 403
KYC_LEVEL_REQUIRED      → 403
INSUFFICIENT_TOKENS     → 402
VALIDATION_ERROR        → 422
DUPLICATE_EMAIL         → 409
INVALID_DNI             → 422
RATE_LIMIT_EXCEEDED     → 429
PAYMENT_FAILED          → 402
WEBHOOK_INVALID         → 401
CONFIG_NOT_FOUND        → 500  (nunca debería ocurrir si el seed es correcto)
```

### 4.4 Formato de respuesta exitosa
```typescript
// transform.interceptor.ts — todas las respuestas exitosas
{
  "success": true,
  "data": { ... },          // el payload
  "meta": {                 // solo en listados paginados
    "nextCursor": "xxx",
    "hasMore": true,
    "total": 1523           // solo en primera página
  }
}
```

### 4.5 Paginación cursor-based (OBLIGATORIO en todos los listados)
```typescript
// cursor.util.ts
export function encodeCursor(data: { createdAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url')
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString())
  return { createdAt: new Date(decoded.createdAt), id: decoded.id }
}

// En queries de Drizzle:
const items = await db.select().from(table)
  .where(and(
    eq(table.status, 'active'),
    cursor ? or(
      lt(table.createdAt, decoded.createdAt),
      and(eq(table.createdAt, decoded.createdAt), lt(table.id, decoded.id))
    ) : undefined
  ))
  .orderBy(desc(table.createdAt), desc(table.id))
  .limit(limit + 1)

const hasMore = items.length > limit
const data = hasMore ? items.slice(0, -1) : items
```

### 4.6 Logging — reglas de sanitización
```typescript
// logging.interceptor.ts
// NUNCA loguear estos campos (sanitizar antes de loguear):
const REDACTED_FIELDS = [
  'password', 'passwordHash', 'token', 'refreshToken',
  'accessToken', 'secret', 'dni', 'cuil', 'cvv',
  'cardNumber', 'phone', 'email', 'address',
  'lat', 'lng', 'latitude', 'longitude'
]

function sanitizeLog(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      REDACTED_FIELDS.some(f => k.toLowerCase().includes(f.toLowerCase()))
        ? '[REDACTED]'
        : sanitizeLog(v)
    ])
  )
}
```
