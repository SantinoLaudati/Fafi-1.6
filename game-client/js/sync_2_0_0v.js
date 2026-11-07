// Sincroniza con la cuenta (base de datos) todo lo personal que antes quedaba solo en el navegador:
// perfil (foto, descripción, logros destacados), mira, ajustes gráficos, sonido, idioma y hora del día.
// Se guarda en configuraciones_jugador.preferencias_ui = { perfil, ajustes } y .mira. Sin servidor, todo sigue funcionando en localStorage.
const KEYS = ['fafi_gfx', 'fafi_xh', 'fafi_audio', 'fafi_time', 'fafi_lang', 'fafi_quality_level'];
const user = () => window.currentUserId || 'Jugador';
const online = () => !!(window.authService && window.authService.isAuthenticated() && !window.authService.devMode && window.apiService);
const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
let timer = 0, applying = false;
function collect() {
  const ajustes = {}; for (const k of KEYS) { const v = get(k); if (v != null) ajustes[k] = v; }
  let perfil = {}; try { perfil = JSON.parse(get('fafi_perfil_' + user()) || '{}') || {}; } catch (e) {}
  let mira = null; try { mira = JSON.parse(get('fafi_xh') || 'null'); } catch (e) {}
  return { prefs: { perfil, ajustes }, mira };
}
export function push() {
  if (applying || !online()) return;
  clearTimeout(timer);
  timer = setTimeout(async () => { try { const c = collect(); await window.apiService.updateConfig({ preferencias_ui: c.prefs, mira: c.mira }); } catch (e) { /* se reintenta en el próximo cambio */ } }, 1500);
}
export async function pull() {
  if (!online()) return false;
  try {
    const r = await window.apiService.getConfig(), cfg = r && r.config; if (!cfg) return false;
    const ui = cfg.preferencias_ui || {};
    applying = true;
    if (ui.ajustes) for (const k of KEYS) if (ui.ajustes[k] != null) localStorage.setItem(k, ui.ajustes[k]);
    if (ui.perfil && Object.keys(ui.perfil).length) localStorage.setItem('fafi_perfil_' + user(), JSON.stringify(ui.perfil));
    if (cfg.mira && cfg.mira.style) localStorage.setItem('fafi_xh', JSON.stringify(cfg.mira));
    applying = false;
    // reaplica lo cargado
    window.dispatchEvent(new Event('fafi-gfx-change'));
    try { const a = await import('./ajustes_2_0_0v.js'); a.applyCrosshair(); } catch (e) {}
    try { const au = JSON.parse(get('fafi_audio') || 'null'); if (au && window.SFX) window.SFX.setConfig(au); } catch (e) {}
    try { if (window.fafiSetLang) window.fafiSetLang(get('fafi_lang') || 'es'); } catch (e) {}
    window.dispatchEvent(new Event('fafi-perfil-change'));
    return true;
  } catch (e) { applying = false; return false; }
}
export function initSync() {
  if (window.__syncInit) return; window.__syncInit = true;
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { orig.call(this, k, v); if (this === window.localStorage && (KEYS.includes(k) || String(k).startsWith('fafi_perfil_'))) push(); };
  window.fafiSync = { push, pull };
}
