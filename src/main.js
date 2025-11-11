import './style.css'
import { createClient } from '@supabase/supabase-js'
import { setupUI } from './ui.js'

// ==========================================
// CONFIGURACIÓN Y CONSTANTES
// ==========================================

const CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://login.jeivian.com',
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON || '',
  BUILD: import.meta.env.VITE_BUILD || 'dev',
  ENV: (import.meta.env.VITE_ENV || 'development').toLowerCase()
}

const CONSTANTS = {
    // Timeouts y keys
    COOLDOWN_MS: 5000,
    SESSION_STORAGE_KEY: 'sso-last',
    OAUTH_SCOPES: 'openid profile email offline_access User.Read',
    PROVIDER: 'azure',

  // Allowlist dev
  ALLOWLIST_DEV: [
    /^https?:\/\/localhost(?:[:/].*)?$/,
    /^https?:\/\/127\.0\.0\.1(?:[:/].*)?$/,
    /^https?:\/\/\[::1\](?:[:/].*)?$/,
    // Redes privadas para desarrollo local
    /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(?:[:/].*)?$/,  // 192.168.x.x
    /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:[:/].*)?$/,  // 10.x.x.x
    /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(?:[:/].*)?$/,  // 172.16.x.x - 172.31.x.x
    /^https?:\/\/([a-z0-9-]+\.)*jeivian\.com(\/.*)?$/,
  ],

  // Allowlist prod: solo subdominios *.jeivian.com vía HTTPS
  ALLOWLIST_PROD: [
    /^https:\/\/([a-z0-9-]+\.)+jeivian\.com(\/.*)?$/,
  ],

    // Fallback targets (valores hardcodeados)
  FALLBACK_TARGET_DEV: 'http://localhost:3000',
  FALLBACK_TARGET_PROD: 'https://app.jeivian.com'
}

// ==========================================
// UTILIDADES GLOBALES
// ==========================================

const $ = (id) => document.getElementById(id)

// Helper para determinar comportamiento por ambiente
const isTestingMode = () => CONFIG.ENV === 'testing'
const shouldAutoRedirect = () => !isTestingMode()
const shouldShowFullUI = () => isTestingMode()

const log = (message, type = 'info') => {
    const icons = { ok: '✅', err: '❌', info: 'ℹ️', warn: '⚠️' }
    const icon = icons[type] || ''
    const fullMessage = icon ? `${icon} ${message}` : message
    const t = new Date().toISOString().slice(11, 19)

    try {
        console.log(`[${t}] ${fullMessage}`)
    } catch (_) { }

    if (shouldShowFullUI()) {
        const logEl = $('log')
        if (logEl) {
            logEl.textContent += `[${t}] ${fullMessage}\n`
            logEl.scrollTop = logEl.scrollHeight
        }
    }
}

const ok = (m) => log(m, 'ok')
const err = (m) => log(m, 'err')
const warn = (m) => log(m, 'warn')

// ==========================================
// UTILIDADES DE TIEMPO Y FORMATO
// ==========================================

function msToTime(ms) {
    const s = Math.max(0, Math.floor(ms / 1000))
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
}

async function copy(text) {
    try {
        await navigator.clipboard.writeText(text)
        ok('Copiado al portapapeles')
    } catch (e) {
        err('No se pudo copiar')
    }
}

// ==========================================
// VALIDACIÓN Y NORMALIZACIÓN
// ==========================================

function normalizeTarget(urlStr) {
    const u = new URL(urlStr)
    return `${u.origin}${u.pathname}${u.search}` // sin hash; el Hub añade su #fragmento
}

  function isAllowedTarget(urlStr) {
    try {
      const u = new URL(urlStr)
      const normalized = `${u.origin}${u.pathname}${u.search}`
        const list = CONFIG.ENV === 'production' ? CONSTANTS.ALLOWLIST_PROD : CONSTANTS.ALLOWLIST_DEV
      return list.some((re) => re.test(normalized))
    } catch (_) { 
      return false 
    }
  }

// ==========================================
// GESTIÓN DE TARGET
// ==========================================

