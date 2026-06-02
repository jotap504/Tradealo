# Plan & Architecture: Native Google Sign-In Integration

Este documento resume los cambios realizados para implementar el inicio de sesión nativo de Google en la aplicación Android (WebView wrapper) e integrarlo con el backend de producción.

## Contexto y Arquitectura

Para evitar redirecciones al navegador externo y mejorar la experiencia de usuario, se reemplazó el flujo OAuth del navegador dentro del WebView por el inicio de sesión nativo de Google.

El flujo es el siguiente:
1. **Detección**: El WebView intercepta cuando el usuario intenta navegar a `/auth/google` (la ruta de inicio de sesión de Google en el sitio web).
2. **Inicio Nativo**: La app Android lanza el SDK nativo de Google Sign-in (`GoogleSignInClient`) solicitando un `idToken`.
3. **Intercambio**: Tras recibir el ID Token de Google en el dispositivo, el APK realiza un POST a la API del backend (`/api/v1/auth/google/id-token`) enviando `{ "idToken": "..." }`.
4. **Validación**: El backend de NestJS valida el token usando la librería oficial `google-auth-library` contra la audiencia configurada.
5. **Inyección y Redirección**: El backend responde con los tokens JWT (`accessToken`, `refreshToken`) y el perfil del usuario. El APK inyecta estas credenciales en el `localStorage` del WebView (`accessToken`, `refreshToken`, `user` y `authUser`) y redirige al usuario a `/dashboard`.

---

## Cambios Realizados

### 1. Backend (`apps/api`)

- **Dependencias**: Se instaló `google-auth-library`.
- **Controlador (`auth.controller.ts`)**:
  - Se agregó el endpoint `POST /auth/google/id-token` que recibe `{ idToken }` y llama al servicio.
- **Servicio (`auth.service.ts`)**:
  - Método `loginWithGoogleIdToken(idToken)`: Utiliza `OAuth2Client` para verificar el token usando las audiencias configuradas.
  - Las audiencias aceptadas se extraen de las variables de entorno `GOOGLE_CLIENT_ID` (Web client ID) y `GOOGLE_ANDROID_CLIENT_ID` (Android client ID).

### 2. Aplicación Android (`apps/android`)

- **Configuración (`strings.xml`)**:
  - Se configuró la URL correcta de la API de producción (`api_base_url` a `https://tradealo.onrender.com/api/v1`).
  - Se configuró el Client ID de tipo Web (`google_web_client_id` a `72299809477-76hcqerm34bv52mu0rvoodsarqgd8q5u.apps.googleusercontent.com`) requerido por Google SDK en Android para poder generar tokens válidos de cara al backend.
- **Lógica (`MainActivity.kt`)**:
  - Intercepción de URLs de Google Sign-in en el `WebViewClient` (método `shouldOverrideUrlLoading`).
  - Inicio de sesión nativo usando `GoogleSignInOptions` y obtención del ID Token.
  - Llamada HTTP con OkHttp para el intercambio del token `/auth/google/id-token`.
  - Parseo de la respuesta manejando el wrapper global de NestJS (`{ success: true, data: { accessToken, ... } }`).
  - Inyección segura de credenciales en `localStorage` usando las llaves del sitio web (`accessToken`, `refreshToken`, `user` y `authUser`) para activar el estado de autenticación de Zustand y posterior redirección al `/dashboard`.

---

## Configuración de Entorno Requerida (Render)

Para que el backend valide correctamente el token generado por el celular, debe estar configurada la siguiente variable de entorno en el panel de **Render**:

- `GOOGLE_ANDROID_CLIENT_ID`: `72299809477-76hcqerm34bv52mu0rvoodsarqgd8q5u.apps.googleusercontent.com`
- `GOOGLE_CLIENT_ID`: (Tu ID de cliente Web existente, utilizado por el frontend Vercel).
