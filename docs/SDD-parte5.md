# TROCALIA — SDD v1.0
# Parte 5: API Contracts completos + Jobs + Categorías seed

---

## SECCIÓN 13 — API CONTRACTS COMPLETOS

### 13.1 Convenciones generales

```
Base URL:          https://api.trocalia.com.ar/api/v1
Autenticación:     Bearer {accessToken} en header Authorization
Formato entrada:   application/json
Formato salida:    application/json
Paginación:        cursor-based en todos los listados
Versión:           /api/v1 — nunca cambiar sin deprecation period

Códigos HTTP usados:
  200 → OK (GET, PATCH exitoso)
  201 → Created (POST exitoso)
  204 → No Content (DELETE exitoso)
  400 → Bad Request (request mal formado)
  401 → Unauthorized (sin token o token inválido)
  402 → Payment Required (INSUFFICIENT_TOKENS o PAYMENT_FAILED)
  403 → Forbidden (sin permiso para el recurso)
  404 → Not Found
  409 → Conflict (DUPLICATE_EMAIL, etc.)
  422 → Unprocessable Entity (validación fallida)
  429 → Too Many Requests (rate limit)
  500 → Internal Server Error
  503 → Service Unavailable (IA no disponible, modo mantenimiento)
```

### 13.2 Auth endpoints — contratos exactos

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /auth/register
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard:    @Public()
Body:     { email: string, password: string, referralCode?: string }
Response 201:
  {
    "success": true,
    "data": {
      "accessToken": "eyJ...",
      "refreshToken": "uuid-opaco",
      "user": {
        "id": "uuid",
        "email": "user@email.com",
        "role": "user",
        "kycLevel": 0,
        "wallet": { "balance": 5 }
      }
    }
  }
Errors: 409 DUPLICATE_EMAIL, 422 VALIDATION_ERROR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /auth/login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard:    @Public()
Body:     { email: string, password: string }
Response 200: igual que /register
Errors: 401 UNAUTHORIZED, 429 RATE_LIMIT_EXCEEDED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /auth/refresh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard:    @Public()
Body:     { refreshToken: string }
Response 200: igual que /register (nuevos tokens)
Errors: 401 UNAUTHORIZED (token inválido/expirado/revocado)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /auth/logout
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard:    JwtAuthGuard
Body:     { refreshToken: string }
Response 204: sin body
Errors: ninguno visible al cliente (idempotente)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /auth/verify-email?token=xxx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard:    @Public()
Response: redirect 302 a {FRONTEND_URL}/email-verified?success=true
          o {FRONTEND_URL}/email-verified?error=expired
```

### 13.3 Users endpoints

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /me
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Response 200:
  {
    "success": true,
    "data": {
      "id": "uuid",
      "email": "user@email.com",
      "role": "verified_user",
      "kycLevel": 2,
      "emailVerified": true,
      "phoneVerified": true,
      "createdAt": "2026-04-28T10:00:00Z",
      "profile": {
        "username": "juanperez",
        "firstName": "Juan",
        "lastName": "Pérez",
        "avatarUrl": "https://cdn.trocalia.com.ar/avatars/uuid.webp",
        "bio": "Vendo...",
        "whatsapp": "+5491112345678",
        "showPhone": true,
        "province": "Buenos Aires",
        "city": "Palermo",
        "completenessPct": 75
      },
      "wallet": {
        "balance": 23,
        "lifetimeEarned": 40,
        "lifetimeSpent": 17
      },
      "reputation": {
        "asSellerAvg": 4.8,
        "asSellerCount": 12,
        "asBuyerAvg": 5.0,
        "asBuyerCount": 3
      }
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATCH /me/profile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Body (todos opcionales):
  {
    "username": string (3-30 chars, solo letras/números/guion_bajo),
    "firstName": string (max 100),
    "lastName": string (max 100),
    "bio": string (max 500),
    "whatsapp": string (formato argentino),
    "showPhone": boolean,
    "province": string (de AR.PROVINCES),
    "city": string (max 100)
  }
Response 200: { "success": true, "data": UserProfileDto }
Errors: 409 si username ya tomado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /me/avatar-upload-url
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Body: { fileName: string, mimeType: 'image/jpeg'|'image/png'|'image/webp' }
Response 200:
  {
    "success": true,
    "data": {
      "uploadUrl": "https://...", // presigned URL (5 min TTL)
      "r2Key": "avatars/uuid/filename.webp",
      "publicUrl": "https://cdn.trocalia.com.ar/avatars/uuid/filename.webp"
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /users/:id/public
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard:    @Public()
Response 200:
  {
    "success": true,
    "data": {
      "id": "uuid",
      "username": "juanperez",
      "avatarUrl": "...",
      "bio": "...",
      "province": "Buenos Aires",
      "city": "Palermo",
      "memberSince": "2026-01-15T00:00:00Z",
      "kycLevel": 2,
      "reputation": { "asSellerAvg": 4.8, "asSellerCount": 12 },
      // whatsapp SOLO si showPhone=true
      "whatsapp": "+5491112345678"
    }
  }
Nota: NUNCA exponer email, kycLevel completo, ni datos internos en endpoint público
```