function validateTarget(target, showErrors = true) {
    if (!target) return ''
    
    const safe = normalizeTarget(target)
    
    if (!isAllowedTarget(safe)) {
        if (showErrors) err('Target no permitido')
        return ''
    }
    
    if (CONFIG.ENV === 'production' && !safe.startsWith('https://')) {
        if (showErrors) err('Target debe ser HTTPS en producción')
        return ''
    }
    
    return safe
}

function getTarget() {
    const params = new URLSearchParams(location.search)
    const raw = params.get('target') || $('target')?.value?.trim()
    return validateTarget(raw, true)
}

// Destino efectivo: usa ?target= si existe; si no, usa fallback según entorno
function getEffectiveTarget() {
    const params = new URLSearchParams(location.search)
    const rawTarget = params.get('target')
    
    // 🔍 DEBUG: Log detallado para diagnosticar el bug
    log(`🎯 DEBUG getEffectiveTarget():`)
    log(`  - URL actual: ${location.href}`)
    log(`  - Parámetro target: "${rawTarget}"`)
    log(`  - Ambiente: ${CONFIG.ENV}`)
    
    const t = getTarget()
    log(`  - getTarget() resultado: "${t}"`)
    
    if (t) {
        log(`  - ✅ Usando target de URL: ${t}`)
        return t
    }
    
    // 🔄 RECUPERAR TARGET: Si no hay target en URL, buscar en localStorage
    const backupTarget = localStorage.getItem('sso_target_backup')
    if (backupTarget) {
        log(`  - 🔄 Target recuperado de backup: "${backupTarget}"`)
        const validatedBackup = validateTarget(backupTarget, false)
        if (validatedBackup) {
            // Limpiar backup después de usarlo
            localStorage.removeItem('sso_target_backup')
            log(`  - ✅ Usando target recuperado: ${validatedBackup}`)
            return validatedBackup
        }
    }
    
    // Fallback según entorno
    const fallback = CONFIG.ENV === 'production' ? CONSTANTS.FALLBACK_TARGET_PROD : CONSTANTS.FALLBACK_TARGET_DEV
    const validatedFallback = validateTarget(fallback, false)
    log(`  - ❌ Sin target válido, usando fallback: ${validatedFallback}`)
    return validatedFallback
}

// ==========================================
// SUPABASE Y AUTENTICACIÓN
// ==========================================

  // Cliente Supabase (PKCE, sesión persistente)
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
    }
})

async function getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

  // Determinar base de redirectTo compatible con Supabase (PKCE requiere same-origin)
  function getHubBaseForRedirect() {
    // El intercambio de código PKCE lee/verifica valores almacenados en localStorage.
    // Debe volver al MISMO origen que inició el flujo para que existan esos valores.
    return `${location.origin}${location.pathname}`
  }

  // Limpieza completa para logout
  function cleanupStorageComplete() {
    try {
        // 🧹 LIMPIEZA COMPLETA: Para logout únicamente
        localStorage.clear()
        sessionStorage.clear()
        ok('Storage limpiado completamente')
    } catch (_) { }
  }

  // Limpieza selectiva para PKCE (preserva sso_target_backup)
  function cleanupPkceStale() {
    try {
        const keys = []
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i) || ''
            // Limpiar tokens PKCE y Supabase, PERO preservar sso_target_backup
            if (/pkce|code_verifier|verifier|sb-/i.test(k) && k !== 'sso_target_backup') {
                keys.push(k)
            }
        }
        keys.forEach(k => localStorage.removeItem(k))
        if (keys.length > 0) {
            log(`🧹 Limpieza PKCE: ${keys.length} items eliminados`)
        }
    } catch (_) { }
  }

  async function handleCodeExchangeIfNeeded() {
    const params = new URLSearchParams(location.search)
    const code = params.get('code')
    const error = params.get('error')
    const description = params.get('error_description')
    if (error) { err(`OAuth error: ${error}. ${description || ''}`); return }
    if (code) ok('Procesando callback (auto-exchange)…')
  }

  async function ensureLogin() {
    const target = getEffectiveTarget()
    
    // 💾 PRESERVAR TARGET: Guardar en localStorage antes de ir a Microsoft
    if (target) {
        localStorage.setItem('sso_target_backup', target)
        log(`💾 Target preservado: ${target}`)
    }
    
    const base = getHubBaseForRedirect()
    const redirectTo = target ? `${base}?target=${encodeURIComponent(target)}` : base
    // Limpiar verifiers antiguos y confiar en PKCE de la librería
    cleanupPkceStale()
    log('Redirigiendo a Microsoft (via Supabase)…')
    const { error } = await supabase.auth.signInWithOAuth({
        provider: CONSTANTS.PROVIDER,
        options: {
            redirectTo,
            scopes: CONSTANTS.OAUTH_SCOPES
        }
    })
    if (error) err(`Error iniciando OAuth: ${error.message || error}`)
  }

  async function refreshSession() {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) return err(`Refresh falló: ${error.message || error}`)
    ok('Refresh de sesión OK')
}

