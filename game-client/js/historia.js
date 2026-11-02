// MODO HISTORIA · NIVEL 1 — "Desembarco de Normandía" (6 de junio de 1944, playa de Omaha).
// Es una secuencia de escenas (sin jugabilidad): cámara cinematográfica, música orquestal procedural (WebAudio),
// efectos de sonido reales (assets/audio/sfx, ver sfx.js) y narrador (locución masculina grabada en assets/historia/audio) con subtítulos.
// Barcos, aviones, soldados con esqueleto y fusiles son GLB reales (ver modelos.js y CREDITS.md); las lanchas LCVP, erizos checos,
// búnkeres y carros destruidos se construyen en código y los GLB (barcos, aviones, soldados) sustituyen a los procedurales en cuanto terminan de cargar.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SFX } from './sfx.js';
import { loadModels, fitModel, militarize, makeRiggedSoldier } from './modelos.js';

const DURATION = 124;

// ------------------------------------------------------------------ utilidades
let seed = 1234;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const R = (a, b) => a + (b - a) * rnd();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function paint(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;
}
// pieza lista para mezclar: geometría + color + transformación
function P(geo, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute('uv');
  paint(g, hex);
  const m = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(1, 1, 1));
  g.applyMatrix4(m); return g;
}
const merge = (parts) => mergeGeometries(parts, false);
const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const mesh = (geo) => { const m = new THREE.Mesh(geo, MAT); m.frustumCulled = false; return m; };
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CYL = (r1, r2, h, s = 10) => new THREE.CylinderGeometry(r1, r2, h, s);