### 13.4 KYC endpoints

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /kyc/status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Response 200:
  {
    "success": true,
    "data": {
      "kycLevel": 2,
      "verifications": {
        "email":   { "status": "approved", "verifiedAt": "2026-04-01T..." },
        "phone":   { "status": "approved", "verifiedAt": "2026-04-01T..." },
        "dni":     { "status": "approved", "verifiedAt": "2026-04-02T..." },
        "address": { "status": "pending",  "submittedAt": "2026-04-28T..." },
        "selfie":  { "status": null }  // nunca enviado
      },
      "tokensEarnedBreakdown": {
        "phone": 3, "dni": 15, "address": 0, "selfie": 0
      }
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /kyc/phone/send-otp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
RateLimit: 3 por usuario por hora
Body: { phone: string } // se valida formato argentino
Response 200: { "success": true, "data": { "message": "OTP enviado" } }
Errors: 422 INVALID_PHONE_FORMAT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /kyc/phone/verify
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
RateLimit: 5 intentos por hora
Body: { phone: string, otp: string }
Response 200: { "success": true, "data": { "tokensEarned": 3, "newKycLevel": 1 } }
Errors: 422 INVALID_OTP, 429 RATE_LIMIT_EXCEEDED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /kyc/dni/upload-url
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
RateLimit: 3 por usuario por día
Body: { fileName: string, mimeType: 'image/jpeg'|'image/png' }
Response 200:
  {
    "success": true,
    "data": {
      "uploadUrl": "https://...", // presigned URL bucket PRIVADO, 5 min TTL
      "s3Key": "kyc/dni/uuid/filename.jpg"
    }
  }
Nota: uploadUrl apunta al bucket KYC privado, NO al bucket público

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /kyc/dni/submit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Body: { s3Key: string, dniNumber: string }
Validación: dniNumber debe pasar validateDNI() de argentina.util.ts
Acción: encriptar dniNumber con encrypt() antes de guardar en DB
Response 200: { "success": true, "data": { "status": "pending", "message": "En revisión" } }
Errors: 422 INVALID_DNI, 409 si ya tiene verificación pendiente del mismo tipo
```

### 13.5 Wallet endpoints

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /wallet/balance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Response 200:
  {
    "success": true,
    "data": {
      "balance": 23,
      "lifetimeEarned": 40,
      "lifetimeSpent": 17,
      "monthlyFreeQuota": { "quota": 5, "used": 2, "remaining": 3 },
      "expiringTokens": {
        "amount": 10,
        "expiresAt": "2026-10-28T..."
      }
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /wallet/transactions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Query: { cursor?: string, limit?: number (default 20, max 50) }
Response 200:
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "amount": -2,
        "balanceAfter": 23,
        "reason": "listing_publish",
        "referenceId": "uuid-listing",
        "referenceType": "listing",
        "createdAt": "2026-04-28T..."
      }
    ],
    "meta": { "nextCursor": "xxx", "hasMore": true }
  }
```

### 13.6 Token Packs endpoints

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /token-packs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: @Public()
Response 200:
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "key": "pro",
        "label": "Pack Pro",
        "tokens": 80,
        "bonusPct": 15,
        "tokensTotal": 92,
        "isFeatured": true,
        "price": { "amount": "10000.00", "currency": "ARS", "display": "$ 10.000" },
        "activePromotion": null
      }
    ]
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /token-packs/checkout
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Body:
  {
    "packId": "uuid",
    "couponCode": "TROCALIA20",  // opcional
    "idempotencyKey": "uuid-generado-por-cliente"  // OBLIGATORIO
  }
