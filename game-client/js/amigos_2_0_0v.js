// Amigos: buscador de jugadores, solicitudes recibidas/enviadas, bloqueo y lista de amigos.
// Con el servidor usa /social/*; sin conexión guarda una lista local (window.friendsList).
const CSS = `
#friends-ui{margin-bottom:14px}
#friends-ui .fr-top{display:flex;gap:8px;position:relative}
#friends-ui .fr-top input{flex:1;margin:0}
#friends-ui .fr-sug{position:absolute;left:0;right:110px;top:100%;z-index:5;background:#10141b;border:1px solid #3a4150;border-radius:4px;max-height:210px;overflow:auto;display:none}
#friends-ui .fr-sug.open{display:block}
#friends-ui .fr-sug div{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;font-size:13px;color:#ddd;border-bottom:1px solid rgba(255,255,255,.05)}
#friends-ui .fr-tabs{display:flex;gap:6px;margin:12px 0 8px;flex-wrap:wrap}
#friends-ui .fr-tab{padding:6px 12px;border:1px solid #333a46;border-radius:14px;font-size:11px;font-weight:700;letter-spacing:1px;color:#9aa0aa;cursor:pointer;text-transform:uppercase;background:#12161d}
#friends-ui .fr-tab.on{border-color:#d69f0f;color:#fff;background:rgba(214,159,15,.14)}
#friends-ui .fr-tab i{font-style:normal;color:#d69f0f;margin-left:4px}
#friends-ui .fr-list{background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);border-radius:4px;max-height:230px;overflow-y:auto}
#friends-ui .fr-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;color:#ddd}
#friends-ui .fr-av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#d69f0f,#7b5a08);color:#111;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex:0 0 auto}
#friends-ui .fr-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#friends-ui .fr-name small{display:block;color:#7c8088;font-size:10.5px}
#friends-ui .fr-btn{background:#1b1f27;border:1px solid #3a4150;color:#ddd;padding:5px 10px;border-radius:3px;cursor:pointer;font-size:11px;font-weight:700;letter-spacing:.5px}
#friends-ui .fr-btn:hover{border-color:#d69f0f;color:#fff}
#friends-ui .fr-btn.ok{border-color:#2f9e5a;color:#6ee79a}
#friends-ui .fr-btn.no{border-color:#8a3a3a;color:#ff8a8a}
#friends-ui .fr-empty{padding:16px;text-align:center;color:#707680;font-size:12px}
#friends-ui .fr-msg{min-height:16px;font-size:11.5px;margin-top:6px;color:#9aa0aa}
#friends-ui .fr-msg.err{color:#ff8a8a}#friends-ui .fr-msg.good{color:#6ee79a}
`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const online = () => !!(window.authService && window.authService.isAuthenticated() && !window.authService.devMode);

