# 🔐 Hub SSO - Single Sign-On Centralizado

**Hub SSO** es un sistema de autenticación centralizado que permite a todas las aplicaciones del ecosistema Jeivian compartir la misma sesión de usuario usando **Microsoft Azure AD** con **OAuth 2.0 + PKCE**.

## 🎯 ¿Qué problema resuelve?

- ✅ **Una sola autenticación** para todas las apps
- ✅ **Sesión compartida** entre aplicaciones
- ✅ **Seguridad centralizada** con PKCE
- ✅ **Logout global** desde cualquier app
- ✅ **Desarrollo simplificado** - no implementar auth en cada app

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Local     │    │   Hub SSO       │    │   Supabase      │    │  Microsoft      │
│ localhost:3000  │    │ sso.jeivian.com │    │login.jeivian.com│    │   Azure AD      │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         │ 1. Redirige a SSO     │                       │                       │
         ├──────────────────────►│                       │                       │
         │                       │ 2. Inicia OAuth       │                       │
         │                       ├──────────────────────►│                       │
         │                       │                       │ 3. OAuth + PKCE       │
         │                       │                       ├──────────────────────►│
         │                       │                       │ 4. Auth Code          │
         │                       │                       │◄──────────────────────┤
         │                       │                       │ 5. Exchange Token     │
         │                       │                       ├──────────────────────►│
         │                       │ 6. Sesión creada      │ 6. Access Token       │
         │                       │◄──────────────────────┤◄──────────────────────┤
         │ 7. Regresa con tokens │                       │                       │
         │◄──────────────────────┤                       │                       │
```

### **Componentes**:
- **App Local**: Tu aplicación (`localhost:3000`, `app.jeivian.com`, etc.)
- **Hub SSO**: Centro de autenticación (`sso.jeivian.com`)
- **Supabase**: Backend de autenticación (`login.jeivian.com`)
- **Microsoft Azure AD**: Proveedor de identidad OAuth

## 🚀 Inicio rápido

### 1. **Desarrollo local**

```bash
# Clonar repositorio
git clone <repo-url>
cd hub-sso

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Modo TESTING (UI completa para debugging)
VITE_ENV=testing npm run dev

# Modo DEVELOPMENT (auto-redirect como producción)
VITE_ENV=development npm run dev
```

### 2. **Integrar en tu app**

```javascript
// En tu aplicación local
function login() {
    const ssoUrl = 'https://sso-dev.jeivian.com'
    const targetUrl = encodeURIComponent(window.location.origin)
    window.location.href = `${ssoUrl}/?target=${targetUrl}`
}

function logout() {
    localStorage.clear() // Limpiar tokens locales
    const ssoUrl = 'https://sso-dev.jeivian.com'
    const targetUrl = encodeURIComponent(window.location.origin + '/login')
    window.location.href = `${ssoUrl}/?logout=true&target=${targetUrl}`
}
```

### 3. **Recibir tokens en tu app**

```javascript
// En tu app, detectar tokens del hash URL
function handleSSOReturn() {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    
    if (accessToken) {
        // Guardar tokens
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        
        // Limpiar URL
        window.location.hash = ''
        
        // Usuario autenticado ✅
        console.log('Usuario logueado exitosamente')
    }
}

// Ejecutar al cargar la página
handleSSOReturn()
```

## 🎛️ Modos de operación

El Hub SSO tiene **3 modos** según la variable `VITE_ENV`:

### 🔄 **DEVELOPMENT** (Auto-redirect)
```bash
VITE_ENV=development npm run dev
```
- ✅ **Auto-redirige** automáticamente
- ✅ **Solo banner** de carga
- ✅ **Permite HTTP** localhost
- ✅ **Fallback**: `http://localhost:3000`
- 🎯 **Uso**: Deploy de desarrollo

### 🚀 **PRODUCTION** (Auto-redirect)
```bash
VITE_ENV=production npm run build
```
- ✅ **Auto-redirige** automáticamente
- ✅ **Solo banner** de carga
- ❌ **Solo HTTPS** (seguridad)
- ✅ **Fallback**: `https://app.jeivian.com`
- 🎯 **Uso**: Deploy de producción

### 🧪 **TESTING** (Manual)
```bash
VITE_ENV=testing npm run dev
```
- ❌ **NO auto-redirige** (manual)
- ✅ **UI completa** con botones
- ✅ **Logs en pantalla** para debugging
- ✅ **Todas las funciones** visibles
- 🎯 **Uso**: Desarrollo y debugging local

## 🔗 URLs y parámetros

### **Login básico**
```
https://sso-dev.jeivian.com/?target=http://localhost:3000
```

### **Logout y redirección**
```
https://sso-dev.jeivian.com/?logout=true&target=http://localhost:3000/login
```

### **Modo testing (debugging)**
```
https://sso-dev.jeivian.com/?target=http://localhost:3000&env=testing
```

### **Parámetros disponibles**

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `target` | URL de retorno después del login | `http://localhost:3000` |
| `logout` | Cerrar sesión antes de proceder | `true` |
| `env` | Forzar modo específico | `testing` |

## 🔒 Seguridad

### **Allowlists por ambiente**

#### Development
- ✅ `http://localhost:*`
- ✅ `http://127.0.0.1:*`
- ✅ `https://*.jeivian.com`

#### Production
- ✅ `https://*.jeivian.com` (solo HTTPS)

### **PKCE (Proof Key for Code Exchange)**
- ✅ **Code Verifier** generado aleatoriamente
- ✅ **Code Challenge** con SHA256
- ✅ **Protección contra ataques** de intercepción
- ✅ **Limpieza automática** de verifiers antiguos

