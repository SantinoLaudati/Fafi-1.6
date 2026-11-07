// Perfil del jugador: foto, descripción, logros destacados y la mira, para que otros jugadores puedan verlo y copiar tu mira.
// Se guarda en este equipo (localStorage 'fafi_perfil_<usuario>') y, con cuenta en el servidor, en la base de datos
// (configuraciones_jugador.preferencias_ui.perfil + .mira); /social/profile?u=<usuario> devuelve el perfil público.
const esc = (s) => String(s == null ? '' : s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
const XH_KEY = 'fafi_xh';
const COLORS = ['#e0a82e', '#3aa0ff', '#ff6a3a', '#4ade80', '#c084fc', '#f472b6', '#22d3ee', '#a3a3a3'];
const user = () => (window.currentUserId || 'Jugador');
const key = (u) => 'fafi_perfil_' + u;
const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
export function getMyProfile() { return { bio: '', avatar: '', badges: [], ...(lsGet(key(user())) || {}) }; }
export function myCrosshair() { return lsGet(XH_KEY) || { style: 'cruz', color: '#ffffff', len: 8, thick: 2, gap: 3, dot: false, dotSize: 2, outline: 1, alpha: 1, dynamic: true }; }
// avatar para mostrar: la foto del jugador, o un círculo de color con la inicial (bots y quienes no subieron foto)
export function avatarHtml(name, photo, size = 32) {
  const n = String(name || '?'); let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  if (photo) return `<img class="pf-av" src="${photo}" width="${size}" height="${size}" alt="" style="width:${size}px;height:${size}px">`;
  return `<span class="pf-av pf-ini" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.46)}px;background:${COLORS[h % COLORS.length]}">${esc(n.charAt(0).toUpperCase())}</span>`;
}
export function crosshairCode(c) { try { return 'FAFI-' + btoa(unescape(encodeURIComponent(JSON.stringify(c)))); } catch (e) { return ''; } }
export function parseCrosshairCode(s) {
  try { const j = JSON.parse(decodeURIComponent(escape(atob(String(s).trim().replace(/^FAFI-/, ''))))); if (j && j.style) return j; } catch (e) {}
  return null;
}
function applyCrosshair(c) { lsSet(XH_KEY, c); try { import('./ajustes_2_0_0v.js').then((m) => { m.applyCrosshair(c); const root = document.getElementById('ax-root'); if (root) root.querySelector('#axXhBox')?.dispatchEvent(new Event('fafi-xh-changed')); }); } catch (e) {} }

const CSS = `
.pf-av{border-radius:50%;object-fit:cover;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;border:2px solid rgba(255,255,255,.25)}
.pf-ini{color:#101218;font-weight:800}
#pf-box{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:16px;margin-bottom:18px;display:flex;gap:18px;flex-wrap:wrap}
#pf-box .pf-left{display:flex;flex-direction:column;align-items:center;gap:8px}
#pf-box .pf-mid{flex:1;min-width:240px;display:flex;flex-direction:column;gap:8px}
#pf-box textarea,#pf-box input[type=text]{width:100%;background:#0c0f14;border:1px solid #333a46;color:#fff;border-radius:4px;padding:8px;font:inherit;resize:vertical;min-height:64px}
#pf-box .pf-btn,.pf-modal .pf-btn{background:#1b2230;border:1px solid #3a4558;color:#e6ebf2;padding:8px 14px;border-radius:3px;cursor:pointer;font-weight:700;letter-spacing:1px;font-size:12px}
#pf-box .pf-btn:hover,.pf-modal .pf-btn:hover{border-color:#e0a82e}.pf-btn.pri{background:linear-gradient(180deg,#d69f0f,#8a6406);color:#111;border-color:#e0a82e}
.pf-badges{display:flex;gap:6px;flex-wrap:wrap}.pf-badge{padding:5px 10px;border-radius:12px;border:1px solid #3a4558;font-size:12px;background:#12161d;color:#9aa0aa;cursor:pointer}
.pf-badge.on{border-color:#e0a82e;color:#ffd86b;background:rgba(214,159,15,.16)}
.pf-modal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center}
.pf-card{width:min(560px,94vw);max-height:92vh;overflow:auto;background:#10151c;border:1px solid #2c3442;border-radius:8px;padding:22px;color:#dfe5ec}
.pf-card h2{margin:0 0 4px;letter-spacing:3px}.pf-card .pf-sub{color:#8e98a5;font-size:12px;letter-spacing:2px;margin-bottom:12px}
.pf-prev{position:relative;width:180px;height:120px;background:linear-gradient(135deg,#6e7f8d,#3d4a55 55%,#26313a);border:1px solid #333a46;border-radius:6px;overflow:hidden}
.pf-prev .pf-x{position:absolute;left:50%;top:50%;width:0;height:0}.pf-prev .pf-x i{position:absolute}
`;
function crossPreview(c) {
  const T = c.thick, L = c.len, O = c.outline, col = c.color, g = c.gap, a = c.alpha;
  const bar = (s) => `<i style="${s};background:${col};opacity:${a};box-shadow:0 0 0 ${O}px rgba(0,0,0,.85)"></i>`;
  let h = '';
  if (c.style !== 'punto' && c.style !== 'circulo') {
    if (c.style !== 't') h += bar(`left:${-T / 2}px;top:${-g - L}px;width:${T}px;height:${L}px`);
    h += bar(`left:${-T / 2}px;top:${g}px;width:${T}px;height:${L}px`) + bar(`left:${-g - L}px;top:${-T / 2}px;width:${L}px;height:${T}px`) + bar(`left:${g}px;top:${-T / 2}px;width:${L}px;height:${T}px`);
  }
  if (c.style === 'circulo') { const R = L + 6; h += `<i style="left:${-R}px;top:${-R}px;width:${R * 2}px;height:${R * 2}px;border:${T}px solid ${col};border-radius:50%;box-sizing:border-box;opacity:${a}"></i>`; }
  if (c.dot || c.style === 'punto') h += bar(`left:${-c.dotSize / 2}px;top:${-c.dotSize / 2}px;width:${c.dotSize}px;height:${c.dotSize}px;border-radius:50%`);
  return `<div class="pf-prev"><div class="pf-x">${h}</div></div>`;
}
const achievements = () => (window.achievements || []).map((a) => ({ id: a.id, name: a.name, desc: a.desc, unlocked: !!a.unlocked }));

// perfil público de otro jugador (o el propio): foto, descripción, logros y mira con botón para copiarla
export async function showProfile(name) {
  let data = null;
  if (name === user()) { const p = getMyProfile(); data = { username: name, perfil: p, mira: myCrosshair(), achievements: achievements().filter((a) => a.unlocked) }; }
  else if (window.authService && window.authService.isAuthenticated() && !window.authService.devMode) {
    try { const r = await window.apiService.request('/social/profile?u=' + encodeURIComponent(name)); data = r.profile || null; } catch (e) { data = null; }
  }
  const m = document.createElement('div'); m.className = 'pf-modal';
  if (!data) { m.innerHTML = `<div class="pf-card"><h2>${esc(name)}</h2><div class="pf-sub">PERFIL</div><p>No se pudo cargar el perfil (se necesita conexión con el servidor).</p><button class="pf-btn" data-x>CERRAR</button></div>`; }
  else {
    const p = data.perfil || {}, mira = data.mira && data.mira.style ? data.mira : null, ach = (data.achievements || []);
    const feat = (p.badges || []).map((id) => ach.find((a) => a.id === id || a.nombre === id)).filter(Boolean);
    m.innerHTML = `<div class="pf-card"><div style="display:flex;gap:16px;align-items:center">${avatarHtml(data.username, p.avatar, 84)}<div><h2>${esc(data.username)}</h2><div class="pf-sub">PERFIL DE JUGADOR</div></div></div>
      <p style="margin:14px 0;line-height:1.5">${esc(p.bio || 'Este jugador todavía no escribió una descripción.')}</p>
      <div class="pf-sub">LOGROS DESTACADOS</div><div class="pf-badges">${feat.length ? feat.map((a) => `<span class="pf-badge on" title="${esc(a.desc || '')}">🏆 ${esc(a.name || a.nombre)}</span>`).join('') : '<span class="pf-badge">sin destacados</span>'}</div>
      <div class="pf-sub" style="margin-top:14px">LOGROS DESBLOQUEADOS: ${ach.length}</div>
      ${mira ? `<div class="pf-sub" style="margin-top:14px">MIRA</div><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${crossPreview(mira)}<div style="display:flex;flex-direction:column;gap:8px"><button class="pf-btn pri" data-copy>COPIAR ESTA MIRA</button><span class="pf-sub" id="pfCopyMsg"></span></div></div>` : ''}
      <div style="margin-top:16px;text-align:right"><button class="pf-btn" data-x>CERRAR</button></div></div>`;
    m.querySelector('[data-copy]')?.addEventListener('click', () => { applyCrosshair({ ...mira }); const s = m.querySelector('#pfCopyMsg'); if (s) s.textContent = '¡Mira copiada! Ya es tu mira (Ajustes > Mira).'; });
  }
  m.addEventListener('click', (e) => { if (e.target === m || e.target.dataset.x !== undefined) m.remove(); });
  document.body.appendChild(m);
}
window.fafiVerPerfil = showProfile;

// avatar -> JPEG cuadrado de 96 px (unos 5-8 KB) para guardarlo sin problemas
function fileToAvatar(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); const s = Math.min(im.width, im.height); g.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 96, 96); res(c.toDataURL('image/jpeg', 0.8)); }; im.onerror = rej; im.src = fr.result; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}