Response 201:
  {
    "success": true,
    "data": {
      "purchaseId": "uuid",
      "preferenceId": "mp-preference-id",
      "checkoutUrl": "https://www.mercadopago.com.ar/checkout/...",
      "pricing": {
        "originalPrice": "10000.00",
        "discountAmount": "2000.00",
        "finalPrice": "8000.00",
        "currency": "ARS",
        "tokensToReceive": 92,
        "promotionApplied": "TROCALIA20"
      }
    }
  }
Errors: 404 PACK_NOT_FOUND, 422 COUPON_INVALID, 409 IDEMPOTENCY_CONFLICT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /token-packs/webhook/mercadopago
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: @Public() (la seguridad es la firma HMAC)
Headers: x-signature, x-request-id (provistos por MP)
Body: { el payload que envía MercadoPago }
Response 200: { "received": true }
Errores internos: log pero siempre responder 200 a MP
  (si respondemos 4xx, MP reintenta indefinidamente)
```

### 13.7 Listings endpoints — contratos completos

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /listings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard, @RequireKycLevel(2)
Body:
  {
    "title": "iPhone 12 Pro 256GB Negro",        // 10-150 chars
    "description": "Descripción detallada...",   // 20-5000 chars
    "categoryId": "uuid",
    "type": "standard",                          // "standard" | "premium"
    "isCollectible": false,
    "condition": "used",                         // "new"|"used"|"refurbished"
    "price": 950000,
    "currency": "ARS",                           // "ARS" | "USD"
    "priceNegotiable": true,
    "province": "Buenos Aires",
    "city": "Palermo",
    "lat": -34.5880,                             // opcional
    "lng": -58.4284,                             // opcional
    "paymentMethods": ["cash", "bank_transfer", "mercadopago"],
    "shippingOptions": ["buyer_pays", "pickup_only"],
    "shippingDescription": "Envío por correo a cargo del comprador",
    "durationDays": 30,                          // 30 | 60 | 90
    "aiGenerated": false,
    "collectibleAttributes": null               // object si isCollectible=true
  }
Response 201:
  {
    "success": true,
    "data": {
      "id": "uuid",
      "status": "active",          // o "pending" si moderación manual
      "moderationStatus": "approved",
      "wasFreeQuota": true,
      "creditsSpent": 0,
      "expiresAt": "2026-05-28T...",
      "url": "https://trocalia.com.ar/p/uuid"
    }
  }
Errors: 403 KYC_LEVEL_REQUIRED, 402 INSUFFICIENT_TOKENS, 422 VALIDATION_ERROR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /listings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: @Public()
Query params (todos opcionales):
  q            string          texto de búsqueda
  categoryId   uuid
  type         standard|premium
  condition    new|used|refurbished
  minPrice     number
  maxPrice     number
  currency     ARS|USD
  province     string
  city         string
  lat          number          requiere lng y radiusKm
  lng          number
  radiusKm     number          default 25, max 200
  isCollectible boolean
  sortBy       recent|price_asc|price_desc|relevance  (default: recent)
  cursor       string
  limit        number          default 20, max 50

Response 200:
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "title": "iPhone 12 Pro 256GB",
        "price": "950000.00",
        "currency": "ARS",
        "priceDisplay": "$ 950.000",
        "condition": "used",
        "type": "premium",
        "isCollectible": false,
        "primaryImage": "https://cdn.trocalia.com.ar/...",
        "city": "Palermo",
        "province": "Buenos Aires",
        "seller": {
          "id": "uuid",
          "username": "juanperez",
          "avatarUrl": "...",
          "kycLevel": 2,
          "reputationAvg": 4.8
        },
        "createdAt": "2026-04-28T...",
        "expiresAt": "2026-05-28T..."
      }
    ],
    "meta": { "nextCursor": "xxx", "hasMore": true, "total": 1523 }
  }
Nota: "total" solo en la primera página (cursor=null). En páginas siguientes: null.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /listings/:id
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: @Public()
Acción: incrementar viewsCount en background (no bloquear respuesta)
Response 200:
  {
    "success": true,
    "data": {
      "id": "uuid",
      "title": "...",
      "description": "...",
      "price": "950000.00",
      "currency": "ARS",
      "priceNegotiable": true,
      "condition": "used",
      "type": "standard",
      "isCollectible": false,
      "collectibleAttributes": null,
      "images": [
        { "id": "uuid", "url": "https://...", "thumbnailUrl": "https://...", "isPrimary": true, "sortOrder": 0 }
      ],
      "paymentMethods": ["cash", "bank_transfer"],
      "shippingOptions": ["buyer_pays"],
      "shippingDescription": "...",
      "province": "Buenos Aires",
      "city": "Palermo",
      "viewsCount": 145,
      "contactsCount": 12,
      "status": "active",
      "expiresAt": "2026-05-28T...",
      "createdAt": "2026-04-01T...",
      "seller": {
        "id": "uuid",
        "username": "juanperez",
        "firstName": "Juan",
        "avatarUrl": "...",
        "kycLevel": 2,
        "whatsapp": "+5491112345678",   // solo si showPhone=true
        "province": "Buenos Aires",
        "city": "Palermo",
        "memberSince": "2026-01-01T...",
        "reputation": { "asSellerAvg": 4.8, "asSellerCount": 12 }
      },
      "category": { "id": "uuid", "name": "Celulares", "slug": "celulares" }
    }
  }
Errors: 404 LISTING_NOT_FOUND (también si status=removed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /listings/:id/upload-image-url
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard (solo el owner)
Body: { fileName: string, mimeType: 'image/jpeg'|'image/png'|'image/webp' }
Validación: mimeType solo puede ser imagen. Tamaño máximo validado via Content-Length.
Response 200:
  {
    "success": true,
    "data": {
      "uploadUrl": "https://...",           // presigned PUT URL, 10 min TTL
      "r2Key": "listings/uuid/img-uuid.webp",
      "publicUrl": "https://cdn.trocalia.com.ar/listings/uuid/img-uuid.webp"
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /listings/:id/contact
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: @Public() (puede contactar sin login)
RateLimit: 3 por IP por listing por 24h
Body:
  {
    "message": string (10-500 chars),
    "senderName": string (si no está logueado, requerido),
    "senderEmail": string (si no está logueado, requerido)
  }
Response 200:
  {
    "success": true,
    "data": {
      "whatsappUrl": "https://wa.me/5491112345678?text=...", // si showPhone=true
      "emailSent": true
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /listings/:id/mark-sold
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard (solo owner)
Body: {} (vacío)
Response 200: { "success": true, "data": { "status": "sold", "tokensEarned": 5 } }
  // tokensEarned: 5 si es primera venta, 0 si no
Errors: 403 FORBIDDEN, 404 LISTING_NOT_FOUND, 409 si ya está sold

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /me/listings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Query: { status?: string, cursor?: string, limit?: number }
Response: lista de listings propios (todos los estados excepto removed)
  Incluir campo: "daysUntilExpiry": number
```

