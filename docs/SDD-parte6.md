# TROCALIA — SDD v1.0
# Parte 6: Frontend, CEO Panel, CI/CD, .cursorrules y checklist final

---

## SECCIÓN 17 — FRONTEND (Next.js 14)

### 17.1 Páginas y rutas

```
PÚBLICAS (sin login):
  /                          Home — listings destacados + categorías
  /listings                  Browse — búsqueda + filtros
  /listing/[id]              Detalle de publicación
  /seller/[username]         Perfil público de vendedor
  /login                     Login
  /register                  Registro
  /email-verified            Confirmación de verificación de email

PRIVADAS (requieren login — redirigir a /login si no hay sesión):
  /dashboard                 Home del usuario logueado
  /my-listings               Mis publicaciones
  /my-listings/new           Nueva publicación
  /my-listings/[id]/edit     Editar publicación
  /wallet                    Mi billetera de tokens
  /wallet/buy-tokens         Comprar tokens
  /notifications             Notificaciones
  /profile                   Mi perfil
  /profile/edit              Editar perfil
  /kyc                       Verificación de identidad

ADMIN (requieren adminJWT — redirigir a /admin/login si no hay sesión):
  /admin                     Dashboard CEO
  /admin/login               Login del panel admin
  /admin/config              Configuración del sistema
  /admin/users               Gestión de usuarios
  /admin/listings            Moderación de listings
  /admin/kyc                 Cola de verificaciones KYC
  /admin/token-packs         Gestión de packs y precios
  /admin/audit-log           Log de auditoría
```

### 17.2 Layout principal

```tsx
// app/layout.tsx
// Estructura de 3 zonas (colores exactos de Bellroy DevTools):

export default function RootLayout({ children }) {
  return (
    <html lang="es-AR">
      <body className="bg-[#EFEFEF] text-[#333333] font-sans antialiased">
        <header className="bg-[#FFFFFF] sticky top-0 z-50">
          <Navbar />
        </header>
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="bg-[#222222] text-[#CCCCCC]">
          <Footer />
        </footer>
      </body>
    </html>
  )
}
```

### 17.3 Componentes obligatorios

```
COMPONENTE                 PROPS MÍNIMAS                              UBICACIÓN
─────────────────────────────────────────────────────────────────────────────────
ListingCard                listing: ListingDto, variant?: 'grid'|'list'    components/listing/
ListingGrid                listings[], isLoading, hasMore, onLoadMore       components/listing/
ListingFilters             filters, onFilterChange                          components/listing/
ListingForm                mode: 'create'|'edit', initialData?              components/listing/
PriceDisplay               amount, currency, negotiable?                    components/listing/
SellerCard                 seller: SellerDto                                components/listing/
ContactButtons             listing: ListingDto                              components/listing/

TokenBadge                 amount, size?: 'sm'|'md'|'lg'                   components/wallet/
WalletBalance              balance, monthlyQuota                            components/wallet/
TokenPackCard              pack: TokenPackDto, onSelect                     components/wallet/
PurchaseModal              pack: TokenPackDto, onClose                      components/wallet/

KycProgress                verifications: KycStatusDto                      components/kyc/
KycStepCard                type, status, onStart                            components/kyc/

AIGeneratorButton          onGenerate(result)                               components/listing/
CategorySelector           categories, selected, onSelect                   components/listing/
ImageUploader              listingId, maxImages, onUploadComplete            components/listing/
ProvinceSelector           value, onChange                                  components/ui/

NotificationBell           count: number                                    components/ui/
Avatar                     src?, username, size                             components/ui/
ReputationStars            avg, count                                       components/ui/
```

### 17.4 Página Home — especificación

```tsx
// app/page.tsx
// Secciones en orden:
// 1. Hero — título + buscador prominente + CTA "Publicar gratis"
// 2. Categorías — grid de categorías con íconos
// 3. Listings Premium Destacados — carrusel horizontal (solo type='premium', status='active')
// 4. Publicaciones recientes — grid de 12 listings más recientes de AR
// 5. Coleccionables destacados — grid de 6 listings con isCollectible=true
// 6. CTA de registro — si el usuario no está logueado

// Datos a fetchear (server components con Next.js):
// - GET /listings?type=premium&limit=6 (para destacados)
// - GET /listings?limit=12&sortBy=recent (para recientes)
// - GET /listings?isCollectible=true&limit=6 (para coleccionables)
// - GET /categories (árbol de categorías — cacheable 1 hora)
```

### 17.5 Página de detalle de listing

