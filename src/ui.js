// UI Management - Separación de lógica de interfaz
export function createHeadlessBanner(text) {
  try {
    const body = document.body
    if (!body) return
    body.innerHTML = ''
    
    const banner = document.createElement('div')
    banner.className = 'sso-headless-banner'
    
    const title = document.createElement('h1')
    title.className = 'sso-headless-title'
    title.textContent = text
    
    const loader = document.createElement('div')
    loader.className = 'sso-headless-loader'
    
    banner.appendChild(title)
    banner.appendChild(loader)
    body.appendChild(banner)
  } catch (_) { }
}

export function createFullUI() {
  try {
    const body = document.body
    if (!body) return
    body.innerHTML = ''

    // Header
    const header = document.createElement('h1')
    header.innerHTML = `SSO Hub — Jeivian <span class="badge" id="build"></span>`

    // Grid container
    const grid = document.createElement('div')
    grid.className = 'grid'

    // Card 1: Configuración
    const configCard = document.createElement('div')
    configCard.className = 'card stack'
    configCard.innerHTML = `
      <div class="section-title">Configuración</div>
      <div class="kvs" id="cfg"></div>
      <div class="row">
        <label for="target">Destino (target)</label>
        <input id="target" type="text" placeholder="https://app.jeivian.com" />
        <button id="fillLocal" class="ghost">Local 3000</button>
        <button id="fillApp" class="ghost">app.jeivian.com</button>
      </div>
      <div class="row">
        <button id="go" class="primary">Ir (redirigir con tokens)</button>
        <button id="login">Forzar login</button>
        <button id="logout">Cerrar sesión</button>
        <button id="refresh">Refrescar sesión</button>
        <button id="clearUrl" class="ghost">Limpiar URL</button>
      </div>
    `

    // Card 2: Estado de sesión
    const sessionCard = document.createElement('div')
    sessionCard.className = 'card stack'
    sessionCard.innerHTML = `
      <div class="section-title">Estado de sesión</div>
      <div class="kvs" id="sessionBox">Cargando…</div>
      <div class="row">
        <button id="copyAT">Copiar access_token</button>
        <button id="copyRT">Copiar refresh_token</button>
        <button id="toggleTokens" class="ghost">Mostrar/Ocultar tokens</button>
      </div>
    `

    // Card 3: Diagnóstico
    const diagnosticCard = document.createElement('div')
    diagnosticCard.className = 'card stack'
    diagnosticCard.innerHTML = `
      <div class="section-title">Diagnóstico</div>
      <div class="row">
        <span>Auth:</span>
        <span id="authBadge" class="badge warn">…</span>
        <span>Dominio:</span>
        <span id="hostBadge" class="badge warn">…</span>
      </div>
      <div class="hr"></div>
      <div class="section-title">Logs</div>
      <div id="log" class="log"></div>
    `

    // Ensamblar
    grid.appendChild(configCard)
    grid.appendChild(sessionCard)
    grid.appendChild(diagnosticCard)
    
    body.appendChild(header)
    body.appendChild(grid)
  } catch (_) { }
}

export function setupUIEventListeners(handlers) {
  const $ = (id) => document.getElementById(id)
  
  try {
    // Event listeners básicos
    $('fillLocal').onclick = () => { $('target').value = 'http://localhost:3000' }
    $('fillApp').onclick = () => { $('target').value = 'https://app.jeivian.com' }
    $('clearUrl').onclick = handlers.clearUrl
    $('go').onclick = handlers.go
    $('login').onclick = handlers.login
    $('logout').onclick = handlers.logout
    $('refresh').onclick = handlers.refresh
    $('copyAT').onclick = handlers.copyAT
    $('copyRT').onclick = handlers.copyRT
    $('toggleTokens').onclick = handlers.toggleTokens
  } catch (_) { }
}

export function configureUIElements(config) {
  const $ = (id) => document.getElementById(id)
  
  try {
    // Configurar build badge
    const buildEl = $('build')
    if (buildEl) buildEl.textContent = config.BUILD
    
    // Configurar información del sistema
    const cfgEl = $('cfg')
    if (cfgEl) {
      cfgEl.textContent = [
        `SUPABASE_URL = ${config.SUPABASE_URL}`,
        `SUPABASE_ANON = (público)`,
        `Origin = ${location.origin}`,
        `Este Hub redirige tokens por #fragmento (no via query)`
      ].join('\n')
    }

    // Poblar target desde URL si existe
    const params = new URLSearchParams(location.search)
    const target = params.get('target')
    const targetEl = $('target')
    if (target && targetEl) {
      targetEl.value = target
    }
  } catch (_) { }
}

export async function setupUI(showFullUI, config, uiHandlers) {
  if (showFullUI) {
    // Modo TESTING: UI completa con botones
    createFullUI()
    
    // Configurar event listeners y elementos
    setupUIEventListeners(uiHandlers)
    configureUIElements(config)
    
    // Inicializar estado de la UI
    if (uiHandlers.paintSession) await uiHandlers.paintSession()
    if (uiHandlers.updateBadges) await uiHandlers.updateBadges()
    
    // Mensaje explicativo para modo manual
    const $ = (id) => document.getElementById(id)
    const logEl = $('log')
    if (logEl) {
      logEl.textContent = 'Modo TESTING: usa los botones para interactuar.\nNo hay autoredirigir automático.\n\n'
    }
  } else {
    // Modo DEVELOPMENT/PRODUCTION: solo banner, auto-redirect
    createHeadlessBanner('Iniciando sesión con Microsoft…')
  }
}
