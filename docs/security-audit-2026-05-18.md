# Security Audit — 2026-05-18

## Metodología

Se ejecutaron 19 pruebas de seguridad contra la API local (`http://localhost:3001`), cubriendo rate limiting, CORS,
autenticación, validación de entrada, inyecciones SQL/NoSQL/XSS, y headers de seguridad.

---

## 🔴 CRÍTICO

### CORS — CORS_ORIGINS no produce origen permisivo

**Archivo:** `apps/api/src/main.ts`

Cuando `CORS_ORIGINS` no está definida (entorno dev), **cualquier origen** es aceptado:

```
Access-Control-Allow-Origin: https://evil.com
Access-Control-Allow-Credentials: true
```

**Riesgo:** No es explotable directamente porque la API usa `Authorization: Bearer` (no cookies que se envíen solas).
Pero combinado con un XSS en el frontend, permite exfiltración de datos o requests a endpoints públicos sensibles.

**Fix:**
```typescript
// main.ts — validar que CORS_ORIGINS tenga valor en producción
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
  throw new Error('CORS_ORIGINS must be configured in production');
}
```
O idealmente, no permitir `!origin` como bypass:
```typescript
origin: function (origin, callback) {
  if (!origin && process.env.NODE_ENV !== 'production') {
    return callback(null, true); // solo en dev para server-to-server
  }
  if (CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
},
```

---

### Rate limiting — completamente inoperante sin Redis

**Archivos:**
- `apps/api/src/main.ts` (express-rate-limit con Redis)
- `apps/api/src/common/guards/rate-limit.guard.ts` (per-endpoint)
- `apps/api/src/redis/redis.module.ts`

Ambos sistemas **falls open** cuando Redis no está disponible:

```typescript
// rate-limit.guard.ts línea 47
if (this.redis.status !== 'ready') return true; // permite todo

// main.ts — express-rate-limit skip
skip: () => redisClient.status !== 'ready', // permite todo
```

**Evidencia:** 50 requests al health endpoint en 13 segundos — 0 bloqueados.

**Fix (inmediato):** Agregar un rate limiter en memoria como fallback cuando Redis no está disponible:

```typescript
// Opción 1: Usar express-rate-limit con store en memoria como fallback
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  // sacar el skip, o dejar que express-rate-limit use su store en memoria default
});
app.use(limiter);
```

```typescript
// Opción 2: En rate-limit.guard.ts, usar Map en memoria como fallback
private readonly fallbackStore = new Map<string, { count: number; expiresAt: number }>();

async canActivate(context: ExecutionContext): Promise<boolean> {
  const options = this.reflector.getAllAndOverride<RateLimitOptions>(...);
  if (!options) return true;
  // ...
  if (this.redis.status === 'ready') {
    return this.checkRedis(key, options);
  }
  return this.checkFallback(key, options);
}
```

---

## 🟠 ALTO

### Admin login sin rate limit

**Archivo:** `apps/api/src/admin/admin-auth.controller.ts`

```typescript
@Post('login')
@HttpCode(HttpStatus.OK)
login(@Body() dto: AdminLoginDto) { // ← sin @RateLimit()
  return this.adminAuthService.login(dto.email, dto.password);
}
```

**Riesgo:** Un atacante puede probar contraseñas de admin sin throttling. Además, TOTP es opcional (solo se exige si el admin lo configuró voluntariamente).

**Fix:**
```typescript
@Post('login')
@HttpCode(HttpStatus.OK)
@RateLimit({ ttl: 900, limit: 5, keyBy: 'ip' })
login(@Body() dto: AdminLoginDto) {
  return this.adminAuthService.login(dto.email, dto.password);
}
```

---

## 🟡 MEDIO

### Refresh token sin rate limit

**Archivo:** `apps/api/src/auth/auth.controller.ts`

```typescript
@Public()
@Post('refresh')
@HttpCode(HttpStatus.OK)
async refresh(@Body() dto: RefreshDto) { // ← sin @RateLimit()
  return this.authService.refresh(dto.refreshToken);
}
```

**Riesgo:** Un atacante con un refresh token robado puede rotarlo indefinidamente sin restricción.

**Fix:**
```typescript
@RateLimit({ ttl: 60, limit: 3, keyBy: 'ip' })
async refresh(@Body() dto: RefreshDto) { ... }
```

---

### JWT secret con fallback hardcodeado

**Archivo:** `apps/api/src/auth/auth.module.ts`

```typescript
JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'changeme_dev_only'
```

**Riesgo:** Si en producción falta la env var, todos los tokens se firman con una clave pública conocida.

**Fix:**
```typescript
// En main.ts o app.module.ts, al iniciar:
if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error('JWT_ACCESS_SECRET is required');
}
```

---

## 🟢 BAJO

### Rate limit en endpoints de mutación de órdenes

**Archivo:** `apps/api/src/orders/orders.controller.ts`

Ningún `PATCH` de orders tiene `@RateLimit()`. Un usuario autenticado podría llamar `cancel` / `deliver` / `complete`
muchas veces seguidas.

### `@Roles()` y `@RequireKycLevel()` sin uso

**Archivo:** `apps/api/src/app.module.ts`

Los guards `RolesGuard` y `KycLevelGuard` están registrados globalmente pero ningún endpoint usa `@Roles()` o
`@RequireKycLevel()`. Son un "no-op" actualmente.

---

## ✅ APROBADAS (sin hallazgos)

| Prueba | Resultado | Detalle |
|--------|-----------|---------|
| Auth sin token | ✅ 401 | JwtAuthGuard funciona correctamente |
| JWT falso/inválido/vacío | ✅ 401 | Firma JWT validada, expired tokens rechazados |
| DTO validation | ✅ | `forbidNonWhitelisted` rechaza campos extra (`isAdmin`, `role`) |
| SQL Injection | ✅ | DTO validation rechaza entrada maliciosa antes de llegar a Drizzle |
| XSS en input | ✅ | Validación de email rechaza `<script>` tags |
| Error leakage | ✅ | No hay stack traces en respuestas JSON |
| Security Headers | ✅ | CSP, HSTS (1 año), X-Frame-Options, nosniff, todos presentes |
| Path traversal | ✅ | NestJS maneja correctamente rutas inválidas |
| NoSQL injection | ✅ | Drizzle ORM usa queries parametrizados |
| Body size limit | ✅ | 8MB configurado y funcional |
| Method override | ✅ | No procesado por la app |
| Content-Type | ✅ | XML rechazado, solo JSON procesado |

---

## Plan de remediación

### Prioridad 1 — Hoy
- [ ] Agregar rate limiter en memoria como fallback para cuando Redis no está disponible
- [ ] Configurar `CORS_ORIGINS` en producción

### Prioridad 2 — Esta semana
- [ ] Agregar `@RateLimit()` a admin login
- [ ] Agregar `@RateLimit()` a refresh token
- [ ] Validar `JWT_ACCESS_SECRET` al startup en producción

### Prioridad 3 — Próximo sprint
- [ ] Agregar `@RateLimit()` a mutaciones de orders (deliver, cancel, complete)
- [ ] Evaluar si vale la pena usar `@Roles()` y `@RequireKycLevel()` en endpoints sensibles
- [ ] Forzar TOTP en cuentas admin (`totpEnabled` default false → true al crear admin)