async function handleLogout() {
    // Limpiar sesión local de Supabase
    await supabase.auth.signOut()
    ok('Sesión local cerrada.')
    
    // 🧹 LIMPIEZA COMPLETA: Usar función específica para logout
    cleanupStorageComplete()
    
    // Obtener target de retorno (de donde vino el usuario)
    const target = getEffectiveTarget()
    
    if (shouldShowFullUI()) {
        // En modo UI: actualizar interfaz
        await paintSession()
        await updateBadges()
        log(`Logout completado. Target de retorno: ${target}`)
        return
    }
    
    // En modo auto-redirect: actualizar banner y redirigir
    if (target) {
        // Actualizar banner para mostrar que se está redirigiendo
        const { createHeadlessBanner } = await import('./ui.js')
        createHeadlessBanner('Sesión cerrada. Regresando...')
        
        log(`Redirigiendo de vuelta a: ${target}`)
        // Pequeño delay para que se vea el mensaje
        setTimeout(() => {
            window.location.href = target
        }, 1500)
    } else {
        log('Logout completado. Sin target de retorno.')
    }
}

async function redirectToTarget(session) {
    const target = getEffectiveTarget()

    if (!target) {
        log('Sin target válido.')
        return
    }

    const at = session.access_token
    const rt = session.refresh_token

    if (!at || !rt) {
        err('Faltan tokens en la sesión.')
        return
    }

    ok('Redirigiendo a target con tokens…')

    // Si estamos en modo auto-redirect, actualizar banner
    if (shouldAutoRedirect()) {
        try {
            const { createHeadlessBanner } = await import('./ui.js')
            createHeadlessBanner('Sesión iniciada. Regresando...')
        } catch (_) { }
    }

    // Usar hash fragment (#) por seguridad: no se envía al servidor ni aparece en logs
    const url = `${target}#access_token=${encodeURIComponent(at)}&refresh_token=${encodeURIComponent(rt)}`

    log(`Target final: ${target}`)
    
    // Pequeño delay para que se vea el mensaje
    setTimeout(() => {
        history.replaceState({}, document.title, location.pathname)
        window.location.replace(url)
    }, 1000)
}

// ==========================================
// UI Y GESTIÓN DE ESTADO
// ==========================================

function setBadge(el, status) {
    el.classList.remove('ok', 'err', 'warn')
    if (status === 'ok') el.classList.add('ok')
    else if (status === 'err') el.classList.add('err')
    else el.classList.add('warn')
}

async function updateBadges() {
    if (!shouldShowFullUI()) return
    const session = await getCurrentSession()
    setBadge($('authBadge'), session ? 'ok' : 'warn')
    $('authBadge').textContent = session ? 'Con sesión' : 'Sin sesión'
    const goodHost = location.hostname.endsWith('jeivian.com')
    setBadge($('hostBadge'), goodHost ? 'ok' : 'warn')
    $('hostBadge').textContent = goodHost ? location.hostname : 'host no jeivian.com'
}

function formatSessionData(session, user, showTokens = false) {
    const exp = session.expires_at ? new Date(session.expires_at * 1000) : null
    const ttl = exp ? msToTime(exp - new Date()) : 'desconocido'
    const show = showTokens ? (v) => v : (v) => '<oculto>'

    return [
        `user.id = ${user?.id}`,
        `user.email = ${user?.email || '(sin email)'}`,
        `session.expires_at = ${exp ? exp.toISOString() : 'n/a'} (TTL ${ttl})`,
        `provider = ${CONSTANTS.PROVIDER}`,
        `access_token = ${show(session.access_token)}`,
        `refresh_token = ${show(session.refresh_token)}`,
    ].join('\n')
}