export function initPerfil() {
  const panel = document.getElementById('fafi16-tab-perfil');
  if (!panel || document.getElementById('pf-box')) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'pf-box';
  const title = panel.querySelector('.fafi16-panel-title'); (title ? title.after(box) : panel.prepend(box));
  const render = () => {
    const p = getMyProfile(), ach = achievements();
    box.innerHTML = `<div class="pf-left"><div id="pfAv">${avatarHtml(user(), p.avatar, 96)}</div><button class="pf-btn" id="pfPhoto">CAMBIAR FOTO</button><input type="file" id="pfFile" accept="image/*" hidden><button class="pf-btn" id="pfDelPhoto">QUITAR</button></div>
      <div class="pf-mid"><b style="letter-spacing:3px">${esc(user())}</b>
        <textarea id="pfBio" maxlength="160" placeholder="Escribí una descripción tuya (máx. 160 caracteres)">${esc(p.bio)}</textarea>
        <div class="pf-sub" style="color:#8e98a5;font-size:11px;letter-spacing:2px">LOGROS DESTACADOS (hasta 3)</div>
        <div class="pf-badges" id="pfBadges">${ach.length ? ach.map((a) => `<span class="pf-badge ${(p.badges || []).includes(a.id) ? 'on' : ''}" data-b="${esc(a.id)}" title="${esc(a.desc)}" style="${a.unlocked ? '' : 'opacity:.4'}">${a.unlocked ? '🏆' : '🔒'} ${esc(a.name)}</span>`).join('') : '<span class="pf-badge">sin logros todavía</span>'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button class="pf-btn pri" id="pfSave">GUARDAR PERFIL</button><button class="pf-btn" id="pfView">VER MI PERFIL</button><button class="pf-btn" id="pfShare">COPIAR CÓDIGO DE MI MIRA</button><button class="pf-btn" id="pfImport">IMPORTAR MIRA</button></div>
        <div class="pf-sub" id="pfMsg" style="font-size:11px;letter-spacing:1px;color:#8e98a5"></div></div>`;
    const msg = (t) => { const e = box.querySelector('#pfMsg'); if (e) e.textContent = t; };
    box.querySelector('#pfPhoto').onclick = () => box.querySelector('#pfFile').click();
    box.querySelector('#pfFile').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const p2 = getMyProfile(); p2.avatar = await fileToAvatar(f); lsSet(key(user()), p2); render(); msg('Foto cargada. Tocá GUARDAR PERFIL para publicarla.'); } catch (err) { msg('No se pudo leer la imagen.'); } };
    box.querySelector('#pfDelPhoto').onclick = () => { const p2 = getMyProfile(); p2.avatar = ''; lsSet(key(user()), p2); render(); };
    box.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => { const p2 = getMyProfile(); const set = new Set(p2.badges || []); if (set.has(b.dataset.b)) set.delete(b.dataset.b); else if (set.size < 3) set.add(b.dataset.b); else return msg('Máximo 3 logros destacados.'); p2.badges = [...set]; p2.bio = box.querySelector('#pfBio').value; lsSet(key(user()), p2); render(); }));
    box.querySelector('#pfSave').onclick = async () => {
      const p2 = getMyProfile(); p2.bio = box.querySelector('#pfBio').value.slice(0, 160); lsSet(key(user()), p2);
      let ok = false;
      if (window.authService && window.authService.isAuthenticated() && !window.authService.devMode) { try { await window.apiService.updateConfig({ preferencias_ui: { perfil: p2 }, mira: myCrosshair() }); ok = true; } catch (e) { /* sin servidor: queda local */ } }
      msg(ok ? 'Perfil guardado en tu cuenta: otros jugadores ya pueden verlo.' : 'Perfil guardado en este equipo (con cuenta del servidor también lo verán los demás).');
      window.dispatchEvent(new Event('fafi-perfil-change'));
    };
    box.querySelector('#pfView').onclick = () => showProfile(user());
    box.querySelector('#pfShare').onclick = async () => { const code = crosshairCode(myCrosshair()); try { await navigator.clipboard.writeText(code); msg('Código copiado: pasáselo a un amigo para que lo importe.'); } catch (e) { window.prompt('Copiá tu código de mira:', code); } };
    box.querySelector('#pfImport').onclick = () => { const s = window.prompt('Pegá el código de mira (FAFI-...)'); if (!s) return; const c = parseCrosshairCode(s); if (c) { applyCrosshair({ ...myCrosshair(), ...c }); msg('Mira importada.'); } else msg('Código inválido.'); };
  };
  render();
  document.querySelector('.fafi16-tab-btn[data-tab="perfil"]')?.addEventListener('click', render);
  window.fafiPerfil = { get: getMyProfile, avatarHtml, show: showProfile };
}
