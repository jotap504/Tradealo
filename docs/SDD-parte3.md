# TROCALIA — SDD v1.0
# Parte 3: Especificación completa de módulos

---

## SECCIÓN 6 — MÓDULOS

### 6.1 Módulo: System Config

**Responsabilidad:** Única fuente de verdad para configuración dinámica del negocio. TODOS los valores de negocio se leen desde aquí, nunca hardcodeados.

**Dependencias:** Redis (caché), PostgreSQL (persistencia)

**Contrato público (lo que otros módulos pueden llamar):**
```typescript
interface IConfigService {
  get<T>(key: string): Promise<T>
  // Lanza ConfigNotFoundException si la key no existe en DB
  // Lee desde Redis primero (TTL 5 min), luego DB
}
```

**Implementación de ConfigService:**
```typescript
// apps/api/src/modules/config/config.service.ts
@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRedis() private redis: Redis,
    @InjectDrizzle() private db: DrizzleDB,
  ) {}

  async get<T>(key: string): Promise<T> {
    // 1. Intentar desde caché
    const cached = await this.redis.get(`config:${key}`)
    if (cached !== null) return JSON.parse(cached) as T

    // 2. Ir a DB
    const [config] = await this.db
      .select()
      .from(systemConfigs)
      .where(eq(systemConfigs.key, key))
      .limit(1)

    if (!config) {
      throw new InternalServerErrorException(
        `CONFIG_NOT_FOUND: key "${key}" no existe. Verificar seed.`
      )
    }

    // 3. Cachear por 5 minutos
    await this.redis.setex(`config:${key}`, 300, JSON.stringify(config.value))
    return config.value as T
  }

  // Solo el AdminConfigService puede llamar a set()
  async set(key: string, value: unknown, adminId: string, reason: string): Promise<void> {
    const [current] = await this.db.select().from(systemConfigs)
      .where(eq(systemConfigs.key, key)).limit(1)
    if (!current) throw new NotFoundException(`CONFIG_NOT_FOUND: ${key}`)

    await this.db.transaction(async (tx) => {
      await tx.update(systemConfigs)
        .set({ value, updatedBy: adminId, updatedAt: new Date() })
        .where(eq(systemConfigs.key, key))

      await tx.insert(systemConfigHistory).values({
        configKey: key,
        oldValue: current.value,
        newValue: value,
        changedBy: adminId,
        changeReason: reason,
      })
    })

    // Invalidar caché inmediatamente
    await this.redis.del(`config:${key}`)
  }
}
```

**Tests requeridos para este módulo:**
```typescript
// test/unit/config.service.spec.ts
describe('SystemConfigService', () => {
  test('retorna valor cacheado desde Redis si existe', async () => { ... })
  test('va a DB si Redis no tiene el valor', async () => { ... })
  test('cachea el valor tras leerlo de DB', async () => { ... })
  test('lanza InternalServerErrorException si key no existe en DB', async () => { ... })
  test('set() invalida el caché tras guardar', async () => { ... })
  test('set() crea registro en system_config_history', async () => { ... })
  test('set() lanza NotFoundException si key no existe', async () => { ... })
})
```

---

### 6.2 Módulo: Auth

**Responsabilidad:** Registro, login, refresh de tokens, logout, verificación de email.

**Dependencias:** UsersModule, WalletModule (para dar tokens de bienvenida), NotificationsModule

**Reglas de negocio:**
```
AUTH-001: El email debe ser único. Si ya existe → DUPLICATE_EMAIL (409)
AUTH-002: La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 número
AUTH-003: El access token expira en 15 minutos
AUTH-004: El refresh token expira en 30 días
AUTH-005: Al hacer refresh, el token viejo se invalida y se emite uno nuevo (rotación)
AUTH-006: Si se detecta uso de un refresh token ya rotado → revocar TODAS las sesiones del usuario
AUTH-007: Al registrarse, enviar email de verificación. El usuario puede usar la app sin verificar email, pero no puede publicar (kycLevel < 1)
AUTH-008: El link de verificación de email expira en 24 horas
AUTH-009: Al registrarse exitosamente → acreditar tokens.reward.registration tokens al wallet
AUTH-010: Máximo 5 intentos de login fallidos en 15 minutos por IP → rate limit 429
```

