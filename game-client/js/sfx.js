// Sonido por muestras reales (mp3 en assets/audio/sfx, ver CREDITS.md).
// Un único AudioContext; cada sonido es una lista de variantes con variación de tono/volumen.
// Posicional: SFX.at(nombre, THREE.Vector3) usa un PannerNode y SFX.listener(camera) lo orienta cada frame.

const BASE = 'assets/audio/sfx/';

// nombre -> { f: archivos, v: volumen, r: [min,max] velocidad, bus, ... }
// slice: corta una muestra larga en golpes sueltos (pasos); seg: recorta [inicio,duración] de la muestra.
const AK = "armas/ak47.ogg", SKS = "armas/fusil_sks.wav", MOSIN = "armas/fusil_mosin.wav", CZ = "armas/pistola_cz.wav", SHOT = "armas/escopeta.wav";
const DEF = {
  // armas
  // disparos: grabaciones reales (OpenGameArt, ver CREDITS.md) recortadas por disparo: clips = [archivo, inicio, duración]
  ak:        { clips: [[AK, 0.25, 0.2], [AK, 0.44, 0.2], [AK, 0.63, 0.2], [AK, 0.81, 0.2], [AK, 5.73, 0.2], [AK, 5.91, 0.2]], v: 2.0, r: [0.96, 1.04], bus: "wep" },
  m4:        { clips: [[SKS, 3.61, 0.5], [SKS, 3.85, 0.5], [SKS, 4.18, 0.5], [SKS, 11.77, 0.5], [SKS, 12.7, 0.5], [SKS, 13.09, 0.5]], v: 1.9, r: [1.0, 1.12], bus: "wep" },
  awp:       { clips: [[MOSIN, 2.86, 3.0], [MOSIN, 8.83, 3.0]], v: 2.4, r: [0.78, 0.85], bus: "wep" },
  deagle:    { clips: [[CZ, 0.21, 0.4], [CZ, 2.81, 0.4], [CZ, 4.03, 0.4], [CZ, 5.52, 0.9]], v: 2.2, r: [0.72, 0.8], bus: "wep" },
  rifle:     { clips: [[SKS, 0.33, 1.3], [SKS, 2.28, 1.2], [SKS, 5.98, 1.5], [SKS, 9.7, 1.5], [MOSIN, 0.8, 0.85]], v: 1.7, r: [0.9, 1.15], bus: "wep" },
  shotgun:   { clips: [[SHOT, 0.12, 0.34], [SHOT, 0.44, 0.26]], v: 2.0, r: [0.85, 1.0], bus: "wep" },
  dry:       { f: ['impactos/sin_balas.wav'],     v: 0.75, r: [0.95, 1.05], bus: 'wep', seg: [0, 0.4] },
  reload_out:{ f: ['cargador_sale'],              v: 0.80, r: [0.92, 1.0],  bus: 'wep' },
  reload_in: { f: ['engranaje_rapido'],           v: 0.70, r: [1.0, 1.1],   bus: 'wep' },
  bolt:      { f: ['impactos/cerrojo_awp.wav'],  v: 0.9, r: [1.0, 1.1], bus: 'wep', seg: [3.95, 1.05] },
  draw:      { f: ['pistola_mov'],                v: 0.60, r: [0.9, 1.1],   bus: 'wep' },
  draw_knife:{ f: ['tajo_cota'],                  v: 0.35, r: [1.4, 1.6],   bus: 'wep', seg: [0, 0.5] },
  knife:     { f: ['tajo_cota'],                  v: 0.65, r: [1.1, 1.3],   bus: 'wep', seg: [0, 0.8] },
  knife_hit: { f: ['impacto_cuerpo', 'golpe_rapido'], v: 0.75, r: [1.1, 1.3], bus: 'wep', seg: [0, 0.7] },
  inspect:   { f: ['engranaje'],                  v: 0.45, r: [0.9, 1.0],   bus: 'wep' },
  // impactos: grabaciones reales (OpenGameArt, ver CREDITS.md)
  hit_flesh: { f: ['impactos/carne_bala1.wav', 'impactos/carne_bala2.wav', 'impactos/carne_bala3.wav'], v: 1.0, r: [0.92, 1.12], bus: 'wep', seg: [0, 0.55] },
  hit_head:  { f: ['impactos/carne_perfora.wav'], v: 1.1, r: [0.95, 1.1], bus: 'wep', seg: [0, 0.6] },
  hit_helmet:{ f: ['impactos/casco1.ogg', 'impactos/casco2.ogg', 'impactos/casco3.ogg', 'impactos/casco4.ogg', 'impactos/casco5.ogg'], v: 1.35, r: [1.15, 1.45], bus: 'wep' },
  pain:      { f: ['impactos/dolor1.wav', 'impactos/dolor2.wav', 'impactos/dolor3.wav'], v: 0.85, r: [0.95, 1.05], bus: 'wep' },
  death:     { f: ['impactos/muerte1.wav', 'impactos/muerte2.wav'], v: 0.95, r: [0.95, 1.05], bus: 'wep' },
  armor:     { f: ['impactos/chaleco.wav'], v: 0.8, r: [1.0, 1.0], bus: 'ui' },
  hit:       { f: ['click_duro'],                 v: 0.55, r: [1.5, 1.7],   bus: 'ui' },
  headshot:  { f: ['golpe_metal'],                v: 0.80, r: [1.2, 1.3],   bus: 'ui', seg: [0, 0.6] },
  hurt:      { f: ['golpe_armadura', 'impacto_cuerpo'], v: 0.75, r: [0.9, 1.0], bus: 'wep', seg: [0, 0.8] },
  kill:      { f: ['grito_esfuerzo', 'grito_pelea', 'grito_pelea2', 'grito_batalla'], v: 0.60, r: [0.85, 1.05], bus: 'wep', seg: [0, 1.2] },
  bulletwall:{ f: ['golpe_armadura'],             v: 0.30, r: [1.5, 2.0],   bus: 'wep', seg: [0, 0.4] },
  // granadas / bomba
  grenade_pin:{ f: ['engranaje_rapido'],          v: 0.55, r: [1.1, 1.2],   bus: 'wep' },
  grenade_throw:{ f: ['pistola_mov'],             v: 0.5,  r: [0.8, 0.9],   bus: 'wep' },
  grenade_bounce:{ f: ['golpe_metal'],            v: 0.35, r: [0.6, 0.75],  bus: 'wep', seg: [0, 0.4] },
  he:        { f: ['explosion_golpe', 'explosion_batalla', 'bomba_batalla'], v: 1.0, r: [0.95, 1.05], bus: 'wep', seg: [0, 3.5] },
  flash:     { f: ['bomba_densa'],                v: 0.60, r: [1.5, 1.7],   bus: 'wep', seg: [0, 1.2] },
  smoke:     { f: ['humo'],                       v: 0.75, r: [1.0, 1.0],   bus: 'wep', seg: [0, 4.0] },
  molotov:   { f: ['explosion_combustible'],      v: 0.75, r: [1.05, 1.2],  bus: 'wep', seg: [0, 2.5] },
  c4_plant:  { f: ['engranaje', 'engranaje_rapido'], v: 0.70, r: [0.8, 0.9], bus: 'wep' },
  c4_beep:   { f: ['pitido_radio'],               v: 0.75, r: [1.0, 1.0],   bus: 'wep', seg: [0, 0.22] },
  c4_defuse: { f: ['cerrojo'],                    v: 0.80, r: [0.95, 1.05], bus: 'wep' },
  c4_blast:  { f: ['explosion_masiva', 'explosion_campo'], v: 1.0, r: [0.85, 0.9], bus: 'wep', seg: [0, 6] },
  // entorno
  step:      { f: ['paso_camino'],                v: 0.28, r: [0.9, 1.1],   bus: 'foot', slice: 0.28 },
  step_grass:{ f: ['paso_hierba'],                v: 0.28, r: [0.9, 1.1],   bus: 'foot', slice: 0.28 },
  step_stone:{ f: ['paso_piedra'],                v: 0.30, r: [0.9, 1.1],   bus: 'foot', slice: 0.28 },
  step_metal:{ f: ['paso_tunel'],                 v: 0.30, r: [0.9, 1.1],   bus: 'foot', slice: 0.30 },
  land:      { f: ['paso_piedra'],                v: 0.45, r: [0.6, 0.7],   bus: 'foot', slice: 0.35 },
  door:      { f: ['puerta_metal'],               v: 0.6,  r: [1.0, 1.0],   bus: 'wep' },
  // ui
  buy:       { f: ['click_duro'],                 v: 0.5,  r: [0.9, 1.0],   bus: 'ui' },
  ui:        { f: ['click_duro'],                 v: 0.35, r: [1.3, 1.4],   bus: 'ui', seg: [0, 0.2] },
  round_start:{ f: ['cuerno_impacto'],            v: 0.55, r: [1.0, 1.0],   bus: 'ui', seg: [0, 3.5] },
  round_win: { f: ['cuerno_guerra'],              v: 0.50, r: [1.0, 1.0],   bus: 'ui', seg: [0, 4.0] },
  heartbeat: { f: ['latido'],                     v: 0.8,  r: [1.0, 1.0],   bus: 'ui' },
  // cinemática: mar, guerra, motores
  splash:    { f: ['chapoteo', 'agua_salpica', 'salto_agua'], v: 0.9, r: [0.85, 1.15], bus: 'wep', seg: [0, 2] },
  splash_big:{ f: ['salto_agua', 'cinematico_agua'], v: 1.0, r: [0.6, 0.8], bus: 'wep', seg: [0, 3] },
  boom_far:  { f: ['explosion_lejana', 'guerra_lejos', 'impacto_lejano', 'bomba_distante', 'guerra_lejana'], v: 0.9, r: [0.9, 1.1], bus: 'wep' },
  boom_mid:  { f: ['explosion_campo', 'explosion_batalla', 'explosion_roca', 'bomba_batalla', 'bomba_densa'], v: 1.0, r: [0.9, 1.1], bus: 'wep', seg: [0, 5] },
  boom_big:  { f: ['explosion_masiva', 'explosion_golpe', 'impacto_epico', 'explosion_eco'], v: 1.0, r: [0.85, 1.0], bus: 'wep', seg: [0, 6] },
  naval:     { f: ['bomba_cae', 'explosion_eco'], v: 1.0, r: [0.7, 0.8], bus: 'wep', seg: [0, 6] },
  war_mix:   { f: ['guerra_explosiones'],         v: 0.8,  r: [0.9, 1.1],   bus: 'wep' },
  thunder:   { f: ['trueno', 'trueno_cerca'],     v: 0.7,  r: [0.9, 1.1],   bus: 'wep' },
  yell:      { f: ['grito_batalla', 'grito_pelea', 'grito_esfuerzo', 'grito_pelea2'], v: 0.55, r: [0.85, 1.1], bus: 'wep', seg: [0, 1.5] },
  crowd:     { f: ['gritos_multitud'],            v: 0.6,  r: [1.0, 1.0],   bus: 'wep' },
  drums:     { f: ['tambores_guerra', 'tambores_guerra2'], v: 0.55, r: [1.0, 1.0], bus: 'mus' },
  horn:      { f: ['cuerno_guerra'],              v: 0.5,  r: [0.8, 0.8],   bus: 'mus' },
  horn_hit:  { f: ['cuerno_impacto'],             v: 0.7,  r: [0.8, 0.9],   bus: 'mus' },
};

