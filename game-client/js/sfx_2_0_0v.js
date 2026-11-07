// Audio del juego con el pack de sonidos del equipo (assets/audio/pack, lista en assets/audio/sonidos.json; se genera con herramientas/convertir-sonidos_2_0_0v.sh).
// Cada arma tiene su disparo, su recarga (cargador fuera / dentro / cierre) y su sonido al sacarla; también suenan cuchillo, impactos, granadas, bomba, menú y rondas.
// Los pasos son sonidos sintetizados (assets/audio/pasos) porque el pack no trae pasos.
// Un nombre sin sonido simplemente no suena. SFX.weapon (lo fija el juego) elige la variante por arma: reload_out -> reload_out_ak, draw -> draw_ak...
const PASOS = 'assets/audio/pasos/';
const PISTOLS = ['deagle', 'five'];
const WEAPON_VARIANTS = ['reload_out', 'reload_in', 'reload_end', 'draw'];
const LIB = {};                                          // nombre -> { v, files: [ruta] }
for (const [n, v] of [['step', 0.3], ['step_grass', 0.28], ['step_stone', 0.32], ['step_metal', 0.3]]) LIB[n] = { v, files: [1, 2, 3].map((i) => PASOS + n + '_' + i + '.ogg') };
let ctx = null, master = null, wanted = false, loading = null;
const bufs = {};                                         // nombre -> [AudioBuffer]
const last = {};
let lis = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  return ctx;
}
async function loadAll() {
  if (loading) return loading;
  loading = (async () => {
    try { const j = await (await fetch('assets/audio/sonidos.json')).json(); for (const k in j) LIB[k] = { v: j[k].v, files: j[k].f }; } catch (e) { console.warn('sonidos.json', e); }
    const names = Object.keys(LIB), queue = []; for (const n of names) bufs[n] = [];
    const worker = async () => { while (queue.length) { const [n, f] = queue.shift(); try { const ab = await (await fetch(f)).arrayBuffer(); bufs[n].push(await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej))); } catch (e) { /* variante faltante */ } } };
    for (const n of names) for (const f of LIB[n].files) queue.push([n, f]);
    await Promise.all([worker(), worker(), worker(), worker()]);
  })();
  return loading;
}
function resolve(name) {
  const w = SFX.weapon;
  if (WEAPON_VARIANTS.includes(name) && w) { const v = name + '_' + w; if (bufs[v] && bufs[v].length) return v; }
  if (name === 'dry' && PISTOLS.includes(w) && bufs.dry_pistol && bufs.dry_pistol.length) return 'dry_pistol';
  if (name === 'bolt') return w === 'awp' ? 'bolt_awp' : null;          // cerrojo: solo la AWP
  if (name === 'reload_end' && !w) return null;
  return name;
}
function start(name, o = {}) {
  const w = resolve(name), list = w && bufs[w];
  if (!ctx || !list || !list.length) return null;
  let i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === last[w]) i = (i + 1) % list.length; last[w] = i;
  const src = ctx.createBufferSource(); src.buffer = list[i];
  const g = ctx.createGain(); let vol = (o.vol == null ? 1 : o.vol) * (LIB[w] ? LIB[w].v : 1);
  let node = src;
  if (o.pos) {                                           // sonido en el espacio: se atenúa con la distancia y se panea según de qué lado está
    const dx = o.pos.x - lis.x, dz = o.pos.z - lis.z, d = Math.hypot(dx, o.pos.y - lis.y, dz);
    vol *= 1 / (1 + Math.max(0, d - (o.ref || 3)) * 0.07);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, (dx * lis.rx + dz * lis.rz) / Math.max(d, 1) * 0.9)); src.connect(p); node = p; }
    if (o.lowpass) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lowpass; node.connect(f); node = f; }
  }
  g.gain.value = Math.min(1.6, vol);
  node.connect(g); g.connect(master); src.start();
  return src;
}

export const SFX = {
  weapon: null,
  init() {
    if (wanted) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    wanted = true; if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    loadAll();
  },
  preload() { return Promise.resolve(); },
  loadAll() { return wanted ? loadAll() : Promise.resolve(); },
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
  has(name) { return !!(bufs[name] && bufs[name].length); },
};
window.SFX = SFX;

// menú: clic en botones, pestañas, tarjetas de modo/mapa, selectores y cajas; elegir bando suena distinto
document.addEventListener('click', (e) => {
  if (!wanted || !e.target.closest) return;
  if (e.target.closest('.team-card')) SFX.play('team');
  else if (e.target.closest('button, .fafi16-tab-btn, .mm-card, .map-pick, .q-btn, .box-buy, .btn-buy, .skin-card, .loot-box, .lo-card')) SFX.play('ui');
}, true);