### 13.8 AI Generation endpoint

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /ai/generate-listing-text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
RateLimit: ver ai.daily_limit_per_user en config (default 10/día)
Body:
  {
    "prompt": string (5-500 chars, descripción libre del producto),
    "categoryId": "uuid"  // opcional, para sugerencia de atributos
  }
Timeout: 30 segundos
Response 200:
  {
    "success": true,
    "data": {
      "title": "iPhone 12 Pro 256GB Negro | Caja original incluida",
      "description": "Vendo iPhone 12 Pro...",
      "suggestedCategory": "electronica-celulares",
      "suggestedAttributes": {
        "marca": "Apple",
        "modelo": "iPhone 12 Pro",
        "almacenamiento": "256GB"
      },
      "priceRangeArs": { "min": 950000, "max": 1100000 }
    }
  }
Errors: 503 AI_UNAVAILABLE (feature flag off o API caída)
        429 AI_RATE_LIMIT (superó límite diario)
```

### 13.9 Reviews endpoints

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /listings/:id/reviews
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Body:
  {
    "direction": "buyer_to_seller",  // "buyer_to_seller" | "seller_to_buyer"
    "overallRating": 5,              // 1-5 entero
    "comment": "Excelente vendedor..." // opcional, max 1000 chars
  }
Response 201: { "success": true, "data": ReviewDto }
Errors: 403 FORBIDDEN (propio listing o ya dejó review), 409 DUPLICATE_REVIEW

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /users/:id/reviews
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: @Public()
Query: { direction?: 'received_as_seller'|'received_as_buyer', cursor?, limit? }
Response 200: CursorPage de reviews públicas
```