for (const k in DEF) if (DEF[k].clips) DEF[k].f = [...new Set(DEF[k].clips.map(c => c[0]))];
for (const k of ['ak', 'm4', 'awp', 'deagle', 'rifle', 'shotgun']) DEF[k].rev = k === 'awp' ? 0.34 : 0.24;   // envío a la reverberación

// bucles de ambiente
const LOOPS = {
  sea:     { f: 'olas',          v: 0.45 },
  sea_bad: { f: 'mar_bravo',     v: 0.55 },
  wind:    { f: 'mar_viento',    v: 0.30 },
  coast:   { f: 'olas_costa',    v: 0.55 },
  boat:    { f: 'lancha',        v: 0.55 },
  ship:    { f: 'barco_madera',  v: 0.35 },
  tank:    { f: 'tanque',        v: 0.45 },
  planes:  { f: 'motor_helicoptero', v: 0.40 },
  march:   { f: 'ejercito_marcha', v: 0.45 },
  warzone: { f: 'guerra_explosiones', v: 0.0 },
};

let ctx = null, master = null, buses = {}, comp = null, reverb = null;
const bufs = {};            // archivo -> AudioBuffer
const pending = {};         // archivo -> Promise
const slices = {};          // archivo -> [{t, d}] golpes detectados
let vol = { master: 0.8, wep: 1, foot: 1, ui: 1, mus: 1 };
let wanted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
  master = ctx.createGain(); master.gain.value = vol.master;
  master.connect(comp); comp.connect(ctx.destination);
  for (const b of ['wep', 'foot', 'ui', 'mus']) { buses[b] = ctx.createGain(); buses[b].gain.value = vol[b]; buses[b].connect(master); }
  // reverberación sintética (cola de ruido que decae): da cuerpo y eco a los disparos como en exteriores
  try {
    const len = Math.floor(ctx.sampleRate * 1.4), imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const conv = ctx.createConvolver(); conv.buffer = imp; const wet = ctx.createGain(); wet.gain.value = 0.55;
    conv.connect(wet); wet.connect(buses.wep); reverb = conv;
  } catch (e) { reverb = null; }
  return ctx;
}