**Endpoints:**
```
POST /api/v1/auth/register        → RegisterDto → AuthResponseDto
POST /api/v1/auth/login           → LoginDto → AuthResponseDto
POST /api/v1/auth/refresh         → RefreshTokenDto → AuthResponseDto
POST /api/v1/auth/logout          → (header Bearer) → void
GET  /api/v1/auth/verify-email    → ?token=xxx → void (redirect a frontend)
POST /api/v1/auth/resend-verify   → { email } → void
```

**DTOs:**
```typescript
// register.dto.ts
export class RegisterDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'La contraseña debe tener al menos una mayúscula y un número'
  })
  password: string

  @IsOptional()
  @IsString()
  @Length(12, 12)
  referralCode?: string
}

// login.dto.ts
export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string

  @IsString()
  @MinLength(1)
  password: string
}

// AuthResponseDto
export class AuthResponseDto {
  accessToken: string     // JWT, 15 min
  refreshToken: string    // opaque token, 30 días
  user: UserSummaryDto
}
```

**Tests requeridos:**
```typescript
// test/unit/auth.service.spec.ts
describe('AuthService', () => {
  describe('register()', () => {
    test('crea usuario con password hasheado (no plain text)')
    test('lanza DUPLICATE_EMAIL si el email ya existe')
    test('acredita tokens de bienvenida al wallet tras registro')
    test('envía email de verificación tras registro')
    test('aplica referralCode si es válido y existe')
    test('ignora referralCode inválido sin lanzar error')
    test('password no aparece en el objeto retornado')
  })
  describe('login()', () => {
    test('retorna accessToken y refreshToken con credenciales correctas')
    test('lanza UNAUTHORIZED con contraseña incorrecta')
    test('lanza UNAUTHORIZED si usuario está banned')
    test('actualiza lastLoginAt al hacer login exitoso')
  })
  describe('refresh()', () => {
    test('emite nuevos tokens con refresh token válido')
    test('invalida el refresh token usado (rotación)')
    test('lanza UNAUTHORIZED con token expirado')
    test('revoca TODAS las sesiones si se detecta token ya rotado')
  })
  describe('logout()', () => {
    test('revoca el refresh token actual')
    test('no lanza error si el token ya estaba revocado')
  })
})

// test/integration/auth.controller.spec.ts
describe('POST /api/v1/auth/register', () => {
  test('201 con datos válidos')
  test('409 con email duplicado')
  test('422 con contraseña sin mayúscula')
  test('422 con contraseña sin número')
  test('422 con email inválido')
  test('429 después de 5 intentos fallidos de login en 15 min')
})
```

---

### 6.3 Módulo: KYC & Verification

**Responsabilidad:** Gestión del proceso de verificación de identidad. Sube documentos a S3, actualiza kycLevel del usuario.

**Reglas de negocio:**
```
KYC-001: kycLevel 0 → solo registro completado
KYC-002: kycLevel 1 → email + teléfono verificados
KYC-003: kycLevel 2 → DNI verificado (necesario para publicar)
KYC-004: kycLevel 3 → domicilio verificado (factura de servicios)
KYC-005: kycLevel 4 → selfie con DNI verificada
KYC-006: El DNI argentino tiene 7 u 8 dígitos numéricos. Validar formato antes de procesar.
KYC-007: Los documentos se suben DIRECTAMENTE desde el frontend a R2 (presigned URL). El backend nunca recibe el archivo binario.
KYC-008: La presigned URL de upload expira en 5 minutos.
KYC-009: Las presigned URLs de lectura (para admins) expiran en 15 minutos.
KYC-010: Al aprobar un KYC → acreditar los tokens correspondientes (leer de ConfigService)
KYC-011: Una verificación en estado 'pending' bloquea nuevas verificaciones del mismo tipo
KYC-012: El admin puede rechazar con un reason. El usuario puede reintentar máximo 3 veces.
```

**Endpoints:**
```
GET  /api/v1/kyc/status                     → KycStatusDto (estado de todas las verificaciones)
POST /api/v1/kyc/phone/send-otp             → { phone } → void
POST /api/v1/kyc/phone/verify               → { phone, otp } → void
POST /api/v1/kyc/dni/upload-url             → { fileName } → { uploadUrl, s3Key }
POST /api/v1/kyc/dni/submit                 → { s3Key, dniNumber } → void
POST /api/v1/kyc/address/upload-url         → { fileName } → { uploadUrl, s3Key }
POST /api/v1/kyc/address/submit             → { s3Key } → void
POST /api/v1/kyc/selfie/upload-url          → { fileName } → { uploadUrl, s3Key }
POST /api/v1/kyc/selfie/submit              → { s3Key } → void

// Admin only:
GET  /api/v1/admin/kyc/pending              → lista de verificaciones pendientes
POST /api/v1/admin/kyc/:id/approve          → void
POST /api/v1/admin/kyc/:id/reject           → { reason } → void
GET  /api/v1/admin/kyc/:id/document-url     → { url } (presigned, 15 min)
```