### 13.10 Notifications endpoint

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /me/notifications
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guard: JwtAuthGuard
Response: últimas 50 no leídas + últimas 10 leídas

POST /me/notifications/:id/read
Guard: JwtAuthGuard
Response 200: { "success": true }

POST /me/notifications/read-all
Guard: JwtAuthGuard
Response 200: { "success": true, "data": { "marked": 12 } }
```

---

## SECCIÓN 14 — JOBS Y QUEUES (BullMQ)

### 14.1 Definición de queues

```typescript
// apps/api/src/jobs/jobs.module.ts

export const QUEUES = {
  NOTIFICATIONS:    'notifications',      // alta prioridad
  SEARCH_SYNC:      'search-sync',        // media prioridad
  IMAGE_PROCESSING: 'image-processing',  // media prioridad
  AI_GENERATION:    'ai-generation',     // media prioridad (rate limited)
  MAINTENANCE:      'maintenance',       // baja prioridad (jobs programados)
} as const

// Configuración de cada queue:
// NOTIFICATIONS:    concurrency 10, removeOnComplete 100
// SEARCH_SYNC:      concurrency 5,  removeOnComplete 50
// IMAGE_PROCESSING: concurrency 3,  removeOnComplete 50
// AI_GENERATION:    concurrency 2,  removeOnComplete 100
// MAINTENANCE:      concurrency 1,  removeOnComplete 10
```

### 14.2 Jobs definidos

```typescript
// Job: sync-listing-to-elasticsearch
// Queue: search-sync
// Disparado por: ListingsService.create(), update(), delete(), markSold()
// Payload: { listingId: string, action: 'index'|'delete' }
// Reintentos: 3, backoff exponencial 5s
// Worker:
async processSearchSync({ listingId, action }) {
  if (action === 'delete') {
    await esClient.delete({ index: 'listings', id: listingId })
    return
  }
  const listing = await listingRepo.findWithRelationsForSearch(listingId)
  if (!listing || listing.status !== 'active') {
    await esClient.delete({ index: 'listings', id: listingId }).catch(() => {})
    return
  }
  await esClient.index({
    index: 'listings',
    id: listingId,
    document: mapListingToEsDoc(listing),
  })
}

// Job: send-notification
// Queue: notifications
// Payload: { userId, channel, type, title, body, data }
// Reintentos: 3, backoff: [60s, 300s, 900s]
// Worker: NotificationsWorker