function load(file) {
  if (bufs[file]) return Promise.resolve(bufs[file]);
  if (pending[file]) return pending[file];
  const c = ensure(); if (!c) return Promise.resolve(null);
  pending[file] = fetch(/\.\w+$/.test(file) ? "assets/audio/" + file : BASE + file + ".mp3")
    .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(ab => new Promise((res, rej) => c.decodeAudioData(ab, res, rej)))
    .then(b => { bufs[file] = b; findHits(file, b); return b; })
    .catch(e => { console.warn('[sfx] no se pudo cargar', file, e); return null; });
  return pending[file];
}

// Detecta golpes (pasos) en una grabación larga: picos de energía separados.
function findHits(file, b) {
  const need = Object.values(DEF).some(d => d.slice && d.f.includes(file));
  if (!need) return;
  const x = b.getChannelData(0), sr = b.sampleRate, win = Math.floor(sr * 0.01);
  const env = [];
  for (let i = 0; i + win < x.length; i += win) { let s = 0; for (let j = 0; j < win; j++) s += x[i + j] * x[i + j]; env.push(Math.sqrt(s / win)); }
  let mx = 0; for (const e of env) if (e > mx) mx = e;
  const thr = mx * 0.30, hits = []; let last = -1e9;
  for (let i = 2; i < env.length - 2; i++) {
    const rising = env[i] > thr && env[i] > env[i - 1] * 1.6 && env[i] >= env[i + 1] * 0.8;
    if (rising && (i - last) * 0.01 > 0.22) { hits.push(Math.max(0, i * 0.01 - 0.02)); last = i; }
  }
  slices[file] = hits.length ? hits : [0];
}