---

### 6.4 Módulo: Token Wallet

**Responsabilidad:** Gestión del balance de tokens. Fuente de verdad sobre créditos disponibles.

**REGLA CRÍTICA:** El wallet NUNCA se modifica directamente. SIEMPRE a través de `WalletService.credit()` o `WalletService.debit()`. Ambos métodos son los ÚNICOS puntos de modificación del balance.

**Reglas de negocio:**
```
WALLET-001: El balance nunca puede quedar en negativo. Si debit() resultaría en negativo → lanzar INSUFFICIENT_TOKENS
WALLET-002: Toda operación sobre el wallet genera un credit_transaction. Sin excepción.
WALLET-003: Las transacciones son INMUTABLES. Solo INSERT, nunca UPDATE ni DELETE en credit_transactions.
WALLET-004: Al debitar, consumir primero los tokens con expiresAt más próximo (FEFO: First Expire First Out)
WALLET-005: Los tokens comprados expiran a los 365 días (configurable: tokens.expiry.days)
WALLET-006: Los tokens ganados (recompensas) no vencen (expiresAt = null)
WALLET-007: El balance en wallets debe ser igual a SUM(amount) de credit_transactions WHERE userId = x. Verificar en tests de integración.
WALLET-008: Operaciones concurrentes sobre el mismo wallet usan SELECT FOR UPDATE para evitar race conditions
```

**Contrato público:**
```typescript
interface IWalletService {
  getBalance(userId: string): Promise<number>
  credit(
    tx: DrizzleTx,
    userId: string,
    amount: number,
    reason: CreditReason,
    referenceId?: string,
    expiresAt?: Date
  ): Promise<void>
  debit(
    tx: DrizzleTx,
    userId: string,
    amount: number,
    reason: CreditReason,
    referenceId?: string
  ): Promise<void>
  // Lanza INSUFFICIENT_TOKENS si balance < amount
  getHistory(userId: string, cursor?: string, limit?: number): Promise<CursorPage<CreditTransactionDto>>
}
```

**Implementación del debit con FEFO:**
```typescript
async debit(tx, userId, amount, reason, referenceId) {
  // SELECT FOR UPDATE — bloquea el wallet para esta transacción
  const [wallet] = await tx.execute(sql`
    SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
  `)

  if (!wallet || wallet.balance < amount) {
    throw new PaymentRequiredException('INSUFFICIENT_TOKENS')
  }

  // Actualizar balance
  await tx.update(wallets)
    .set({
      balance: sql`balance - ${amount}`,
      lifetimeSpent: sql`lifetime_spent + ${amount}`,
      updatedAt: new Date()
    })
    .where(eq(wallets.userId, userId))

  // Registrar transacción (INMUTABLE)
  await tx.insert(creditTransactions).values({
    userId,
    amount: -amount,
    balanceAfter: wallet.balance - amount,
    reason,
    referenceId,
    referenceType: this.getReferenceType(reason),
  })
}
```

**Tests requeridos:**
```typescript
describe('WalletService', () => {
  describe('debit()', () => {
    test('reduce el balance correctamente')
    test('lanza INSUFFICIENT_TOKENS si balance < amount')
    test('lanza INSUFFICIENT_TOKENS si balance = 0')
    test('crea credit_transaction con amount negativo')
    test('balanceAfter en la transacción refleja el balance real')
    test('dos debits concurrentes no resultan en balance negativo')
    // Test de concurrencia — crítico:
    test('race condition: 2 debits simultáneos de 5 tokens con balance de 8 → uno falla', async () => {
      // Inicializar wallet con balance 8
      // Disparar 2 debits de 5 simultáneamente
      // Verificar que exactamente uno tuvo éxito y uno lanzó INSUFFICIENT_TOKENS
      // Verificar que el balance final es 3 (no 8 ni -2)
    })
  })
  describe('credit()', () => {
    test('incrementa el balance correctamente')
    test('crea credit_transaction con amount positivo')
    test('tokens con expiresAt se registran correctamente')
    test('tokens de recompensa tienen expiresAt null')
  })
  describe('invariante de integridad', () => {
    test('SUM(credit_transactions) == wallets.balance para cualquier usuario')
  })
})
```