```tsx
// app/listing/[id]/page.tsx
// Layout de 2 columnas en desktop, 1 columna en mobile

// Columna izquierda (60%):
//   - Galería de imágenes (imagen principal grande + thumbnails)
//   - Título + precio + moneda
//   - Descripción
//   - Atributos del producto (tabla)
//   - Si isCollectible: atributos de coleccionable
//   - Reviews del vendedor (últimas 5)

// Columna derecha (40%):
//   - Precio (repetido, prominente)
//   - Botón WhatsApp (verde #25D366) — si showPhone=true
//   - Formulario de consulta — siempre visible
//   - Métodos de pago aceptados (badges)
//   - Opciones de envío
//   - Card del vendedor (avatar, username, kyc badge, reputación, provincia)
//   - Botón "Ver más del vendedor"

// Meta tags para SEO (Next.js generateMetadata):
export async function generateMetadata({ params }) {
  const listing = await getListing(params.id)
  return {
    title: `${listing.title} | Trocalia`,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
      images: [listing.primaryImage],
      url: `https://trocalia.com.ar/listing/${listing.id}`,
    },
  }
}
```

### 17.6 Flujo de nueva publicación — pasos

```
PASO 1: Categoría
  → Selector de árbol de categorías
  → Si isCollectible=true → mostrar aviso de categoría especial

PASO 2: Información del producto
  → Título (con botón "Generar con IA" si ai.text.enabled=true)
  → Descripción (con botón "Generar con IA")
  → Condición (radio: Nuevo / Usado / Reacondicionado)
  → Si categoría tiene atributos → formulario dinámico de atributos

PASO 3: Fotos
  → Drag & drop de imágenes
  → Subida directa a R2 vía presigned URL
  → Ordenar imágenes (drag & drop)
  → Mínimo 1, máximo según tipo

PASO 4: Precio y contacto
  → Precio + selector de moneda (ARS / USD)
  → Checkbox "Precio negociable"
  → Métodos de pago aceptados (checkboxes)
  → Opciones de envío (checkboxes)
  → Descripción del envío (textarea opcional)

PASO 5: Ubicación
  → Selector de provincia (dropdown)
  → Ciudad (texto)
  → Botón "Usar mi ubicación" (geolocalización del browser)

PASO 6: Tipo y duración
  → Mostrar: Standard / Premium (con precios en tokens)
  → Duración: 30 / 60 / 90 días (con multiplicadores)
  → Cálculo de costo total en tiempo real
  → Si tiene cuota gratuita → mostrar "¡Gratis con tu cuota mensual!"
  → Botón "Publicar"

VALIDACIONES:
  → Cada paso valida antes de avanzar (no permitir avanzar con errores)
  → Si en PASO 6 no tiene tokens suficientes → mostrar modal de compra de tokens
```

### 17.7 CEO Panel — componentes

```tsx
// app/admin/config/page.tsx
// Organizado en acordeones por categoría:
// Tokens y Recompensas / Costos de Publicación / Duraciones / IA / Features / Moderación

// ConfigTable: tabla de configuraciones con edición inline
// ConfigEditor: modal de edición de una config específica
//   → Muestra: label, description, valor actual, tipo, validación, historial

// app/admin/users/page.tsx
// Tabla de usuarios con: avatar, email, kycLevel, status, balance tokens, fechas
// Filtros: por status, por kycLevel, por fecha de registro
// Acciones: ver detalle, suspender, banear, ajustar tokens

// app/admin/listings/page.tsx
// Tabla de listings pendientes de moderación
// Filtros: por moderationStatus, por riskScore, por fecha
// Acciones: aprobar, rechazar (con campo de razón obligatorio)
// Vista previa del listing en panel lateral (sin salir de la página)
```

---

## SECCIÓN 18 — CI/CD PIPELINE

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [develop, 'feature/**', 'fix/**']
  pull_request:
    branches: [develop, main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --filter=api
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: apps/api/coverage

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_DB: trocalia_test, POSTGRES_USER: trocalia, POSTGRES_PASSWORD: password }
        ports: ['5433:5432']
        options: --health-cmd pg_isready --health-interval 5s
      redis:
        image: redis:7-alpine
        ports: ['6380:6379']
      elasticsearch:
        image: elasticsearch:8.13.0
        env: { discovery.type: single-node, xpack.security.enabled: 'false' }
        ports: ['9201:9200']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://trocalia:password@localhost:5433/trocalia_test
      - run: pnpm test:integration --filter=api
        env:
          DATABASE_URL: postgresql://trocalia:password@localhost:5433/trocalia_test
          REDIS_URL: redis://localhost:6380
          ELASTICSEARCH_URL: http://localhost:9201

  build:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

# .github/workflows/deploy-staging.yml
# Trigger: push a develop
# Acciones: build Docker images → push a ECR → deploy a staging → smoke tests

# .github/workflows/deploy-prod.yml
# Trigger: push a main (solo via PR aprobado)
# Acciones: build → deploy → smoke tests → notificar al equipo
```