// ------------------------------------------------------------------ modelos procedurales
// Soldado estadounidense del Día D: casco M1, chaqueta M1941, mochila, cartuchera y fusil M1 Garand. Mira hacia -Z.
function soldierGeo(variant) {
  const skin = [0xd9a98a, 0xc58f6d, 0xe2b99b, 0x9d6b4b][variant % 4];
  const jacket = [0x6e6c44, 0x676541, 0x72704a][variant % 3];
  const parts = [
    P(BOX(0.46, 0.6, 0.27), jacket, 0, 1.17, 0),                            // torso
    P(BOX(0.48, 0.07, 0.29), 0x4a4630, 0, 0.88, 0),                         // cinturón con cartucheras
    P(BOX(0.4, 0.42, 0.17), 0x58553a, 0, 1.2, 0.2),                         // mochila
    P(CYL(0.09, 0.09, 0.44, 8), 0x7a7452, 0, 1.45, 0.22, 0, 0, Math.PI / 2),  // manta enrollada
    P(new THREE.SphereGeometry(0.105, 8, 6), skin, 0, 1.59, -0.01),         // cabeza
    P(new THREE.SphereGeometry(0.155, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x55603a, 0, 1.63, 0),   // casco M1
    P(CYL(0.205, 0.205, 0.014, 14), 0x4d5733, 0, 1.635, 0),                 // ala del casco
    P(BOX(0.025, 0.1, 0.02), 0x30341f, 0.1, 1.58, -0.06),                   // barboquejo
    // brazos hacia el arma
    P(BOX(0.11, 0.5, 0.11), jacket, -0.3, 1.2, -0.12, -0.9, 0, 0),
    P(BOX(0.11, 0.46, 0.11), jacket, 0.3, 1.22, -0.1, -0.75, 0, 0),
    // M1 Garand: caja de madera, cañón metálico y mecanismo
    P(BOX(0.06, 0.1, 0.82), 0x77502c, 0.02, 1.2, -0.38),
    P(CYL(0.014, 0.014, 0.44, 6), 0x2c2d31, 0.02, 1.235, -0.9, Math.PI / 2, 0, 0),
    P(BOX(0.05, 0.05, 0.3), 0x34353a, 0.02, 1.26, -0.38),
    P(BOX(0.06, 0.16, 0.07), 0x6a4626, 0.02, 1.12, -0.05, 0.4, 0, 0)
  ];
  return merge(parts);
}
function legGeo(jacketHex) {
  return merge([P(BOX(0.17, 0.78, 0.2), 0x6b6745, 0, -0.39, 0), P(BOX(0.18, 0.12, 0.27), 0x2f2418, 0, -0.84, -0.03), P(BOX(0.19, 0.16, 0.21), 0x7b7552, 0, -0.18, 0)]);
}
const SOLDIER_GEOS = [0, 1, 2, 3].map(soldierGeo);
const LEG_GEO = legGeo();
function makeSoldier(variant = 0) {
  const g = new THREE.Group();
  const body = mesh(SOLDIER_GEOS[variant % 4]); g.add(body);
  const lL = mesh(LEG_GEO), lR = mesh(LEG_GEO);
  lL.position.set(-0.11, 0.86, 0); lR.position.set(0.11, 0.86, 0);
  g.add(lL, lR);
  g.userData = { body, lL, lR, ph: rnd() * 6.28, base: 0 };
  return g;
}
// pose: 'stand' | 'run' | 'wade' | 'down'
function poseSoldier(s, pose, t, sp = 1) {
  const u = s.userData;
  if (u.rig) {                                                             // soldado GLB con esqueleto: la animación la lleva el mixer
    u.rig.set(pose, pose === 'wade' ? 0.85 * sp : sp);
    s.rotation.x = pose === 'down' ? -Math.PI / 2 : 0; if (pose === 'down') s.position.y = Math.max(s.position.y, 0.05);
    return;
  }
  if (pose === 'run' || pose === 'wade') {
    const f = pose === 'wade' ? 5 : 8, a = pose === 'wade' ? 0.5 : 0.9, w = Math.sin(t * f * sp + u.ph);
    u.lL.rotation.x = w * a; u.lR.rotation.x = -w * a;
    u.body.position.y = Math.abs(Math.cos(t * f * sp + u.ph)) * 0.06; u.body.rotation.x = 0.12;
    s.rotation.x = 0;
  } else if (pose === 'down') {
    s.rotation.x = -Math.PI / 2; s.position.y = Math.max(s.position.y, 0.05); u.lL.rotation.x = u.lR.rotation.x = 0; u.body.rotation.x = 0;
  } else {
    u.lL.rotation.x = u.lR.rotation.x = 0; u.body.position.y = Math.sin(t * 1.5 + u.ph) * 0.015; u.body.rotation.x = 0; s.rotation.x = 0;
  }
}

// Hull genérico (barco de guerra): contorno visto desde arriba extruido; la proa queda hacia -Z.
function hullGeo(L, B, H, hex, bowK = 0.34) {
  const sh = new THREE.Shape();
  sh.moveTo(-B / 2, -L / 2); sh.lineTo(B / 2, -L / 2); sh.lineTo(B / 2, L * (0.5 - bowK)); sh.quadraticCurveTo(B * 0.42, L * 0.5 - L * 0.05, 0, L / 2); sh.quadraticCurveTo(-B * 0.42, L * 0.5 - L * 0.05, -B / 2, L * (0.5 - bowK)); sh.lineTo(-B / 2, -L / 2);
  const g = new THREE.ExtrudeGeometry(sh, { depth: H, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  return P(g, hex);
}
function destroyer(scale = 1, big = false) {
  const L = 115, B = 12.5, parts = [];
  parts.push(hullGeo(L, B, 2.4, 0x3a2e2c, 0.3));                          // obra viva (rojiza)
  const up = hullGeo(L, B + 0.3, 5.2, 0x7e878d, 0.3); parts.push(P(up, 0x7e878d, 0, 2.4, 0));
  const fz = (v) => v * L / 115;
  parts.push(P(BOX(7, 4.4, 11), 0x868f95, 0, 7.6, fz(-6)));               // puente
  parts.push(P(BOX(5.5, 2.4, 6), 0x7a8389, 0, 10.8, fz(-8)));
  parts.push(P(BOX(3, 1.4, 3), 0x6e777d, 0, 12.5, fz(-10)));
  parts.push(P(CYL(0.2, 0.2, 14, 6), 0x555b60, 0, 19, fz(-4)));           // mástil
  parts.push(P(BOX(5, 0.25, 0.25), 0x555b60, 0, 17, fz(-4)));
  parts.push(P(BOX(3.4, 1.4, 0.25), 0x62686d, 0, 20, fz(-5)));            // radar
  parts.push(P(CYL(1.5, 1.3, 6, 10), 0x4e5459, 0, 8.2, fz(16)));          // chimeneas
  parts.push(P(CYL(1.5, 1.3, 6, 10), 0x4e5459, 0, 8.2, fz(26)));
  const turrets = big ? [-30, -18, -6, 34, 46] : [-34, -23, 40, 50];
  turrets.forEach((z, i) => {
    const y = i < 2 || (big && i === 2) ? 7.8 : 7.8;
    parts.push(P(CYL(big ? 3.2 : 2.3, big ? 3.4 : 2.5, 2.0, 12), 0x727b81, 0, y, fz(z)));
    const dir = z < 0 ? -1 : 1;
    const nb = big ? 3 : 2;
    for (let k = 0; k < nb; k++) parts.push(P(CYL(0.28, 0.28, big ? 9 : 6, 6), 0x2d3033, (k - (nb - 1) / 2) * 0.9, y + 0.5, fz(z) - dir * (big ? 5.5 : 3.5), Math.PI / 2, 0, 0));
  });
  // franjas de invasión en la cubierta no se ven; bandera
  parts.push(P(BOX(0.05, 1.6, 2.2), 0xb8272d, 0, 21.8, fz(-4.6)));
  const g = mesh(merge(parts)); g.scale.setScalar(scale * (big ? 1.7 : 1));
  const root = new THREE.Group(); root.add(g);
  root.userData = { turretZ: turrets.map(z => fz(z) * scale * (big ? 1.7 : 1)), big, scale: scale * (big ? 1.7 : 1) };
  return root;
}
function transport() {
  const parts = [hullGeo(130, 18, 5, 0x30302f, 0.22), P(hullGeo(130, 18.2, 6, 0x5f6559, 0.22), 0x5f6559, 0, 5, 0),
    P(BOX(14, 9, 24), 0x7c7f73, 0, 15, 12), P(BOX(9, 6, 8), 0x84877b, 0, 23, 14), P(CYL(2, 1.7, 9, 10), 0x2e2e2e, 0, 22, 34)];
  for (let i = 0; i < 4; i++) { parts.push(P(BOX(0.5, 18, 0.5), 0x464646, 0, 20, -50 + i * 14)); parts.push(P(BOX(0.4, 0.4, 12), 0x464646, 0, 29, -45 + i * 14)); }
  return mesh(merge(parts));
}
// Lancha de desembarco LCVP (Higgins): suelo, costados, popa con cabina del timonel y rampa de proa articulada. Proa hacia -Z.
function makeLCVP() {
  const g = new THREE.Group();
  const hull = merge([
    P(BOX(3.2, 0.5, 11), 0x4b5246, 0, 0.25, 0),
    P(BOX(0.22, 1.5, 8.2), 0x606759, -1.5, 1.05, 0.9), P(BOX(0.22, 1.5, 8.2), 0x606759, 1.5, 1.05, 0.9),
    P(BOX(0.22, 1.5, 3.2), 0x606759, -1.18, 1.05, -4.2, 0, 0.42, 0), P(BOX(0.22, 1.5, 3.2), 0x606759, 1.18, 1.05, -4.2, 0, -0.42, 0),
    P(BOX(3.2, 1.5, 0.25), 0x575e51, 0, 1.0, 5.5),                      // popa
    P(BOX(1.2, 1.9, 1.3), 0x4f574a, 1.0, 1.3, 4.3), P(BOX(1.3, 0.12, 1.4), 0x3d4439, 1.0, 2.3, 4.3), // cabina
    P(BOX(0.12, 0.5, 0.12), 0x2d2f2c, 1.0, 2.6, 4.3), P(CYL(0.04, 0.04, 1.1, 6), 0x1f201f, 1.0, 2.7, 3.75, Math.PI / 2, 0, 0), // ametralladora .30
    P(BOX(0.8, 0.5, 0.9), 0x3d4439, -0.9, 0.7, 4.6),                    // motor
    P(BOX(3.0, 0.1, 9.6), 0x2f342c, 0, 0.55, 0.2)                       // cubierta interior oscura
  ]);
  g.add(mesh(hull));
  const ramp = new THREE.Group(); ramp.position.set(0, 0.9, -5.55);
  const rm = mesh(merge([P(BOX(2.9, 0.14, 2.4), 0x545b4d, 0, 0, -1.2), P(BOX(2.9, 0.06, 0.12), 0x333a2f, 0, 0.08, -2.35)])); ramp.add(rm); g.add(ramp);
  ramp.rotation.x = Math.PI / 2 - 0.02;                                   // cerrada (vertical)
  g.userData = { ramp, crew: [] };
  return g;
}
function c47() {
  const stripe = (z, y = 0.1) => [P(BOX(29.5, 0.1, 0.55), 0xf2f2ee, 0, y, z), P(BOX(29.5, 0.1, 0.55), 0x16161a, 0, y, z - 0.55), P(BOX(29.5, 0.1, 0.55), 0xf2f2ee, 0, y, z - 1.1)];
  const parts = [
    P(CYL(1.25, 1.1, 19, 10), 0x636a43, 0, 0, 0, Math.PI / 2, 0, 0), P(new THREE.ConeGeometry(1.25, 3.2, 10), 0x636a43, 0, 0, -11.2, -Math.PI / 2, 0, 0),
    P(BOX(29.5, 0.55, 4), 0x5c633f, 0, -0.3, -1.2), P(BOX(0.5, 3.2, 3.6), 0x5c633f, 0, 2, 8.6), P(BOX(8.5, 0.35, 2.4), 0x5c633f, 0, 0.3, 8.4),
    P(CYL(0.55, 0.55, 2.4, 8), 0x4a4f33, -6.5, -0.3, -3.4, Math.PI / 2, 0, 0), P(CYL(0.55, 0.55, 2.4, 8), 0x4a4f33, 6.5, -0.3, -3.4, Math.PI / 2, 0, 0),
    P(CYL(1.5, 1.5, 0.06, 12), 0x222222, -6.5, -0.3, -4.7, Math.PI / 2, 0, 0), P(CYL(1.5, 1.5, 0.06, 12), 0x222222, 6.5, -0.3, -4.7, Math.PI / 2, 0, 0),
    ...stripe(0.6), ...stripe(2.4, -0.28), P(BOX(2.6, 0.1, 0.5), 0xf2f2ee, 0, 1.35, 5.5)
  ];
  return mesh(merge(parts));
}
function hedgehog() {
  const b = (rx, ry, rz) => P(BOX(0.16, 2.3, 0.16), 0x453a30, 0, 0.9, 0, rx, ry, rz);
  return mesh(merge([b(0.6, 0, 0.5), b(-0.5, 1.0, 0.7), b(0.2, 2.1, -0.8), P(BOX(0.1, 0.1, 1.8), 0x2f2823, 0, 0.9, 0, 0, 0.4, 0)]));
}
function bunker() {
  const g = merge([P(BOX(11, 4.2, 8), 0x8d8b82, 0, 2.1, 0), P(BOX(11.6, 0.6, 8.6), 0x7e7c74, 0, 4.4, 0), P(BOX(5, 0.9, 0.3), 0x15171a, 0, 3.3, 4.02), P(BOX(2.2, 0.6, 3), 0x72706a, -3.5, 4.9, 1)]);
  return mesh(g);
}
function wreckTank() {
  return mesh(merge([P(BOX(3.2, 1.0, 6), 0x3a3a34, 0, 0.9, 0), P(BOX(2.2, 0.9, 2.8), 0x33332e, 0, 1.8, 0.2), P(CYL(0.12, 0.12, 3.4, 6), 0x222222, 0, 1.9, -2.2, Math.PI / 2, 0, 0), P(BOX(0.7, 0.55, 6.4), 0x2b2b27, -1.7, 0.5, 0), P(BOX(0.7, 0.55, 6.4), 0x2b2b27, 1.7, 0.5, 0)]));
}
function stake() { return mesh(merge([P(CYL(0.07, 0.09, 2.6, 5), 0x4b3a28, 0, 0.7, 0, 0.3, 0, 0), P(CYL(0.12, 0.12, 0.35, 6), 0x2b2b2b, 0, 1.9, 0.4)])); }

// ------------------------------------------------------------------ texturas de efectos
function softTex(rgba0, rgba1) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, rgba0); gr.addColorStop(1, rgba1);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

// ------------------------------------------------------------------ audio procedural
function createAudio() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  const ac = new AC(); const A = { ac };
  const master = ac.createGain(); master.gain.value = 0.9;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ac.destination);
  const len = ac.sampleRate * 2.8, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
  const conv = ac.createConvolver(); conv.buffer = ir; const wet = ac.createGain(); wet.gain.value = 0.38; conv.connect(wet); wet.connect(master);
  const music = ac.createGain(); music.gain.value = 0.55; music.connect(master); music.connect(conv);
  const sfx = ac.createGain(); sfx.gain.value = 0.85; sfx.connect(master); const sfxRev = ac.createGain(); sfxRev.gain.value = 0.35; sfx.connect(sfxRev); sfxRev.connect(conv);
  const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  A.master = master; A.music = music; A.sfx = sfx;
  const noise = (t0, dur, type, freq, q, vol, env = 'decay', dest = sfx, pan = 0) => {
    const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0);
    if (env === 'decay') { g.gain.linearRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
    else { g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t0 + dur); }
    let last = g; s.connect(f); f.connect(g);
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
    last.connect(dest); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  };
  const tone = (t0, dur, f0, f1, type, vol, dest = sfx) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
  };
  A.boom = (vol = 0.9, big = false, pan = 0) => { const t = ac.currentTime; noise(t, big ? 2.6 : 1.5, 'lowpass', big ? 300 : 500, 0.7, vol, 'decay', sfx, pan); tone(t, big ? 1.4 : 0.8, big ? 70 : 90, 22, 'sine', vol * 0.9); noise(t, 0.12, 'highpass', 1500, 0.5, vol * 0.4); };
  A.splash = (vol = 0.4, pan = 0) => { const t = ac.currentTime; noise(t, 0.9, 'bandpass', 700, 0.6, vol, 'decay', sfx, pan); };
  A.whistle = (vol = 0.12) => { const t = ac.currentTime; tone(t, 1.0, 2400, 700, 'sine', vol); };
  A.gun = (n = 6, vol = 0.22, pan = 0) => { const t = ac.currentTime; for (let i = 0; i < n; i++) noise(t + i * (0.055 + Math.random() * 0.03), 0.07, 'highpass', 1800, 0.8, vol, 'decay', sfx, pan); };
  A.rifle = (vol = 0.2, pan = 0) => { const t = ac.currentTime; noise(t, 0.35, 'bandpass', 1400, 0.7, vol, 'decay', sfx, pan); };
  // continuos: mar, motores, aviones
  const loopNoise = (type, freq, vol) => { const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ac.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(sfx); s.start(); return { g, f, vol }; };
  A.sea = loopNoise('lowpass', 420, 0.5); A.surf = loopNoise('bandpass', 900, 0.3);
  { const lfo = ac.createOscillator(); lfo.frequency.value = 0.11; const lg = ac.createGain(); lg.gain.value = 140; lfo.connect(lg); lg.connect(A.sea.f.frequency); lfo.start(); }
  const eng = ac.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 46; const ef = ac.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 160; const eg = ac.createGain(); eg.gain.value = 0; eng.connect(ef); ef.connect(eg); eg.connect(sfx); eng.start(); A.engine = eg;
  A.planes = (t0, dur) => { for (const [f, p] of [[88, -0.4], [93, 0.4], [176, 0]]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.07, t0 + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t0 + dur); o.connect(lp); lp.connect(g); if (ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.setValueAtTime(p - 0.6, t0); pn.pan.linearRampToValueAtTime(p + 0.6, t0 + dur); g.connect(pn); pn.connect(sfx); } else g.connect(sfx); o.start(t0); o.stop(t0 + dur + 0.1); } };
  // ---- música (Re menor): colchón de cuerdas, timbales, caja de marcha, metales y arpegio ----
  const CH = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]];   // Dm, Bb, Gm, A (MIDI)
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const BAR = 4.2;
  const inten = (t) => { const k = [[0, .2], [14, .35], [30, .5], [46, .66], [60, .86], [70, 1], [90, .9], [104, .6], [114, .35], [124, .1]]; for (let i = 1; i < k.length; i++) if (t < k[i][0]) return lerp(k[i - 1][1], k[i][1], (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])); return .1; };
  const pad = (t0, dur, midi, vol, lp, type = 'sawtooth') => { for (const d of [-7, 7]) { const o = ac.createOscillator(); o.type = type; o.frequency.value = hz(midi); o.detune.value = d; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t0 + dur * 1.12); o.connect(f); f.connect(g); g.connect(music); o.start(t0); o.stop(t0 + dur * 1.15); } };
  const timp = (t0, vol) => { tone(t0, 0.7, 92, 44, 'sine', vol, music); noise(t0, 0.09, 'lowpass', 400, 0.5, vol * 0.5, 'decay', music); };
  const snare = (t0, vol) => noise(t0, 0.09, 'bandpass', 2200, 0.8, vol, 'decay', music);
  let bar = 0, startT = 0, nextAt = 0, timer = null, ended = false;
  const scheduleBar = () => {
    const t0 = nextAt, tf = t0 - startT, I = inten(tf), c = CH[bar % 4], last = tf > 112;
    const chord = last ? [50, 57, 62, 66] : c;
    chord.forEach((m, i) => pad(t0, BAR, m, (0.05 + 0.04 * I) * (i === 0 ? 1.3 : 1), 380 + 1300 * I));
    pad(t0, BAR, chord[0] - 12, 0.1 + 0.05 * I, 260, 'triangle');
    if (I > 0.3) { timp(t0, 0.45 * I); if (I > 0.6) timp(t0 + BAR / 2, 0.38 * I); }
    if (I > 0.55) for (let i = 0; i < 16; i++) { if (I < 0.8 && i % 2) continue; snare(t0 + i * BAR / 16, 0.05 + 0.12 * I * (i % 4 === 0 ? 1.4 : 0.7) * (0.6 + Math.random() * 0.5)); }
    if (I > 0.45) for (let i = 0; i < 8; i++) { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(chord[1 + (i % 3)] + 24); const g = ac.createGain(); const tt = t0 + i * BAR / 8; g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.035 * I, tt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.45); o.connect(g); g.connect(music); o.start(tt); o.stop(tt + 0.5); }
    if (I > 0.75) pad(t0, BAR, chord[0], 0.07, 700, 'sawtooth');                                   // metales
    nextAt += BAR; bar++;
  };
  A.startMusic = () => { startT = ac.currentTime + 0.2; nextAt = startT; bar = 0; ended = false; for (let i = 0; i < 2; i++) scheduleBar(); timer = setInterval(() => { if (ended) return; while (nextAt < ac.currentTime + 2.2) scheduleBar(); }, 300);
    A.sea.g.gain.linearRampToValueAtTime(A.sea.vol, ac.currentTime + 3); A.surf.g.gain.linearRampToValueAtTime(0.0, ac.currentTime + 1); };
  A.setScene = (t) => { const now = ac.currentTime;
    A.engine.gain.linearRampToValueAtTime(t > 31 && t < 90 ? 0.09 : (t >= 90 ? 0.03 : 0), now + 1.5);
    A.surf.g.gain.linearRampToValueAtTime(t > 66 ? 0.28 : 0, now + 2); };
  A.stop = () => { ended = true; clearInterval(timer); const now = ac.currentTime; master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now); master.gain.linearRampToValueAtTime(0.0001, now + 1.2); setTimeout(() => { try { ac.close(); } catch (e) {} }, 1600); };
  A.resume = () => ac.resume && ac.resume();
  return A;
}