---

### 6.5 Módulo: Token Packs & MercadoPago

**Responsabilidad:** Venta de packs de tokens. Integración con MercadoPago como único gateway.

**Reglas de negocio:**
```
PAYMENT-001: Idempotency key obligatorio en cada compra. Si la misma key llega dos veces → retornar la compra original sin procesar de nuevo.
PAYMENT-002: El webhook de MercadoPago debe validarse con HMAC-SHA256 antes de procesar.
PAYMENT-003: Solo acreditar tokens cuando el payment status sea 'approved'.
PAYMENT-004: Si el pago queda en 'pending' (ej: rapipago, pagofacil) → guardar la compra en estado pending, esperar webhook.
PAYMENT-005: Si el pago es rechazado → actualizar tokenPurchase.status = 'rejected'. No acreditar tokens.
PAYMENT-006: Los tokens comprados tienen expiresAt = now() + 365 días.
PAYMENT-007: tokensGranted = pack.tokens + floor(pack.tokens * pack.bonusPct / 100) + promotion.bonusTokensExtra
PAYMENT-008: Al acreditar tokens → enviar notificación al usuario.
PAYMENT-009: El precio del pack se lee de token_pack_prices WHERE country_code = 'AR' (MVP).
```

**Endpoints:**
```
GET  /api/v1/token-packs                    → lista de packs activos con precios para AR
POST /api/v1/token-packs/checkout           → CheckoutDto → { preferenceId, checkoutUrl }
POST /api/v1/token-packs/webhook/mercadopago → (MP webhook) → void
GET  /api/v1/wallet/purchases               → historial de compras paginado
```

**Flujo de checkout:**
```
1. Frontend llama POST /checkout con { packId, couponCode?, idempotencyKey }
2. Backend verifica idempotencyKey no procesado previamente
3. Backend calcula precio final (con promo si aplica)
4. Backend crea preference en MercadoPago SDK
5. Backend guarda tokenPurchase en DB con status='pending'
6. Backend retorna { preferenceId, checkoutUrl }
7. Frontend redirige al usuario al checkoutUrl de MP
8. MP procesa el pago y llama al webhook de la plataforma
9. Backend valida firma del webhook
10. Si status='approved' → acreditar tokens → notificar usuario
```

---

### 6.6 Módulo: Listings

**Responsabilidad:** CRUD completo de publicaciones. Gestión del ciclo de vida.

**Reglas de negocio:**
```
LISTING-001: Para publicar, el usuario necesita kycLevel >= 2 (DNI verificado)
LISTING-002: Calcular costo = baseCost * durationMultiplier
             baseCost: leer de config según tipo (standard/premium/collectible)
             durationMultiplier: leer de config según durationDays (30/60/90)
LISTING-003: Primero verificar cuota mensual gratuita. Si quota.used < quota.quota → usar cuota (wasFreeQuota=true, creditsSpent=0)
LISTING-004: Si no hay cuota gratuita → verificar balance del wallet >= costo calculado → debitar
LISTING-005: Si no hay tokens suficientes → INSUFFICIENT_TOKENS. No publicar.
LISTING-006: Al publicar → calcular riskScore → según resultado aplicar moderationStatus automático
             riskScore < 40  → approved (si features.auto_approve_verified=true Y kycLevel>=2)
             riskScore 40-79 → pending (queue de revisión manual)
             riskScore >= 80 → rejected automático
LISTING-007: expiresAt = publishedAt + durationDays días
LISTING-008: Solo el dueño del listing puede editarlo. Verificar userId === listing.userId
LISTING-009: Un listing 'sold' o 'removed' no puede volver a 'active'
LISTING-010: Las imágenes se suben a R2 vía presigned URLs (mismo patrón que KYC)
LISTING-011: Mínimo 1 imagen, máximo 10 para standard, 20 para premium
LISTING-012: Al publicar → sincronizar a Elasticsearch (via BullMQ job, NO sincrónico)
LISTING-013: Al marcar como 'sold' → acreditar tokens.reward.first_sale si es la primera venta del usuario
LISTING-014: El job 'listing-expiry' corre cada hora. Listings con expiresAt < now() y status='active' → cambiar a 'expired'
LISTING-015: Renovar listing = publicar de nuevo con 50% de descuento (leer listing.cost.renewal_pct)
LISTING-016: Premium listings aparecen antes que standard en los resultados de búsqueda
```