async function paintSession() {
    if (!shouldShowFullUI()) return
    const box = $('sessionBox')
    const session = await getCurrentSession()
    if (!session) {
        box.textContent = 'Sin sesión'
        return
    }
    const { data: { user } } = await supabase.auth.getUser()
    box.textContent = formatSessionData(session, user, false)
}

// ==========================================
// HANDLERS DE UI
// ==========================================

function setupUIHandlers() {
    return {
        clearUrl: () => {
            history.replaceState({}, document.title, location.pathname)
            ok('URL limpia')
        },
        go: async () => {
            const session = await getCurrentSession()
            if (session) await redirectToTarget(session)
            else await ensureLogin()
        },
        login: async () => { await ensureLogin() },
        logout: async () => {
            await handleLogout()
        },
        refresh: async () => {
            await refreshSession()
            await paintSession()
        },
        copyAT: async () => {
            const session = await getCurrentSession()
            if (session?.access_token) copy(session.access_token)
        },
        copyRT: async () => {
            const session = await getCurrentSession()
            if (session?.refresh_token) copy(session.refresh_token)
        },
        toggleTokens: async () => {
            const session = await getCurrentSession()
            const box = $('sessionBox')
            if (!session) return

            const showing = box.classList.toggle('token')
            const { data: { user } } = await supabase.auth.getUser()
            box.textContent = formatSessionData(session, user, showing)
        },
        paintSession,
        updateBadges
    }
}

// ==========================================
// LÓGICA POR AMBIENTE
// ==========================================

async function handleAutoRedirectMode() {
    log(`Modo ${CONFIG.ENV.toUpperCase()} - autoredirigir automáticamente`)

    // Autoredirigir si hay sesión
    const session = await getCurrentSession()
    if (session) {
        try {
            await redirectToTarget(session)
            return
        } catch (error) {
            warn('Error en primer intento de redirección, reintentando...', error.message)
            // Pequeña pausa y retry
            setTimeout(async () => {
                try {
                    await redirectToTarget(session)
                } catch (retryError) {
                    err('Error en retry de redirección:', retryError.message)
                    // Fallback: usar target por defecto
                    const fallback = CONFIG.ENV === 'development' 
                        ? CONSTANTS.FALLBACK_TARGET_DEV 
                        : CONSTANTS.FALLBACK_TARGET_PROD
                    window.location.href = fallback
                }
            }, 1000)
            return
        }
    }

    // Sin sesión: intentar login con cooldown
    const now = Date.now()
    const last = Number(sessionStorage.getItem(CONSTANTS.SESSION_STORAGE_KEY) || 0)
    if (now - last > CONSTANTS.COOLDOWN_MS) {
        sessionStorage.setItem(CONSTANTS.SESSION_STORAGE_KEY, String(now))
        await ensureLogin()
    }
}

function handleTestingMode() {
    // En modo testing: mostrar UI completa pero no autoredirigir
    // Los botones están disponibles para interacción manual
    log('Modo TESTING - UI completa, usar botones manualmente')
}

// ==========================================
// FUNCIÓN PRINCIPAL Y BOOTSTRAP
// ==========================================

async function bootstrap() {
    // Verificar si es una petición de logout PRIMERO
    const params = new URLSearchParams(location.search)
    const isLogout = params.get('logout') === 'true'
    
    // Configurar UI según modo
    const uiHandlers = setupUIHandlers()

    await setupUI(shouldShowFullUI(), CONFIG, uiHandlers, isLogout)

    // Lógica de autenticación (común para todos los ambientes)
    ok('Cargando Hub…')
    log(`Ambiente: ${CONFIG.ENV.toUpperCase()}`)
    
    if (isLogout) {
        ok('Cerrando sesión...')
        await handleLogout()
        return
    }
    
    // Para debugging
    await handleCodeExchangeIfNeeded()

    if (shouldShowFullUI()) {
        handleTestingMode()
        return
    }

    await handleAutoRedirectMode()
}

// Event listener solo para logging - la lógica de UI/redirección está en bootstrap()
supabase.auth.onAuthStateChange((event) => {
    log(`Evento auth: ${event}`)
})

async function main() {
    await bootstrap()
}

main()