// Audio del juego. Solo suenan: disparos de las armas (recortados de "TODAS LAS ARMAS DE CSGO CON SUS SONIDOS.mp3", 3 variantes por arma
// en assets/audio/armas), pasos y aterrizaje, granadas (pin, lanzamiento, rebote y explosiones) y menú (clics). Todo lo demás está silenciado.
// La interfaz (SFX.play, SFX.at, SFX.loop...) se mantiene para que el resto del código no cambie: un nombre sin sonido simplemente no suena.
const ARMAS = 'assets/audio/armas/', EFECTOS = 'assets/audio/efectos/';
const WEAPONS = ['ak', 'm4', 'awp', 'deagle', 'five', 'p90', 'smg', 'shotgun', 'shorty', 'm4b', 'vandal', 'vss', 'negev'];
// nombre -> { dir, n variantes, v volumen }
const LIB = {};
for (const w of WEAPONS) LIB[w] = { dir: ARMAS, n: 3, v: 1 };
Object.assign(LIB, {
  awp: { dir: ARMAS, n: 3, v: 1.0 }, vss: { dir: ARMAS, n: 3, v: 0.7 }, m4b: { dir: ARMAS, n: 3, v: 0.7 }, smg: { dir: ARMAS, n: 3, v: 0.8 }, five: { dir: ARMAS, n: 3, v: 0.8 },
  deagle: { dir: ARMAS, n: 3, v: 0.95 }, negev: { dir: ARMAS, n: 3, v: 0.9 },
  step: { dir: EFECTOS, n: 3, v: 0.3 }, step_grass: { dir: EFECTOS, n: 3, v: 0.28 }, step_stone: { dir: EFECTOS, n: 3, v: 0.32 }, step_metal: { dir: EFECTOS, n: 3, v: 0.3 },
  land: { dir: EFECTOS, n: 1, v: 0.4 }, reload_out: { dir: EFECTOS, n: 1, v: 0.8 }, reload_in: { dir: EFECTOS, n: 1, v: 0.7 },
  ui: { dir: EFECTOS, n: 1, v: 0.5 }, buy: { dir: EFECTOS, n: 1, v: 0.6 },
  grenade_pin: { dir: EFECTOS, n: 1, v: 0.7 }, grenade_throw: { dir: EFECTOS, n: 1, v: 0.6 }, grenade_bounce: { dir: EFECTOS, n: 1, v: 0.5 },
  he: { dir: EFECTOS, n: 1, v: 1.0 }, flash: { dir: EFECTOS, n: 1, v: 0.8 }, smoke: { dir: EFECTOS, n: 1, v: 0.8 }, molotov: { dir: EFECTOS, n: 1, v: 0.85 },
});
const ALIAS = { rifle: 'ak' };                           // nombres genéricos que usa el juego
let ctx = null, master = null, wanted = false;
const bufs = {};                                         // nombre -> [AudioBuffer]
const last = {};                                         // última variante usada (no se repite seguida)
let lis = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  return ctx;
}
async function loadSound(name) {
  if (bufs[name]) return;
  bufs[name] = [];
  const d = LIB[name]; if (!d) return;
  for (let i = 1; i <= d.n; i++) {
    try {
      const ab = await (await fetch(d.dir + name + '_' + i + '.ogg')).arrayBuffer();
      bufs[name].push(await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)));
    } catch (e) { /* variante faltante: se usan las demás */ }
  }
}
function start(name, o = {}) {
  const w = ALIAS[name] || name; const list = bufs[w];
  if (!ctx || !list || !list.length) return null;
  let i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === last[w]) i = (i + 1) % list.length; last[w] = i;
  const src = ctx.createBufferSource(); src.buffer = list[i];
  src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.06;
  const g = ctx.createGain(); let vol = (o.vol == null ? 1 : o.vol) * (LIB[w] ? LIB[w].v : 1);
  let node = src;
  if (o.pos) {                                           // sonido en el espacio: se atenúa con la distancia y se panea según de qué lado está
    const dx = o.pos.x - lis.x, dz = o.pos.z - lis.z, d = Math.hypot(dx, o.pos.y - lis.y, dz);
    vol *= 1 / (1 + Math.max(0, d - (o.ref || 3)) * 0.07);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, (dx * lis.rx + dz * lis.rz) / Math.max(d, 1) * 0.9)); src.connect(p); node = p; }
    if (o.lowpass) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lowpass; node.connect(f); node = f; }
  }
  g.gain.value = Math.min(1.5, vol);
  node.connect(g); g.connect(master); src.start();
  return src;
}

export const SFX = {
  // se llama desde un gesto del usuario: crea el contexto y descarga los sonidos
  init() {
    if (wanted) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    wanted = true; if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    Object.keys(LIB).forEach(loadSound);
  },
  preload() { return Promise.resolve(); },
  loadAll() { return wanted ? Promise.all(Object.keys(LIB).map(loadSound)) : Promise.resolve(); },
  play(name, o) { return wanted ? start(name, o || {}) : null; },
  at(name, pos, o = {}) { return wanted && pos ? start(name, Object.assign({ pos }, o)) : null; },
  loop() { return { set() {}, stop() {} }; },
  listener(camera) {
    if (!camera) return;
    camera.updateMatrixWorld(); const e = camera.matrixWorld.elements;
    lis.x = e[12]; lis.y = e[13]; lis.z = e[14]; lis.rx = e[0]; lis.rz = e[2];
  },
  setVolume(v = 0.8) { if (master) master.gain.value = v; },
  duck() {},
  get ctx() { return null; },                            // la cinemática no usa este contexto (va silenciada)
  get ready() { return !!ctx; },
  surface: 'step',
  bus() { return null; },
  has(name) { return !!LIB[ALIAS[name] || name]; },
};
window.SFX = SFX;

// menú: clic en botones, pestañas, tarjetas de modo/mapa/bando y selectores
document.addEventListener('click', (e) => {
  if (!wanted) return;
  if (e.target.closest && e.target.closest('button, .fafi16-tab-btn, .mm-card, .map-pick, .team-card, .q-btn, .box-buy, .btn-buy, .skin-card, .loot-box, .lo-card')) SFX.play('ui');
}, true);