// Job: check-listing-expiry
// Queue: maintenance
// Disparado por: CronJob cada hora (schedule: '0 * * * *')
// Payload: {}
// Worker:
async checkListingExpiry() {
  const expiredListings = await db.select()
    .from(listings)
    .where(and(
      eq(listings.status, 'active'),
      lt(listings.expiresAt, new Date())
    ))
    .limit(100) // procesar de a 100 para no saturar

  for (const listing of expiredListings) {
    await db.update(listings)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(listings.id, listing.id))

    await notificationsQueue.add('send-notification', {
      userId: listing.userId,
      channel: 'email',
      type: 'listing_expired',
      title: 'Tu publicación venció',
      body: `Tu publicación "${listing.title}" venció. Podés renovarla con un 50% de descuento.`,
      data: { listingId: listing.id }
    })
  }
}

// Job: check-listing-expiring-soon
// Queue: maintenance
// Disparado por: CronJob cada día a las 9:00 AM (schedule: '0 9 * * *')
// Avisa 5 días antes de vencimiento (configurable: listing.duration.warning_days)
async checkListingExpiringSoon() {
  const warningDays = await configService.get<number>('listing.duration.warning_days')
  const targetDate = addDays(new Date(), warningDays)

  const expiringListings = await db.select()
    .from(listings)
    .where(and(
      eq(listings.status, 'active'),
      between(listings.expiresAt, new Date(), targetDate)
    ))
    .limit(200)

  for (const listing of expiringListings) {
    await notificationsQueue.add('send-notification', {
      userId: listing.userId,
      channel: 'push',
      type: 'listing_expiring',
      title: `Tu publicación vence en ${warningDays} días`,
      body: `"${listing.title}" está por vencer. Renovála para que siga activa.`,
      data: { listingId: listing.id }
    })
  }
}

// Job: check-token-expiry
// Queue: maintenance
// Disparado por: CronJob cada día a las 3:00 AM (schedule: '0 3 * * *')
async checkTokenExpiry() {
  // Buscar tokens comprados (con expiresAt) que vencen hoy
  const expiredTxns = await db.select()
    .from(creditTransactions)
    .where(and(
      lt(creditTransactions.expiresAt, new Date()),
      gt(creditTransactions.amount, 0),
      isNotNull(creditTransactions.expiresAt)
    ))
    .limit(500)

  for (const txn of expiredTxns) {
    // La expiración de tokens se maneja debiendo el monto desde el wallet
    // Solo si el usuario aún tiene ese saldo disponible
    const wallet = await walletRepo.findByUserId(txn.userId)
    const expireAmount = Math.min(txn.amount, wallet.balance)

    if (expireAmount > 0) {
      await walletService.debit(db, txn.userId, expireAmount,
        'token_expired', txn.id)
    }
  }
}
```

---

## SECCIÓN 15 — SEED DE CATEGORÍAS

```typescript
// apps/api/src/database/seeds/categories.seed.ts

