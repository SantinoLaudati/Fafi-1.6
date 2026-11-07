// Cliente del modo online (preparado para cuando el servidor esté levantado).
// Habla con database/php-backend/websocket/server.php: ws(s)://host/game?token=JWT
//   cliente -> servidor: join_room {roomId, mode, map}, leave_room, player_update {position, rotation, ...}, shoot, damage, chat, ping
//   servidor -> cliente: welcome, room_state, player_joined, player_left, player_update, player_shoot, player_damage, player_killed, player_respawned, chat, pong, error
// Esta clase solo maneja la conexión y la sala (lobby). La sincronización de jugadores remotos dentro de la partida
// se engancha con on('player_update', ...) cuando el servidor esté disponible.
export class OnlineClient {
  constructor() { this.ws = null; this.handlers = {}; this.state = 'offline'; this.room = null; this.players = []; this.me = null; this.ping = null; this._pingT = 0; this._tries = 0; this._want = false; }
  on(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); return this; }
  _emit(type, data) { (this.handlers[type] || []).forEach((f) => { try { f(data); } catch (e) { console.warn('online handler', e); } }); }
  _set(s, info) { this.state = s; this._emit('state', { state: s, info }); }

  get available() { return !!(window.authService && window.authService.isAuthenticated() && !window.authService.devMode && window.FAFI_CONFIG && window.FAFI_CONFIG.wsUrl); }

  // abre la conexión (promesa: resuelve con 'welcome' o rechaza con el motivo)
  connect(timeoutMs = 6000) {
    if (!this.available) return Promise.reject(new Error('Iniciá sesión con tu cuenta para jugar online.'));
    if (this.ws && this.ws.readyState === 1) return Promise.resolve(this.me);
    this._want = true; this._set('connecting');
    return new Promise((resolve, reject) => {
      let done = false;
      const fail = (m) => { if (done) return; done = true; this._set('offline', m); try { this.ws && this.ws.close(); } catch (e) {} reject(new Error(m)); };
      const timer = setTimeout(() => fail('El servidor online no responde.'), timeoutMs);
      let ws;
      try { ws = new WebSocket(window.FAFI_CONFIG.wsUrl + '?token=' + encodeURIComponent(window.authService.token)); } catch (e) { clearTimeout(timer); return fail('No se pudo abrir la conexión.'); }
      this.ws = ws;
      ws.onmessage = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.type === 'welcome') { this.me = { id: m.userId, username: m.username }; this._tries = 0; this._set('online'); this._startPing(); if (!done) { done = true; clearTimeout(timer); resolve(this.me); } }
        else if (m.type === 'room_state') { this.room = m.room; this.players = m.players || []; this._set('room'); }
        else if (m.type === 'player_joined') { this.players = this.players.filter((p) => p.id !== m.player.id).concat(m.player); }
        else if (m.type === 'player_left') { this.players = this.players.filter((p) => p.id !== (m.playerId ?? m.id)); }
        else if (m.type === 'pong') { this.ping = Math.max(0, Date.now() - (this._pingSent || Date.now())); }
        this._emit(m.type, m);
        this._emit('*', m);
      };
      ws.onclose = (ev) => { clearTimeout(timer); this._stopPing(); this.room = null; this.players = []; if (!done) fail(ev.code === 4001 ? 'Sesión inválida: volvé a iniciar sesión.' : 'No se pudo conectar al servidor online.'); else { this._set('offline', 'Conexión cerrada'); if (this._want && this._tries < 5) setTimeout(() => this.connect().catch(() => {}), Math.min(8000, 1000 * ++this._tries)); } };
      ws.onerror = () => {};
    });
  }
  disconnect() { this._want = false; this._stopPing(); try { this.ws && this.ws.close(); } catch (e) {} this.ws = null; this.room = null; this.players = []; this._set('offline'); }
  send(type, data = {}) { if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify({ type, ...data })); return true; } return false; }
  joinRoom(roomId, mode = 'defuse', map = 'dust2') { return this.send('join_room', { roomId, mode, map }); }
  listRooms() { return this.send('list_rooms'); }
  createRoom(name) { return this.send('create_room', { name }); }
  vote(map) { return this.send('vote_map', { map }); }
  startMatch() { return this.send('start_match'); }
  leaveRoom() { this.room = null; this.players = []; return this.send('leave_room'); }
  sendUpdate(pos, rot, extra = {}) { return this.send('player_update', { position: pos, rotation: rot, ...extra }); }
  chat(text) { return this.send('chat', { message: text }); }
  _startPing() { this._stopPing(); this._pingT = setInterval(() => { this._pingSent = Date.now(); this.send('ping'); }, 4000); }
  _stopPing() { clearInterval(this._pingT); }
}
export const online = new OnlineClient();
window.fafiOnline = online;