// ------------------------------------------------------------------ sonidos reales (muestras) sobre la música procedural
// La música de orquesta sigue siendo procedural; todos los efectos (cañones, explosiones, fusiles, mar, motores, gritos)
// son grabaciones de assets/audio/sfx reproducidas por sfx.js.
function withSamples(A) {
  if (!A) return A;
  SFX.init();
  SFX.preload(['boom_far', 'boom_mid', 'boom_big', 'naval', 'splash', 'splash_big', 'rifle', 'war_mix', 'yell', 'horn_hit', 'sea', 'sea_bad', 'wind', 'boat', 'ship', 'coast', 'planes', 'march']);
  const proc = { stop: A.stop, startMusic: A.startMusic };
  A.sea.vol = 0; A.surf.vol = 0;
  const pan = (p) => (p == null ? 0 : p);
  A.boom = (vol = 0.9, big = false, p = 0) => SFX.play(big ? (Math.random() < 0.5 ? 'naval' : 'boom_big') : (vol > 0.45 ? 'boom_mid' : 'boom_far'), { vol: Math.min(1, vol * 1.15), pan: pan(p) });
  A.splash = (vol = 0.4, p = 0) => SFX.play('splash', { vol: Math.min(1, vol * 2.2), pan: pan(p) });
  A.gun = (n = 6, vol = 0.22, p = 0) => { for (let i = 0; i < Math.min(n, 5); i++) SFX.play('rifle', { vol: Math.min(1, vol * 2.6), pan: pan(p), delay: i * (0.07 + Math.random() * 0.05), rate: 1 + Math.random() * 0.25 }); };
  A.rifle = (vol = 0.2, p = 0) => { SFX.play('rifle', { vol: Math.min(1, vol * 3), pan: pan(p), rate: 0.9 + Math.random() * 0.3 }); if (Math.random() < 0.1) SFX.play('yell', { vol: 0.4, pan: pan(p) }); };
  A.planes = (t0, dur) => { const l = SFX.loop('planes', { vol: 1, fade: dur * 0.4 }); if (l) setTimeout(() => l.stop(2.5), Math.max(0, dur * 1000 - 2500)); };
  const L = {}, want = {}; let timer = null, ended = false;
  const apply = () => { if (ended) return; for (const k in want) { if (!L[k]) L[k] = SFX.loop(k, { vol: 0, fade: 0.05 }); if (L[k]) L[k].set(want[k], 1.2); } };
  A.setScene = (t) => {
    want.sea = t < 66 ? 0.8 : 0.45; want.wind = 0.45;
    want.ship = t < 36 ? 0.9 : 0; want.boat = t > 31 && t < 90 ? 1 : 0;
    want.coast = t > 62 ? (t < 90 ? 0.7 : 1) : 0;
    want.planes = 0; delete want.planes;
    apply();
  };
  A.startMusic = () => { proc.startMusic(); A.setScene(0); timer = setInterval(apply, 1000); };
  A.stop = () => { ended = true; clearInterval(timer); for (const k in L) L[k] && L[k].stop(1.2); proc.stop(); };
  return A;
}