export function initAmigos() {
  const root = document.getElementById('friends-ui');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  root.innerHTML = `
    <div class="fr-top"><input type="text" id="frInput" class="fafi16-input" placeholder="Buscar jugador por nombre..." autocomplete="off" maxlength="32">
      <button class="fafi16-btn-standard fafi16-btn-success" style="margin:0;width:auto" id="frAdd">AÑADIR</button><div class="fr-sug" id="frSug"></div></div>
    <div class="fr-msg" id="frMsg"></div>
    <div class="fr-tabs" id="frTabs"></div>
    <div class="fr-list" id="frList"></div>`;
  const $ = (id) => root.querySelector('#' + id);
  let tab = 'amigos', data = [], local = false, searchTimer = 0, pollTimer = 0;

  const msg = (t, cls = '') => { const m = $('frMsg'); m.textContent = t || ''; m.className = 'fr-msg ' + cls; };
  const load = async () => {
    if (!online()) {
      local = true;
      data = (window.friendsList || []).map((n) => ({ username: n, estado: 'aceptada', direccion: 'enviada', amigo_id: n }));
      return render();
    }
    local = false;
    try { const r = await window.apiService.getFriends(); data = (r && r.friends) || []; window.friendsList = data.filter((f) => f.estado === 'aceptada').map((f) => f.username); }
    catch (e) { msg(e.message || 'No se pudo cargar la lista', 'err'); }
    render();
  };
  const groups = () => ({
    amigos: data.filter((f) => f.estado === 'aceptada'),
    recibidas: data.filter((f) => f.estado === 'pendiente' && f.direccion === 'recibida'),
    enviadas: data.filter((f) => f.estado === 'pendiente' && f.direccion !== 'recibida'),
    bloqueados: data.filter((f) => f.estado === 'bloqueada')
  });
  const render = () => {
    const g = groups();
    const names = { amigos: 'Amigos', recibidas: 'Solicitudes', enviadas: 'Enviadas', bloqueados: 'Bloqueados' };
    const visible = local ? ['amigos'] : Object.keys(names);
    $('frTabs').innerHTML = visible.map((k) => `<div class="fr-tab ${k === tab ? 'on' : ''}" data-t="${k}">${names[k]}<i>${g[k].length}</i></div>`).join('');
    const list = g[tab] || [];
    const empty = { amigos: 'Todavía no tenés amigos. Buscá un jugador arriba y mandale una solicitud.', recibidas: 'No tenés solicitudes pendientes.', enviadas: 'No enviaste solicitudes.', bloqueados: 'No bloqueaste a nadie.' }[tab];
    $('frList').innerHTML = list.length ? list.map((f) => {
      const id = esc(f.amigo_id), name = esc(f.username);
      const acts = (tab === 'amigos' ? `<button class="fr-btn" data-a="view" data-id="${id}" data-n="${name}">PERFIL</button>` : '') + (tab === 'amigos' ? `<button class="fr-btn no" data-a="del" data-id="${id}" data-n="${name}">QUITAR</button>${local ? '' : `<button class="fr-btn" data-a="block" data-id="${id}" data-n="${name}">BLOQUEAR</button>`}`
        : tab === 'recibidas' ? `<button class="fr-btn ok" data-a="accept" data-id="${id}" data-n="${name}">ACEPTAR</button><button class="fr-btn no" data-a="del" data-id="${id}" data-n="${name}">RECHAZAR</button>`
        : tab === 'enviadas' ? `<button class="fr-btn" data-a="del" data-id="${id}" data-n="${name}">CANCELAR</button>`
        : `<button class="fr-btn" data-a="del" data-id="${id}" data-n="${name}">DESBLOQUEAR</button>`);
      const sub = tab === 'amigos' ? (local ? 'Lista local (sin conexión)' : 'Cuenta activa') : tab === 'recibidas' ? 'Quiere ser tu amigo' : tab === 'enviadas' ? 'Esperando respuesta' : 'Bloqueado';
      return `<div class="fr-row"><div class="fr-av">${name.charAt(0).toUpperCase()}</div><div class="fr-name">${name}<small>${sub}</small></div>${acts}</div>`;
    }).join('') : `<div class="fr-empty">${empty}</div>`;
    // aviso en la pestaña principal cuando hay solicitudes nuevas
    const pb = document.querySelector('.fafi16-tab-btn[data-tab="perfil"]');
    if (pb) pb.dataset.badge = g.recibidas.length ? String(g.recibidas.length) : '';
  };

  const act = async (a, id, name) => {
    if (a === 'view') { if (window.fafiVerPerfil) window.fafiVerPerfil(name); return; }
    try {
      if (local) { window.friendsList = (window.friendsList || []).filter((n) => n !== name); window.fafiSaveGameData && window.fafiSaveGameData(); msg('Amigo eliminado.', 'good'); return load(); }
      if (a === 'accept') { await window.apiService.acceptFriend(id); msg(`Ahora sos amigo de ${name}.`, 'good'); }
      else if (a === 'block') { if (!confirm(`¿Bloquear a ${name}?`)) return; await window.apiService.blockUser(id); msg(`${name} fue bloqueado.`, 'good'); }
      else { if (tab === 'amigos' && !confirm(`¿Quitar a ${name} de tus amigos?`)) return; await window.apiService.removeFriend(id); msg('Hecho.', 'good'); }
    } catch (e) { msg(e.message, 'err'); }
    load();
  };
  const add = async (name) => {
    name = (name || '').trim();
    if (!name) return msg('Escribí el nombre del jugador.', 'err');
    $('frSug').classList.remove('open');
    if (local) {
      const l = window.friendsList || (window.friendsList = []);
      if (l.includes(name)) return msg('Ya está en tu lista.', 'err');
      l.push(name); window.fafiSaveGameData && window.fafiSaveGameData(); $('frInput').value = ''; msg(`${name} agregado (lista local).`, 'good'); return load();
    }
    try { const r = await window.apiService.addFriend(name); $('frInput').value = ''; msg(r.message || 'Solicitud enviada.', 'good'); tab = r.message && /aceptada/i.test(r.message) ? 'amigos' : 'enviadas'; }
    catch (e) { msg(e.message, 'err'); }
    load();
  };

  const suggest = async () => {
    const q = $('frInput').value.trim(), box = $('frSug');
    if (local || q.length < 2) { box.classList.remove('open'); return; }
    try {
      const r = await window.apiService.searchUsers(q), known = new Set(data.map((f) => f.username));
      const us = (r.users || []).slice(0, 8);
      box.innerHTML = us.length ? us.map((u) => `<div><span>${esc(u.username)}</span>${known.has(u.username) ? '<small style="color:#7c8088">ya en tu lista</small>' : `<button class="fr-btn ok" data-add="${esc(u.username)}">AÑADIR</button>`}</div>`).join('') : '<div style="color:#8a909c">Sin resultados</div>';
      box.classList.add('open');
    } catch (e) { box.classList.remove('open'); }
  };

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; render(); return; }
    const b = e.target.closest('[data-a]'); if (b) { act(b.dataset.a, b.dataset.id, b.dataset.n); return; }
    const ad = e.target.closest('[data-add]'); if (ad) { add(ad.dataset.add); return; }
    if (e.target.id === 'frAdd') add($('frInput').value);
  });
  $('frInput').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(suggest, 280); });
  $('frInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') add($('frInput').value); });
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) $('frSug').classList.remove('open'); });
  document.querySelector('.fafi16-tab-btn[data-tab="perfil"]')?.addEventListener('click', load);
  // refresco periódico mientras la pestaña de perfil está abierta (para ver solicitudes nuevas)
  pollTimer = setInterval(() => { if (document.getElementById('fafi16-tab-perfil')?.classList.contains('active') && !document.hidden) load(); }, 20000);
  window.fafiRefreshFriends = load;
  load();
}