// ----- pestaña ONLINE del menú de partida: salas visibles para todos, equipos 5v5 al azar y votación de mapa -----
const CSS = `
#pmOn{flex-direction:column;gap:14px;align-items:stretch!important;justify-content:flex-start!important;max-width:1100px;width:100%;margin:0 auto;color:#cfd6df}
#pmOn .on-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#pmOn input{background:#0c0f14;border:1px solid #333a46;color:#fff;padding:11px 12px;border-radius:3px;font-size:14px;flex:1;min-width:160px}
#pmOn .on-btn{background:#1b2230;border:1px solid #3a4558;color:#e6ebf2;padding:11px 20px;border-radius:3px;cursor:pointer;font-weight:800;letter-spacing:2px;font-size:12px}
#pmOn .on-btn:hover{border-color:#5bb7ff}#pmOn .on-btn.go{background:linear-gradient(180deg,#2f9e3f,#1c6b27);border-color:#4dbf5e}
#pmOn .on-btn:disabled{opacity:.4;cursor:not-allowed}
#pmOn .on-st{font-size:12px;letter-spacing:1px;color:#8e98a5}#pmOn .on-st.ok{color:#6ee79a}#pmOn .on-st.err{color:#ff8a8a}
#pmOn .on-list{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);border-radius:3px;max-height:38vh;overflow:auto}
#pmOn .on-room{display:grid;grid-template-columns:1fr 160px 90px 110px;gap:10px;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px}
#pmOn .on-room.head{font-size:11px;letter-spacing:3px;color:#7d8794;background:rgba(255,255,255,.04)}
#pmOn .on-empty{padding:26px;text-align:center;color:#7d8794}
#pmOn .on-teams{display:grid;grid-template-columns:1fr 1fr;gap:14px}
#pmOn .on-team{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);padding:10px 14px;border-radius:3px}
#pmOn .on-team h4{margin:0 0 8px;font-size:12px;letter-spacing:4px;color:#e0a82e}
#pmOn .on-slot{padding:6px 8px;font-size:14px;border-bottom:1px solid rgba(255,255,255,.05);display:flex;justify-content:space-between}
#pmOn .on-slot.empty{color:#566;font-style:italic}#pmOn .on-slot b{color:#e0a82e;font-size:11px;letter-spacing:2px}
#pmOn .on-maps{display:flex;gap:10px;flex-wrap:wrap}
#pmOn .on-map{flex:1;min-width:130px;padding:14px 10px;text-align:center;border:2px solid rgba(255,255,255,.1);background:#0d1117;cursor:pointer;border-radius:3px;font-weight:800;letter-spacing:2px;position:relative}
#pmOn .on-map:hover{border-color:rgba(255,255,255,.4)}#pmOn .on-map.mine{border-color:#fff;background:#18202b}
#pmOn .on-map i{position:absolute;top:-9px;right:-9px;min-width:24px;height:24px;border-radius:12px;background:#e0a82e;color:#111;font-style:normal;font-size:13px;line-height:24px;text-align:center}
#pmOn .on-note{font-size:11px;color:#7d8794;letter-spacing:1px}
`;
const MAP_NAMES = { dust2: 'DUST II', italy: 'ITALY', office: 'OFFICE', mirage: 'MIRAGE' };
export function initOnlineLobby() {
  const ov = document.getElementById('teamOverlay'), pane = document.getElementById('pmOn');
  if (!ov || !pane || pane.dataset.ready) return;
  pane.dataset.ready = '1';
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const esc = (s) => String(s).replace(/[<>&"']/g, '');
  let view = 'rooms', msg = ['', ''], myVote = null, votes = {};
  const setMsg = (t, c = '') => { msg = [t, c]; const e = pane.querySelector('#onMsg'); if (e) { e.textContent = t; e.className = 'on-st ' + c; } };

  // pestañas COMPETITIVO / ONLINE
  const tabs = ov.querySelectorAll('.pm-tab'), off = document.getElementById('pmOff'), go = document.getElementById('pmGo'), sub = document.getElementById('pmSub'), rules = document.getElementById('pmRules');
  const showTab = (k) => {
    tabs.forEach((t) => t.classList.toggle('sel', t.dataset.pm === k));
    off.hidden = k !== 'off'; pane.hidden = k !== 'on'; go.classList.toggle('hide', k !== 'off');
    sub.textContent = k === 'off' ? 'DEFUSE 5v5 · CONTRA BOTS · ELEGÍ EL MAPA' : 'ONLINE · SALAS ABIERTAS · 5 CONTRA 5';
    rules.textContent = k === 'off' ? '18 rondas · gana el primero en llegar a 12 · bando aleatorio y cambio de lado a mitad de partida' : 'Equipos de 5 al azar · bando T/CT al azar · el mapa lo vota la sala';
    if (k === 'on') connect();
  };
  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.pm)));

  const connect = async () => {
    if (!online.available) { view = 'login'; return render(); }
    if (online.state === 'online' || online.state === 'room') { online.listRooms(); view = online.room ? 'room' : 'rooms'; return render(); }
    view = 'connecting'; render();
    try { await online.connect(); online.listRooms(); view = online.room ? 'room' : 'rooms'; } catch (e) { view = 'down'; msg = [e.message, 'err']; }
    render();
  };

  const render = () => {
    if (view === 'login') pane.innerHTML = '<div class="on-empty">Para jugar online iniciá sesión con tu cuenta (no el modo sin conexión).</div>';
    else if (view === 'connecting') pane.innerHTML = '<div class="on-empty">Conectando con el servidor...</div>';
    else if (view === 'down') pane.innerHTML = `<div class="on-empty">${esc(msg[0] || 'El servidor online no está disponible.')}<br><br><button class="on-btn" id="onRetry">REINTENTAR</button><div class="on-note" style="margin-top:10px">Mientras tanto podés jugar contra bots en la pestaña COMPETITIVO.</div></div>`;
    else if (view === 'rooms') {
      const rooms = online.rooms || [];
      pane.innerHTML = `<div class="on-row"><input id="onName" maxlength="24" placeholder="Nombre de tu sala"><button class="on-btn go" id="onCreate">CREAR SALA</button><button class="on-btn" id="onRefresh">ACTUALIZAR</button></div>
        <div class="on-st ${msg[1]}" id="onMsg">${esc(msg[0])}</div>
        <div class="on-list"><div class="on-room head"><span>SALA</span><span>ANFITRIÓN</span><span>JUGADORES</span><span></span></div>
        ${rooms.length ? rooms.map((r) => `<div class="on-room"><span>${esc(r.name)}</span><span>${esc(r.host)}</span><span>${r.players}/${r.max}</span><span>${r.state === 'waiting' && r.players < r.max ? `<button class="on-btn" data-join="${esc(r.id)}">UNIRSE</button>` : `<span class="on-note">${r.state === 'waiting' ? 'LLENA' : 'EN JUEGO'}</span>`}</span></div>`).join('') : '<div class="on-empty">No hay salas abiertas. ¡Creá la primera!</div>'}</div>
        <div class="on-note">Todos los jugadores conectados al servidor ven tu sala y pueden unirse (máximo 10).</div>`;
    } else if (view === 'room') {
      const pl = online.players || [], host = online.room && online.room.host, mine = online.me && online.me.id;
      const slot = (i) => pl[i] ? `<div class="on-slot"><span>${esc(pl[i].username)}</span>${pl[i].id === host ? '<b>ANFITRIÓN</b>' : ''}</div>` : '<div class="on-slot empty">esperando jugador...</div>';
      const col = (from) => Array.from({ length: 5 }, (_, i) => slot(from + i)).join('');
      pane.innerHTML = `<div class="on-row"><b style="font-size:18px;letter-spacing:2px">${esc((online.room && online.room.name) || 'Sala')}</b><span class="on-st">${pl.length}/10 jugadores</span><span style="flex:1"></span><button class="on-btn" id="onLeave">SALIR</button></div>
        <div class="on-teams"><div class="on-team"><h4>EQUIPO 1</h4>${col(0)}</div><div class="on-team"><h4>EQUIPO 2</h4>${col(5)}</div></div>
        <div class="on-note">Al iniciar, los jugadores se reparten al azar en 5 contra 5 y el bando (terroristas / antiterroristas) también se sortea.</div>
        <div class="on-row"><span class="on-note" style="letter-spacing:3px">VOTÁ EL MAPA</span></div>
        <div class="on-maps">${Object.keys(MAP_NAMES).map((k) => `<div class="on-map ${myVote === k ? 'mine' : ''}" data-vote="${k}">${MAP_NAMES[k]}${votes[k] ? `<i>${votes[k]}</i>` : ''}</div>`).join('')}</div>
        <div class="on-row"><span class="on-st ${msg[1]}" id="onMsg">${esc(msg[0])}</span><span style="flex:1"></span>${host === mine ? '<button class="on-btn go" id="onStart">INICIAR PARTIDA</button>' : '<span class="on-note">Solo el anfitrión inicia la partida</span>'}</div>`;
    }
  };

  pane.addEventListener('click', (e) => {
    const t = e.target;
    if (t.id === 'onRetry') connect();
    else if (t.id === 'onCreate') { const n = pane.querySelector('#onName').value.trim(); myVote = null; votes = {}; online.createRoom(n || ''); setMsg('Creando sala...'); }
    else if (t.id === 'onRefresh') online.listRooms();
    else if (t.dataset.join) { myVote = null; votes = {}; online.joinRoom(t.dataset.join, 'defuse'); setMsg('Entrando...'); }
    else if (t.id === 'onLeave') { online.leaveRoom(); view = 'rooms'; online.listRooms(); render(); }
    else if (t.id === 'onStart') online.startMatch();
    else if (t.closest && t.closest('[data-vote]')) { const k = t.closest('[data-vote]').dataset.vote; myVote = k; online.vote(k); render(); }
  });
  online.on('rooms_list', (m) => { online.rooms = m.rooms; if (!pane.hidden && view === 'rooms') render(); });
  online.on('room_state', (m) => { view = 'room'; votes = m.room.votes || {}; setMsg(''); render(); });
  online.on('player_joined', () => { if (view === 'room') render(); });
  online.on('player_left', (m) => { if (online.room && m.host) online.room.host = m.host; votes = m.votes || votes; if (view === 'room') render(); });
  online.on('votes', (m) => { votes = m.votes || {}; if (view === 'room') render(); });
  online.on('error', (m) => setMsg(m.message || 'Error del servidor', 'err'));
  // la sala arrancó: se muestra a qué equipo y bando te tocó y se abre la partida en el mapa ganador
  // (la sincronización de los jugadores dentro de la partida depende del servidor de juego: por ahora cada uno juega su partida con bots en ese mapa y bando)
  online.on('match_start', (m) => {
    const me = online.me && online.me.id, side = (m.teams.t || []).some((p) => p.id === me) ? 't' : 'ct';
    setMsg('¡Partida! Mapa ' + (MAP_NAMES[m.map] || m.map) + ' · te tocó ' + (side === 't' ? 'TERRORISTAS' : 'ANTITERRORISTAS'), 'ok');
    setTimeout(() => { if (window.fafiLaunch) window.fafiLaunch(m.map, side); }, 1500);
  });
  showTab('off');
}