// ------------------------------------------------------------------ narración (síntesis de voz) + subtítulos
const LINES = [
  [2.5,  'Seis de junio de mil novecientos cuarenta y cuatro. Son las cinco y media de la madrugada, y el Canal de la Mancha está cubierto de acero.'],
  [11.5, 'Casi siete mil barcos. Once mil aviones. La mayor invasión anfibia de la historia: la Operación Overlord.'],
  [19.5, 'Desde los destructores, los cañones abren fuego contra las defensas alemanas del Muro del Atlántico.'],
  [27.5, 'Durante cuatro años, Europa ha esperado este día.'],
  [34.0, 'En las lanchas de desembarco, miles de jóvenes soldados guardan silencio. Muchos jamás han visto un combate. Algunos rezan.'],
  [45.0, 'El sargento da la última orden: cuando caiga la rampa, no os detengáis. Pase lo que pase, seguid avanzando.'],
  [54.0, 'Frente a ellos, la playa de Omaha. Obstáculos, minas y ametralladoras en lo alto de los acantilados.'],
  [63.0, 'El estruendo es ensordecedor. Los proyectiles levantan columnas de agua alrededor de las lanchas.'],
  [71.0, '¡Se abre la rampa! ¡Adelante!'],
  [76.5, 'Los primeros hombres saltan al agua, cargados con treinta kilos de equipo. Detrás de cada obstáculo, alguien busca refugio.'],
  [91.0, 'Pero no se detienen. Paso a paso cruzan la arena bajo el fuego, y la playa se llena de uniformes verdes.'],
  [101.5, 'Ese día, miles no volverían a casa. Pero la libertad de Europa comenzaba aquí, en las costas de Normandía.'],
  [113.5, 'Nivel uno completado.']
];
function createNarrator(subEl) {
  // Locutor: archivos narr_NN.wav (voz masculina "Microsoft Pablo", ver herramientas/generar-voz.ps1).
  // Si un archivo falta o el navegador lo rechaza, cae a la síntesis de voz del navegador y a subtítulos.
  const ss = window.speechSynthesis; let voice = null, hideT = null, cur = null;
  const pick = () => { const vs = ss ? ss.getVoices() : []; const es = vs.filter(v => /^es/i.test(v.lang)); voice = es.find(v => /jorge|pablo|diego|enrique|male|google espa/i.test(v.name)) || es.find(v => /es-ES/i.test(v.lang)) || es[0] || null; };
  if (ss) { pick(); ss.onvoiceschanged = pick; }
  const show = (txt) => { clearTimeout(hideT); subEl.textContent = txt; subEl.style.opacity = 1; };
  const hide = (d = 400) => { clearTimeout(hideT); hideT = setTimeout(() => { subEl.style.opacity = 0; }, d); };
  const synth = (txt) => {
    const est = Math.max(3, txt.length / 13);
    if (!ss || !voice) { show(txt); hide(est * 1000); return; }
    try {
      const u = new SpeechSynthesisUtterance(txt); u.voice = voice; u.lang = voice.lang; u.rate = 0.9; u.pitch = 0.7; u.volume = 1;
      u.onend = () => hide(500); u.onerror = () => hide(est * 1000);
      show(txt); ss.speak(u);
    } catch (e) { show(txt); hide(est * 1000); }
  };
  return {
    say(txt, idx) {
      this.stop(false);
      const a = new Audio('assets/historia/audio/narr_' + String(idx).padStart(2, '0') + '.wav');
      a.volume = 1; cur = a; show(txt);
      a.onended = () => { if (cur === a) hide(500); };
      a.onerror = () => { if (cur === a) { cur = null; synth(txt); } };
      const p = a.play(); if (p && p.catch) p.catch(() => { if (cur === a) { cur = null; synth(txt); } });
    },
    stop(clearSub = true) {
      if (cur) { try { cur.pause(); } catch (e) {} cur = null; }
      try { ss && ss.cancel(); } catch (e) {}
      if (clearSub) subEl.style.opacity = 0;
    }
  };
}