**Cálculo de riskScore:**
```typescript
async calculateRiskScore(listing: CreateListingDto, user: User): Promise<number> {
  let score = 0
  const daysSinceRegistration = differenceInDays(new Date(), user.createdAt)

  if (daysSinceRegistration < 7) score += 30
  if (user.kycLevel === 0) score += 25
  if (user.kycLevel === 1) score += 15

  // Precio sospechosamente bajo (< 30% del promedio de la categoría)
  const avgPrice = await this.searchService.getAvgPrice(listing.categoryId, listing.currency)
  if (avgPrice && listing.price < avgPrice * 0.3) score += 40

  // Alta velocidad de publicación (más de 5 en la última hora)
  const recentCount = await this.listingRepo.countRecentByUser(user.id, 1) // última hora
  if (recentCount > 5) score += 35

  return Math.min(score, 100)
}
```

**Endpoints:**
```
POST   /api/v1/listings                     → CreateListingDto → ListingDto
GET    /api/v1/listings                     → ListingFiltersDto → CursorPage<ListingDto>
GET    /api/v1/listings/:id                 → ListingDetailDto (incrementa viewsCount)
PATCH  /api/v1/listings/:id                 → UpdateListingDto → ListingDto
DELETE /api/v1/listings/:id                 → void (soft delete: status='removed')
POST   /api/v1/listings/:id/mark-sold       → void
POST   /api/v1/listings/:id/renew           → void
POST   /api/v1/listings/:id/pause           → void
POST   /api/v1/listings/:id/reactivate      → void
POST   /api/v1/listings/:id/upload-image-url → { fileName } → { uploadUrl, r2Key }
POST   /api/v1/listings/:id/images          → { r2Key, isPrimary } → ListingImageDto
DELETE /api/v1/listings/:id/images/:imageId → void

GET    /api/v1/users/:id/listings           → listings públicos de un vendedor (paginado)
GET    /api/v1/me/listings                  → mis listings (todos los estados, paginado)
```

**Filtros de búsqueda (GET /listings):**
```typescript
export class ListingFiltersDto {
  @IsOptional() @IsString() q?: string                    // texto libre
  @IsOptional() @IsUUID() categoryId?: string
  @IsOptional() @IsEnum(ListingTypeEnum) type?: string
  @IsOptional() @IsEnum(ListingConditionEnum) condition?: string
  @IsOptional() @IsNumber() minPrice?: number
  @IsOptional() @IsNumber() maxPrice?: number
  @IsOptional() @IsEnum(CurrencyEnum) currency?: string
  @IsOptional() @IsString() province?: string
  @IsOptional() @IsString() city?: string
  @IsOptional() @IsNumber() lat?: number                  // para búsqueda geo
  @IsOptional() @IsNumber() lng?: number
  @IsOptional() @IsNumber() radiusKm?: number             // default: 25
  @IsOptional() @IsBoolean() isCollectible?: boolean
  @IsOptional() @IsString() sortBy?: 'recent'|'price_asc'|'price_desc'|'relevance'
  @IsOptional() @IsString() cursor?: string
  @IsOptional() @IsNumber() @Min(1) @Max(50) limit?: number // default: 20
}
```

**Tests requeridos:**
```typescript
describe('ListingsService', () => {
  describe('create()', () => {
    test('lanza KYC_LEVEL_REQUIRED si kycLevel < 2')
    test('usa cuota gratuita si hay disponible (wasFreeQuota=true, creditsSpent=0)')
    test('debita tokens si no hay cuota gratuita')
    test('lanza INSUFFICIENT_TOKENS si no hay tokens y no hay cuota')
    test('costo es baseCost * durationMultiplier correctamente')
    test('riskScore < 40 con usuario verificado → moderationStatus=approved')
    test('riskScore >= 40 → moderationStatus=pending')
    test('expiresAt = publishedAt + durationDays')
    test('encola job de sync a Elasticsearch')
    test('no permite publicar más de 10 imágenes en listing standard')
  })
  describe('update()', () => {
    test('lanza FORBIDDEN si userId !== listing.userId')
    test('no permite editar listing con status=sold')
    test('no permite editar listing con status=removed')
  })
  describe('markSold()', () => {
    test('acredita tokens de primera venta si es la primera del usuario')
    test('NO acredita tokens de primera venta en ventas posteriores')
  })
  describe('job: listing-expiry', () => {
    test('cambia status a expired cuando expiresAt < now()')
    test('no cambia status de listings sold o removed')
    test('envía notificación de vencimiento al vendedor')
  })
})
```