export const CATEGORIES_SEED = [
  // Electrónica
  { slug: 'electronica',        name: 'Electrónica',           isCollectible: false, parentId: null },
  { slug: 'celulares',          name: 'Celulares',             isCollectible: false, parentId: 'electronica' },
  { slug: 'computadoras',       name: 'Computadoras',          isCollectible: false, parentId: 'electronica' },
  { slug: 'tablets',            name: 'Tablets',               isCollectible: false, parentId: 'electronica' },
  { slug: 'audio',              name: 'Audio y Sonido',        isCollectible: false, parentId: 'electronica' },
  { slug: 'gaming',             name: 'Videojuegos',           isCollectible: false, parentId: 'electronica' },
  { slug: 'camaras',            name: 'Cámaras y Fotografía',  isCollectible: false, parentId: 'electronica' },

  // Vehículos
  { slug: 'vehiculos',          name: 'Vehículos',             isCollectible: false, parentId: null },
  { slug: 'autos',              name: 'Autos',                 isCollectible: false, parentId: 'vehiculos' },
  { slug: 'motos',              name: 'Motos',                 isCollectible: false, parentId: 'vehiculos' },
  { slug: 'bicicletas',         name: 'Bicicletas',            isCollectible: false, parentId: 'vehiculos' },

  // Ropa y Accesorios
  { slug: 'ropa',               name: 'Ropa y Accesorios',     isCollectible: false, parentId: null },
  { slug: 'ropa-mujer',         name: 'Ropa Mujer',            isCollectible: false, parentId: 'ropa' },
  { slug: 'ropa-hombre',        name: 'Ropa Hombre',           isCollectible: false, parentId: 'ropa' },
  { slug: 'calzado',            name: 'Calzado',               isCollectible: false, parentId: 'ropa' },

  // Hogar
  { slug: 'hogar',              name: 'Hogar y Jardín',        isCollectible: false, parentId: null },
  { slug: 'muebles',            name: 'Muebles',               isCollectible: false, parentId: 'hogar' },
  { slug: 'electrodomesticos',  name: 'Electrodomésticos',     isCollectible: false, parentId: 'hogar' },

  // Deportes
  { slug: 'deportes',           name: 'Deportes',              isCollectible: false, parentId: null },

  // Instrumentos musicales
  { slug: 'instrumentos',       name: 'Instrumentos Musicales',isCollectible: false, parentId: null },

  // ── COLECCIONABLES ────────────────────────────────────────
  { slug: 'coleccionables',     name: 'Coleccionables',        isCollectible: true,  parentId: null },
  { slug: 'comics',             name: 'Comics y Historietas',  isCollectible: true,  parentId: 'coleccionables' },
  { slug: 'figuras',            name: 'Figuras y Estatuillas', isCollectible: true,  parentId: 'coleccionables' },
  { slug: 'monedas',            name: 'Monedas y Billetes',    isCollectible: true,  parentId: 'coleccionables' },
  { slug: 'estampillas',        name: 'Estampillas',           isCollectible: true,  parentId: 'coleccionables' },
  { slug: 'discos-vinilo',      name: 'Discos de Vinilo',      isCollectible: true,  parentId: 'coleccionables' },
  { slug: 'cartas-trading',     name: 'Cartas Coleccionables', isCollectible: true,  parentId: 'coleccionables' },
  { slug: 'juguetes-antiguos',  name: 'Juguetes Antiguos',     isCollectible: true,  parentId: 'coleccionables' },
  { slug: 'relojes',            name: 'Relojes',               isCollectible: true,  parentId: 'coleccionables' },
  { slug: 'arte',               name: 'Arte y Pinturas',       isCollectible: true,  parentId: 'coleccionables' },

  // Otros
  { slug: 'otros',              name: 'Otros',                 isCollectible: false, parentId: null },
]