### **Tokens en hash fragments**
```
# ✅ Seguro - no se envía al servidor
https://app.com/#access_token=abc123&refresh_token=def456

# ❌ Inseguro - se envía al servidor
https://app.com/?access_token=abc123&refresh_token=def456
```

## 🛠️ Desarrollo

### **Estructura del proyecto**
```
hub-sso/
├── src/
│   ├── main.js          # Lógica principal y autenticación
│   ├── ui.js            # Interfaz de usuario
│   └── style.css        # Estilos
├── index.html           # HTML base (vacío, se genera dinámicamente)
├── wrangler.toml        # Configuración Cloudflare
├── worker.js            # Worker de Cloudflare
├── DEPLOY.md            # Guía de deployment
└── README.md            # Esta documentación
```

### **Scripts disponibles**
```bash
npm run dev          # Desarrollo local
npm run build        # Build para producción
npm run preview      # Preview del build
```

### **Variables de entorno**
```bash
# .env
VITE_SUPABASE_URL=https://login.jeivian.com
VITE_SUPABASE_ANON=tu_anon_key_aqui
VITE_ENV=testing
VITE_BUILD=local
```

## 🚀 Deploy

### **Cloudflare Workers (Recomendado)**
```bash
# Instalar Wrangler
npm install -g wrangler

# Login a Cloudflare
wrangler login

# Configurar secretos
wrangler secret put VITE_SUPABASE_ANON --env dev

# Build y deploy
npm run build
wrangler deploy --env dev
```

Ver [DEPLOY.md](./DEPLOY.md) para guía completa.

### **Otros proveedores**
El Hub SSO es una SPA estática, funciona en:
- ✅ **Vercel**
- ✅ **Netlify** 
- ✅ **GitHub Pages**
- ✅ **Cualquier hosting estático**

## 🧪 Testing y debugging

### **Modo testing local**
```bash
VITE_ENV=testing npm run dev
```
- 🔍 **UI completa** con todos los controles
- 🔍 **Logs detallados** en pantalla
- 🔍 **Botones manuales** para cada acción
- 🔍 **Información de sesión** visible

### **URLs de testing**
```bash
# Testing local
http://localhost:5173/?target=http://localhost:3000&env=testing

# Testing en Cloudflare
https://sso-dev.jeivian.com/?target=http://localhost:3000&env=testing
```

### **Logs útiles**
```javascript
// En la consola del navegador
console.log('Sesión actual:', await supabase.auth.getSession())
console.log('Usuario:', await supabase.auth.getUser())

// Limpiar todo para testing
localStorage.clear()
sessionStorage.clear()
```

## 🔄 Flujo completo

### **1. Usuario accede a tu app**
```
Usuario → http://localhost:3000
```

### **2. App detecta que no hay sesión**
```javascript
if (!localStorage.getItem('access_token')) {
    // Redirigir a SSO
    window.location.href = 'https://sso-dev.jeivian.com/?target=' + 
        encodeURIComponent(window.location.origin)
}
```

### **3. Hub SSO maneja autenticación**
```
Hub SSO → Microsoft Azure AD → OAuth 2.0 + PKCE
```

### **4. Usuario regresa con tokens**
```
http://localhost:3000/#access_token=abc&refresh_token=def
```

### **5. App guarda tokens y continúa**
```javascript
// Extraer tokens del hash
const params = new URLSearchParams(window.location.hash.substring(1))
const accessToken = params.get('access_token')

// Guardar y limpiar URL
localStorage.setItem('access_token', accessToken)
window.location.hash = ''

// ✅ Usuario autenticado
```

## 🤝 Integración con Supabase

El Hub SSO usa **Supabase Auth** como backend:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://login.jeivian.com',
    'tu_anon_key'
)

// Login con Microsoft
await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
        scopes: 'openid profile email offline_access User.Read',
        redirectTo: window.location.origin
    }
})
```

## 📚 Recursos adicionales

- 📖 [DEPLOY.md](./DEPLOY.md) - Guía completa de deployment
- 🔐 [Supabase Auth](https://supabase.com/docs/guides/auth) - Documentación oficial
- ☁️ [Cloudflare Workers](https://workers.cloudflare.com/) - Plataforma de hosting
- 🔒 [OAuth 2.0 PKCE](https://oauth.net/2/pkce/) - Especificación de seguridad

## 🐛 Troubleshooting

### **Error: "Target no permitido"**
- ✅ Verifica que tu URL esté en la allowlist
- ✅ En desarrollo: usa `http://localhost:*`
- ✅ En producción: usa `https://*.jeivian.com`

### **Error: "No se puede conectar a Supabase"**
- ✅ Verifica `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON`
- ✅ Confirma que el proyecto Supabase esté activo

### **Tokens no llegan a la app**
- ✅ Verifica que uses **hash fragments** (`#`) no query params (`?`)
- ✅ Confirma que el `target` sea exacto (sin trailing slash)

### **Loop infinito de redirección**
- ✅ Limpia localStorage: `localStorage.clear()`
- ✅ Limpia sessionStorage: `sessionStorage.clear()`
- ✅ Verifica el cooldown (5 segundos entre intentos)

## 📞 Soporte

¿Problemas o preguntas?
- 🔍 Revisa los logs en modo `testing`
- 📖 Consulta [DEPLOY.md](./DEPLOY.md)
- 🐛 Abre un issue en el repositorio

---

**Hub SSO** - Autenticación centralizada simple y segura 🔐