---

### 6.7 Módulo: AI Generation

**Responsabilidad:** Generación de texto para listings usando DeepSeek API.

**Reglas de negocio:**
```
AI-001: Verificar features.ai_generation = true antes de procesar. Si false → 503
AI-002: Verificar que el usuario no superó ai.daily_limit_per_user generaciones hoy (leer de Redis counter)
AI-003: El prompt del sistema NO puede ser modificado por el usuario
AI-004: Si la API de DeepSeek falla → retornar error 503, no reintentar automáticamente
AI-005: Guardar cada generación en listing_ai_generations (para analítica y costo)
AI-006: El texto generado es una SUGERENCIA. El usuario puede editarlo antes de publicar.
AI-007: El tiempo máximo de espera para generación es 30 segundos (timeout)
```

**System prompt (FIJO — no editable desde CEO Panel):**
```
Eres un asistente especializado en crear publicaciones para un marketplace argentino.
Dado el producto que describe el usuario, genera en español rioplatense:
1. Título atractivo (máximo 80 caracteres, sin emojis)
2. Descripción detallada y honesta (150-300 palabras)
3. Categoría sugerida (de la lista provista)
4. Atributos clave del producto
5. Rango de precio estimado en ARS

REGLAS ESTRICTAS:
- No inventes especificaciones que el usuario no mencionó
- No uses lenguaje de vendedor agresivo
- El texto debe ser honesto y descriptivo
- Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones adicionales
```

**Formato de respuesta esperado de DeepSeek:**
```json
{
  "title": "iPhone 12 Pro 256GB Negro | Caja original incluida",
  "description": "Vendo iPhone 12 Pro en excelente estado...",
  "suggestedCategory": "electronica-celulares",
  "suggestedAttributes": {
    "marca": "Apple",
    "modelo": "iPhone 12 Pro",
    "almacenamiento": "256GB",
    "color": "Negro",
    "condicion": "Usado"
  },
  "priceRangeArs": { "min": 950000, "max": 1100000 }
}
```

**Endpoint:**
```
POST /api/v1/ai/generate-listing-text
Body: { prompt: string (max 500 chars), categoryId?: string }
Response: { title, description, suggestedCategory, suggestedAttributes, priceRangeArs }
```

---

### 6.8 Módulo: Search

**Responsabilidad:** Indexación y búsqueda de listings en Elasticsearch.

**Reglas:**
```
SEARCH-001: La búsqueda principal usa Elasticsearch. PostgreSQL es la fuente de verdad, no el search engine.
SEARCH-002: La sincronización ES ↔ PG es eventual (asíncrona via BullMQ). Puede haber delay de hasta 30 segundos.
SEARCH-003: Listings con status != 'active' NO se indexan en ES. Se eliminan del índice.
SEARCH-004: Listings premium aparecen antes que standard (boost en ES query).
SEARCH-005: La búsqueda por texto usa el analyzer 'spanish_custom'.
SEARCH-006: La búsqueda geográfica usa geo_distance filter de ES.
SEARCH-007: Si ES no está disponible → fallback a búsqueda en PostgreSQL (degraded mode).
```

**Mapping de Elasticsearch (crear al inicializar):**
```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "spanish_custom": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "spanish_stop", "spanish_stemmer", "asciifolding"]
        }
      },
      "filter": {
        "spanish_stemmer": { "type": "stemmer", "language": "spanish" },
        "spanish_stop": { "type": "stop", "stopwords": "_spanish_" }
      }
    }
  },
  "mappings": {
    "properties": {
      "id":             { "type": "keyword" },
      "title":          { "type": "text", "analyzer": "spanish_custom" },
      "description":    { "type": "text", "analyzer": "spanish_custom" },
      "categoryId":     { "type": "keyword" },
      "type":           { "type": "keyword" },
      "isCollectible":  { "type": "boolean" },
      "condition":      { "type": "keyword" },
      "price":          { "type": "scaled_float", "scaling_factor": 100 },
      "currency":       { "type": "keyword" },
      "location":       { "type": "geo_point" },
      "province":       { "type": "keyword" },
      "city":           { "type": "keyword" },
      "isPremium":      { "type": "boolean" },
      "sellerKycLevel": { "type": "integer" },
      "createdAt":      { "type": "date" },
      "expiresAt":      { "type": "date" }
    }
  }
}
```