// Atributos por categoría de coleccionables:
export const COLLECTIBLE_ATTRIBUTES_SEED = [
  // Comics
  { categorySlug: 'comics', key: 'editorial',  label: 'Editorial',  type: 'select',  options: ['Marvel','DC','Image','Dark Horse','Ivrea','La Marca','Otra'], isRequired: true },
  { categorySlug: 'comics', key: 'condicion',  label: 'Condición',  type: 'select',  options: ['Mint','Near Mint','Muy Bueno','Bueno','Regular'], isRequired: true },
  { categorySlug: 'comics', key: 'numero',     label: 'Número',     type: 'text',    isRequired: false },
  { categorySlug: 'comics', key: 'anio',       label: 'Año',        type: 'number',  isRequired: false },
  { categorySlug: 'comics', key: 'idioma',     label: 'Idioma',     type: 'select',  options: ['Español','Inglés','Otro'], isRequired: false },

  // Figuras
  { categorySlug: 'figuras', key: 'marca',     label: 'Marca',      type: 'text',    isRequired: true },
  { categorySlug: 'figuras', key: 'personaje', label: 'Personaje',  type: 'text',    isRequired: true },
  { categorySlug: 'figuras', key: 'escala',    label: 'Escala',     type: 'select',  options: ['1:6','1:10','1:12','1:18','Funko Pop','Otra'], isRequired: false },
  { categorySlug: 'figuras', key: 'completa',  label: '¿Completa?', type: 'boolean', isRequired: true },
  { categorySlug: 'figuras', key: 'en_caja',   label: '¿En caja?',  type: 'boolean', isRequired: false },

  // Monedas
  { categorySlug: 'monedas', key: 'pais',      label: 'País',       type: 'text',    isRequired: true },
  { categorySlug: 'monedas', key: 'anio',      label: 'Año',        type: 'number',  isRequired: true },
  { categorySlug: 'monedas', key: 'condicion', label: 'Condición',  type: 'select',  options: ['Sin Circular','Muy Buena','Buena','Regular'], isRequired: true },
  { categorySlug: 'monedas', key: 'metal',     label: 'Metal',      type: 'select',  options: ['Oro','Plata','Cobre','Aluminio','Bronce','Otro'], isRequired: false },

  // Discos de Vinilo
  { categorySlug: 'discos-vinilo', key: 'artista',   label: 'Artista',          type: 'text',   isRequired: true },
  { categorySlug: 'discos-vinilo', key: 'disco',     label: 'Álbum',            type: 'text',   isRequired: true },
  { categorySlug: 'discos-vinilo', key: 'anio',      label: 'Año',              type: 'number', isRequired: false },
  { categorySlug: 'discos-vinilo', key: 'condicion', label: 'Estado del vinilo',type: 'select', options: ['Mint','VG+','VG','G','Poor'], isRequired: true },
  { categorySlug: 'discos-vinilo', key: 'sello',     label: 'Sello discográfico',type: 'text',  isRequired: false },

  // Cartas trading
  { categorySlug: 'cartas-trading', key: 'juego',    label: 'Juego',            type: 'select', options: ['Magic: The Gathering','Pokémon','Yu-Gi-Oh!','Flesh and Blood','Otro'], isRequired: true },
  { categorySlug: 'cartas-trading', key: 'edicion',  label: 'Edición/Set',      type: 'text',   isRequired: false },
  { categorySlug: 'cartas-trading', key: 'rareza',   label: 'Rareza',           type: 'select', options: ['Común','Infrecuente','Rara','Muy Rara','Mítica'], isRequired: false },
  { categorySlug: 'cartas-trading', key: 'idioma',   label: 'Idioma',           type: 'select', options: ['Español','Inglés','Japonés','Portugués'], isRequired: false },
  { categorySlug: 'cartas-trading', key: 'cantidad', label: 'Cantidad de cartas',type: 'number', isRequired: false },
]
```

---

## SECCIÓN 16 — TEMPLATES DE EMAIL

```typescript
// apps/api/src/modules/notifications/email-templates.ts
// Usar Resend con React Email o templates HTML simples

export const EMAIL_TEMPLATES = {
  VERIFY_EMAIL: {
    subject: 'Verificá tu email en Trocalia',
    // Variables: { firstName, verificationUrl }
  },
  LISTING_PUBLISHED: {
    subject: '¡Tu publicación está activa!',
    // Variables: { firstName, listingTitle, listingUrl, expiresAt }
  },
  LISTING_EXPIRING: {
    subject: 'Tu publicación vence en 5 días',
    // Variables: { firstName, listingTitle, listingUrl, renewUrl }
  },
  LISTING_EXPIRED: {
    subject: 'Tu publicación venció',
    // Variables: { firstName, listingTitle, renewUrl }
  },
  TOKENS_RECEIVED: {
    subject: 'Recibiste tokens en Trocalia',
    // Variables: { firstName, tokensAmount, reason, newBalance }
  },
  KYC_APPROVED: {
    subject: 'Tu verificación fue aprobada',
    // Variables: { firstName, kycType, tokensEarned }
  },
  KYC_REJECTED: {
    subject: 'Tu verificación necesita correcciones',
    // Variables: { firstName, kycType, rejectionReason }
  },
  CONTACT_RECEIVED: {
    subject: 'Alguien te consultó por tu publicación',
    // Variables: { sellerName, listingTitle, listingUrl, senderName, message }
  },
  PURCHASE_APPROVED: {
    subject: 'Tu compra de tokens fue procesada',
    // Variables: { firstName, tokensAmount, packName, newBalance }
  },
  TOKENS_LOW: {
    subject: 'Te estás quedando sin tokens',
    // Variables: { firstName, balance, buyUrl }
  },
}
```