// ------------------------------------------------------------------ la película
export function playNormandy({ onEnd, seekTo } = {}) {
  seed = 1234;
  // ---- DOM ----
  const root = document.createElement('div');
  root.id = 'histOverlay';
  root.style.cssText = 'position:fixed;inset:0;z-index:60000;background:#000;overflow:hidden;font-family:Oswald,Rajdhani,Segoe UI,sans-serif;color:#fff;user-select:none';
  root.innerHTML = '<canvas id="histCanvas" style="position:absolute;inset:0;width:100%;height:100%"></canvas>'
    + '<div style="position:absolute;left:0;right:0;top:0;height:10.5%;background:#000"></div><div style="position:absolute;left:0;right:0;bottom:0;height:10.5%;background:#000"></div>'
    + '<div id="histCard" style="position:absolute;left:0;right:0;top:34%;text-align:center;opacity:0;transition:opacity 1.2s;text-shadow:0 2px 14px #000"></div>'
    + '<div id="histLoc" style="position:absolute;left:5%;bottom:17%;opacity:0;transition:opacity 1s;letter-spacing:4px;font-size:clamp(11px,1.5vw,18px);text-shadow:0 2px 8px #000;border-left:3px solid #d69f0f;padding-left:10px"></div>'
    + '<div id="histSub" style="position:absolute;left:8%;right:8%;bottom:12.5%;text-align:center;font-size:clamp(14px,2.1vw,26px);line-height:1.35;opacity:0;transition:opacity .35s;text-shadow:0 2px 6px #000,0 0 14px #000;font-family:Georgia,serif;font-style:italic"></div>'
    + '<div id="histFade" style="position:absolute;inset:0;background:#000;opacity:1;pointer-events:none"></div>'
    + '<button id="histSkip" style="position:absolute;right:2.5%;top:13%;background:rgba(0,0,0,.55);color:#e8d9a8;border:1px solid rgba(214,159,15,.6);padding:7px 16px;letter-spacing:3px;cursor:pointer;font-size:12px">SALTAR ▸</button>';
  document.body.appendChild(root);
  const $ = (id) => root.querySelector('#' + id);
  const cardEl = $('histCard'), locEl = $('histLoc'), subEl = $('histSub'), fadeEl = $('histFade');

  // ---- three ----
  const canvas = $('histCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 4000);
  scene.fog = new THREE.Fog(0x56627a, 200, 1900);
  const hemi = new THREE.HemisphereLight(0x9fb4d6, 0x3a3128, 0.5); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb070, 0.9); scene.add(sun, sun.target);
  addEventListener('resize', resize); resize();

  // cielo
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: V(0, 0.05, -1) }, sunCol: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top,mid,hor,sunCol,sunDir; void main(){ float h=max(vP.y,0.0); vec3 c=mix(hor,mid,smoothstep(0.0,0.22,h)); c=mix(c,top,smoothstep(0.18,0.8,h)); float s=max(dot(normalize(vP),normalize(sunDir)),0.0); c+=sunCol*(pow(s,8.0)*0.25+pow(s,120.0)*0.9); gl_FragColor=vec4(c,1.0); }'
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 12), skyMat); sky.frustumCulled = false; scene.add(sky);
  const SKY_KEYS = [
    [0,   0x080f20, 0x1a2640, 0x4a5670, 0xff9a5a, 0.15, 0.30, 4],
    [18,  0x182848, 0x44547a, 0xd89a6c, 0xffb070, 0.85, 0.45, 6],
    [50,  0x30487a, 0x7084a4, 0xcdb090, 0xffd2a0, 1.05, 0.55, 9],
    [100, 0x46679a, 0x98a8bc, 0xe2caa2, 0xfff0d0, 1.25, 0.62, 16],
    [124, 0x46679a, 0x98a8bc, 0xe2caa2, 0xfff0d0, 1.25, 0.62, 16]
  ];
  const _c1 = new THREE.Color(), _c2 = new THREE.Color();
  function updateSky(t) {
    let i = 1; while (i < SKY_KEYS.length - 1 && t > SKY_KEYS[i][0]) i++;
    const a = SKY_KEYS[i - 1], b = SKY_KEYS[i], k = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
    const mix = (n, tgt) => { _c1.setHex(a[n]); _c2.setHex(b[n]); tgt.copy(_c1).lerp(_c2, k); };
    mix(1, skyMat.uniforms.top.value); mix(2, skyMat.uniforms.mid.value); mix(3, skyMat.uniforms.hor.value); mix(4, skyMat.uniforms.sunCol.value);
    scene.fog.color.copy(skyMat.uniforms.hor.value).multiplyScalar(0.92);
    const el = lerp(a[7], b[7], k) * Math.PI / 180;
    const az = lerp(-0.8, 0.55, sstep(40, 62, t)); const dir = V(Math.cos(el) * 0.55, Math.sin(el), Math.cos(el) * az).normalize();
    skyMat.uniforms.sunDir.value.copy(dir); sun.position.copy(dir).multiplyScalar(500).add(cam.position); sun.target.position.copy(cam.position);
    sun.color.copy(skyMat.uniforms.sunCol.value); sun.intensity = lerp(a[5], b[5], k) * 1.35; hemi.intensity = Math.max(lerp(a[6], b[6], k), 0.5 + 0.55 * sstep(30, 55, t));
    hemi.color.copy(skyMat.uniforms.mid.value).lerp(new THREE.Color(0xffffff), 0.25);
  }

  // mar: olas en GPU con normales en el fragmento, reflejo del cielo (Fresnel), brillo del sol, color por profundidad y espuma
  const SEA_N = 240, seaGeo = new THREE.PlaneGeometry(1800, 1800, SEA_N, SEA_N); seaGeo.rotateX(-Math.PI / 2); seaGeo.translate(0, 0, 450);
  const calm = (z) => clamp((z + 5) / 90, 0.08, 1);
  const waveH = (x, z, t) => calm(z) * (0.9 * Math.sin(x * 0.045 + t * 0.9) + 0.65 * Math.sin(z * 0.06 - t * 1.15 + x * 0.01) + 0.3 * Math.sin((x + z) * 0.12 + t * 1.7));
  const raw = (hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);   // el cielo tampoco convierte: mismos valores en pantalla
  const WAVE_GLSL = 'float calm(float z){ return clamp((z+5.0)/90.0,0.08,1.0); }\n'
    + 'float wave(vec2 p,float t){ return calm(p.y)*(0.9*sin(p.x*0.045+t*0.9)+0.65*sin(p.y*0.06-t*1.15+p.x*0.01)+0.3*sin((p.x+p.y)*0.12+t*1.7)); }\n';
  const seaMat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uT: { value: 0 }, top: skyMat.uniforms.top, mid: skyMat.uniforms.mid, hor: skyMat.uniforms.hor, sunCol: skyMat.uniforms.sunCol, sunDir: skyMat.uniforms.sunDir,
      deep: { value: raw(0x17313f) }, shallowC: { value: raw(0x4f8a86) }, foamC: { value: raw(0xdfe9e6) }
    }]),
    vertexShader: 'uniform float uT; varying vec3 vW;\n' + WAVE_GLSL + '#include <fog_pars_vertex>\n'
      + 'void main(){ vec3 p=position; p.y=wave(p.xz,uT); vW=p; vec4 mvPosition=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: 'uniform float uT; uniform vec3 top,mid,hor,sunCol,sunDir,deep,shallowC,foamC; varying vec3 vW;\n' + WAVE_GLSL + '#include <fog_pars_fragment>\n'
      + 'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\n'
      + 'float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }\n'
      + 'vec3 skyCol(vec3 d){ float h=max(d.y,0.0); vec3 c=mix(hor,mid,smoothstep(0.0,0.22,h)); c=mix(c,top,smoothstep(0.18,0.8,h)); float s=max(dot(d,normalize(sunDir)),0.0); return c+sunCol*(pow(s,8.0)*0.25+pow(s,120.0)*0.9); }\n'
      + 'void main(){\n'
      + '  vec2 p=vW.xz; float e=0.7;\n'
      + '  vec2 g=vec2(wave(p+vec2(e,0.0),uT)-wave(p-vec2(e,0.0),uT), wave(p+vec2(0.0,e),uT)-wave(p-vec2(0.0,e),uT))/(2.0*e);\n'
      + '  float c=calm(p.y); vec2 r=vec2(0.0);\n'
      + '  for(int i=0;i<4;i++){ float fi=float(i); vec2 d=normalize(vec2(cos(fi*2.1+0.4),sin(fi*2.1+0.4))); float f=0.55+fi*0.63; r+=d*cos(dot(p,d)*f+uT*(1.1+fi*0.5)+fi*1.7)*f*0.022*c; }\n'
      + '  r+=(vec2(vnoise(p*0.8+uT*0.3),vnoise(p*0.8-uT*0.25+7.0))-0.5)*0.18*c;\n'
      + '  vec3 N=normalize(vec3(-g.x-r.x,1.0,-g.y-r.y));\n'
      + '  vec3 V=normalize(cameraPosition-vW); float ndv=max(dot(N,V),0.0);\n'
      + '  float F=0.02+0.55*pow(1.0-ndv,5.0);\n'
      + '  vec3 R=reflect(-V,N); R.y=abs(R.y); vec3 refl=min(skyCol(R),vec3(1.0))*0.8;\n'
      + '  float shore=smoothstep(70.0,-5.0,vW.z);\n'
      + '  float crest=smoothstep(0.2,1.5,vW.y);\n'
      + '  vec3 body=mix(deep,shallowC,shore*0.8)+shallowC*0.22*crest*(1.0-F);\n'
      + '  vec3 col=mix(body,refl,clamp(F*1.1+0.04,0.0,1.0));\n'
      + '  vec3 L=normalize(sunDir); col+=sunCol*pow(max(dot(R,L),0.0),380.0)*1.1*smoothstep(0.0,0.5,L.y+0.15);\n'
      + '  float n=vnoise(p*0.45+uT*0.15);\n'
      + '  float foam=smoothstep(1.0,1.6,vW.y+n*0.5)*0.55 + smoothstep(14.0,-4.0,vW.z)*smoothstep(0.35,0.75,n+0.35*sin(vW.z*0.7-uT*1.8+n*4.0));\n'
      + '  col=mix(col,foamC,clamp(foam,0.0,1.0));\n'
      + '  gl_FragColor=vec4(col,1.0);\n'
      + '#include <fog_fragment>\n}'
  });
  const sea = new THREE.Mesh(seaGeo, seaMat); sea.frustumCulled = false; scene.add(sea);
  const updateSea = (t) => { seaMat.uniforms.uT.value = t; };

  // playa y acantilados (malla de alturas)
  const TW = 360, TD = 230, TX = 90, TZ = 58;
  const terrH = (x, z) => {                                    // z>0 hacia el mar
    const n = Math.sin(x * 0.07) * 1.2 + Math.sin(x * 0.19 + z * 0.1) * 0.6 + Math.sin(z * 0.21) * 0.4;
    if (z > 6) return -0.2 - (z - 6) * 0.07 + n * 0.1;
    if (z > -34) return 0.1 + (6 - z) * 0.05 + n * 0.12;             // arena
    const cl = sstep(-34, -72, z);                                    // pendiente hacia el acantilado
    return 2 + cl * (21 + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.17) * 2.5) + n * 0.5 + (z < -72 ? (-z - 72) * 0.04 : 0);
  };
  const tg = new THREE.PlaneGeometry(TW, TD, TX, TZ); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -85);
  { const p = tg.attributes.position, col = new Float32Array(p.count * 3); const sand = new THREE.Color(0xb3a37c), wet = new THREE.Color(0x8a7d5e), grass = new THREE.Color(0x5b6a3a), rock = new THREE.Color(0x7d786a);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = terrH(x, z); p.setY(i, h);
      const c = h < 0.5 ? wet.clone().lerp(sand, sstep(-0.5, 0.5, h)) : (z > -38 ? sand.clone() : grass.clone().lerp(rock, sstep(6, 22, h) * 0.8 + Math.abs(Math.sin(x * 0.2 + z)) * 0.18));
      if (z > -38 && h >= 0.5) c.lerp(grass, sstep(-26, -36, z) * 0.7);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); terrain.frustumCulled = false; scene.add(terrain);

  // ---- población del mundo ----
  const world = new THREE.Group(); scene.add(world);
  const effects = [];   // { update(dt,t) -> false para borrar }
  const texFire = softTex('rgba(255,235,170,1)', 'rgba(255,120,20,0)'), texSmoke = softTex('rgba(60,58,55,0.95)', 'rgba(40,38,36,0)'), texFoam = softTex('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'), texFlash = softTex('rgba(255,255,230,1)', 'rgba(255,190,60,0)');
  function sprite(tex, pos, size, opacity, additive) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !additive }));
    s.position.copy(pos); s.scale.setScalar(size); scene.add(s); return s;
  }
  const killSprite = (s) => { scene.remove(s); s.material.dispose(); };
  function smokePuff(pos, size = 6, life = 6, up = 3, drift = 2) {
    const s = sprite(texSmoke, pos, size, 0.75, false); let age = 0; const v = V(R(-0.5, 0.5) + drift * 0.3, up, R(-0.5, 0.5));
    effects.push({ update(dt) { age += dt; s.position.addScaledVector(v, dt); s.scale.setScalar(size * (1 + age * 0.5)); s.material.opacity = 0.75 * (1 - age / life); if (age >= life) { killSprite(s); return false; } return true; } });
  }
  function fireball(pos, size = 8, withSmoke = true) {
    const s = sprite(texFire, pos, size, 1, true); let age = 0;
    effects.push({ update(dt) { age += dt; s.scale.setScalar(size * (0.6 + age * 3)); s.material.opacity = Math.max(0, 1 - age / 0.7); if (age > 0.7) { killSprite(s); return false; } return true; } });
    if (withSmoke) for (let i = 0; i < 4; i++) smokePuff(pos.clone().add(V(R(-2, 2), R(0, 2), R(-2, 2))), size * 0.8, R(4, 8), R(2, 5));
  }
  const plumeGeo = CYL(0.35, 1.4, 1, 9);
  function plume(x, z, big = 1, quiet = false) {
    const y = waveH(x, z, clockT) - 0.2;
    const m = new THREE.Mesh(plumeGeo, new THREE.MeshBasicMaterial({ color: 0xe6eeee, transparent: true, opacity: 0.5, fog: true, depthWrite: false })); m.position.set(x, y, z); scene.add(m);
    const foam = sprite(texFoam, V(x, y + 0.4, z), 6 * big, 0.8, false); let age = 0;
    effects.push({ update(dt) { age += dt; const h = 22 * big * Math.min(1, age * 3) * (1 - 0.35 * Math.max(0, age - 0.5)); m.scale.set(big * 0.8 * (1 + age * 1.6), Math.max(0.1, h), big * 0.8 * (1 + age * 1.6)); m.position.y = y + h / 2; m.material.opacity = 0.5 * (1 - age / 1.9); foam.scale.setScalar(6 * big * (1 + age * 1.2)); foam.material.opacity = 0.8 * (1 - age / 1.9); if (age > 1.9) { scene.remove(m); m.material.dispose(); killSprite(foam); return false; } return true; } });
    if (audio && !quiet) { audio.whistle(0.05); setTimeout(() => { if (audio) audio.boom(0.35 * Math.min(1, big), false, clamp((x - cam.position.x) / 80, -1, 1)); }, 450); }
  }
  function muzzleFlash(pos, size = 5) { const s = sprite(texFlash, pos, size, 1, true); let age = 0; effects.push({ update(dt) { age += dt; s.material.opacity = 1 - age / 0.14; if (age > 0.14) { killSprite(s); return false; } return true; } }); }
  const tracerGeo = BOX(0.1, 0.1, 6);
  function tracer(a, b, speed = 260) {
    const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false })); scene.add(m);
    const d = b.clone().sub(a), L = d.length(); d.normalize(); let s = 0; m.lookAt(d.clone().add(a));
    effects.push({ update(dt) { s += speed * dt; m.position.copy(a).addScaledVector(d, s); m.lookAt(m.position.clone().add(d)); if (s > L) { scene.remove(m); m.material.dispose(); return false; } return true; } });
  }

  // ---- escena: flota ----
  const fleet = [];   // {obj, speed}
  function addShip(obj, x, z, yaw = 0, speed = 0) { obj.position.set(x, 0, z); obj.rotation.y = yaw; world.add(obj); fleet.push({ obj, speed, x, z, ph: rnd() * 6.28 }); return obj; }
  const dds = [];
  [[-70, 330], [95, 360], [-170, 420], [150, 470]].forEach(([x, z]) => dds.push(addShip(destroyer(1), x, z, 0, 0.8)));
  const bbs = [addShip(destroyer(1, true), -230, 520, 0, 0.5), addShip(destroyer(1, true), 280, 560, 0, 0.5)];
  const transports = []; for (let i = 0; i < 12; i++) transports.push(addShip(transport(), -420 + i * 78 + R(-14, 14), 660 + R(-60, 120), R(-0.04, 0.04), 0.7));
  for (let i = 0; i < 70; i++) { const b = makeLCVP(); b.userData.ramp.rotation.x = Math.PI / 2 - 0.02; addShip(b, R(-380, 380), R(130, 560), R(-0.05, 0.05), R(5, 8)); }
  // lanchas en formación cercana (para S4, S6)
  const wave2 = []; for (let i = 0; i < 14; i++) { const b = makeLCVP(); const L = i % 2 ? 1 : -1; b.position.set(L * (14 + Math.floor(i / 2) * 15), 0, 262 + (i % 3) * 22); world.add(b); wave2.push(b); }
  // héroe
  const hero = makeLCVP(); world.add(hero);
  { const lamp = new THREE.PointLight(0xffd7a0, 1.6, 16, 1.2); lamp.position.set(0, 3.2, 0.5); hero.add(lamp); }
  // soldados dentro del héroe
  const crew = []; for (let i = 0; i < 24; i++) { const s = makeSoldier(i); const col = i % 2 ? 1 : -1, row = Math.floor(i / 2); s.position.set(col * 0.75, 0.62, 3.2 - row * 0.62); s.rotation.y = 0; hero.add(s); crew.push(s); }
  { const cox = makeSoldier(2); cox.position.set(1.0, 0.65, 4.4); cox.rotation.y = Math.PI * 0.1; hero.add(cox); }
  // otros héroes: ametralladora y suboficial
  // aviones
  const planes = []; for (let k = 0; k < 18; k++) { const p = c47(); p.position.set(-80 + (k % 6) * 38 + R(-5, 5), 140 + (k % 3) * 8, 900 - Math.floor(k / 6) * 60); p.rotation.y = 0; world.add(p); planes.push(p); }
  // playa
  const hedges = []; for (let i = 0; i < 70; i++) { const h = hedgehog(); const z = R(-6, 24), x = R(-110, 110); h.position.set(x, terrH(x, z) + 0.05, z); h.rotation.y = R(0, 6.28); world.add(h); hedges.push(h); }
  for (let i = 0; i < 40; i++) { const s = stake(); const z = R(10, 30), x = R(-110, 110); s.position.set(x, terrH(x, z) + 0.3, z); s.rotation.y = R(0, 6.28); world.add(s); }
  const bunkers = []; [[-60, -78], [-8, -86], [42, -80], [92, -84]].forEach(([x, z]) => { const b = bunker(); b.position.set(x, terrH(x, z) + 0.2, z); b.rotation.y = R(-0.1, 0.1); world.add(b); bunkers.push(b); });
  const tanks = []; [[-24, -4, 0.4], [52, 2, -0.5]].forEach(([x, z, r]) => { const t = wreckTank(); t.position.set(x, terrH(x, z) + 0.1, z); t.rotation.y = r; world.add(t); tanks.push(t); });
  // alambre de espino
  { const parts = []; for (let i = 0; i < 90; i++) { const x = -120 + i * 2.7; parts.push(P(BOX(2.4, 0.06, 0.06), 0x2a2a2a, x, 1.1, 0, 0, 0, 0.0), P(BOX(0.06, 1.2, 0.06), 0x3a2e22, x + 1.2, 0.6, 0)); } const w = mesh(merge(parts)); w.position.set(0, terrH(0, -33) + 0.05, -33); world.add(w); }
  // soldados en la playa (activados en la escena 5-6)
  const beachGuys = [];
  for (let i = 0; i < 48; i++) { const s = makeSoldier(i + 1); s.visible = false; world.add(s); beachGuys.push({ s, x0: R(-16, 20), delay: i * 0.5 + R(0, 0.4), sp: R(2.1, 3.0), down: i % 9 === 4 ? R(86, 100) : 0, lane: R(-1, 1) }); }
  // humo de los restos
  const smokers = [V(-24, 2.2, -4), V(52, 2.2, 2), V(-60, 8, -60), V(70, 8, -62)];

  // ---- modelos GLB reales (assets/historia): sustituyen a los procedurales cuando terminan de cargar ----
  const rigged = [];
  const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
  const swapModel = (obj, model) => { if (!model) return false; if (obj.isMesh) obj.material = HIDDEN; else obj.children.forEach(c => { c.visible = false; }); obj.add(model); return true; };
  const waterline = (m, k) => { m.position.y -= m.userData.size.y * k; return m; };
  function upgradeModels() {
    dds.forEach(d => swapModel(d, waterline(fitModel('destroyer', 115), 0.14)));
    bbs.forEach(b => { const m = fitModel('battleship', 196, { yaw: Math.PI / 2 }); if (m) { militarize(m, 0x7b8589, 0.88, 0.2); swapModel(b, waterline(m, 0.14)); } });
    transports.forEach(tp => { const m = fitModel('cargo', 130, { yaw: Math.PI }); if (m) { militarize(m, 0x5a5f4c, 0.6); swapModel(tp, waterline(m, 0.18)); } });
    planes.forEach(p => { const m = fitModel('plane', 20, { yaw: Math.PI }); if (m) { militarize(m, 0x606746, 0.5); swapModel(p, m); } });
    const rig = (s) => { const g = makeRiggedSoldier(); if (!g) return; const u = s.userData; u.body.visible = u.lL.visible = u.lR.visible = false; s.add(g); u.rig = g.userData.rig; rigged.push(s); };
    crew.forEach(rig); rig(cox);
    beachGuys.forEach(b => rig(b.s));
    // sacos de arena: parapetos delante de los búnkeres y en la playa
    const spots = []; bunkers.forEach(b => { for (let i = -3; i <= 3; i++) spots.push([b.position.x + i * 2.1, b.position.z + 7 + Math.abs(i) * 0.3, i * 0.08]); });
    for (let i = 0; i < 16; i++) spots.push([R(-90, 90), R(-18, -8), R(-0.4, 0.4)]);
    spots.forEach(([x, z, r]) => { const m = fitModel('sandbag', 2.1); if (!m) return; m.position.set(x, terrH(x, z), z); m.rotation.y = r + R(-0.05, 0.05); world.add(m); });
  }
  (async () => { try { await loadModels(); if (!ended) upgradeModels(); } catch (e) { console.warn('[historia] modelos GLB', e); } })();

  // ---- audio y narrador ----
  let audio = null; try { audio = withSamples(createAudio()); } catch (e) { console.warn('audio', e); }
  const narr = createNarrator(subEl);

  // ---- plano de cámara ----
  const hz0 = { z: 0 };
  const heroZ = (t) => { const k = [[0, 330], [32, 300], [50, 240], [68, 34], [71, 18], [200, 18]]; for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])); return 18; };
  const heroX = 0;
  const SH = [   // [t0, t1, from(pos,look,fov), to(pos,look,fov), shake]
    [0, 16,   [V(0, 5, 760), V(0, 18, 560), 58], [V(-20, 9, 520), V(0, 20, 330), 52], 0.15],
    [16, 31,  [V(-70, 9, 262), V(-70, 12, 330), 48], [V(-40, 14, 292), V(-72, 12, 330), 40], 0.1],
    [31, 50,  'boatInt', null, 0.4],
    [50, 71,  'boatBow', null, 0.5],
    [71, 87,  [V(-6, 3.4, 31), V(0, 1.4, 10), 58], [V(5, 2.6, 27), V(0, 1.3, 0), 50], 0.6],
    [87, 108, [V(-14, 1.5, 34), V(-10, 3, -4), 62], [V(10, 5.5, 12), V(0, 8, -40), 56], 0.35],
    [108, 124, [V(0, 12, 70), V(0, 4, -20), 55], [V(-30, 85, 200), V(0, 5, -10), 50], 0.05]
  ];
  const tmpL = V(0, 0, 0);
  function placeCamera(t, clk) {
    let shot = SH[SH.length - 1]; for (const s of SH) if (t >= s[0] && t < s[1]) { shot = s; break; }
    const k = clamp((t - shot[0]) / (shot[1] - shot[0]), 0, 1), e = sstep(0, 1, k) * 0.5 + k * 0.5;
    const hb = hero.position, sh = shot[4];
    if (shot[2] === 'boatInt') {
      const kk = e; cam.position.set(hb.x + lerp(-0.9, 0.6, kk), hb.y + lerp(3.1, 2.5, kk), hb.z + lerp(7.4, 2.2, kk)); tmpL.set(hb.x + lerp(0.3, 0.0, kk), hb.y + 1.4, hb.z - lerp(2, 8, kk)); cam.fov = lerp(64, 56, kk);
      cam.up.set(0, 1, 0); cam.position.y += 0; cam.lookAt(tmpL); cam.rotateZ(hero.rotation.z * 0.8 + Math.sin(clk * 0.8) * 0.01);
    } else if (shot[2] === 'boatBow') {
      cam.position.set(hb.x + lerp(0.5, 0.9, e), hb.y + lerp(5.2, 4.4, e), hb.z + 3.5); tmpL.set(0, lerp(10, 4, e), -80); cam.fov = lerp(58, 50, e); cam.up.set(0, 1, 0); cam.lookAt(tmpL); cam.rotateZ(hero.rotation.z * 0.7);
    } else {
      cam.position.lerpVectors(shot[2][0], shot[3][0], e); tmpL.lerpVectors(shot[2][1], shot[3][1], e); cam.fov = lerp(shot[2][2], shot[3][2], e); cam.up.set(0, 1, 0); cam.lookAt(tmpL);
    }
    if (sh) { cam.position.x += Math.sin(clk * 3.1) * sh * 0.06 + Math.sin(clk * 7.3) * sh * 0.025; cam.position.y += Math.sin(clk * 2.3) * sh * 0.07 + Math.sin(clk * 9.1) * sh * 0.02; }
    cam.updateProjectionMatrix();
  }

  // ---- bucle ----
  let clockT = 0, t = 0, last = 0, ended = false, lineIdx = 0, ev = { plane: false, nextShell: 0, nextBoom: 0, nextMG: 0, nextNaval: 0, nextRifle: 0, nextSmoke: 0 }, bw = 0, rampOpen = 0, started = false;
  const cardAt = (t0, t1, html, el = cardEl) => ({ t0, t1, html, el, on: false });
  const cards = [
    cardAt(1.5, 8.5, '<div style="font-size:clamp(28px,6vw,78px);letter-spacing:.35em;font-weight:600;color:#f1e6c5">OPERACIÓN OVERLORD</div><div style="margin-top:14px;font-size:clamp(12px,1.8vw,22px);letter-spacing:.5em;color:#d69f0f">6 DE JUNIO DE 1944 · 05:30</div><div style="margin-top:8px;font-size:clamp(11px,1.4vw,17px);letter-spacing:.3em;color:#b9c3cf">CANAL DE LA MANCHA</div>'),
    cardAt(112.2, 122, '<div style="font-size:clamp(14px,2vw,26px);letter-spacing:.5em;color:#d69f0f">NIVEL 1</div><div style="margin-top:10px;font-size:clamp(24px,4.6vw,60px);letter-spacing:.25em;font-weight:600;color:#f1e6c5">DESEMBARCO DE NORMANDÍA</div><div style="margin-top:14px;font-size:clamp(11px,1.5vw,18px);letter-spacing:.4em;color:#b9c3cf">COMPLETADO</div>'),
    cardAt(52, 61, 'PLAYA DE OMAHA · 06:30', locEl)
  ];

  function frame(ts) {
    if (ended) return;
    requestAnimationFrame(frame);
    if (!last) last = ts; const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    if (!started) return;
    clockT += dt; t += dt; if (seekTo) { t = seekTo; seekTo = 0; for (const c of cards) c.on = false; lineIdx = LINES.findIndex(l => l[0] > t); if (lineIdx < 0) lineIdx = LINES.length; beachGuys.forEach(b => b.s.visible = false); }
    // fundido de entrada/salida
    fadeEl.style.opacity = Math.max(clamp(1 - t / 2.2, 0, 1), clamp((t - (DURATION - 3.5)) / 3.5, 0, 1), (ev.cut > 0 ? ev.cut : 0));
    if (ev.cut > 0) ev.cut = Math.max(0, ev.cut - dt * 3);
    for (const sh of SH) if (Math.abs(t - sh[0]) < dt && sh[0] > 1) ev.cut = 1;
    if (t >= DURATION) return finish(true);
    // narración
    while (lineIdx < LINES.length && t >= LINES[lineIdx][0]) { narr.say(LINES[lineIdx][1], lineIdx); lineIdx++; }
    for (const c of cards) { const on = t >= c.t0 && t < c.t1; if (on !== c.on) { c.on = on; if (on) c.el.innerHTML = c.html; c.el.style.opacity = on ? 1 : 0; } }
    if (audio) { const sk = (t > 31 && t < 90 ? 1 : (t >= 90 ? 2 : 0)) + (t > 66 ? 10 : 0); if (sk !== ev.sk) { ev.sk = sk; audio.setScene(t); } }
    // ---- mundo ----
    updateSea(clockT); updateSky(t);
    for (const f of fleet) { f.obj.position.z = f.speed > 3 ? Math.max(f.obj.position.z - f.speed * dt * (t < 60 ? 1 : 0.4), 16 + (f.ph * 20 % 30)) : f.obj.position.z - f.speed * dt; const y = waveH(f.obj.position.x, f.obj.position.z, clockT); f.obj.position.y = y * (f.speed > 3 ? 0.9 : 0.35); f.obj.rotation.x = Math.sin(clockT * 0.6 + f.ph) * 0.012; f.obj.rotation.z = Math.sin(clockT * 0.5 + f.ph) * 0.02; }
    // héroe
    hero.position.set(heroX, 0, heroZ(t)); { const x = hero.position.x, z = hero.position.z, h = waveH(x, z, clockT); hero.position.y = h + 0.1; hero.rotation.x = (waveH(x, z - 3, clockT) - waveH(x, z + 3, clockT)) * 0.12; hero.rotation.z = (waveH(x + 2, z, clockT) - waveH(x - 2, z, clockT)) * 0.25 + Math.sin(clockT * 0.9) * 0.02; }
    wave2.forEach((b, i) => { const sp = t < 71 ? (heroZ(t + 0.01) - heroZ(t - 0.01)) / 0.02 : 0; b.position.z += sp * dt * 1.02; b.position.y = waveH(b.position.x, b.position.z, clockT) + 0.1; b.rotation.z = Math.sin(clockT * 0.8 + i) * 0.04; b.rotation.x = Math.sin(clockT * 0.7 + i * 2) * 0.03; });
    crew.forEach((s, i) => { poseSoldier(s, 'stand', clockT); s.rotation.x = Math.sin(clockT * 1.1 + i) * 0.04 + hero.rotation.x; s.rotation.z = hero.rotation.z * 0.5 + Math.sin(clockT * 0.9 + i * 0.7) * 0.03; });
    // rampa
    const wantOpen = t > 71 ? sstep(71, 72.4, t) : 0; hero.userData.ramp.rotation.x = lerp(Math.PI / 2 - 0.02, -0.28, wantOpen);
    if (t > 71.4 && !ev.ramp) { ev.ramp = true; audio && audio.boom(0.35, false); SFX.play("horn_hit", { vol: 0.8 }); SFX.play("yell", { vol: 0.7 }); }
    // soldados saliendo de la lancha / avanzando por la playa
    if (t > 72) {
      crew.forEach((s, i) => { if (!s.userData.out) { const t0 = 72.2 + i * 0.28; if (t > t0) { s.userData.out = true; hero.remove(s); world.add(s); s.position.set(hero.position.x + (i % 2 ? 0.75 : -0.75), 0.6, hero.position.z - 3); s.rotation.set(0, 0, 0); s.userData.t0 = t0; s.userData.sp = R(1.9, 2.6); s.userData.lane = (i % 2 ? 1 : -1) * R(0.3, 1.8); } } });
    }
    for (const s of crew) if (s.userData.out) { const u = s.userData; s.position.z -= u.sp * dt * 1.0; s.position.x += u.lane * dt * 0.35; const gy = terrH(s.position.x, s.position.z); const wy = waveH(s.position.x, s.position.z, clockT); const g = Math.max(gy, wy - 0.45); s.position.y += (g - s.position.y) * Math.min(1, dt * 8); poseSoldier(s, s.position.z > 4 ? 'wade' : 'run', clockT, 1); if (u.sp > 0 && s.position.z < -30) u.sp *= 0.995; }
    for (const b of beachGuys) {
      const tt = t - 74 - b.delay; if (tt < 0) { b.s.visible = false; continue; }
      b.s.visible = true;
      if (!b.z) { b.z = R(34, 46); b.s.position.x = b.x0; b.s.position.z = b.z; }
      const downNow = b.down && t > b.down;
      if (downNow) { poseSoldier(b.s, 'down', clockT); continue; }
      b.s.position.z -= b.sp * dt * (b.s.position.z > 6 ? 0.75 : 1) * (b.s.position.z < -28 ? 0.5 : 1); b.s.position.x += b.lane * dt * 0.25;
      if (b.s.position.z < -52) b.s.visible = false;
      const gy = terrH(b.s.position.x, b.s.position.z), wy = waveH(b.s.position.x, b.s.position.z, clockT);
      b.s.position.y += (Math.max(gy, wy - 0.5) - b.s.position.y) * Math.min(1, dt * 8);
      poseSoldier(b.s, b.s.position.z > 4 ? 'wade' : 'run', clockT, 0.9);
    }
    // aviones
    planes.forEach((p, i) => { const start = 8 + Math.floor(i / 6) * 3; const tt = t - start; p.position.z = 900 - Math.max(0, tt) * 150 + (i % 6) * 0; p.position.y = 150 + (i % 3) * 7 + Math.sin(clockT * 0.4 + i) * 1.2; p.visible = tt > -2 && p.position.z > -500; p.rotation.z = Math.sin(clockT * 0.7 + i) * 0.03; });
    if (t > 8.5 && !ev.plane) { ev.plane = true; audio && audio.planes(audio.ac.currentTime, 11); }
    if (t > 98 && !ev.plane2) { ev.plane2 = true; audio && audio.planes(audio.ac.currentTime, 9); }
    planes.forEach((p, i) => { if (t > 96) { const tt = t - 96 - Math.floor(i / 6) * 3; p.position.z = 700 - Math.max(0, tt) * 140; p.position.x = -90 + (i % 6) * 40; p.visible = tt > -1 && p.position.z > -500; } });
    // ---- eventos ----
    // 1) bombardeo naval (escena 2) y fuego de fondo
    if (t > 15 && t < 34 && t > ev.nextNaval) {
      ev.nextNaval = t + R(1.6, 2.6);
      const d = dds[Math.floor(R(0, dds.length))], tz = d.userData.turretZ || [];
      const z = d.position.z + (tz.length ? tz[Math.floor(R(0, tz.length))] : -30), p = V(d.position.x + R(-0.5, 0.5), 8.5, z - 7);
      muzzleFlash(p, 22); for (let i = 0; i < 4; i++) smokePuff(p.clone().add(V(R(-2, 2), 0, R(-3, 0))), 12, 7, 2, -2);
      audio && audio.boom(0.9, true, clamp((d.position.x - cam.position.x) / 150, -1, 1));
      // obús hacia la playa: llega más tarde y levanta fuego lejos
      setTimeout(() => { if (!ended) { const x = R(-90, 90); fireball(V(x, terrH(x, -50) + 3, -50 + R(-20, 20)), 14, true); } }, 1800);
    }
    if (t > 20 && t < 32) { bbs.forEach((b, i) => { if (rnd() < dt * 0.35) { muzzleFlash(V(b.position.x + R(-2, 2), 16, b.position.z - 40), 40); audio && audio.boom(0.6, true, i ? 0.6 : -0.6); } }); }
    // 2) escena 4-6: proyectiles en el mar y explosiones en la orilla
    if (t > 52 && t < 100 && t > ev.nextShell) { ev.nextShell = t + R(0.35, 0.9) * (t > 70 ? 0.8 : 1);
      const hz = hero.position.z, x = R(-45, 45), z = t > 68 ? R(-4, 50) : clamp(hz + R(-120, 40), -10, 400); plume(x, z, R(0.7, 1.4)); }
    if (t > 66 && t < 108 && t > ev.nextBoom) { ev.nextBoom = t + R(0.5, 1.3);
      const x = R(-70, 70), z = R(-30, 14); fireball(V(x, terrH(x, z) + 1.5, z), R(8, 15), true); audio && audio.boom(0.55, false, clamp((x - cam.position.x) / 90, -1, 1)); }
    // ametralladoras de los búnkeres
    if (t > 53 && t < 102 && t > ev.nextMG) { ev.nextMG = t + R(0.6, 1.4);
      const b = bunkers[Math.floor(R(0, bunkers.length))], o = V(b.position.x, b.position.y + 3.4, b.position.z + 4.2);
      muzzleFlash(o, 3); const tx = R(-20, 20) + (t > 72 ? hero.position.x : 0), tz = t > 72 ? R(-10, 36) : R(100, 250);
      for (let i = 0; i < 5; i++) setTimeout(() => { if (!ended) tracer(o.clone(), V(tx + R(-6, 6), 1, tz + R(-6, 6)), 300); }, i * 70);
      audio && audio.gun(7, 0.2, clamp((b.position.x - cam.position.x) / 120, -1, 1)); }
    if (t > 76 && t < 104 && t > ev.nextRifle) { ev.nextRifle = t + R(0.25, 0.6); audio && audio.rifle(0.12, R(-0.8, 0.8)); }
    // humo persistente de restos
    if (t > 40 && t > ev.nextSmoke) { ev.nextSmoke = t + 0.22; const sm = smokers[Math.floor(R(0, smokers.length))]; smokePuff(sm.clone().add(V(R(-1, 1), 0, R(-1, 1))), R(5, 9), R(7, 10), R(4, 7), 3); }
    // efectos
    for (let i = effects.length - 1; i >= 0; i--) if (!effects[i].update(dt, t)) effects.splice(i, 1);
    for (const s of rigged) if (s.visible && (s.parent !== world || s.position.distanceToSquared(cam.position) < 28900)) s.userData.rig.update(dt);
    placeCamera(t, clockT);
    renderer.render(scene, cam);
  }

  function finish(done) {
    if (ended) return; ended = true;
    narr.stop(); audio && audio.stop();
    removeEventListener('resize', resize); removeEventListener('keydown', onKey);
    renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    root.style.transition = 'opacity .6s'; root.style.opacity = 0; setTimeout(() => root.remove(), 650);
    if (onEnd) onEnd(!!done);
  }
  const onKey = (e) => { if (e.code === 'Escape') finish(false); };
  addEventListener('keydown', onKey);
  $('histSkip').addEventListener('click', () => finish(false));
  // el audio exige un gesto previo: esta función se llama desde un clic
  if (audio) { audio.resume(); audio.startMusic(); }
  started = true; requestAnimationFrame(frame);
  return { skip: () => finish(false), seek: (s) => { seekTo = s; } };
}