---

### 6.9 Módulo: Reviews & Reputation

**Reglas:**
```
REVIEW-001: Solo se puede dejar una review por listing por dirección (buyer→seller o seller→buyer)
REVIEW-002: El rating debe ser entre 1 y 5 (entero)
REVIEW-003: No se puede dejar review de un listing propio
REVIEW-004: Se puede dejar review solo si hubo contacto registrado en contact_inquiries (buyer) o si el listing está en estado 'sold' (seller)
REVIEW-005: Al crear una review → recalcular reputation_scores del usuario revieweado
REVIEW-006: Al dar una review → acreditar tokens.reward.review_given tokens al reviewer
REVIEW-007: El score de reputación = AVG de los últimos 100 ratings (weighted: los últimos 12 meses tienen 70% del peso)
```

---

### 6.10 Módulo: Contact

**Responsabilidad:** Permitir contacto entre compradores y vendedores sin chat en tiempo real.

**Reglas:**
```
CONTACT-001: El botón de WhatsApp construye el link wa.me/{phone}?text={mensaje_predefinido}
CONTACT-002: El teléfono del vendedor se muestra solo si userProfile.showPhone = true
CONTACT-003: Si showPhone = false → solo mostrar formulario de consulta
CONTACT-004: El formulario de consulta envía email al vendedor vía Resend
CONTACT-005: Registrar cada contacto en contact_inquiries (para métricas y reviews)
CONTACT-006: Incrementar listing.contactsCount al registrar un contacto
CONTACT-007: Rate limit: máximo 3 contactos al mismo vendedor en 24 horas por usuario
```

**Endpoint:**
```
POST /api/v1/listings/:id/contact
Body: { message: string (min 10, max 500), senderName?: string, senderEmail?: string }
Response: { whatsappUrl?: string, emailSent: boolean }
```

---

### 6.11 Módulo: Notifications

**Responsabilidad:** Envío de notificaciones por email (Resend) y push (OneSignal).

**Eventos que disparan notificaciones:**

| Evento | Canal | Destinatario |
|--------|-------|-------------|
| listing_published | email + in_app | vendedor |
| listing_expiring (5 días antes) | email + push | vendedor |
| listing_expired | email + in_app | vendedor |
| tokens_received | in_app | usuario |
| tokens_low (< 3 tokens) | email | usuario |
| kyc_approved | email + in_app | usuario |
| kyc_rejected | email + in_app | usuario |
| review_received | in_app | usuario |
| contact_received | email | vendedor |
| purchase_approved | email + in_app | comprador |

**Reglas:**
```
NOTIF-001: Todas las notificaciones se encolan en BullMQ. No se envían de forma sincrónica.
NOTIF-002: Si el envío falla → reintentar 3 veces con backoff exponencial (1min, 5min, 15min)
NOTIF-003: Registrar cada notificación en la tabla notifications con su status
NOTIF-004: El usuario puede marcar notificaciones como leídas
NOTIF-005: El endpoint GET /me/notifications solo retorna las últimas 50 no leídas + las últimas 10 leídas
```

---

## SECCIÓN 7 — VARIABLES DE ENTORNO

```bash
# apps/api/.env
# Base de datos
DATABASE_URL=postgresql://trocalia:password@localhost:5432/trocalia
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# JWT
JWT_SECRET=<min-64-chars-random>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=trocalia-uploads
R2_KYC_BUCKET_NAME=trocalia-kyc-private
R2_PUBLIC_URL=https://cdn.trocalia.com.ar

# MercadoPago
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=
MP_NOTIFICATION_URL=https://api.trocalia.com.ar/api/v1/token-packs/webhook/mercadopago

# DeepSeek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@trocalia.com.ar

# Push (OneSignal)
ONESIGNAL_APP_ID=
ONESIGNAL_API_KEY=

# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000

# Encriptación de datos KYC (AES-256)
KYC_ENCRYPTION_KEY=<32-bytes-hex>

# Admin
ADMIN_JWT_SECRET=<diferente-al-jwt-secret-min-64-chars>
ADMIN_SESSION_TIMEOUT=7200  # 2 horas en segundos
```
