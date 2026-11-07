// Audio del juego: solo los disparos de las armas (recortados de "TODAS LAS ARMAS DE CSGO CON SUS SONIDOS.mp3").
// Cada arma tiene 3 variantes propias en assets/audio/armas (arma_1.ogg ... arma_3.ogg); no hay otros sonidos.
// La interfaz (SFX.play, SFX.at, SFX.loop...) se mantiene para que el resto del código no cambie: lo que no es un disparo no suena.
const BASE = 'assets/audio/armas/';
const WEAPONS = ['ak', 'm4', 'awp', 'deagle', 'five', 'p90', 'smg', 'shotgun', 'shorty', 'm4b', 'vandal', 'vss', 'negev'];
const ALIAS = { rifle: 'ak' };                           // nombres genéricos que usa el juego
const VOL = { awp: 1.0, deagle: 0.95, shotgun: 1.0, shorty: 1.0, negev: 0.9, vss: 0.7, m4b: 0.7, smg: 0.8, five: 0.8 };
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
async function loadWeapon(w) {
  if (bufs[w]) return;
  bufs[w] = [];
  for (let i = 1; i <= 3; i++) {
    try {
      const ab = await (await fetch(BASE + w + '_' + i + '.ogg')).arrayBuffer();
      bufs[w].push(await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)));
    } catch (e) { /* variante faltante: se usan las demás */ }
  }
}
function start(name, o = {}) {
  const w = ALIAS[name] || name; const list = bufs[w];
  if (!ctx || !list || !list.length) return null;
  let i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === last[w]) i = (i + 1) % list.length; last[w] = i;
  const src = ctx.createBufferSource(); src.buffer = list[i];
  src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.04;
  const g = ctx.createGain(); let vol = (o.vol == null ? 1 : o.vol) * (VOL[w] || 1);
  let node = src;
  if (o.pos) {                                           // sonido de un bot: se atenúa con la distancia y se panea según de qué lado está
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
  // se llama desde un gesto del usuario: crea el contexto y descarga los disparos
  init() {
    if (wanted) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    wanted = true; if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    WEAPONS.forEach(loadWeapon);
  },
  preload() { return Promise.resolve(); },
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
  has(name) { return WEAPONS.includes(ALIAS[name] || name); },
};
window.SFX = SFX;
