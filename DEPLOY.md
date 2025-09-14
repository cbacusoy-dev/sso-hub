# 🚀 Deploy Hub SSO a Cloudflare Workers

## 🤔 ¿Qué es Wrangler?

**Wrangler** es la herramienta oficial de Cloudflare para manejar Workers y Pages desde la línea de comandos. Te permite:
- ✅ **Deploy automático** con un comando
- ✅ **Configuración declarativa** via `wrangler.toml`
- ✅ **Manejo de secretos** de forma segura
- ✅ **Variables de entorno** por ambiente
- ✅ **Logs en tiempo real** para debugging

## 📋 Prerrequisitos

1. **Cuenta de Cloudflare** con Workers habilitado
2. **Dominio configurado** en Cloudflare DNS (ej: `sso-dev.example.com`)
3. **Node.js** instalado (versión 16 o superior)
4. **Proyecto de Supabase** configurado con OAuth (opcional si usas el existente)

## 🔧 Instalación y configuración

### 1. Instalar Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Autenticar con Cloudflare
```bash
wrangler login
```
Esto abrirá tu navegador para autenticar con tu cuenta de Cloudflare.

### 3. Verificar autenticación
```bash
wrangler whoami
```

## 🔐 Configuración de Supabase

El Hub SSO usa la **Supabase ANON Key** que está **hardcodeada** en el código fuente (`src/main.js`):

```javascript
const CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://login.jeivian.com',
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON || 'tu-anon-key-aqui'
}
```

**⚠️ Importante**: La ANON key es **pública por diseño** y se incluye en el JavaScript compilado. No es necesario configurarla como secreto en Cloudflare.

## 🚀 Deploy del Hub SSO

### 1. Build del proyecto
```bash
npm run build
```

### 2. Deploy a Cloudflare
```bash
wrangler deploy --env dev
```

¡Eso es todo! Tu Hub SSO estará disponible en tu dominio configurado

## 🧪 Probar el Hub SSO

Una vez deployado, puedes probar estas URLs:

### Login desde app local
```
https://tu-dominio-sso.com/?target=http://localhost:3000
```

### Logout y regreso a app local
```
https://tu-dominio-sso.com/?logout=true&target=http://localhost:3000
```

### Solo el Hub (fallback automático)
```
https://tu-dominio-sso.com/
```

## ⚙️ Configuración por ambiente

El Hub SSO maneja **3 ambientes** diferentes:

### 🔄 **DEVELOPMENT** (Auto-redirect)
```toml
[env.dev.vars]
VITE_ENV = "development"
```
- ✅ **Auto-redirige** si hay sesión
- ✅ **Solo banner** "Iniciando sesión con Microsoft..."
- ✅ **Permite HTTP** localhost
- ✅ **Fallback**: `http://localhost:3000`

### 🚀 **PRODUCTION** (Auto-redirect)
```toml
[env.prod.vars]
VITE_ENV = "production"
```
- ✅ **Auto-redirige** si hay sesión
- ✅ **Solo banner** "Iniciando sesión con Microsoft..."
- ❌ **Solo HTTPS** (seguridad)
- ✅ **Fallback**: `https://app.jeivian.com`

### 🧪 **TESTING** (Manual)
```toml
[env.test.vars]
VITE_ENV = "testing"
```
- ❌ **NO auto-redirige** (manual)
- ✅ **UI completa** con botones
- ✅ **Logs en pantalla** para debugging
- ✅ **Perfecto para desarrollo local**

## 📁 Archivos importantes

### `wrangler.toml`
Configuración de Cloudflare Workers:
```toml
name = "hub-sso-dev"
main = "worker.js"
assets = { directory = "./dist", binding = "ASSETS" }
compatibility_date = "2025-09-14"

[env.dev]
name = "hub-sso-dev"
routes = [
  { pattern = "sso-dev.example.com", custom_domain = true }
]

[env.dev.vars]
VITE_ENV = "development"
VITE_BUILD = "dev-cloudflare"
```

### `worker.js`
Worker que sirve los assets estáticos:
```javascript
export default {
  async fetch(request, env, ctx) {
    return env.ASSETS.fetch(request);
  }
};
```

### `dist/`
Build optimizado del Hub SSO (generado por `npm run build`)

## 🔄 Actualizar el Hub SSO

Para actualizar después de cambios en el código:

```bash
# 1. Build con los cambios
npm run build

# 2. Deploy actualizado
wrangler deploy --env dev
```

## 📊 Monitoreo y debugging

### Ver logs en tiempo real
```bash
wrangler tail --env dev
```

### Ver deployments
```bash
wrangler deployments list --env dev
```

### Rollback si algo falla
```bash
wrangler rollback [version-id] --env dev
```

## 🐛 Troubleshooting

### Error: "Not authenticated"
```bash
wrangler login
```

### Error: "Custom domain not configured"
Verifica que tu dominio esté configurado en Cloudflare DNS y apunte a Cloudflare.

### Error: "Supabase connection failed"
Verifica que la ANON key esté correctamente configurada en el código fuente.

### Error: "Build failed"
```bash
npm run build
# Revisa errores en el código
```

### Hub SSO no funciona
1. Verifica que el dominio esté configurado correctamente
2. Revisa los logs: `wrangler tail --env dev`
3. Confirma que el build se completó sin errores

## 🎯 Integración con tus apps

Una vez deployado, tus apps locales pueden usar el Hub SSO:

### Login
```javascript
// En tu aplicación
function login() {
    const ssoUrl = 'https://tu-dominio-sso.com'
    const targetUrl = encodeURIComponent(window.location.origin)
    window.location.href = `${ssoUrl}/?target=${targetUrl}`
}
```

### Logout
```javascript
// En tu aplicación
function logout() {
    // Limpiar tokens locales
    localStorage.clear()
    
    // Ir al Hub SSO para logout completo
    const ssoUrl = 'https://tu-dominio-sso.com'
    const targetUrl = encodeURIComponent(window.location.origin + '/login')
    window.location.href = `${ssoUrl}/?logout=true&target=${targetUrl}`
}
```

## 🌍 Múltiples ambientes

Puedes configurar múltiples ambientes en `wrangler.toml`:

```toml
# Desarrollo
[env.dev]
name = "hub-sso-dev"
routes = [{ pattern = "sso-dev.example.com", custom_domain = true }]
[env.dev.vars]
VITE_ENV = "development"

# Producción
[env.prod]
name = "hub-sso-prod"
routes = [{ pattern = "sso.example.com", custom_domain = true }]
[env.prod.vars]
VITE_ENV = "production"

# Testing (opcional)
[env.test]
name = "hub-sso-test"
routes = [{ pattern = "sso-test.example.com", custom_domain = true }]
[env.test.vars]
VITE_ENV = "testing"
```

Deploy a cada ambiente:
```bash
wrangler deploy --env dev    # Desarrollo
wrangler deploy --env prod   # Producción
wrangler deploy --env test   # Testing
```

## 🚀 ¡Listo!

Tu Hub SSO está deployado y listo para usar. Es:
- ✅ **Rápido**: Servido desde el edge de Cloudflare
- ✅ **Seguro**: PKCE + HTTPS + allowlists
- ✅ **Flexible**: 3 modos según necesidades
- ✅ **Escalable**: Funciona con cualquier app del ecosistema

¿Problemas? Revisa los logs con `wrangler tail --env dev` 🔍