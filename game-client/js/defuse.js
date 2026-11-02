// MODO DEFUSE (5v5 estilo CS:GO): rondas, economía, bomba, bots con navegación, zonas de spawn y sitios.
// Este módulo no importa game.js: recibe un objeto `A` (API) con lo que necesita del motor.
import * as THREE from 'three';
import { makeLoader } from './loaders.js';
import { NavGrid } from './nav.js';
import { createChickens } from './chickens.js';
import { loadCharacterAssets, createCharacter, giveWeapon, animateCharacter, killCharacter, reviveCharacter, muzzleWorld, CHAR_HEIGHT } from './characters.js';

const BOMB_FILE = 'assets/extras/cs_go_bomb.glb';

// Insignias de bando (originales) para HUD, selector y marcador
export const TEAM_BADGE = {
  ct: '<svg viewBox="0 0 64 64" class="badge"><path d="M32 4 L56 12 V32 C56 46 46 56 32 60 C18 56 8 46 8 32 V12 Z" fill="#1d5fd0" stroke="#a9ccff" stroke-width="3"/><path d="M32 16 l4.6 9.4 10.3 1.5-7.5 7.2 1.8 10.3-9.2-4.9-9.2 4.9 1.8-10.3-7.5-7.2 10.3-1.5z" fill="#fff"/></svg>',
  t:  '<svg viewBox="0 0 64 64" class="badge"><path d="M32 3 L59 17 V47 L32 61 L5 47 V17 Z" fill="#c4560f" stroke="#ffc58a" stroke-width="3"/><path d="M32 14 L44 32 L32 50 L20 32 Z" fill="#fff"/><path d="M32 22 L38 32 L32 42 L26 32 Z" fill="#c4560f"/></svg>'
};

export const WSTAT = {
  ak:     { dmg: 36,  rate: 0.10, burst: [3, 6], pause: [0.28, 0.55] },
  m4:     { dmg: 33,  rate: 0.09, burst: [3, 6], pause: [0.28, 0.55] },
  awp:    { dmg: 115, rate: 1.30, burst: [1, 1], pause: [0.15, 0.4] },
  deagle: { dmg: 53,  rate: 0.38, burst: [1, 2], pause: [0.30, 0.6] },
  knife:  { dmg: 40,  rate: 0.5,  burst: [1, 1], pause: [0.3, 0.6] }
};
export const HEAD_MULT = { knife: 1 };

const CFG = {
  freeze: 10, roundTime: 105, bombTime: 40, endDelay: 6, winRounds: 4,
  plantTime: 3.2, defuseTime: 10, defuseKitTime: 5,
  startMoney: 800, win: 3250, lose: 1400, loseStep: 500, loseMax: 3400, killReward: 300, plantReward: 300, maxMoney: 16000,
  buyAfterStart: 20
};
const BOT_NAMES = {
  ct: ['Atlas', 'Falcon', 'Nova', 'Viper', 'Bravo'],
  t:  ['Raven', 'Blaze', 'Ghost', 'Tango', 'Cobra']
};