const pick = a => a[(Math.random() * a.length) | 0];
const rr = ([a, b]) => a + Math.random() * (b - a);

function start(name, o = {}) {
  const d = DEF[name]; if (!d || !ctx) return null;
  if (ctx.state === 'suspended') ctx.resume();
  const clip = d.clips ? pick(d.clips) : null;
  const file = clip ? clip[0] : pick(d.f), b = bufs[file];
  if (!b) { load(file); return null; }
  const src = ctx.createBufferSource(); src.buffer = b;
  src.playbackRate.value = rr(d.r) * (o.rate || 1);
  let off = 0, dur;
  if (clip) { off = clip[1]; dur = clip[2]; }
  else if (d.slice) { const h = slices[file] || [0]; off = pick(h); dur = d.slice; }
  else if (d.seg) { off = d.seg[0]; dur = d.seg[1]; }
  const g = ctx.createGain();
  src.connect(g);                      // (faltaba esta conexión: los efectos puntuales no sonaban)
  const t0 = ctx.currentTime + (o.delay || 0);
  const level = d.v * (o.vol == null ? 1 : o.vol);
  g.gain.setValueAtTime(level, t0);
  let node = g;
  if (o.pos) {
    const p = ctx.createPanner();
    p.panningModel = 'equalpower'; p.distanceModel = 'inverse';
    p.refDistance = o.ref || 6; p.rolloffFactor = o.rolloff || 1.2; p.maxDistance = 400;
    if (p.positionX) { p.positionX.value = o.pos.x; p.positionY.value = o.pos.y; p.positionZ.value = o.pos.z; }
    else p.setPosition(o.pos.x, o.pos.y, o.pos.z);
    g.connect(p); node = p;
  } else if (o.pan) {
    const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); node = p;
  }
  if (o.lowpass) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lowpass; node.connect(f); node = f; }
  node.connect(buses[d.bus] || master);
  if (d.rev && reverb) { const s = ctx.createGain(); s.gain.value = d.rev; node.connect(s); s.connect(reverb); }
  if (dur) {
    const real = dur / src.playbackRate.value;
    g.gain.setValueAtTime(level, t0 + Math.max(0, real - 0.12));
    g.gain.linearRampToValueAtTime(0, t0 + real);
    src.start(t0, off, dur);
  } else src.start(t0, off);
  return src;
}