---

## SECCIÓN 19 — .cursorrules COMPLETO

```
# TROCALIA — Cursor Rules v1.0
# Este archivo define las reglas que Cursor debe seguir al generar código.
# SIEMPRE consultar el SDD antes de implementar cualquier feature.

## STACK (NO cambiar sin actualizar el SDD)
- Backend: NestJS 10 + TypeScript strict + Drizzle ORM
- Frontend: Next.js 14 App Router + TailwindCSS + shadcn/ui
- DB: PostgreSQL 16 + PostGIS + Redis + Elasticsearch
- Tests: Jest (unit) + Supertest (integration) + Playwright (e2e)
- Queue: BullMQ

## PATRONES OBLIGATORIOS

### Backend
- Estructura de módulo: module + controller + service + repository + dto/
- El controller NUNCA tiene lógica de negocio. Solo llama al service.
- El service contiene TODA la lógica de negocio.
- El repository contiene TODAS las queries a la DB (Drizzle).
- Los DTOs validan TODA entrada con class-validator.
- Toda query de listado usa cursor-based pagination (ver cursor.util.ts).
- Nunca usar OFFSET para paginar.
- Toda modificación al wallet pasa por WalletService.credit() o WalletService.debit().
- Toda config de negocio se lee via ConfigService.get(), NUNCA hardcodeada.
- Las transacciones de DB que tocan múltiples tablas usan db.transaction().

### Frontend
- Usar TanStack Query para toda llamada a la API.
- Usar React Hook Form + Zod para todos los formularios.
- Colores exactos: fondo #EFEFEF, cards/nav #FFFFFF, footer #222222, texto #333333.
- Fuente body: Lato. Fuente display (títulos): Plus Jakarta Sans.
- Sin borders ni underlines por defecto (ver globals.css).
- Imágenes: siempre object-cover, aspect-square en cards.
- El botón de WhatsApp siempre usa color #25D366.

## NAMING CONVENTIONS
- Archivos: kebab-case (listing.service.ts, kyc-verification.dto.ts)
- Clases: PascalCase (ListingService, CreateListingDto)
- Variables y funciones: camelCase (getUserById, isVerified)
- Constantes globales: SCREAMING_SNAKE_CASE (MAX_IMAGES_STANDARD)
- Tablas DB: snake_case plural (user_verifications, credit_transactions)
- Columnas DB: snake_case (created_at, kyc_level)
- Enums en código: PascalCase (ListingStatus.Active)
- Enums en DB: snake_case ('active', 'kyc_level_required')

## MANEJO DE ERRORES
- Usar SIEMPRE los códigos de error definidos en SDD-parte1 sección 4.3
- No inventar nuevos códigos de error sin agregarlos al SDD
- Formato de respuesta error: { success: false, error: { code, message, statusCode, timestamp, path } }
- Formato de respuesta exitosa: { success: true, data: {...}, meta?: {...} }

## SEGURIDAD — REGLAS ABSOLUTAS
- NUNCA exponer datos de un usuario a otro sin verificar ownership
- NUNCA permitir balance negativo en wallet
- NUNCA loguear passwords, tokens, DNI, teléfonos o emails completos
- NUNCA hardcodear secrets, API keys o passwords
- SIEMPRE validar la firma HMAC del webhook de MercadoPago antes de procesar
- SIEMPRE usar SELECT FOR UPDATE al modificar el wallet
- SIEMPRE sanitizar inputs con class-validator whitelist: true

## TESTS
- Todo método público de un Service debe tener test unitario
- Todo endpoint debe tener test de integración
- Los tests NO pueden modificar datos de otros tests (usar fixtures aislados)
- Coverage mínimo: 80% en branches, functions, lines, statements
- NUNCA mockear la base de datos en integration tests — usar DB real en Docker

## ARGENTINA
- country_code siempre 'AR' en MVP (no pedir al usuario)
- Teléfono siempre en formato argentino (+54...)
- Documento: solo DNI, validar con validateDNI() de argentina.util.ts
- Monedas permitidas: ARS y USD únicamente
- Timezone: America/Argentina/Buenos_Aires
- Locale: es-AR para formateo de números y fechas

## LO QUE NO HACER
- No crear archivos README.md o documentación extra
- No agregar comentarios que expliquen QUÉ hace el código (el código es autoexplicativo)
- Solo agregar comentarios cuando el POR QUÉ no es obvio
- No implementar features fuera del alcance del MVP (ver SDD sección 1.2)
- No usar 'any' en TypeScript — usar 'unknown' si el tipo no se conoce
- No usar non-null assertion (!) excepto en tests
- No usar OFFSET para paginación
- No hacer requests síncronos donde debería ser async (notificaciones, ES sync)
```

