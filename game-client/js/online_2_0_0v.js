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
  leaveRoom() { this.room = null; this.players = []; return this.send('leave_room'); }
  sendUpdate(pos, rot, extra = {}) { return this.send('player_update', { position: pos, rotation: rot, ...extra }); }
  chat(text) { return this.send('chat', { message: text }); }
  _startPing() { this._stopPing(); this._pingT = setInterval(() => { this._pingSent = Date.now(); this.send('ping'); }, 4000); }
  _stopPing() { clearInterval(this._pingT); }
}
export const online = new OnlineClient();
window.fafiOnline = online;

// ----- panel de lobby dentro de la pantalla de preparación de Defuse -----
const CSS = `
#teamOverlay .mode-row{display:flex;gap:10px;justify-content:center;margin:8px 0 4px;flex-wrap:wrap}
#teamOverlay .mode-btn{background:#12161d;border:1px solid #333a46;color:#aeb4bf;padding:11px 22px;border-radius:4px;font-weight:800;letter-spacing:2px;font-size:12px;cursor:pointer;text-transform:uppercase}
#teamOverlay .mode-btn.sel{border-color:#d69f0f;color:#fff;background:rgba(214,159,15,.16)}
#teamOverlay .mode-btn small{display:block;font-weight:500;letter-spacing:0;color:#7c8088;text-transform:none;margin-top:3px}
#onlinePanel{width:min(720px,92%);margin:6px auto 4px;background:rgba(10,13,18,.8);border:1px solid #2c333f;border-radius:6px;padding:12px 14px;display:none;color:#cfd3da;font-size:13px}
#onlinePanel.show{display:block}
#onlinePanel .op-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
#onlinePanel input{background:#0c0f14;border:1px solid #333a46;color:#fff;padding:8px 10px;border-radius:4px;font-size:13px;flex:1;min-width:140px;text-transform:uppercase}
#onlinePanel button{background:#1b1f27;border:1px solid #3a4150;color:#ddd;padding:8px 14px;border-radius:4px;cursor:pointer;font-weight:700;font-size:12px;letter-spacing:1px}
#onlinePanel button:hover{border-color:#d69f0f;color:#fff}
#onlinePanel .op-st{margin-top:8px;font-size:12px;color:#8a909c}
#onlinePanel .op-st.ok{color:#6ee79a}#onlinePanel .op-st.err{color:#ff8a8a}
#onlinePanel .op-pl{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap}
#onlinePanel .op-pl span{background:#161b23;border:1px solid #2c333f;border-radius:12px;padding:3px 10px;font-size:12px}
`;
export function initOnlineLobby(getMap) {
  const ov = document.getElementById('teamOverlay');
  if (!ov || document.getElementById('onlinePanel')) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const anchor = ov.querySelector('.ts-step');
  const modeRow = document.createElement('div');
  modeRow.innerHTML = `<div class="ts-step"><span>0</span>ELIGE EL MODO</div>
    <div class="mode-row"><button class="mode-btn sel" id="modeBots">VS BOTS<small>Partida local 5v5, sin conexión</small></button><button class="mode-btn" id="modeOnline">ONLINE<small>Salas con otros jugadores</small></button></div>
    <div id="onlinePanel"><div class="op-row"><input id="opRoom" maxlength="16" placeholder="Código de sala (ej. MIRAGE1)"><button id="opJoin">UNIRME / CREAR SALA</button><button id="opLeave">SALIR</button></div><div class="op-st" id="opStatus"></div><div class="op-pl" id="opPlayers"></div></div>`;
  ov.insertBefore(modeRow, anchor);
  ov.querySelectorAll('.ts-step span').forEach((s, i) => { s.textContent = i + 1; });
  const $ = (id) => document.getElementById(id), status = (t, c = '') => { const s = $('opStatus'); s.textContent = t; s.className = 'op-st ' + c; };
  const showPlayers = () => { $('opPlayers').innerHTML = online.players.map((p) => `<span>${String(p.username).replace(/[<>&]/g, '')}</span>`).join(''); };
  $('modeBots').onclick = () => { $('modeBots').classList.add('sel'); $('modeOnline').classList.remove('sel'); $('onlinePanel').classList.remove('show'); window.fafiDefuseMode = 'bots'; };
  $('modeOnline').onclick = async () => {
    $('modeOnline').classList.add('sel'); $('modeBots').classList.remove('sel'); $('onlinePanel').classList.add('show'); window.fafiDefuseMode = 'online';
    if (!online.available) return status('Iniciá sesión con tu cuenta (no el modo sin conexión) para entrar a salas online.', 'err');
    status('Conectando con el servidor...');
    try { await online.connect(); status('Conectado como ' + online.me.username + '. Elegí un código de sala y el mapa.', 'ok'); } catch (e) { status(e.message + ' Podés jugar contra bots mientras tanto.', 'err'); }
  };
  $('opJoin').onclick = () => {
    const code = ($('opRoom').value || '').trim().toUpperCase();
    if (!code) return status('Escribí un código de sala.', 'err');
    if (!online.joinRoom(code, 'defuse', getMap ? getMap() : 'dust2')) return status('No hay conexión con el servidor.', 'err');
    status('Entrando a la sala ' + code + '...');
  };
  $('opLeave').onclick = () => { online.leaveRoom(); showPlayers(); status('Saliste de la sala.'); };
  online.on('room_state', (m) => { status(`Sala ${m.room.id} · ${online.players.length} jugador(es). La partida online completa se habilita cuando el servidor tenga el modo activo.`, 'ok'); showPlayers(); });
  online.on('player_joined', showPlayers); online.on('player_left', showPlayers);
  online.on('error', (m) => status(m.message || 'Error del servidor', 'err'));
}