export function createDefuse(A) {
  const D = {
    active: false, state: 'idle', stateT: 0, round: 0, score: { ct: 0, t: 0 }, loseStreak: { ct: 0, t: 0 },
    units: [], player: null, team: 't', nav: null, zones: null,
    bomb: { carrier: null, planted: false, pos: new THREE.Vector3(), site: null, timer: 0, mesh: null, dropped: false, lightT: 0 },
    hold: { kind: null, t: 0, need: 0 }, smokes: [], roundTime: 0, hasKit: false, loading: false,
    killfeed: [], tracers: [], siteMarks: null, playerKillsRound: 0, matchOver: false
  };
  const $ = id => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const navCache = {};
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  let bombProto = null;
  const chickens = createChickens(A);

  // ---------------------------------------------------------------- utilidades
  const eyeOf = (u, out) => out.set(u.pos.x, u.pos.y + (u.isPlayer ? 0 : 0.98), u.pos.z);
  function playerFeet() { const c = A.camera.position; return tmpV3.set(c.x, c.y - A.eyeHeight(), c.z); }
  function syncPlayerUnit() {
    const p = D.player; if (!p) return;
    const c = A.camera.position;
    p.pos.set(c.x, c.y - A.eyeHeight(), c.z);
  }
  function losClear(a, b) {            // segmento a->b libre de geometría
    const d = tmpV2.copy(b).sub(a); const L = d.length(); if (L < 0.01) return true;
    ray.set(a, d.divideScalar(L)); ray.far = L; ray.firstHitOnly = true;
    return ray.intersectObjects(A.colliders, false).length === 0;
  }
  function smokeBlocks(a, b) {
    const now = performance.now();
    for (const s of D.smokes) {
      if (now > s.until) continue;
      // distancia del centro del humo al segmento a-b
      const ab = tmpV.copy(b).sub(a); const L2 = ab.lengthSq(); if (L2 < 1e-6) continue;
      const t = THREE.MathUtils.clamp(tmpV2.copy(s.pos).sub(a).dot(ab) / L2, 0, 1);
      const px = a.x + ab.x * t - s.pos.x, py = a.y + ab.y * t - s.pos.y, pz = a.z + ab.z * t - s.pos.z;
      if (px * px + py * py + pz * pz < s.r * s.r) return true;
    }
    return false;
  }
  const enemiesOf = u => D.units.filter(o => o.alive && o.team !== u.team);
  const alliesOf = u => D.units.filter(o => o.alive && o.team === u.team);
  const alive = team => D.units.filter(u => u.team === team && u.alive);

  // ---------------------------------------------------------------- zonas
  function mapZones(nav) {
    const def = A.mapDef();
    const key = A.mapKey();
    if (D.zones && D.zones.key === key) return D.zones;
    let z = def.zones ? JSON.parse(JSON.stringify(def.zones)) : null;
    if (!z) z = autoZones(nav);
    // acomoda los centros a la malla de navegación
    for (const k of ['t', 'ct', 'A', 'B']) {
      const n = nav.nearest(z[k].x, z[k].y ?? null, z[k].z, 8);
      if (n >= 0) { z[k].x = nav.nodes[n].x; z[k].z = nav.nodes[n].z; z[k].y = nav.nodes[n].y; }
    }
    z.key = key; D.zones = z; return z;
  }
  function autoZones(nav) {
    const N = nav.nodes; if (N.length < 20) throw new Error('mapa sin navegación');
    const b = A.bounds; const diag = Math.hypot(b.max.x - b.min.x, b.max.z - b.min.z);
    // nivel principal
    const hist = new Map();
    for (const n of N) { const k = Math.round(n.y); hist.set(k, (hist.get(k) || 0) + 1); }
    let maxC = 0; const sc = new Map();
    for (const [k, c] of hist) { const cc = c + (hist.get(k - 1) || 0) + (hist.get(k + 1) || 0); sc.set(k, cc); maxC = Math.max(maxC, cc); }
    let lvl = null; for (const [k, cc] of sc) if (cc >= maxC * 0.3 && (lvl === null || k < lvl)) lvl = k;
    const main = N.filter(n => Math.abs(n.y - lvl) <= 1.6 && n.wall < 2);
    // los dos puntos más alejados
    let A1 = main[0], B1 = main[1], bd = -1;
    const step = Math.max(1, Math.floor(main.length / 220));
    for (let i = 0; i < main.length; i += step) for (let j = i + 1; j < main.length; j += step) {
      const d = (main[i].x - main[j].x) ** 2 + (main[i].z - main[j].z) ** 2; if (d > bd) { bd = d; A1 = main[i]; B1 = main[j]; }
    }
    const t = A1.z >= B1.z ? A1 : B1, ct = A1.z >= B1.z ? B1 : A1;
    // apertura (cuántos nodos libres hay alrededor)
    const open = n => { let c = 0; const [ix, iz] = [n.ix, n.iz]; for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const ids = nav.cells.get(nav.key(ix + dx, iz + dz)); if (ids) for (const id of ids) if (Math.abs(N[id].y - n.y) < 1.2) { c++; break; } } return c; };
    const far = (n, p, f) => Math.hypot(n.x - p.x, n.z - p.z) > diag * f;
    const cand = main.filter(n => far(n, t, 0.22) && far(n, ct, 0.18)).map(n => ({ n, o: open(n) })).sort((a, b) => b.o - a.o);
    const sA = cand[0] ? cand[0].n : main[0];
    const sB = (cand.find(c => Math.hypot(c.n.x - sA.x, c.n.z - sA.z) > diag * 0.28) || cand[1] || cand[0]).n;
    return { t: { x: t.x, y: t.y, z: t.z, r: 4.5 }, ct: { x: ct.x, y: ct.y, z: ct.z, r: 4.5 }, A: { x: sA.x, y: sA.y, z: sA.z, r: 5 }, B: { x: sB.x, y: sB.y, z: sB.z, r: 5 } };
  }
  // dirección "abierta" desde p hacia el objetivo: primer punto de la ruta a >3.5 m (evita mirar a una pared)
  const lookRay = new THREE.Raycaster();
  function openLook(p, target) {
    let want = target;
    const path = D.nav.path(p, target);
    if (path) for (const w of path) if (Math.hypot(w.x - p.x, w.z - p.z) > 3.5) { want = w; break; }
    // si la vista hacia ese punto está tapada de cerca (pared / fondo de pasillo), se elige la dirección libre más próxima
    const eye = new THREE.Vector3(p.x, (p.y || 0) + 0.6, p.z);
    const free = ang => { lookRay.set(eye, new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang))); lookRay.far = 6; lookRay.firstHitOnly = true; const h = lookRay.intersectObjects(A.colliders, false)[0]; return h ? h.distance : 6; };
    const base = Math.atan2(want.x - p.x, want.z - p.z);
    if (free(base) < 2.5) {
      let best = base, bs = -1e9;
      for (let i = 0; i < 16; i++) {
        const a = base + (i / 16) * Math.PI * 2;
        const d = Math.min(i, 16 - i) / 8 * Math.PI;                       // distancia angular a la dirección deseada
        const s = free(a) - d * 1.3;
        if (s > bs) { bs = s; best = a; }
      }
      return { x: p.x + Math.sin(best) * 6, y: p.y, z: p.z + Math.cos(best) * 6 };
    }
    return want;
  }
  function spawnPoints(team, n = 5) {
    const z = D.zones[team], nav = D.nav;
    const pts = [{ x: z.x, y: z.y, z: z.z }];
    for (let tries = 0; tries < 80 && pts.length < n; tries++) {
      const p = nav.randomNear(z.x, z.z, z.r * (1 + tries / 40));
      if (!p || Math.abs(p.y - z.y) > 1.5) continue;
      if (pts.every(q => Math.hypot(q.x - p.x, q.z - p.z) > 1.05)) pts.push(p);
    }
    while (pts.length < n) pts.push({ x: z.x + (pts.length - 2) * 0.6, y: z.y, z: z.z });
    return pts;
  }
  function buildSiteMarks() {
    if (D.siteMarks) { A.world.remove(D.siteMarks); }
    const g = new THREE.Group();
    for (const k of ['A', 'B']) {
      const s = D.zones[k];
      const ring = new THREE.Mesh(new THREE.RingGeometry(s.r - 0.14, s.r, 56), new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(s.x, s.y + 0.06, s.z); g.add(ring);
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      x.fillStyle = 'rgba(255,176,32,0.95)'; x.font = 'bold 110px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.strokeStyle = '#000'; x.lineWidth = 8; x.strokeText(k, 64, 70); x.fillText(k, 64, 70);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false }));
      sp.scale.set(1.4, 1.4, 1); sp.position.set(s.x, s.y + 2.4, s.z); g.add(sp);
    }
    A.world.add(g); D.siteMarks = g;
  }

  // ---------------------------------------------------------------- unidades
  function makeUnit(team, name, isPlayer, variant) {
    const u = {
      id: D.units.length, team, name, isPlayer, hp: 100, alive: true, kills: 0, deaths: 0, money: CFG.startMoney,
      weaponId: 'deagle', pos: new THREE.Vector3(), yaw: 0, speed: 0, path: null, pathIdx: 0, goal: null,
      target: null, nextThink: Math.random() * 0.4, nextShot: 0, burstLeft: 0, aimT: 0, alertUntil: 0, flashedUntil: 0,
      skill: rand(0.75, 1.1), hasBomb: false, plantT: 0, defuseT: 0, role: null, stuckT: 0, lastPos: new THREE.Vector3(),
      lastSeenT: 0, kit: false, spotted: 0, char: null
    };
    if (!isPlayer) {
      u.char = createCharacter(team, variant);
      if (u.char) { A.world.add(u.char.root); giveWeapon(u.char, u.weaponId); u.char.groundFn = groundAt; }
    }
    return u;
  }
  function botLoadout(u) {
    // ronda de pistolas: deagle; luego rifles. El dinero del equipo decide.
    const r = D.round;
    const rich = r >= 3 || Math.random() < 0.18 + (r - 1) * 0.15;
    const isCT = u.team === 'ct';
    let w = 'deagle';
    if (rich) w = Math.random() < 0.14 ? 'awp' : (isCT ? 'm4' : 'ak');
    u.weaponId = w; if (u.char) giveWeapon(u.char, w);
  }
  function placeUnit(u, p, lookAt) {
    u.pos.set(p.x, p.y, p.z);
    u.yaw = Math.atan2(lookAt.x - p.x, lookAt.z - p.z);
    u.path = null; u.goal = null; u.target = null; u.speed = 0;
    u.lastPos.copy(u.pos);
    if (u.char) { u.char.root.position.copy(u.pos); u.char.root.rotation.y = u.yaw; }
  }

  // ---------------------------------------------------------------- partida
  function showLoading(msg, frac) {
    const el = $('dfLoading'); if (!el) return;
    el.classList.add('show'); el.querySelector('.msg').textContent = msg; el.querySelector('i').style.width = Math.round((frac || 0) * 100) + '%';
  }
  function hideLoading() { const el = $('dfLoading'); if (el) el.classList.remove('show'); }

  async function startMatch(team) {
    if (D.loading) return;
    D.loading = true; D.team = team;
    try {
      showLoading('Cargando personajes…', 0.05);
      await loadCharacterAssets(['t', 'ct']);
      showLoading('Generando navegación del mapa…', 0.2);
      const key = A.mapKey();
      if (!navCache[key + '|' + A.mapFile()]) {
        const nd = (A.mapDef() && A.mapDef().nav) || {};   // mapas reducidos (Office) necesitan celda fina y menos altura libre
        const nav = new NavGrid(A.bounds, A.colliders, nd.cell || 1.0, { headroom: nd.headroom, step: nd.step });
        await nav.build(f => showLoading('Generando navegación del mapa…', 0.2 + f * 0.7));
        navCache[key + '|' + A.mapFile()] = nav;
      }
      D.nav = navCache[key + '|' + A.mapFile()];
      D.zones = null; mapZones(D.nav);
      if (!bombProto) {
        showLoading('Cargando bomba…', 0.95);
        try { bombProto = (await new Promise((res, rej) => makeLoader().load(BOMB_FILE, g => res(g), undefined, rej))).scene; } catch (e) { console.warn('bomba', e); bombProto = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.25), new THREE.MeshStandardMaterial({ color: 0x6b4a2a })); }
      }
      showLoading('Cargando gallinas…', 0.97); await chickens.load();
      // limpiar partida previa
      cleanupUnits();
      const enemy = team === 't' ? 'ct' : 't';
      D.units = [];
      const p = makeUnit(team, A.playerName(), true, 0); p.char = null; D.player = p; D.units.push(p);
      for (let i = 0; i < 4; i++) D.units.push(makeUnit(team, BOT_NAMES[team][i], false, i));
      for (let i = 0; i < 5; i++) D.units.push(makeUnit(enemy, BOT_NAMES[enemy][i], false, i));
      D.score = { ct: 0, t: 0 }; D.loseStreak = { ct: 0, t: 0 }; D.round = 0; D.matchOver = false;
      chickens.clear();
      const zc = D.zones, b0 = A.bounds;
      const cp = [D.nav.randomNear(zc.t.x, zc.t.z, 9), D.nav.randomNear(zc.t.x, zc.t.z, 9), D.nav.randomNear((b0.min.x + b0.max.x) / 2, (b0.min.z + b0.max.z) / 2, 8)].filter(Boolean);
      chickens.spawn(cp);
      p.money = CFG.startMoney;
      buildSiteMarks();
      D.active = true;
      hideLoading();
      document.body.classList.add('df-on');
      nextRound(true);
    } catch (e) {
      console.error('Defuse: no se pudo iniciar', e);
      hideLoading(); A.showFloating('No se pudo iniciar Defuse: ' + e.message);
    }
    D.loading = false;
  }
  function cleanupUnits() {
    for (const u of D.units) if (u.char) A.world.remove(u.char.root);
    D.units = []; D.player = null;
    removeBombMesh();
    for (const t of D.tracers) A.scene.remove(t.obj); D.tracers = [];
    chickens.clear();
    for (const s of D.smokes) if (s.obj) A.world.remove(s.obj); D.smokes = [];
  }
  function endMatch() {
    D.active = false; D.state = 'idle';
    document.body.classList.remove('df-on');
    cleanupUnits();
    if (D.siteMarks) { A.world.remove(D.siteMarks); D.siteMarks = null; }
    A.setPlayerFrozen(false); A.setViewmodelVisible(true);
  }

  function nextRound(first) {
    D.round++;
    D.bomb.planted = false; D.bomb.dropped = false; D.bomb.carrier = null; D.bomb.timer = 0;
    removeBombMesh();
    D.hold.kind = null; D.hold.t = 0;
    for (const s of D.smokes) if (s.obj) A.world.remove(s.obj); D.smokes = [];
    A.grenadesClear();
    const z = D.zones, enemyOf = t => t === 't' ? 'ct' : 't';
    const spT = spawnPoints('t'), spCT = spawnPoints('ct');
    const idx = { t: 0, ct: 0 };
    // el jugador siempre al centro del spawn; los demás ordenados
    const order = [D.player, ...D.units.filter(u => u !== D.player)];
    for (const u of order) {
      const pts = u.team === 't' ? spT : spCT;
      const p = pts[idx[u.team]++ % pts.length];
      const look = openLook(p, z[enemyOf(u.team)]);
      u.hp = 100; u.alive = true; u.target = null; u.hasBomb = false; u.plantT = 0; u.defuseT = 0; u.flashedUntil = 0; u.burstLeft = 0;
      u.nextShot = 0; u.alertUntil = 0; u.spotted = 0;
      if (u.char) { reviveCharacter(u.char); u.char.root.visible = true; }
      placeUnit(u, p, look);
      if (!u.isPlayer) {
        if (!first && !u.hadWeaponDied) { /* conserva arma */ }
        if (first || u.diedLast) { botLoadout(u); } else if (D.round === 2) botLoadout(u);
        u.diedLast = false;
        u.kit = u.team === 'ct' && Math.random() < 0.5;
      }
    }
    // jugador: equipo según supervivencia
    const pl = D.player;
    if (first || pl.diedLast) A.resetLoadout(D.team, true); else A.resetLoadout(D.team, false);
    pl.diedLast = false;
    A.setMoney(pl.money);
    // bomba: la lleva un T al azar (o el jugador)
    const ts = D.units.filter(u => u.team === 't');
    const carrier = ts[Math.floor(Math.random() * ts.length)];
    carrier.hasBomb = true; D.bomb.carrier = carrier;
    // planes de bots
    const siteForT = Math.random() < 0.5 ? 'A' : 'B';
    D.planSite = siteForT;
    const cts = D.units.filter(u => u.team === 'ct' && !u.isPlayer);
    cts.forEach((u, i) => { u.role = i % 2 === 0 ? 'A' : 'B'; });
    D.units.filter(u => u.team === 't' && !u.isPlayer).forEach(u => { u.role = siteForT; });
    D.state = 'freeze'; D.stateT = CFG.freeze; D.roundTime = CFG.roundTime;
    A.setPlayerFrozen(true); A.setViewmodelVisible(true); A.setSpectating(false);
    A.camera.position.set(pl.pos.x, pl.pos.y + A.eyeHeight(), pl.pos.z);
    A.lookAtPlayer(pl.pos.x + Math.sin(pl.yaw) * 6, pl.pos.y + A.eyeHeight() - 0.15, pl.pos.z + Math.cos(pl.yaw) * 6);
    D.playerKillsRound = 0;
    banner(first ? 'COMIENZA LA PARTIDA' : 'RONDA ' + D.round, D.team === 't' ? 'Plantá la bomba en A o B' : 'Defendé los sitios A y B', D.team);
    refreshHud(true);
  }
  function banner(title, sub, team) {
    const el = $('dfBanner'); if (!el) return;
    el.innerHTML = (team ? TEAM_BADGE[team] : '') + '<div><b>' + title + '</b><span>' + (sub || '') + '</span></div>';
    el.className = 'show ' + (team || '');
    clearTimeout(banner._t); banner._t = setTimeout(() => { el.className = ''; }, 3200);
  }

  function roundEnd(winner, reason) {
    if (D.state === 'end') return;
    D.state = 'end'; D.stateT = CFG.endDelay;
    D.score[winner]++;
    const loser = winner === 'ct' ? 't' : 'ct';
    D.loseStreak[winner] = 0; D.loseStreak[loser] = Math.min(4, D.loseStreak[loser] + 1);
    const reward = { [winner]: CFG.win, [loser]: Math.min(CFG.loseMax, CFG.lose + CFG.loseStep * (D.loseStreak[loser] - 1)) };
    for (const u of D.units) { u.money = Math.min(CFG.maxMoney, u.money + reward[u.team]); if (!u.alive) u.diedLast = true; }
    A.setMoney(D.player.money);
    const mine = D.team === winner;
    banner((winner === 'ct' ? 'ANTITERRORISTAS' : 'TERRORISTAS') + ' GANAN LA RONDA', reason, winner);
    $('dfBanner')?.classList.add(mine ? 'good' : 'bad');
    D.hold.kind = null;
    refreshHud(true);
    if (D.score[winner] >= CFG.winRounds) {
      D.matchOver = true;
      setTimeout(() => {
        banner(mine ? '¡VICTORIA!' : 'DERROTA', 'Marcador final ' + D.score.ct + ' - ' + D.score.t + ' (CT - T). Pulsá ESC para volver al menú.', winner);
      }, 1800);
    }
  }
  function checkRoundEnd() {
    if (D.state !== 'live' && D.state !== 'planted') return;
    const ctA = alive('ct').length, tA = alive('t').length;
    if (D.bomb.planted) {
      if (ctA === 0) { roundEnd('t', 'Todos los antiterroristas eliminados'); }
      return;
    }
    if (tA === 0) roundEnd('ct', 'Todos los terroristas eliminados');
    else if (ctA === 0) roundEnd('t', 'Todos los antiterroristas eliminados');
  }

  // ---------------------------------------------------------------- bomba
  function bombSite(pos) {
    for (const k of ['A', 'B']) { const s = D.zones[k]; if (Math.hypot(pos.x - s.x, pos.z - s.z) <= s.r) return k; }
    return null;
  }
  function ensureBombMesh() {
    if (D.bomb.mesh) return D.bomb.mesh;
    const g = new THREE.Group();
    const m = bombProto.clone(true);
    const box = new THREE.Box3().setFromObject(m); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
    const s = 0.34 / Math.max(size.x, size.z); m.scale.setScalar(s); m.position.set(-c.x * s, -box.min.y * s, -c.z * s);
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    g.add(m);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    led.position.set(0.1, 0.12, 0); g.add(led); g.userData.led = led;
    g.userData.light = { intensity: 0 };   // la luz real se toma del pool al plantar
    A.world.add(g); D.bomb.mesh = g; return g;
  }
  function removeBombMesh() {
    const m = D.bomb.mesh; if (!m) return;
    if (m.userData.light && m.userData.light.isLight) A.releaseLight(m.userData.light);
    A.world.remove(m); D.bomb.mesh = null;
  }
  function dropBomb(pos) {
    D.bomb.carrier = null; D.bomb.dropped = true;
    D.bomb.pos.set(pos.x, pos.y, pos.z);
    const m = ensureBombMesh(); m.position.copy(D.bomb.pos); m.rotation.y = Math.random() * 6;
    A.showFloating('La bomba está en el suelo');
  }
  function plantBomb(by) {
    D.bomb.planted = true; D.bomb.dropped = false; D.bomb.site = bombSite(by.pos);
    D.bomb.pos.set(by.pos.x, by.pos.y, by.pos.z); D.bomb.timer = CFG.bombTime; D.bomb.carrier = null; by.hasBomb = false;
    const m = ensureBombMesh(); m.position.copy(D.bomb.pos); m.rotation.y = by.yaw;
    m.userData.light = A.acquireLight(0xff2020, 0, 3.5, new THREE.Vector3(D.bomb.pos.x, D.bomb.pos.y + 0.28, D.bomb.pos.z)) || { intensity: 0 };
    D.state = 'planted'; D.stateT = CFG.bombTime;
    if (by.isPlayer) { by.money = Math.min(CFG.maxMoney, by.money + CFG.plantReward); A.setMoney(by.money); }
    banner('BOMBA PLANTADA', 'Sitio ' + D.bomb.site + ' • ' + CFG.bombTime + ' s', 't');
    D.units.forEach(u => { if (u.alive && u.team === 'ct' && !u.isPlayer) { u.goal = null; u.path = null; } });
  }
  function explode() {
    const pos = D.bomb.pos; const R = 14;
    const m = D.bomb.mesh; if (m) { m.userData.led.visible = false; }
    A.explosionFx(pos, R);
    for (const u of D.units) {
      if (!u.alive) continue;
      const d = Math.hypot(u.pos.x - pos.x, u.pos.z - pos.z);
      if (d < R && Math.abs(u.pos.y - pos.y) < 4) damageUnit(u, Math.round(500 * (1 - d / R) + 40), null, false, 'bomb');
    }
    roundEnd('t', 'La bomba explotó');
  }
  function defuseDone(by) {
    D.bomb.planted = false; D.bomb.timer = 0;
    if (D.bomb.mesh) { D.bomb.mesh.userData.light.intensity = 0; D.bomb.mesh.userData.led.material.color.set(0x20ff40); }
    if (by.isPlayer) { by.money = Math.min(CFG.maxMoney, by.money + CFG.plantReward); A.setMoney(by.money); }
    roundEnd('ct', 'Bomba desactivada');
  }

  // ---------------------------------------------------------------- daño / muertes
  function addKillfeed(killer, victim, weapon, head) {
    const el = $('dfKillfeed'); if (!el) return;
    const row = document.createElement('div'); row.className = 'kf' + ((killer && killer.isPlayer) || victim.isPlayer ? ' me' : '');
    const nm = u => '<b class="' + u.team + '">' + u.name + '</b>';
    const wn = { ak: 'AK-47', m4: 'M4A4', awp: 'AWP', deagle: 'Deagle', knife: 'Cuchillo', bomb: 'Bomba', he: 'Granada HE', fire: 'Molotov' }[weapon] || weapon;
    row.innerHTML = (killer ? nm(killer) : '<b class="n">Mundo</b>') + ' <i>' + wn + (head ? ' ⌖' : '') + '</i> ' + nm(victim);
    el.prepend(row); setTimeout(() => row.remove(), 6000);
    while (el.children.length > 5) el.lastChild.remove();
  }
  function damageUnit(u, dmg, attacker, head, weapon) {
    if (!u.alive || D.state === 'freeze' || D.state === 'end' && attacker) return false;
    u.hp -= dmg;
    if (u.isPlayer) A.damageFlash(Math.min(1, dmg / 60));
    else { u.alertUntil = performance.now() + 4000; if (attacker && attacker.alive) { u.target = attacker; } }
    if (u.hp <= 0) { killUnit(u, attacker, head, weapon); return true; }
    return false;
  }
  function killUnit(u, killer, head, weapon) {
    u.alive = false; u.hp = 0; u.deaths++; u.speed = 0; u.path = null;
    if (killer && killer !== u) { killer.kills++; if (killer.team !== u.team) { killer.money = Math.min(CFG.maxMoney, killer.money + CFG.killReward); if (killer.isPlayer) A.setMoney(killer.money); } }
    if (u.char) killCharacter(u.char);
    if (u.hasBomb) { u.hasBomb = false; dropBomb(u.pos); }
    if (u.isPlayer) { A.setViewmodelVisible(false); A.setSpectating(true); u.diedLast = true; A.showFloating('Has muerto'); }
    addKillfeed(killer, u, weapon, head);
    refreshHud();
    checkRoundEnd();
  }

  // ---------------------------------------------------------------- bots
  function canSee(a, b, now) {
    if (a.flashedUntil > now) return false;
    const ea = eyeOf(a, new THREE.Vector3()); const eb = b.isPlayer ? new THREE.Vector3(b.pos.x, b.pos.y + A.eyeHeight() - 0.25, b.pos.z) : new THREE.Vector3(b.pos.x, b.pos.y + 0.7, b.pos.z);
    const dx = eb.x - ea.x, dz = eb.z - ea.z; const dist = Math.hypot(dx, dz);
    if (dist > 70) return false;
    if (now > a.alertUntil) {
      const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
      if ((dx * fx + dz * fz) / Math.max(dist, 0.001) < 0.3) return false;
    }
    if (smokeBlocks(ea, eb)) return false;
    return losClear(ea, eb);
  }
  function setGoal(u, p) {
    if (!p) return;
    u.goal = new THREE.Vector3(p.x, p.y, p.z);
    u.path = D.nav.path(u.pos, p); u.pathIdx = 0;
    if (!u.path) u.path = [{ x: p.x, y: p.y, z: p.z }];
  }
  // ---- suelo y paredes reales para los bots (no flotan ni atraviesan muros) ----
  const gRay = new THREE.Raycaster(), gDown = new THREE.Vector3(0, -1, 0), wRay = new THREE.Raycaster();
  const _td = new THREE.Vector3(), _tp = new THREE.Vector3();
  const gO = new THREE.Vector3(), wO = new THREE.Vector3(), wD = new THREE.Vector3();
  const WDIRS = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(Math.sin(i * Math.PI / 4), 0, Math.cos(i * Math.PI / 4)));
  function groundAt(x, z, y) {
    gRay.set(gO.set(x, y + 0.75, z), gDown); gRay.far = 2.2; gRay.firstHitOnly = false;
    for (const h of gRay.intersectObjects(A.colliders, false)) {
      if (!h.face) continue;
      if (h.face.normal.clone().transformDirection(h.object.matrixWorld).y < 0.45) continue;
      return h.point.y;
    }
    return null;
  }
  function settle(u, dt) {
    // paredes: 8 rayos cortos a la altura del torso; se empuja hacia fuera lo que penetra
    const sc = A.colScale ? A.colScale() : 1, rad = 0.26 * Math.max(0.5, sc);
    wRay.far = rad; wRay.firstHitOnly = true;
    for (let k = 0; k < 2; k++) {
      let moved = false;
      for (const d of WDIRS) {
        wRay.set(wO.set(u.pos.x, u.pos.y + 0.62 * Math.max(0.7, sc), u.pos.z), d);
        const h = wRay.intersectObjects(A.colliders, false)[0];
        if (h && (!h.face || Math.abs(h.face.normal.clone().transformDirection(h.object.matrixWorld).y) < 0.6)) {
          const p = rad - h.distance + 0.01; u.pos.x -= d.x * p; u.pos.z -= d.z * p; moved = true;
        }
      }
      if (!moved) break;
    }
    // suelo: la altura sigue la geometría (escaleras, rampas)
    const gy = groundAt(u.pos.x, u.pos.z, u.pos.y);
    if (gy !== null && Math.abs(gy - u.pos.y) < 1.0) u.pos.y += (gy - u.pos.y) * Math.min(1, (dt || 0.016) * 14);
  }
  function moveAlongPath(u, dt, speed) {
    if (!u.path || u.pathIdx >= u.path.length) { u.speed = 0; return true; }
    const w = u.path[u.pathIdx];
    const dx = w.x - u.pos.x, dz = w.z - u.pos.z; const d = Math.hypot(dx, dz);
    if (d < 0.35) { u.pathIdx++; return u.pathIdx >= u.path.length; }
    const st = Math.min(d, speed * dt);
    u.pos.x += dx / d * st; u.pos.z += dz / d * st;
    u.pos.y += (w.y - u.pos.y) * Math.min(1, dt * 4);
    settle(u, dt);
    u.speed = speed;
    return false;
  }
  function faceToward(u, x, z, dt, rate = 9) {
    const want = Math.atan2(x - u.pos.x, z - u.pos.z);
    let d = want - u.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    u.yaw += d * Math.min(1, dt * rate);
  }
  function fireAt(u, t, now) {
    const st = WSTAT[u.weaponId] || WSTAT.deagle;
    if (now < u.nextShot) return;
    if (u.burstLeft <= 0) {
      if (!u.paused) { u.paused = true; u.nextShot = now + rand(st.pause[0], st.pause[1]) * 1000 / u.skill; return; }
      u.paused = false; u.burstLeft = Math.max(1, Math.round(rand(st.burst[0], st.burst[1])));
    }
    u.burstLeft--; u.nextShot = now + st.rate * 1000;
    const eye = eyeOf(u, new THREE.Vector3());
    const mz = (u.char && muzzleWorld(u.char, new THREE.Vector3())) || eye.clone();
    const tp = t.isPlayer ? new THREE.Vector3(t.pos.x, t.pos.y + A.eyeHeight() - 0.35, t.pos.z) : new THREE.Vector3(t.pos.x, t.pos.y + 0.6, t.pos.z);
    const dist = eye.distanceTo(tp);
    const moving = u.speed > 0.3;
    let p = 0.55 * u.skill - dist * 0.0085 - (moving ? 0.12 : 0);
    if (t.isPlayer) p -= A.playerMoving() ? 0.1 : 0;
    p = THREE.MathUtils.clamp(p, 0.07, 0.62);
    const hit = Math.random() < p;
    const head = hit && Math.random() < 0.13;
    const aimPt = tp.clone();
    if (!hit) { aimPt.x += rand(-1, 1) * (0.4 + dist * 0.03); aimPt.y += rand(-0.5, 0.7); aimPt.z += rand(-1, 1) * (0.4 + dist * 0.03); }
    tracer(mz, aimPt); muzzleFlash(mz);
    if (hit) {
      // el humo / pared intermedia ya se chequeó en canSee
      const dmg = Math.round(st.dmg * (head ? (HEAD_MULT[u.weaponId] || 4) : 1) * Math.max(0.6, 1 - dist * 0.004));
      damageUnit(t, dmg, u, head, u.weaponId);
    }
    A.botShotFx(eye, u.weaponId);
  }
  const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,200,90,.85)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const trGeo = new THREE.BoxGeometry(0.045, 0.045, 1);
  function tracer(a, b) {
    // estela luminosa que viaja del cañón al impacto (visible aunque sea de día)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 1, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    const m = new THREE.Mesh(trGeo, mat); m.frustumCulled = false; A.scene.add(m);
    D.tracers.push({ obj: m, kind: 'tr', a: a.clone(), b: b.clone(), dist: a.distanceTo(b), t: 0.16, max: 0.16, shared: true });
  }
  function muzzleFlash(p) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    sp.position.copy(p); sp.scale.setScalar(0.42); A.scene.add(sp);
    D.tracers.push({ obj: sp, kind: 'fl', t: 0.08, max: 0.08 });
  }
  function thinkBot(u, now) {
    // objetivo: enemigo visible más cercano
    let best = null, bd = 1e9;
    for (const e of D.units) {
      if (!e.alive || e.team === u.team) continue;
      if (canSee(u, e, now)) { const d = u.pos.distanceTo(e.pos); if (d < bd) { bd = d; best = e; } }
    }
    if (best) {
      if (u.target !== best) { u.aimT = 0; }
      u.target = best; u.lastSeenT = now;
      if (best.team === 't' || best.team === 'ct') best.spotted = now;
    } else if (u.target && now - u.lastSeenT > 1800) u.target = null;
  }
  function planGoals(u) {
    const z = D.zones;
    if (u.team === 't') {
      if (D.bomb.planted) {
        const p = D.nav.randomNear(D.bomb.pos.x, D.bomb.pos.z, 6.5); setGoal(u, p || D.bomb.pos);
      } else if (u.hasBomb) {
        const s = z[D.planSite]; setGoal(u, D.nav.randomNear(s.x, s.z, s.r * 0.6) || s);
      } else if (D.bomb.dropped && !D.bomb.carrier && Math.random() < 0.5) {
        setGoal(u, D.bomb.pos);
      } else {
        const s = z[D.planSite]; setGoal(u, D.nav.randomNear(s.x, s.z, s.r * 0.95) || s);
      }
    } else {
      if (D.bomb.planted) {
        const near = D.units.filter(o => o.team === 'ct' && o.alive && !o.isPlayer).sort((a, b) => a.pos.distanceTo(D.bomb.pos) - b.pos.distanceTo(D.bomb.pos));
        if (near[0] === u) setGoal(u, D.bomb.pos); else setGoal(u, D.nav.randomNear(D.bomb.pos.x, D.bomb.pos.z, 7) || D.bomb.pos);
      } else {
        const s = z[u.role || 'A']; setGoal(u, D.nav.randomNear(s.x, s.z, s.r * 0.9) || s);
      }
    }
  }
  function updateBot(u, dt, now) {
    if (!u.alive) { if (u.char) { animateCharacter(u.char, dt, 0); } return; }
    if (D.state === 'freeze' || D.state === 'end') {
      u.speed = 0;
      if (u.char) { u.char.root.position.copy(u.pos); u.char.root.rotation.y = u.yaw; animateCharacter(u.char, dt, 0); }
      return;
    }
    u.nextThink -= dt;
    if (u.nextThink <= 0) { u.nextThink = 0.22 + Math.random() * 0.18; thinkBot(u, now); }
    const tgt = u.target && u.target.alive ? u.target : null;
    let speed = 0;
    if (tgt && now - u.lastSeenT < 1200) {
      // combate: se detiene y apunta
      faceToward(u, tgt.pos.x, tgt.pos.z, dt, 11);
      u.aimT += dt;
      const reaction = 0.35 / u.skill;
      if (u.aimT > reaction) fireAt(u, tgt, now);
      // algunos se mueven lateral mientras disparan: no (se mantienen quietos para precisión)
    } else {
      // objetivos / ruta
      if (!u.goal || !u.path || u.pathIdx >= (u.path ? u.path.length : 0)) {
        u.idleT = (u.idleT || 0) - dt;
        if (u.idleT <= 0) { planGoals(u); u.idleT = rand(0.3, 2.2); }
      }
      // plantar / desactivar
      if (u.team === 't' && u.hasBomb && !D.bomb.planted && D.state === 'live') {
        const s = bombSite(u.pos);
        if (s && s === D.planSite) {
          u.plantT += dt; u.speed = 0; speed = 0;
          if (u.plantT >= CFG.plantTime) plantBomb(u);
        } else u.plantT = 0;
      }
      if (u.team === 'ct' && D.bomb.planted && u.pos.distanceTo(D.bomb.pos) < 1.5) {
        u.defuseT += dt; speed = 0;
        if (u.defuseT >= (u.kit ? CFG.defuseKitTime : CFG.defuseTime)) defuseDone(u);
      } else if (u.team === 'ct') u.defuseT = 0;
      if (!(u.plantT > 0 && u.plantT < CFG.plantTime) && !(u.defuseT > 0)) {
        const walk = D.bomb.planted && u.team === 'ct' ? 3.1 : 2.55;
        const done = moveAlongPath(u, dt, walk);
        speed = done ? 0 : walk;
        if (u.path && u.pathIdx < u.path.length) faceToward(u, u.path[u.pathIdx].x, u.path[u.pathIdx].z, dt, 8);
      }
      // recoger la bomba caída
      if (D.bomb.dropped && u.team === 't' && !D.bomb.carrier && u.pos.distanceTo(D.bomb.pos) < 1.0) {
        u.hasBomb = true; D.bomb.carrier = u; D.bomb.dropped = false; if (D.bomb.mesh) { A.world.remove(D.bomb.mesh); D.bomb.mesh = null; }
      }
      // atasco
      u.stuckT += dt;
      if (u.stuckT > 2.2) { if (u.pos.distanceTo(u.lastPos) < 0.25 && u.path && speed > 0) { u.goal = null; u.path = null; u.idleT = 0; } u.lastPos.copy(u.pos); u.stuckT = 0; }
    }
    if (u.char) {
      u.char.root.position.copy(u.pos); u.char.root.rotation.y = u.yaw;
      const pitch = tgt ? Math.atan2((tgt.pos.y - u.pos.y) * 0.5, Math.max(1, u.pos.distanceTo(tgt.pos))) : 0;
      animateCharacter(u.char, dt, tgt ? 0 : speed, pitch);
    }
  }
  function separate() {
    const us = D.units.filter(u => u.alive);
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j]; const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z; const d = Math.hypot(dx, dz);
      if (d < 0.5 && d > 0.001) {
        const push = (0.5 - d) * 0.5; const nx = dx / d, nz = dz / d;
        if (!a.isPlayer) { a.pos.x -= nx * push; a.pos.z -= nz * push; settle(a, 0.016); }
        if (!b.isPlayer) { b.pos.x += nx * push; b.pos.z += nz * push; settle(b, 0.016); }
      }
    }
  }

  // ---------------------------------------------------------------- jugador
  function updatePlayerHold(dt) {
    const p = D.player; if (!p || !p.alive || D.state === 'freeze' || D.state === 'end') { D.hold.kind = null; $('dfProgress')?.classList.remove('show'); $('dfPrompt')?.classList.remove('show'); return; }
    syncPlayerUnit();
    const keyE = A.keys['KeyE'];
    const moving = A.playerMoving();
    let kind = null, need = 0;
    if (p.team === 't' && p.hasBomb && !D.bomb.planted) {
      const s = bombSite(p.pos);
      if (s) { kind = 'plant'; need = CFG.plantTime; }
    } else if (p.team === 'ct' && D.bomb.planted && p.pos.distanceTo(D.bomb.pos) < 2.0) {
      kind = 'defuse'; need = D.hasKit ? CFG.defuseKitTime : CFG.defuseTime;
    }
    const prompt = $('dfPrompt');
    if (prompt) { prompt.textContent = kind === 'plant' ? 'Mantén [E] para plantar la bomba' : kind === 'defuse' ? 'Mantén [E] para desactivar la bomba' : ''; prompt.classList.toggle('show', !!kind && !D.hold.kind); }
    if (kind && keyE && !moving && A.playerGrounded()) {
      if (D.hold.kind !== kind) { D.hold.kind = kind; D.hold.t = 0; }
      D.hold.t += dt; D.hold.need = need;
      if (D.hold.t >= need) {
        if (kind === 'plant') plantBomb(p); else defuseDone(p);
        D.hold.kind = null;
      }
    } else if (D.hold.kind) { D.hold.kind = null; D.hold.t = 0; }
    const bar = $('dfProgress');
    if (bar) {
      bar.classList.toggle('show', !!D.hold.kind);
      if (D.hold.kind) { bar.querySelector('i').style.width = Math.min(100, D.hold.t / D.hold.need * 100) + '%'; bar.querySelector('span').textContent = D.hold.kind === 'plant' ? 'PLANTANDO' : 'DESACTIVANDO'; }
    }
    // recoger bomba caída (T)
    if (p.team === 't' && D.bomb.dropped && !D.bomb.carrier && p.pos.distanceTo(D.bomb.pos) < 1.0) {
      p.hasBomb = true; D.bomb.carrier = p; D.bomb.dropped = false; if (D.bomb.mesh) { A.world.remove(D.bomb.mesh); D.bomb.mesh = null; } A.showFloating('Recogiste la bomba');
    }
  }
  function spectate() {
    const p = D.player; if (!p || p.alive) return;
    const mates = D.units.filter(u => u.alive && u.team === p.team && !u.isPlayer);
    const foe = D.units.filter(u => u.alive && u.team !== p.team && !u.isPlayer);
    const watch = mates[0] || foe[0];
    if (!watch) return;
    const cam = A.camera;
    const back = new THREE.Vector3(-Math.sin(watch.yaw), 0, -Math.cos(watch.yaw)).multiplyScalar(1.1);
    cam.position.set(watch.pos.x + back.x, watch.pos.y + 1.25, watch.pos.z + back.z);
    A.lookAtPlayer(watch.pos.x + Math.sin(watch.yaw) * 3, watch.pos.y + 0.9, watch.pos.z + Math.cos(watch.yaw) * 3);
  }

  // ---------------------------------------------------------------- bucle
  function update(dt) {
    if (!D.active) return;
    const now = performance.now();
    syncPlayerUnit();
    // estados
    if (D.state === 'freeze') {
      D.stateT -= dt;
      if (D.stateT <= 0) { D.state = 'live'; D.stateT = 0; A.setPlayerFrozen(false); banner('¡A POR ELLOS!', '', D.team); }
    } else if (D.state === 'live') {
      D.roundTime -= dt;
      if (D.roundTime <= 0) { roundEnd('ct', 'Se acabó el tiempo'); }
    } else if (D.state === 'planted') {
      D.bomb.timer -= dt;
      const m = D.bomb.mesh;
      if (m) {
        const f = Math.max(0.25, D.bomb.timer / CFG.bombTime);
        D.bomb.lightT += dt; const period = 0.35 + f * 0.9;
        const on = (D.bomb.lightT % period) < 0.12;
        m.userData.led.visible = on; m.userData.light.intensity = on ? 3 : 0;
      }
      if (D.bomb.timer <= 0) { explode(); }
    } else if (D.state === 'end') {
      D.stateT -= dt;
      if (D.stateT <= 0 && !D.matchOver) { nextRound(false); }
    }
    for (const u of D.units) if (!u.isPlayer) updateBot(u, dt, now);
    separate();
    chickens.update(dt, D.nav, D.player ? D.player.pos : null);
    updatePlayerHold(dt);
    spectate();
    // trazadoras
    for (let i = D.tracers.length - 1; i >= 0; i--) {
      const t = D.tracers[i]; t.t -= dt;
      if (t.t <= 0) { A.scene.remove(t.obj); if (!t.shared && t.obj.geometry) t.obj.geometry.dispose(); t.obj.material.dispose(); D.tracers.splice(i, 1); continue; }
      const k = 1 - t.t / t.max;
      if (t.kind === 'tr') {
        const head = Math.min(t.dist, k * t.dist * 1.15), tail = Math.max(0, head - Math.min(3, t.dist));
        _td.copy(t.b).sub(t.a).normalize();
        t.obj.position.copy(t.a).addScaledVector(_td, (head + tail) / 2); t.obj.scale.z = Math.max(0.05, head - tail);
        t.obj.lookAt(_tp.copy(t.obj.position).add(_td)); t.obj.material.opacity = 1 - k * 0.6;
      } else { t.obj.material.opacity = 1 - k; t.obj.scale.setScalar(0.42 + k * 0.25); }
    }
    // humos caducados
    for (let i = D.smokes.length - 1; i >= 0; i--) if (now > D.smokes[i].until + 2500) { if (D.smokes[i].obj) A.world.remove(D.smokes[i].obj); D.smokes.splice(i, 1); }
    refreshHud();
  }

  // ---------------------------------------------------------------- HUD
  let hudAcc = 0, lastKey = '';
  function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
  function refreshHud(force) {
    const p = D.player; if (!p) return;
    const t = D.state === 'freeze' ? D.stateT : D.state === 'planted' ? D.bomb.timer : D.state === 'live' ? D.roundTime : 0;
    const key = [D.score.ct, D.score.t, Math.ceil(t), alive('ct').length, alive('t').length, Math.ceil(p.hp), D.state, D.bomb.planted, p.money, D.round].join('|');
    if (!force && key === lastKey) return; lastKey = key;
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set('dfScoreCT', D.score.ct); set('dfScoreT', D.score.t);
    set('dfTimer', D.state === 'freeze' ? fmt(t) : fmt(t));
    const tm = $('dfTimer'); if (tm) { tm.className = D.bomb.planted ? 'bomb' : D.state === 'freeze' ? 'freeze' : (t < 10 && D.state === 'live' ? 'low' : ''); }
    set('dfRound', D.state === 'freeze' ? 'TIEMPO DE COMPRA' : D.bomb.planted ? 'BOMBA PLANTADA' : 'RONDA ' + D.round);
    const pips = (team, id) => { const e = $(id); if (!e) return; e.innerHTML = D.units.filter(u => u.team === team).map(u => '<i class="' + (u.alive ? 'on' : '') + (u.isPlayer ? ' me' : '') + '"></i>').join(''); };
    pips('ct', 'dfPipsCT'); pips('t', 'dfPipsT');
    set('dfHealthNum', Math.max(0, Math.ceil(p.hp)));
    const hb = $('dfHealthBar'); if (hb) { hb.style.width = Math.max(0, p.hp) + '%'; hb.className = p.hp < 30 ? 'low' : ''; }
    set('dfMoney', '$' + p.money);
    const bs = $('dfBombInfo'); if (bs) bs.textContent = p.hasBomb ? '💣 Llevas la bomba' : (D.bomb.dropped ? '💣 Bomba en el suelo' : '');
  }
  function renderScoreboard() {
    const el = $('dfScoreboard'); if (!el) return;
    const row = u => '<tr class="' + (u.alive ? '' : 'dead') + (u.isPlayer ? ' me' : '') + '"><td>' + u.name + '</td><td>' + u.kills + '</td><td>' + u.deaths + '</td><td>' + (u.team === D.team ? '$' + u.money : '') + '</td></tr>';
    const tbl = team => '<div class="team ' + team + '"><h3>' + TEAM_BADGE[team] + (team === 'ct' ? 'ANTITERRORISTAS' : 'TERRORISTAS') + '<em>' + D.score[team] + '</em></h3><table><tr><th>Jugador</th><th>K</th><th>M</th><th>$</th></tr>' + D.units.filter(u => u.team === team).sort((a, b) => b.kills - a.kills).map(row).join('') + '</table></div>';
    el.innerHTML = tbl('ct') + tbl('t');
  }

  // ---------------------------------------------------------------- balas del jugador contra bots
  const _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();
  function segPointDist(a, b, p) { const ab = _p1.copy(b).sub(a); const L2 = ab.lengthSq(); const t = L2 > 0 ? THREE.MathUtils.clamp(_p2.copy(p).sub(a).dot(ab) / L2, 0, 1) : 0; return { d: _p2.copy(a).addScaledVector(ab, t).distanceTo(p), t }; }
  // devuelve true si la bala impactó (y debe eliminarse). Daño según arma.
  function bulletHit(prev, pos, bullet) {
    if (!D.active || D.state === 'freeze') return false;
    const p = D.player; if (!p || !p.alive) return false;
    let best = null, bt = 2;
    for (const u of D.units) {
      if (!u.alive || u.team === p.team || u.isPlayer) continue;
      // cabeza (esfera) y cuerpo (cápsula vertical)
      const hc = tmpV.set(u.pos.x, u.pos.y + 0.99, u.pos.z);
      const rh = segPointDist(prev, pos, hc);
      if (rh.d < 0.15) { if (rh.t < bt) { bt = rh.t; best = { u, head: true, t: rh.t }; } continue; }
      // cuerpo: distancia al eje vertical (xz) en el punto más cercano
      const ab = _p1.copy(pos).sub(prev);
      for (let k = 0; k <= 4; k++) {
        const tt = k / 4; const x = prev.x + ab.x * tt, y = prev.y + ab.y * tt, z = prev.z + ab.z * tt;
        if (y < u.pos.y + 0.05 || y > u.pos.y + 0.9) continue;
        if ((x - u.pos.x) ** 2 + (z - u.pos.z) ** 2 < 0.27 * 0.27) { if (tt < bt) { bt = tt; best = { u, head: false, t: tt }; } break; }
      }
    }
    if (!best) return false;
    // ¿hay pared antes del impacto?
    const hp = new THREE.Vector3().copy(prev).lerp(pos, best.t);
    if (!losClear(prev, hp)) return false;
    const w = bullet.weapon || 'ak';
    const st = WSTAT[w] || WSTAT.ak;
    const dmg = Math.round(st.dmg * (best.head ? (HEAD_MULT[w] || 4) : 1));
    A.hitFeedback(hp, best.head);
    damageUnit(best.u, dmg, p, best.head, w);
    return true;
  }
  function meleeHit(origin, dir, range) {
    if (!D.active || !D.player || !D.player.alive) return false;
    let hit = false;
    for (const u of D.units) {
      if (!u.alive || u.team === D.player.team || u.isPlayer) continue;
      const to = tmpV.set(u.pos.x - origin.x, u.pos.y + 0.55 - origin.y, u.pos.z - origin.z); const d = to.length();
      if (d > range) continue;
      if (to.normalize().dot(dir) < 0.7) continue;
      A.hitFeedback(tmpV2.set(u.pos.x, u.pos.y + 0.6, u.pos.z), false);
      damageUnit(u, WSTAT.knife.dmg, D.player, false, 'knife'); hit = true;
    }
    return hit;
  }
  // explosión / fuego de granadas
  function areaDamage(pos, radius, maxDmg, attacker, weapon) {
    for (const u of D.units) {
      if (!u.alive) continue;
      const c = u.isPlayer ? tmpV.set(u.pos.x, u.pos.y + 0.7, u.pos.z) : tmpV.set(u.pos.x, u.pos.y + 0.6, u.pos.z);
      const d = c.distanceTo(pos); if (d > radius) continue;
      if (!losClear(pos, c)) continue;
      const dmg = Math.round(maxDmg * (1 - d / radius));
      if (dmg > 0) damageUnit(u, dmg, attacker || null, false, weapon);
    }
  }
  function flashArea(pos, attacker) {
    const now = performance.now();
    for (const u of D.units) {
      if (!u.alive) continue;
      const e = u.isPlayer ? new THREE.Vector3(u.pos.x, u.pos.y + A.eyeHeight(), u.pos.z) : new THREE.Vector3(u.pos.x, u.pos.y + 0.98, u.pos.z);
      const d = e.distanceTo(pos); if (d > 22) continue;
      if (!losClear(pos, e)) continue;
      if (u.isPlayer) {
        // cuánto mira hacia la flash
        const fwd = new THREE.Vector3(); A.camera.getWorldDirection(fwd);
        const to = pos.clone().sub(e).normalize();
        const facing = fwd.dot(to);
        const dur = Math.max(0.6, 4.2 * (1 - d / 22)) * (facing > 0 ? (0.5 + facing * 0.5) : 0.35);
        A.flashScreen(dur);
      } else {
        u.flashedUntil = now + Math.max(0.8, 3.8 * (1 - d / 22)) * 1000; u.target = null;
      }
    }
  }
  function registerSmoke(pos, r, ms, obj) { D.smokes.push({ pos: pos.clone(), r, until: performance.now() + ms, obj }); }

  // ---------------------------------------------------------------- radar
  function drawRadar(ctx, mapX, mapY, s) {
    if (!D.active) return;
    const now = performance.now();
    for (const k of ['A', 'B']) { const z = D.zones[k]; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,176,32,0.95)'; ctx.fillText(k, mapX(z.x), mapY(z.z)); ctx.strokeStyle = 'rgba(255,176,32,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mapX(z.x), mapY(z.z), z.r * s, 0, Math.PI * 2); ctx.stroke(); }
    for (const u of D.units) {
      if (u.isPlayer) continue;
      const mate = u.team === D.team;
      if (!u.alive) { if (mate) { ctx.fillStyle = 'rgba(160,160,160,0.7)'; ctx.fillRect(mapX(u.pos.x) - 3, mapY(u.pos.z) - 3, 6, 6); } continue; }
      if (!mate && now - u.spotted > 1500) continue;
      ctx.fillStyle = mate ? '#66ccff' : '#ff4a3a'; ctx.beginPath(); ctx.arc(mapX(u.pos.x), mapY(u.pos.z), 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    }
    const b = D.bomb;
    if (b.planted || b.dropped) { ctx.fillStyle = b.planted ? '#ff3030' : '#ffd24a'; ctx.beginPath(); ctx.arc(mapX(b.pos.x), mapY(b.pos.z), 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); }
  }

  // ---------------------------------------------------------------- API pública
  return {
    D, startMatch, endMatch, update, bulletHit, meleeHit, areaDamage, flashArea, registerSmoke, drawRadar,
    renderScoreboard, smokeBlocks,
    get active() { return D.active; },
    get playerDead() { return !!(D.player && !D.player.alive); },
    get frozen() { return D.active && D.state === 'freeze'; },
    get team() { return D.team; },
    get state() { return D.state; },
    get zones() { return D.zones; },
    get units() { return D.units; },
    get player() { return D.player; },
    canBuy() {
      if (!D.active) return true;
      if (!D.player || !D.player.alive) return false;
      const z = D.zones[D.team];
      const inZone = Math.hypot(D.player.pos.x - z.x, D.player.pos.z - z.z) <= z.r * 1.8;
      const time = D.state === 'freeze' || (D.state === 'live' && (CFG.roundTime - D.roundTime) < CFG.buyAfterStart);
      return inZone && time;
    },
    buyReason() {
      if (!D.player.alive) return 'Estás muerto';
      const z = D.zones[D.team]; const inZone = Math.hypot(D.player.pos.x - z.x, D.player.pos.z - z.z) <= z.r * 1.8;
      if (!inZone) return 'Solo puedes comprar en tu zona de spawn';
      return 'El tiempo de compra terminó';
    },
    setHasKit(v) { D.hasKit = v; },
    get hasKit() { return D.hasKit; },
    teamAllows(w) { if (!D.active) return true; if (w === 'ak') return D.team === 't'; if (w === 'm4') return D.team === 'ct'; return true; },
    cfg: CFG,
    getSites() { return D.zones ? { A: D.zones.A, B: D.zones.B, t: D.zones.t, ct: D.zones.ct } : null; }
  };
}
