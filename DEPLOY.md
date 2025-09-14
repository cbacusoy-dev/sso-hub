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
2. **Dominio configurado**: `sso-dev.jeivian.com` debe apuntar a Cloudflare DNS
3. **Node.js** instalado (ya lo tienes)
4. **Supabase ANON Key** de tu dashboard de Supabase

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

## 🔐 Configurar secretos

El Hub SSO necesita tu **Supabase ANON Key** como secreto:

```bash
wrangler secret put VITE_SUPABASE_ANON --env dev
```

Cuando te pida el valor, ingresa tu ANON key de Supabase.

## 🚀 Deploy del Hub SSO

### 1. Build del proyecto
```bash
npm run build
```

### 2. Deploy a Cloudflare
```bash
wrangler deploy --env dev
```

¡Eso es todo! Tu Hub SSO estará disponible en `https://sso-dev.jeivian.com`

## 🧪 Probar el Hub SSO

Una vez deployado, puedes probar estas URLs:

### Login desde app local
```
https://sso-dev.jeivian.com/?target=http://localhost:3000
```

### Logout y regreso a app local
```
https://sso-dev.jeivian.com/?logout=true&target=http://localhost:3000
```

### Modo testing (UI completa)
```
https://sso-dev.jeivian.com/?target=http://localhost:3000&env=testing
```

### Solo el Hub (fallback automático)
```
https://sso-dev.jeivian.com/
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
  { pattern = "sso-dev.jeivian.com", custom_domain = true }
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
Verifica que `sso-dev.jeivian.com` esté en tu Cloudflare DNS apuntando a Cloudflare.

### Error: "Secret not found"
```bash
wrangler secret put VITE_SUPABASE_ANON --env dev
```

### Error: "Build failed"
```bash
npm run build
# Revisa errores en el código
```

### Hub SSO no funciona
1. Verifica que el dominio esté configurado
2. Revisa los logs: `wrangler tail --env dev`
3. Prueba en modo testing: `?env=testing`

## 🎯 Integración con tus apps

Una vez deployado, tus apps locales pueden usar el Hub SSO:

### Login
```javascript
// En tu app local (localhost:3000)
function login() {
    window.location.href = 'https://sso-dev.jeivian.com/?target=' + 
        encodeURIComponent(window.location.origin)
}
```

### Logout
```javascript
// En tu app local
function logout() {
    // Limpiar tokens locales
    localStorage.clear()
    
    // Ir al Hub SSO para logout completo
    window.location.href = 'https://sso-dev.jeivian.com/?logout=true&target=' + 
        encodeURIComponent(window.location.origin + '/login')
}
```

### Testing/Debug
```javascript
// Para debugging con UI completa
function loginDebug() {
    window.location.href = 'https://sso-dev.jeivian.com/?target=' + 
        encodeURIComponent(window.location.origin) + '&env=testing'
}
```

## 🌍 Múltiples ambientes

Puedes configurar múltiples ambientes en `wrangler.toml`:

```toml
# Desarrollo
[env.dev]
name = "hub-sso-dev"
routes = [{ pattern = "sso-dev.jeivian.com", custom_domain = true }]
[env.dev.vars]
VITE_ENV = "development"

# Producción
[env.prod]
name = "hub-sso-prod"
routes = [{ pattern = "sso.jeivian.com", custom_domain = true }]
[env.prod.vars]
VITE_ENV = "production"

# Testing
[env.test]
name = "hub-sso-test"
routes = [{ pattern = "sso-test.jeivian.com", custom_domain = true }]
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