export const SFX = {
  // Llamar desde un gesto del usuario (clic): crea el contexto y precarga.
  init() {
    if (wanted) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    wanted = true; ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    // solo se precargan los sonidos esenciales; el resto se descodifica la primera vez que suena (ahorra cientos de MB de RAM)
    for (const n of ['ui', 'hit', 'step', 'dry', 'draw', 'reload_out', 'reload_in', 'ak', 'm4', 'awp', 'deagle', 'knife', 'hit_flesh', 'hit_head', 'hit_helmet', 'pain']) { const d = DEF[n]; if (d) d.f.forEach(f => load(f)); }
  },
  preload(names) { ensure(); for (const n of names) { const d = DEF[n]; if (d) d.f.forEach(f => load(f)); const l = LOOPS[n]; if (l) load(l.f); } return Promise.all([...(names || [])].flatMap(n => (DEF[n] ? DEF[n].f : LOOPS[n] ? [LOOPS[n].f] : []).map(f => load(f)))); },
  play(name, o) { if (!wanted) return null; return start(name, o); },
  // sonido en el espacio: atenúa por distancia y paneo por la orientación del listener
  at(name, pos, o = {}) { if (!wanted || !pos) return null; return start(name, Object.assign({ pos }, o)); },
  loop(name, o = {}) {
    if (!wanted) return null;
    const L = LOOPS[name]; if (!L || !ctx) return null;
    const b = bufs[L.f]; if (!b) { load(L.f); return null; }
    const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
    src.playbackRate.value = o.rate || 1;
    const g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(buses[o.bus || 'wep']);
    const lvl = (o.vol == null ? 1 : o.vol) * L.v;
    src.start(0, Math.random() * Math.max(0, b.duration - 1));
    g.gain.linearRampToValueAtTime(lvl, ctx.currentTime + (o.fade || 1.5));
    return {
      set(v, t = 0.4) { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(v * L.v, ctx.currentTime, t); },
      stop(t = 0.6) { try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(0, ctx.currentTime, t / 3); src.stop(ctx.currentTime + t + 0.2); } catch (_) {} },
    };
  },
  // orienta el oyente con la cámara
  listener(camera) {
    if (!ctx || !camera) return;
    const L = ctx.listener;
    camera.updateMatrixWorld();
    const e = camera.matrixWorld.elements;
    const px = e[12], py = e[13], pz = e[14];
    const fx = -e[8], fy = -e[9], fz = -e[10], ux = e[4], uy = e[5], uz = e[6];
    if (L.positionX) {
      L.positionX.value = px; L.positionY.value = py; L.positionZ.value = pz;
      L.forwardX.value = fx; L.forwardY.value = fy; L.forwardZ.value = fz;
      L.upX.value = ux; L.upY.value = uy; L.upZ.value = uz;
    } else { L.setPosition(px, py, pz); L.setOrientation(fx, fy, fz, ux, uy, uz); }
  },
  setVolume(master_ = 0.8) { vol.master = master_; if (master) master.gain.value = master_; },
  duck(level = 0.3, secs = 2) { if (!master) return; const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(vol.master * level, t, 0.05); master.gain.setTargetAtTime(vol.master, t + secs, 0.4); },
  // para que la cinemática comparta el contexto
  get ctx() { return ensure(); },
  get ready() { return !!ctx; },
  surface: "step",
  bus(n) { ensure(); return buses[n]; },
  has(name) { return !!DEF[name]; },
};
window.SFX = SFX;