---

## SECCIÓN 20 — CHECKLIST FINAL DE CADA MÓDULO

```
Antes de considerar un módulo completo, verificar:

□ Schema de Drizzle creado y migrado
□ Enums necesarios agregados
□ Índices de DB creados (incluyendo índices PostGIS si aplica)
□ Seed de datos iniciales ejecutado (si el módulo lo requiere)
□ DTOs con validaciones completas (class-validator)
□ Service con toda la lógica de negocio
□ Repository con todas las queries (Drizzle, sin raw SQL excepto PostGIS)
□ Controller con guards correctos (JwtAuthGuard, KycLevelGuard, RolesGuard)
□ Rate limiting configurado en endpoints sensibles
□ Respuestas en formato estándar { success, data, meta }
□ Errores con códigos estándar del SDD
□ Tests unitarios: cobertura >= 80%
□ Tests de integración: todos los endpoints y flujos críticos
□ Logging sanitizado (sin PII en logs)
□ Ownership verificado en operaciones sobre recursos de usuarios
□ Job de BullMQ creado si el módulo tiene operaciones asíncronas
□ Notificación enviada donde corresponde según tabla de eventos
□ CEO Panel actualizado si el módulo tiene parámetros configurables
□ Elasticsearch sincronizado si el módulo publica contenido buscable
□ Documentación de endpoints actualizada en este SDD

ANTES DE DEPLOY A STAGING:
□ docker compose up → todos los servicios sanos
□ pnpm db:migrate → sin errores
□ pnpm db:seed → config seed OK + categorías seed OK
□ pnpm test → 100% pasan
□ pnpm test:integration → 100% pasan
□ pnpm build → sin errores de TypeScript

ANTES DE DEPLOY A PRODUCCIÓN:
□ Todo el checklist de staging
□ Security checklist de SDD-parte4 sección 8.5
□ pnpm audit → 0 high/critical
□ Variables de entorno de producción configuradas
□ Secrets en AWS Secrets Manager (no en .env de producción)
□ Cloudflare WAF configurado
□ Rate limiting de Cloudflare configurado
□ Alertas de Sentry/Datadog configuradas
□ Backup de DB configurado
```

---

## ÍNDICE COMPLETO DEL SDD

```
SDD-parte1.md  → Instrucciones para el agente IA, algoritmo de test loop,
                  stack definitivo, estructura de carpetas, convenciones de código

SDD-parte2.md  → Schema completo de base de datos en Drizzle ORM
                  (users, tokens, listings, reviews, config, notifications)

SDD-parte3.md  → Especificación detallada de módulos:
                  Config, Auth, KYC, Wallet, Token Packs/MP, Listings, AI,
                  Search, Reviews, Contact, Notifications

SDD-parte4.md  → Seguridad (helmet, JWT, rate limiting, HMAC, encriptación KYC),
                  proceso de testing con loop de autocorrección,
                  variables de entorno, setup inicial, constantes Argentina,
                  rutas del CEO Panel

SDD-parte5.md  → API Contracts completos para todos los endpoints,
                  Jobs y queues (BullMQ), seed de categorías y coleccionables,
                  templates de email

SDD-parte6.md  → Frontend (páginas, layout, componentes, flujos),
                  CEO Panel UI, CI/CD pipeline, .cursorrules completo,
                  checklist final de módulo y de deploy

ORDEN DE LECTURA OBLIGATORIO PARA EL AGENTE:
  1. SDD-parte1.md — instrucciones y reglas absolutas
  2. SDD-parte2.md — schema (base de todo)
  3. SDD-parte4.md — seguridad (aplicar desde el primer módulo)
  4. SDD-parte3.md — módulo a implementar
  5. SDD-parte5.md — API contract del módulo
  6. SDD-parte6.md — tests y checklist antes de avanzar al siguiente módulo
```
