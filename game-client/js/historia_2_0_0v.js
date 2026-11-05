// MODO HISTORIA — capítulos del mapa de hechos de la Segunda Guerra Mundial (el último: Día D).
// Cada capítulo es una secuencia de planos: mapa de contexto, fotografías de época y escenas 3D con los modelos de assets/WW2.
// La duración de cada plano la marca la locución (assets/historia/audio/cN_M.wav, guion en assets/historia/guion.json).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SFX } from './sfx_2_0_0v.js';
import { drawBase, drawLayers, ASPECT } from './mapa_2_0_0v.js';
import * as W from './ww2_2_0_0v.js';

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

function hedgehog() {
  const b = (rx, ry, rz) => P(BOX(0.16, 2.3, 0.16), 0x453a30, 0, 0.9, 0, rx, ry, rz);
  return mesh(merge([b(0.6, 0, 0.5), b(-0.5, 1.0, 0.7), b(0.2, 2.1, -0.8), P(BOX(0.1, 0.1, 1.8), 0x2f2823, 0, 0.9, 0, 0, 0.4, 0)]));
}
function bunker() {
  const g = merge([P(BOX(11, 4.2, 8), 0x8d8b82, 0, 2.1, 0), P(BOX(11.6, 0.6, 8.6), 0x7e7c74, 0, 4.4, 0), P(BOX(5, 0.9, 0.3), 0x15171a, 0, 3.3, 4.02), P(BOX(2.2, 0.6, 3), 0x72706a, -3.5, 4.9, 1)]);
  return mesh(g);
}

function softTex(rgba0, rgba1) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, rgba0); gr.addColorStop(1, rgba1);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}


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
  const inten = (t) => (A.moodFn ? A.moodFn(t) : 0.5);
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


// ================================================================== sonido: música procedural + muestras reales
function withSamples(A) {
  if (!A) return A;
  SFX.init();
  SFX.preload(['boom_far', 'boom_mid', 'boom_big', 'naval', 'splash', 'splash_big', 'rifle', 'ak', 'm4', 'war_mix', 'yell', 'horn_hit', 'sea', 'sea_bad', 'wind', 'boat', 'coast', 'planes', 'march', 'drums', 'dry', 'bolt', 'reload_out', 'reload_in']);
  const proc = { stop: A.stop, startMusic: A.startMusic };
  A.sea.vol = 0; A.surf.vol = 0;
  const pn = (p) => (p == null ? 0 : p);
  A.boom = (vol = 0.9, big = false, p = 0) => SFX.play(big ? (Math.random() < 0.5 ? 'naval' : 'boom_big') : (vol > 0.45 ? 'boom_mid' : 'boom_far'), { vol: Math.min(1, vol * 1.15), pan: pn(p) });
  A.splash = (vol = 0.4, p = 0) => SFX.play('splash', { vol: Math.min(1, vol * 2.2), pan: pn(p) });
  A.rifle = (vol = 0.2, p = 0) => SFX.play('rifle', { vol: Math.min(1, vol * 3), pan: pn(p), rate: 0.9 + Math.random() * 0.3 });
  A.burst = (n = 5, vol = 0.3, p = 0) => { for (let i = 0; i < n; i++) SFX.play('ak', { vol: Math.min(1, vol * 2.4), pan: pn(p), delay: i * (0.08 + Math.random() * 0.04), rate: 1.05 + Math.random() * 0.2 }); };
  const L = {}, want = {}; let timer = null, ended = false;
  const apply = () => { if (ended) return; for (const k in want) { if (!L[k]) L[k] = SFX.loop(k, { vol: 0, fade: 0.05 }); if (L[k]) L[k].set(want[k], 1.4); } };
  A.ambience = (m) => { for (const k in want) want[k] = 0; Object.assign(want, m); apply(); };
  A.startMusic = () => { proc.startMusic(); timer = setInterval(apply, 1000); };
  A.stop = () => { ended = true; clearInterval(timer); for (const k in L) L[k] && L[k].stop(1.2); proc.stop(); };
  return A;
}

// ================================================================== escenario 3D: cielo, mar, luces y efectos
const PRESETS = {
  dawn:  { top: 0x1d2b45, mid: 0x6c6f86, hor: 0xe9a875, sunCol: 0xffb878, sunDir: [0.25, 0.1, -1], fog: 0xb59a8f, fogN: 25, fogF: 650, hemi: [0x8d9bbd, 0x3a3228, 0.6], sun: [0xffc080, 1.8] },
  over:  { top: 0x4b5560, mid: 0x78828b, hor: 0xa4adb2, sunCol: 0xd9d4c8, sunDir: [-0.3, 0.35, -0.5], fog: 0x93a0a8, fogN: 80, fogF: 1900, hemi: [0xb6c0c8, 0x4a5258, 0.95], sun: [0xe8e2d6, 1.2] },
  gold:  { top: 0x3b5f98, mid: 0x9d8d86, hor: 0xe3bf94, sunCol: 0xffe2a8, sunDir: [-0.6, 0.25, -0.7], fog: 0xd9bfa0, fogN: 250, fogF: 4200, hemi: [0xcfd9ee, 0x7a6a58, 0.8], sun: [0xffe3b0, 2.2] },
  night: { top: 0x0a1428, mid: 0x182744, hor: 0x35507a, sunCol: 0xc8d6ff, sunDir: [0.45, 0.42, -0.8], fog: 0x1a2a44, fogN: 40, fogF: 1300, hemi: [0x7f98cc, 0x141a28, 1.0], sun: [0xaec4ff, 1.5], stars: true },
  dday:  { top: 0x44566f, mid: 0x8a95a3, hor: 0xc8c3b4, sunCol: 0xffe6bd, sunDir: [0.5, 0.18, -0.8], fog: 0x9fa6ab, fogN: 50, fogF: 1500, hemi: [0xb7c2cf, 0x4b4a40, 0.9], sun: [0xffe2b8, 1.4] },
  dusk:  { top: 0x22304f, mid: 0x8a6a7a, hor: 0xff9a5a, sunCol: 0xffa060, sunDir: [0.5, 0.07, -0.8], fog: 0xb58a7a, fogN: 80, fogF: 1800, hemi: [0x8a8fb0, 0x4a3a30, 0.75], sun: [0xff9a55, 1.7] },
  bunker: { top: 0x2a3548, mid: 0x7c7f8c, hor: 0xcaa88c, sunCol: 0xffc890, sunDir: [0.3, 0.12, -1], fog: 0xa89a90, fogN: 40, fogF: 900, hemi: [0x9aa6c0, 0x3a3630, 0.7], sun: [0xffc890, 1.6] }
};
const WAVE_GLSL = 'uniform float uAmp,uShore;\nfloat calm(float z){ return mix(1.0,clamp((z+5.0)/90.0,0.08,1.0),uShore); }\n'
  + 'float wave(vec2 p,float t){ return uAmp*calm(p.y)*(0.9*sin(p.x*0.045+t*0.9)+0.65*sin(p.y*0.06-t*1.15+p.x*0.01)+0.3*sin((p.x+p.y)*0.12+t*1.7)); }\n';

function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x888888, 100, 2000);
  const cam = new THREE.PerspectiveCamera(52, 1, 0.15, 7000); scene.add(cam);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8), sun = new THREE.DirectionalLight(0xffffff, 1.5);
  scene.add(hemi, sun, sun.target);
  const st = { renderer, scene, cam, t: 0, amp: 1, shore: 0, fx: [], preset: null };
  // cielo
  const skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 0.1, -1) }, sunCol: { value: new THREE.Color() } };
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top,mid,hor,sunCol,sunDir; void main(){ float h=max(vP.y,0.0); vec3 c=mix(hor,mid,smoothstep(0.0,0.22,h)); c=mix(c,top,smoothstep(0.18,0.8,h)); float s=max(dot(normalize(vP),normalize(sunDir)),0.0); c+=sunCol*(pow(s,8.0)*0.25+pow(s,140.0)*0.9); gl_FragColor=vec4(c,1.0);\n#include <colorspace_fragment>\n}'
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 24, 12), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
  // estrellas
  const sp = new Float32Array(500 * 3); for (let i = 0; i < 500; i++) { const a = rnd() * 6.283, e = 0.08 + rnd() * 1.4, r = 4800; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, fog: false, depthWrite: false })); stars.visible = false; stars.frustumCulled = false; scene.add(stars);
  // mar (olas en GPU; sigue a la cámara para ser infinito)
  const seaU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uAmp: { value: 1 }, uShore: { value: 0 }, top: skyU.top, mid: skyU.mid, hor: skyU.hor, sunCol: skyU.sunCol, sunDir: skyU.sunDir,
    deep: { value: new THREE.Color(0x17313f) }, shallowC: { value: new THREE.Color(0x4f8a86) }, foamC: { value: new THREE.Color(0xdfe9e6) } }]);
  seaU.top = skyU.top; seaU.mid = skyU.mid; seaU.hor = skyU.hor; seaU.sunCol = skyU.sunCol; seaU.sunDir = skyU.sunDir;
  const seaMat = new THREE.ShaderMaterial({
    fog: true, uniforms: seaU,
    vertexShader: 'uniform float uT; varying vec3 vW;\n' + WAVE_GLSL + '#include <fog_pars_vertex>\nvoid main(){ vec3 w=(modelMatrix*vec4(position,1.0)).xyz; w.y=wave(w.xz,uT); vW=w; vec4 mvPosition=viewMatrix*vec4(w,1.0); gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: 'uniform float uT; uniform vec3 top,mid,hor,sunCol,sunDir,deep,shallowC,foamC; varying vec3 vW;\n' + WAVE_GLSL + '#include <fog_pars_fragment>\n'
      + 'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\n'
      + 'float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }\n'
      + 'vec3 skyCol(vec3 d){ float h=max(d.y,0.0); vec3 c=mix(hor,mid,smoothstep(0.0,0.22,h)); c=mix(c,top,smoothstep(0.18,0.8,h)); float s=max(dot(d,normalize(sunDir)),0.0); return c+sunCol*(pow(s,8.0)*0.25+pow(s,120.0)*0.9); }\n'
      + 'void main(){\n  vec2 p=vW.xz; float e=0.7;\n'
      + '  vec2 g=vec2(wave(p+vec2(e,0.0),uT)-wave(p-vec2(e,0.0),uT), wave(p+vec2(0.0,e),uT)-wave(p-vec2(0.0,e),uT))/(2.0*e);\n'
      + '  float c=calm(p.y)*min(uAmp,1.4); vec2 r=vec2(0.0);\n'
      + '  for(int i=0;i<4;i++){ float fi=float(i); vec2 d=normalize(vec2(cos(fi*2.1+0.4),sin(fi*2.1+0.4))); float f=0.55+fi*0.63; r+=d*cos(dot(p,d)*f+uT*(1.1+fi*0.5)+fi*1.7)*f*0.022*c; }\n'
      + '  r+=(vec2(vnoise(p*0.8+uT*0.3),vnoise(p*0.8-uT*0.25+7.0))-0.5)*0.07*c;\n'
      + '  vec3 N=normalize(vec3(-g.x-r.x,1.0,-g.y-r.y)); vec3 V=normalize(cameraPosition-vW); float ndv=max(dot(N,V),0.0);\n'
      + '  float F=0.02+0.55*pow(1.0-ndv,5.0); vec3 R=reflect(-V,N); R.y=abs(R.y); vec3 refl=min(skyCol(R),vec3(1.0))*0.8;\n'
      + '  float shore=uShore*smoothstep(70.0,-5.0,vW.z); float crest=smoothstep(0.2,1.5,vW.y/max(uAmp,0.2));\n'
      + '  vec3 body=mix(deep,shallowC,shore*0.8)+shallowC*0.22*crest*(1.0-F);\n'
      + '  vec3 col=mix(body,refl,clamp(F*1.1+0.04,0.0,1.0)); vec3 L=normalize(sunDir); col+=sunCol*pow(max(dot(R,L),0.0),380.0)*1.1*smoothstep(0.0,0.5,L.y+0.15);\n'
      + '  float n=vnoise(p*0.45+uT*0.15);\n'
      + '  float foam=smoothstep(1.0,1.6,vW.y/max(uAmp,0.3)+n*0.5)*0.4*min(uAmp,1.0) + uShore*smoothstep(14.0,-4.0,vW.z)*smoothstep(0.35,0.75,n+0.35*sin(vW.z*0.7-uT*1.8+n*4.0));\n'
      + '  col=mix(col,foamC,clamp(foam,0.0,1.0)); col=col/(1.0+max(col-0.85,0.0)); gl_FragColor=vec4(col,1.0);\n#include <fog_fragment>\n#include <colorspace_fragment>\n}'
  });
  const seaGeo = new THREE.PlaneGeometry(3600, 3600, 260, 260); seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, seaMat); sea.frustumCulled = false; scene.add(sea);
  st.sea = sea; st.seaU = seaU;
  st.waveH = (x, z, t = st.t) => { const a = st.amp, c = 1 + (clamp((z + 5) / 90, 0.08, 1) - 1) * st.shore; return a * c * (0.9 * Math.sin(x * 0.045 + t * 0.9) + 0.65 * Math.sin(z * 0.06 - t * 1.15 + x * 0.01) + 0.3 * Math.sin((x + z) * 0.12 + t * 1.7)); };
  st.setPreset = (name) => {
    const p = PRESETS[name]; st.preset = name;
    skyU.top.value.setHex(p.top); skyU.mid.value.setHex(p.mid); skyU.hor.value.setHex(p.hor); skyU.sunCol.value.setHex(p.sunCol); skyU.sunDir.value.set(...p.sunDir).normalize();
    scene.fog.color.setHex(p.fog); scene.fog.near = p.fogN; scene.fog.far = p.fogF; scene.background = null;
    hemi.color.setHex(p.hemi[0]); hemi.groundColor.setHex(p.hemi[1]); hemi.intensity = p.hemi[2] * 2.4;
    sun.color.setHex(p.sun[0]); sun.intensity = p.sun[1]; sun.position.copy(skyU.sunDir.value).multiplyScalar(400); sun.target.position.set(0, 0, 0);
    stars.visible = !!p.stars;
    seaU.deep.value.setHex({ night: 0x0b1c2c, dusk: 0x2a3a46, dawn: 0x2c4352, over: 0x2a4150, gold: 0x2f5266, dday: 0x2d4a58, bunker: 0x2c4352 }[name] || 0x2d4a58);
  };
  st.setSea = (amp, shore = 0) => { st.amp = amp; st.shore = shore; seaU.uAmp.value = amp; seaU.uShore.value = shore; };
  st.fovBase = 52;
  st.fit = () => { const a = cam.aspect; cam.fov = a >= 1.25 ? st.fovBase : Math.min(105, 2 * Math.atan(Math.tan(st.fovBase * Math.PI / 360) * 1.25 / a) * 180 / Math.PI); cam.updateProjectionMatrix(); };   // ventana estrecha: más campo de visión
  const size = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; st.fit(); };
  addEventListener('resize', size); size();
  // texturas y efectos
  const texFire = softTex('rgba(255,235,170,1)', 'rgba(255,120,20,0)'), texSmoke = softTex('rgba(70,68,64,0.95)', 'rgba(40,38,36,0)'), texFoam = softTex('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'), texFlash = softTex('rgba(255,255,230,1)', 'rgba(255,190,60,0)'), texCloud = softTex('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)');
  st.tex = { fire: texFire, smoke: texSmoke, foam: texFoam, flash: texFlash, cloud: texCloud };
  const sprite = (tex, pos, size, opacity, additive) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !additive }));
    s.position.copy(pos); s.scale.setScalar(size); scene.add(s); return s;
  };
  const kill = (s) => { scene.remove(s); s.material.dispose(); };
  st.sprite = sprite;
  st.smoke = (pos, size = 6, life = 6, up = 3, drift = 2, col = 0xffffff) => {
    const s = sprite(texSmoke, pos, size, 0.7, false); s.material.color.setHex(col); let age = 0; const v = V(R(-0.5, 0.5) + drift * 0.3, up, R(-0.5, 0.5));
    st.fx.push({ update(dt) { age += dt; s.position.addScaledVector(v, dt); s.scale.setScalar(size * (1 + age * 0.5)); s.material.opacity = 0.7 * (1 - age / life); if (age >= life) { kill(s); return false; } return true; } });
  };
  st.fire = (pos, size = 8, smoke = true) => {
    const s = sprite(texFire, pos, size, 1, true); let age = 0;
    st.fx.push({ update(dt) { age += dt; s.scale.setScalar(size * (0.6 + age * 3)); s.material.opacity = Math.max(0, 1 - age / 0.7); if (age > 0.7) { kill(s); return false; } return true; } });
    if (smoke) for (let i = 0; i < 4; i++) st.smoke(pos.clone().add(V(R(-2, 2), R(0, 2), R(-2, 2))), size * 0.8, R(4, 8), R(2, 5));
  };
  st.flash = (pos, size = 5) => { const s = sprite(texFlash, pos, size, 1, true); let age = 0; st.fx.push({ update(dt) { age += dt; s.material.opacity = 1 - age / 0.12; if (age > 0.12) { kill(s); return false; } return true; } }); };
  const plumeGeo = new THREE.CylinderGeometry(0.35, 1.4, 1, 9);
  st.plume = (x, z, big = 1) => {
    const y = st.waveH(x, z) - 0.2;
    const m = new THREE.Mesh(plumeGeo, new THREE.MeshBasicMaterial({ color: 0xe6eeee, transparent: true, opacity: 0.5, fog: true, depthWrite: false })); m.position.set(x, y, z); scene.add(m);
    const foam = sprite(texFoam, V(x, y + 0.4, z), 6 * big, 0.8, false); let age = 0;
    st.fx.push({ update(dt) { age += dt; const h = 22 * big * Math.min(1, age * 3) * (1 - 0.35 * Math.max(0, age - 0.5)); m.scale.set(big * 0.8 * (1 + age * 1.6), Math.max(0.1, h), big * 0.8 * (1 + age * 1.6)); m.position.y = y + h / 2; m.material.opacity = 0.5 * (1 - age / 1.9); foam.scale.setScalar(6 * big * (1 + age * 1.2)); foam.material.opacity = 0.8 * (1 - age / 1.9); if (age > 1.9) { scene.remove(m); m.material.dispose(); kill(foam); return false; } return true; } });
  };
  const trGeo = new THREE.BoxGeometry(0.12, 0.12, 7);
  st.tracer = (a, b, speed = 240) => {
    const m = new THREE.Mesh(trGeo, new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false })); scene.add(m);
    const d = b.clone().sub(a), Ln = d.length(); d.normalize(); let s = 0;
    st.fx.push({ update(dt) { s += speed * dt; m.position.copy(a).addScaledVector(d, s); m.lookAt(m.position.clone().add(d)); if (s > Ln) { scene.remove(m); m.material.dispose(); return false; } return true; } });
  };
  // un modelo que flota: sigue la ola y se inclina con ella (yaw = rumbo)
  st.ride = (obj, x, z, yaw, k = 1) => {
    const e = 4, h = st.waveH(x, z), hx = st.waveH(x + e, z) - st.waveH(x - e, z), hz = st.waveH(x, z + e) - st.waveH(x, z - e);
    obj.position.set(x, h, z); obj.rotation.order = 'YXZ'; obj.rotation.set(-Math.atan2(hz, 2 * e) * k, yaw, Math.atan2(hx, 2 * e) * k);
  };
  st.update = (dt) => {
    st.t += dt; seaU.uT.value = st.t;
    sea.position.set(Math.round(cam.position.x / 14) * 14, 0, Math.round(cam.position.z / 14) * 14);
    sky.position.copy(cam.position); stars.position.copy(cam.position);
    for (let i = st.fx.length - 1; i >= 0; i--) if (!st.fx[i].update(dt)) st.fx.splice(i, 1);
  };
  st.dispose = () => { removeEventListener('resize', size); renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); };
  return st;
}

// playa y acantilados de Normandía (malla de alturas); z>0 hacia el mar
function makeBeach(scene) {
  const terrH = (x, z) => {
    const n = Math.sin(x * 0.07) * 1.2 + Math.sin(x * 0.19 + z * 0.1) * 0.6 + Math.sin(z * 0.21) * 0.4;
    if (z > 6) return -0.2 - (z - 6) * 0.07 + n * 0.1;
    if (z > -34) return 0.1 + (6 - z) * 0.05 + n * 0.12;
    const cl = sstep(-34, -72, z);
    return 2 + cl * (21 + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.17) * 2.5) + n * 0.5 + (z < -72 ? (-z - 72) * 0.04 : 0);
  };
  const tg = new THREE.PlaneGeometry(520, 230, 130, 58); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -85);
  const p = tg.attributes.position, col = new Float32Array(p.count * 3), sand = new THREE.Color(0xb3a37c), wet = new THREE.Color(0x8a7d5e), grass = new THREE.Color(0x5b6a3a), rock = new THREE.Color(0x7d786a);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = terrH(x, z); p.setY(i, h);
    const c = h < 0.5 ? wet.clone().lerp(sand, sstep(-0.5, 0.5, h)) : (z > -38 ? sand.clone() : grass.clone().lerp(rock, sstep(6, 22, h) * 0.8 + Math.abs(Math.sin(x * 0.2 + z)) * 0.18));
    if (z > -38 && h >= 0.5) c.lerp(grass, sstep(-26, -36, z) * 0.7);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true })); terrain.frustumCulled = false; scene.add(terrain);
  return { terrH, terrain };
}

// terreno llano con hierba para las escenas de campo
function makeField(scene, size = 1800) {
  const g = new THREE.PlaneGeometry(size, size, 90, 90); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), a = new THREE.Color(0x5a6638), b = new THREE.Color(0x474f2c), c2 = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const n = Math.sin(x * 0.03) * Math.sin(z * 0.04) * 0.5 + 0.5 + Math.sin(x * 0.11 + z * 0.07) * 0.15; c2.copy(a).lerp(b, clamp(n, 0, 1)); col[i * 3] = c2.r; col[i * 3 + 1] = c2.g; col[i * 3 + 2] = c2.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.frustumCulled = false; scene.add(m); return m;
}
function tree(h = 9) { return mesh(merge([P(CYL(0.25, 0.35, h * 0.35, 6), 0x3b2e20, 0, h * 0.17, 0), P(new THREE.ConeGeometry(h * 0.32, h * 0.8, 7), 0x2d3a22, 0, h * 0.62, 0), P(new THREE.ConeGeometry(h * 0.24, h * 0.6, 7), 0x35432a, 0, h * 0.92, 0)])); }

// ================================================================== guion y recursos
let GUION = null;
export async function loadGuion() {
  if (!GUION) GUION = await fetch('assets/historia/guion.json').then(r => r.json());
  return GUION;
}
const audioDur = (src) => new Promise(res => {
  const a = new Audio(); a.preload = 'metadata'; const done = (d) => res(isFinite(d) && d > 0 ? d : 8);
  a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(0); setTimeout(() => done(0), 6000); a.src = src;
});
const preloadImg = (src) => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

// ================================================================== interfaz de la cinemática (capas, subtítulos, efectos de película)
let cssDone = false;
function injectCss() {
  if (cssDone) return; cssDone = true;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), id = x.createImageData(128, 128);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  x.putImageData(id, 0, 0);
  const st = document.createElement('style');
  st.textContent = `
#histOverlay{position:fixed;inset:0;z-index:60000;background:#000;overflow:hidden;font-family:Oswald,Rajdhani,'Segoe UI',sans-serif;color:#fff;user-select:none}
#histOverlay .L{position:absolute;inset:0;opacity:0;transition:opacity .8s ease}
#histOverlay .L.on{opacity:1}
#histOverlay canvas.h3d{position:absolute;inset:0;width:100%;height:100%}
#histOverlay .hmap canvas{position:absolute;inset:0;width:100%;height:100%}
#histOverlay .hphoto{background:#000}
#histOverlay .hphoto .bg{position:absolute;inset:-6%;background-size:cover;background-position:center;filter:blur(22px) brightness(.4) grayscale(.5)}
#histOverlay .hphoto .kb{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;will-change:transform}
#histOverlay .hphoto img{max-width:100%;max-height:100%;box-shadow:0 0 60px #000;filter:grayscale(.75) sepia(.35) contrast(1.08)}
#histOverlay .hphoto img.cover{width:100%;height:100%;object-fit:cover;box-shadow:none}
#histOverlay .hphoto img.contain{max-height:80%;max-width:80%}
#histOverlay .hcard{background:#050607;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px}
#histOverlay .hcard div{opacity:0;animation:hcIn 1.4s forwards}
#histOverlay .hcard .l0{font-size:clamp(14px,2vw,22px);letter-spacing:8px;color:#d69f0f}
#histOverlay .hcard .l1{font-size:clamp(30px,6vw,78px);font-weight:700;letter-spacing:3px;animation-delay:.9s}
#histOverlay .hcard .l2{font-size:clamp(14px,2.2vw,26px);color:#c9c2ae;font-family:Georgia,serif;font-style:italic;animation-delay:1.9s}
@keyframes hcIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
#histOverlay .hfx{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 52%,rgba(0,0,0,.62) 100%)}
#histOverlay .hgrain{position:absolute;inset:-50%;pointer-events:none;opacity:.075;mix-blend-mode:overlay;background:url(${c.toDataURL()});animation:hGrain .7s steps(7) infinite}
@keyframes hGrain{0%{transform:translate(0,0)}14%{transform:translate(-6%,4%)}28%{transform:translate(5%,-7%)}42%{transform:translate(-3%,9%)}57%{transform:translate(8%,3%)}71%{transform:translate(-9%,-5%)}85%{transform:translate(4%,6%)}100%{transform:translate(0,0)}}
#histOverlay .hbar{position:absolute;left:0;right:0;background:#000;height:9.5%}
#histOverlay .hsub{position:absolute;left:9%;right:9%;bottom:11.5%;text-align:center;font-size:clamp(15px,2.1vw,27px);line-height:1.38;opacity:0;transition:opacity .45s;text-shadow:0 2px 6px #000,0 0 16px #000;font-family:Georgia,serif;font-style:italic}
#histOverlay .hcap{position:absolute;left:5%;top:13%;max-width:60%;opacity:0;transition:opacity .6s;letter-spacing:3px;font-size:clamp(11px,1.45vw,17px);text-shadow:0 2px 8px #000;border-left:3px solid #d69f0f;padding:2px 0 2px 12px;text-transform:uppercase}
#histOverlay .htitle{position:absolute;left:0;right:0;top:36%;text-align:center;opacity:0;transition:opacity 1.2s;text-shadow:0 3px 18px #000;pointer-events:none}
#histOverlay .htitle .a{font-size:clamp(12px,1.6vw,18px);letter-spacing:9px;color:#d69f0f}
#histOverlay .htitle .b{font-size:clamp(34px,6.4vw,88px);font-weight:700;letter-spacing:4px;line-height:1.05;margin:8px 0}
#histOverlay .htitle .c{font-size:clamp(14px,2vw,24px);letter-spacing:6px;color:#e3d9bd}
#histOverlay .hskip{position:absolute;right:2.5%;top:11.5%;background:rgba(0,0,0,.55);color:#e8d9a8;border:1px solid rgba(214,159,15,.6);padding:7px 16px;letter-spacing:3px;cursor:pointer;font-size:12px;z-index:5}
#histOverlay .hprog{position:absolute;left:0;bottom:0;height:3px;background:#d69f0f;width:0}
#histOverlay .hfade{position:absolute;inset:0;background:#000;opacity:1;transition:opacity 1s;pointer-events:none}
#histOverlay .hload{position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;letter-spacing:6px;z-index:6}
#histOverlay .hload i{display:block;width:240px;height:3px;background:#222}#histOverlay .hload b{display:block;height:100%;width:0;background:#d69f0f}
#histOverlay .hdone{position:absolute;inset:0;background:rgba(0,0,0,.82);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;opacity:0;transition:opacity 1.2s;z-index:4;pointer-events:none}
#histOverlay .hdone .a{letter-spacing:8px;color:#d69f0f;font-size:clamp(13px,1.8vw,20px)}#histOverlay .hdone .b{font-size:clamp(28px,5vw,64px);font-weight:700;letter-spacing:3px}#histOverlay .hdone .c{max-width:70%;font-family:Georgia,serif;font-style:italic;font-size:clamp(14px,1.9vw,23px);color:#d6cfb8}`;
  document.head.appendChild(st);
}

function createOverlay() {
  injectCss();
  const root = document.createElement('div'); root.id = 'histOverlay';
  root.innerHTML = '<canvas class="h3d"></canvas><div class="L hmap"><canvas></canvas></div><div class="L hphoto"><div class="bg"></div><div class="kb"><img></div></div><div class="L hcard"></div>'
    + '<div class="hfx"></div><div class="hgrain"></div><div class="hbar" style="top:0"></div><div class="hbar" style="bottom:0"></div>'
    + '<div class="hcap"></div><div class="hsub"></div><div class="htitle"></div><div class="hdone"></div><div class="hprog"></div><button class="hskip">SALTAR ▸</button>'
    + '<div class="hfade"></div><div class="hload"><div class="t">CARGANDO CAPÍTULO</div><i><b></b></i></div>';
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  return { root, q, canvas3d: q('canvas.h3d'), mapEl: q('.hmap'), mapCanvas: q('.hmap canvas'), photoEl: q('.hphoto'), photoImg: q('.hphoto img'), photoBg: q('.hphoto .bg'), photoKb: q('.hphoto .kb'), cardEl: q('.hcard'), sub: q('.hsub'), cap: q('.hcap'), title: q('.htitle'), done: q('.hdone'), prog: q('.hprog'), skip: q('.hskip'), fade: q('.hfade'), load: q('.hload'), loadBar: q('.hload b') };
}

// ================================================================== utilidades de cámara
const e01 = (a, b, v) => sstep(a, b, v);
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function lookCam(cam, pos, target, roll = 0) { cam.position.set(pos[0], pos[1], pos[2]); cam.lookAt(target[0], target[1], target[2]); if (roll) cam.rotateZ(roll); }
const ZONE = {
  alemania: [[6.0, 51.0], [6.0, 53.3], [7.2, 53.6], [8.6, 54.9], [10.0, 54.8], [12.0, 54.4], [14.3, 53.9], [14.5, 52.5], [15.0, 51.0], [12.5, 50.2], [13.8, 48.7], [13.0, 47.6], [10.4, 47.5], [7.6, 47.6], [8.2, 49.0], [6.4, 49.5]],
  polonia: [[14.2, 53.9], [18.7, 54.4], [23.5, 54.3], [23.8, 52.0], [23.6, 50.4], [22.6, 49.1], [19.0, 49.4], [15.0, 50.9], [14.5, 52.5]],
  austria: [[9.6, 47.4], [13.0, 47.6], [13.8, 48.7], [16.9, 48.1], [17.0, 47.0], [14.5, 46.4], [12.2, 46.9], [10.4, 46.8]],
  checos: [[12.1, 50.3], [14.5, 51.0], [16.5, 50.3], [18.8, 49.6], [17.0, 48.8], [15.0, 48.9], [13.0, 49.5]],
  francia: [[-4.7, 48.5], [-1.4, 49.7], [2.5, 51.0], [4.5, 50.0], [6.4, 49.4], [7.6, 47.6], [7.0, 45.9], [6.9, 44.3], [4.0, 43.4], [3.0, 42.5], [-1.8, 43.4], [-1.2, 46.0], [-2.2, 47.2]],
  noruega: [[5, 58.5], [5.2, 62], [10, 64.2], [14, 67.5], [19, 70], [28, 71], [24, 69.5], [17, 68], [12, 64], [11, 60], [8, 58.5]],
  dinamarca: [[8.1, 55.5], [8.3, 57.0], [10.5, 57.7], [10.8, 56.2], [10.9, 54.9], [9.8, 54.8]],
  benelux: [[3.3, 51.3], [4.2, 52.2], [5, 53.4], [7, 53.2], [6.0, 51.0], [6.0, 50.0], [4.5, 49.7], [2.6, 50.8]],
  urss: [[23.8, 52.0], [28, 56], [31, 60], [46, 62], [46, 45], [38, 46.5], [30, 47], [26, 48.5], [23.6, 50.4]],
  inglaterra: [[-5.7, 50], [-3, 50.4], [1.4, 51.2], [1.7, 52.8], [0, 53.6], [-1.8, 55.5], [-3.2, 53.4], [-4.6, 52.5], [-5.2, 51.7], [-4, 51.2]]
};
const RED = '#c0392b', GOLD = '#e8c050', BLUE = '#4a8fd6', GREY = '#aab4bc';

// ================================================================== CAPÍTULOS
// Cada constructor recibe X = { S: escenario 3D, A: audio, ov: capa HTML } y devuelve la lista de planos.
// Un plano = { segs:[{ to, kind:'map'|'photo'|'card'|'3d', ..., caption, enter(), update(u, dt) }] } con `to` = fracción del plano.
const CH = {};

CH[1] = async (X) => {
  const { S, A } = X, scene = S.scene;
  S.setPreset('dday'); S.setSea(1.0, 1);
  const G = new THREE.Group(); G.visible = false; scene.add(G);
  const { terrH } = makeBeach(G);
  // defensas: erizos checos y búnkeres con sus defensores
  const hedges = []; for (let i = 0; i < 30; i++) { const h = (await W.makeDeco('hedgehog', R(2.2, 3.0))) || hedgehog(); const x = R(-150, 150), z = R(-6, 22); h.position.set(x, Math.max(terrH(x, z), -0.8) + 0.05, z); h.rotation.y = R(0, 6.28); G.add(h); hedges.push(h); }
  const bunkers = [[-60, -78], [-8, -86], [42, -80], [92, -84], [-110, -76]];
  const defenders = [];
  // sacos de arena y cajas de munición junto a cada búnker
  const decoBunker = async (bx, bz) => { for (let i = 0; i < 3; i++) { const s = await W.makeDeco("sandbags", 2.4); if (!s) break; const x = bx - 8 + i * 4, z = bz + 11 + (i % 2) * 0.6; s.position.set(x, terrH(x, z), z); s.rotation.y = R(-0.15, 0.15); G.add(s); } for (let i = 0; i < 2; i++) { const a = await W.makeDeco("ammo", 0.9); if (!a) break; const x = bx + 6.5 + i * 1.2, z = bz + 8; a.position.set(x, terrH(x, z) + 0.05, z); a.rotation.y = R(0, 6); G.add(a); } };
  for (const [bx, bz] of bunkers) {
    const b = bunker(); b.position.set(bx, terrH(bx, bz) + 0.2, bz); G.add(b); await decoBunker(bx, bz);
    for (const sx of [-1, 1]) { const g = await W.makeGuard(0); if (!g) continue; g.position.set(bx + sx * 6.8, terrH(bx + sx * 6.8, bz + 6.5) + 0.05, bz + 6.5); g.rotation.y = R(-0.4, 0.4); G.add(g); defenders.push(g); }
  }
  // lanchas Higgins
  const boats = []; const lanes = 13;
  for (let r = 0; r < 2; r++) for (let i = 0; i < lanes; i++) {
    const b = await W.makeBoat(); if (!b) break;
    b.userData = Object.assign(b.userData, { x0: -96 + i * 16 + R(-2, 2), z0: 120 + r * 46 + R(-8, 8), stopZ: 22 + R(-3, 10), sp: R(5.2, 6.4), ph: R(0, 6.28) });
    b.userData.ramp(0); G.add(b); boats.push(b);
  }
  const hero = await W.makeBoat(); if (hero) { hero.userData.ramp(0); G.add(hero); }
  const planes = []; for (let i = 0; i < 6; i++) { const b = await W.makeBomber(); if (!b) break; b.userData.dx = (i % 3 - 1) * 70 + R(-8, 8); b.userData.dz = Math.floor(i / 3) * 60 + R(-8, 8); G.add(b); planes.push(b); b.visible = false; }
  const sunsetSky = { on: false };
  let off = 0, boom = 0, trace = 0, heroZ = 260, heroX = 0, ramp = 0, flyZ = 0, smokeT = 0;
  const heroPose = () => { if (!hero) return; S.ride(hero, heroX, heroZ, 0, 0.8); if (hero.userData.prop) hero.userData.prop.rotation.z += 0.5; hero.userData.ramp(ramp); };
  const moveBoats = (dt, go = true) => {
    if (go) off += dt;
    for (const b of boats) { const d = b.userData; const z = Math.max(d.stopZ, d.z0 - d.sp * off); S.ride(b, d.x0, z, 0, z > 30 ? 0.9 : 0.35); if (d.prop) d.prop.rotation.z += dt * (z > d.stopZ ? 18 : 3); }
    if (hero) heroPose();
  };
  const bombers = (dt, on) => { for (const p of planes) { p.visible = on; if (!on) continue; p.position.set(p.userData.dx, 160 + Math.sin(S.t * 0.5 + p.userData.dx) * 2, p.userData.dz + flyZ); p.userData.mixer.update(dt); } };
  const shelling = (dt, rate, zr = [-30, 12]) => { boom -= dt; if (boom <= 0) { boom = R(0.25, 0.7) * rate; const x = R(-110, 110), z = R(zr[0], zr[1]); S.fire(V(x, terrH(x, z) + 1.5, z), R(9, 17), true); A.boom(R(0.4, 0.8), false, clamp(x / 100, -1, 1)); } };
  const defenderFire = (dt, tx, tz) => { trace -= dt; if (trace <= 0) { trace = R(0.07, 0.2); const [bx, bz] = bunkers[Math.floor(R(0, bunkers.length))]; const o = V(bx + R(-3, 3), terrH(bx, bz) + 3.6, bz + 4.3); S.flash(o, 3.5); for (let i = 0; i < 3; i++) setTimeout(() => S.tracer(o.clone(), V(tx + R(-8, 8), 1.2, tz + R(-12, 12)), 280), i * 55); if (Math.random() < 0.35) A.burst(3, 0.13, clamp(bx / 120, -1, 1)); } };
  const seaSmoke = (dt) => { smokeT -= dt; if (smokeT <= 0) { smokeT = 0.3; for (const p of [[-24, 2], [52, 4], [-70, -52], [80, -46]]) S.smoke(V(p[0] + R(-1, 1), 2, p[1]), R(8, 14), R(7, 11), R(4, 7), 3, 0x2b2927); } };
  const heroCam = (a, b) => { const p = new THREE.Vector3(...a); hero.localToWorld(p); const tg = new THREE.Vector3(...b); hero.localToWorld(tg); S.cam.position.copy(p); S.cam.lookAt(tg); };
  const common = (dt, sh = 1.2) => { moveBoats(dt); seaSmoke(dt); shelling(dt, sh, [-30, 8]); };
  return [
    // 0 · la flota cruza el Canal al amanecer
    { segs: [{ to: 1, kind: '3d', caption: '6 de junio de 1944 · 06:30 · el Canal de la Mancha',
      enter() { G.visible = true; S.setPreset('dday'); S.setSea(1.0, 1); S.sea.visible = true; off = 0; heroZ = 260; ramp = 0; flyZ = 300; A.ambience({ sea_bad: 0.5, boat: 0.7, wind: 0.5 }); },
      update(u, dt) {
        common(dt, 1.6); flyZ -= 90 * dt; bombers(dt, true);
        const k = e01(0, 1, u), cz = 330 - off * 5.5 + 38;
        lookCam(S.cam, [lerp(-8, 22, k), lerp(34, 11, k), cz + lerp(40, 26, k)], [0, lerp(8, 3, k), cz - 150 - k * 30]);
      } }] },
    // 1 · los aviones abren el camino
    { segs: [{ to: 1, kind: '3d', caption: 'Miles de aviones aliados sobrevuelan la costa',
      enter() { G.visible = true; S.setPreset('dday'); S.sea.visible = true; flyZ = 330 - off * 5.5 + 200; A.ambience({ sea_bad: 0.4, planes: 0.9, wind: 0.4 }); },
      update(u, dt) {
        common(dt, 1.2); flyZ -= 80 * dt; bombers(dt, true);
        const cz = 330 - off * 5.5 + 20;
        lookCam(S.cam, [lerp(-40, -26, u), 7, cz], [0, 150, flyZ - 20]);
      } }] },
    // 2 · dentro de la lancha
    { segs: [{ to: 1, kind: '3d', caption: 'A bordo de una lancha de desembarco LCVP',
      enter() { G.visible = true; S.setPreset('dday'); S.sea.visible = true; heroZ = 250; ramp = 0; A.ambience({ sea_bad: 0.6, boat: 0.9, wind: 0.5 }); bombers(0, true); },
      update(u, dt) {
        heroZ = Math.max(70, heroZ - 7 * dt); heroX = Math.sin(S.t * 0.2) * 1.5; moveBoats(dt); flyZ -= 90 * dt; bombers(dt, true); seaSmoke(dt);
        boom -= dt; if (boom <= 0) { boom = R(0.35, 0.8); const x = heroX + R(-40, 40), z = heroZ - R(45, 160); S.plume(x, z, R(0.9, 1.6)); A.splash(0.45, clamp(x / 60, -1, 1)); A.boom(0.4, false, R(-1, 1)); }
        heroCam([0.35, 4.3, 1.6], [0, 2.2, -26]); S.cam.rotateX(0.03 + 0.04 * Math.sin(S.t * 0.7)); S.cam.rotateZ(Math.sin(S.t * 0.9) * 0.015);
      } }] },
    // 3 · las defensas alemanas desde la playa
    { segs: [{ to: 1, kind: '3d', caption: 'El Muro del Atlántico · búnkeres, erizos checos y sacos de arena',
      enter() { G.visible = true; S.setPreset('dday'); S.sea.visible = true; bombers(0, false); A.ambience({ coast: 0.8, sea: 0.5, wind: 0.4 }); },
      update(u, dt) {
        moveBoats(dt); seaSmoke(dt); shelling(dt, 0.8, [-34, 14]); defenderFire(dt, lerp(-10, 20, u), 30);
        const bx = -8, bz = -86, th = terrH(bx + 16, bz + 24), th2 = terrH(bx, bz + 8);
        lookCam(S.cam, [bx + lerp(22, 12, u), th + 3.4, bz + lerp(28, 20, u)], [bx + lerp(3, -3, u), th2 + 2.6, bz + 8]);
      } }] },
    // 4 · el fuego sobre las lanchas
    { segs: [{ to: 1, kind: '3d', caption: 'Obuses y ametralladoras sobre las lanchas',
      enter() { G.visible = true; S.setPreset('dday'); S.sea.visible = true; heroZ = 140; A.ambience({ sea_bad: 0.6, boat: 0.7, coast: 0.5, wind: 0.5 }); },
      update(u, dt) {
        heroZ = Math.max(70, heroZ - 6 * dt); moveBoats(dt); seaSmoke(dt); shelling(dt, 0.8, [-34, 12]); defenderFire(dt, heroX, heroZ - 20);
        boom -= dt * 2; if (boom <= 0) { boom = R(0.25, 0.6); const x = heroX + R(-35, 35), z = heroZ - R(15, 90); S.plume(x, z, R(1.0, 1.8)); A.splash(0.5, clamp(x / 60, -1, 1)); A.boom(0.5, false, R(-1, 1)); }
        const p = new THREE.Vector3(lerp(24, 16, u), 4.5, 26); hero.localToWorld(p); const tg = new THREE.Vector3(0, 2, -18); hero.localToWorld(tg);
        S.cam.position.copy(p); S.cam.lookAt(tg);
      } }] },
    // 5 · cae la rampa
    { segs: [{ to: 1, kind: '3d', caption: 'Playa de Omaha · las rampas se abren',
      enter() { this._r = false; G.visible = true; S.setPreset('dday'); S.sea.visible = true; A.ambience({ sea_bad: 0.5, boat: 0.5, coast: 0.8, wind: 0.4 }); bombers(0, false); },
      update(u, dt) {
        heroZ = Math.max(40, heroZ - 5 * dt); moveBoats(dt); seaSmoke(dt); shelling(dt, 0.9, [-34, 16]); defenderFire(dt, heroX, heroZ - 8);
        ramp = e01(0.12, 0.38, u); if (ramp > 0 && !this._r) { this._r = true; SFX.play('door', { vol: 0.8 }); }
        const k = e01(0, 1, u);
        const p = new THREE.Vector3(lerp(13, 10, k), lerp(5.0, 3.8, k), 11); hero.localToWorld(p); const tg = new THREE.Vector3(-0.5, 1.5, -12); hero.localToWorld(tg);
        S.cam.position.copy(p); S.cam.lookAt(tg.x, tg.y + k * 1.5, tg.z);
      } }] },
    // 6 · la foto real y la playa
    { segs: [
      { to: 0.5, kind: 'photo', photo: 'landing', fit: 'cover', kb: [1.0, 0.02, 0, 1.16, -0.03, 0.01], caption: 'Soldados desembarcando en las playas de Normandía · 6 de junio de 1944' },
      { to: 1, kind: '3d', caption: 'Omaha Beach · la resistencia es feroz',
        enter() { G.visible = true; S.setPreset('dday'); S.sea.visible = true; A.ambience({ coast: 0.9, sea: 0.4, wind: 0.4 }); },
        update(u, dt) { moveBoats(dt); seaSmoke(dt); shelling(dt, 0.6, [-30, 14]); defenderFire(dt, lerp(-30, 40, u), 12); lookCam(S.cam, [lerp(60, 20, u), lerp(14, 6, u), 70], [lerp(-20, 0, u), 3, 0]); } }
    ] },
    // 7 · anochece
    { segs: [{ to: 1, kind: '3d', caption: 'Normandía · el comienzo de la liberación de Europa',
      enter() { G.visible = true; S.setPreset('dusk'); S.setSea(0.8, 1); S.sea.visible = true; bombers(0, false); A.ambience({ coast: 0.9, sea: 0.4, wind: 0.3 }); },
      update(u, dt) { moveBoats(dt, false); seaSmoke(dt); const k = e01(0, 1, u); lookCam(S.cam, [lerp(-40, 30, k), lerp(5, 22, k), lerp(90, 62, k)], [lerp(0, 10, k), lerp(5, 12, k), -40]); } }] }
  ];
};

// Locución: cadena de estudio (filtro grave, cuerpo cálido, presencia, compresión y un poco de sala) para que suene a narrador de documental
let narrChain = null;
function mastered(el) {
  try {
    SFX.init(); const ctx = SFX.ctx; if (!ctx) return;
    if (!narrChain) {
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 75;
      const warm = ctx.createBiquadFilter(); warm.type = 'lowshelf'; warm.frequency.value = 190; warm.gain.value = 5;
      const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3000; pres.Q.value = 0.9; pres.gain.value = 2.5;
      const air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 7500; air.gain.value = -3;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -22; comp.ratio.value = 3.2; comp.attack.value = 0.01; comp.release.value = 0.25;
      const len = ctx.sampleRate * 1.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      const conv = ctx.createConvolver(); conv.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.16; const out = ctx.createGain(); out.gain.value = 1.35;
      hp.connect(warm); warm.connect(pres); pres.connect(air); air.connect(comp); comp.connect(out); comp.connect(conv); conv.connect(wet); wet.connect(out); out.connect(ctx.destination);
      narrChain = { input: hp };
    }
    ctx.createMediaElementSource(el).connect(narrChain.input);
  } catch (e) { console.warn('[historia] cadena de voz', e); }
}

// ================================================================== reproductor de capítulos
const NEEDS_3D = new Set([1]);
const MOOD = { 1: (k) => k < 0.8 ? 0.4 + 0.6 * (k / 0.8) : 0.55 - (k - 0.8) * 1.2 };

export async function getChapters() { return (await loadGuion()).chapters; }

export async function playChapter(id, { onEnd, beat: startBeat = 0 } = {}) {
  seed = 4321 + id * 17;
  const guion = await loadGuion(); const meta = guion.chapters.find(c => c.id === id);
  const ov = createOverlay();
  let ended = false, raf = 0, S = null, A = null, narr = null, onResize = null;
  const cleanup = () => {
    cancelAnimationFrame(raf); removeEventListener('keydown', onKey); removeEventListener('resize', onResize);
    try { narr && narr.pause(); } catch (e) {} try { A && A.stop(); } catch (e) {} try { S && S.dispose(); } catch (e) {}
    setTimeout(() => ov.root.remove(), 700); ov.root.style.transition = 'opacity .6s'; ov.root.style.opacity = 0;
  };
  const finish = (done) => { if (ended) return; ended = true; cleanup(); if (onEnd) onEnd(!!done, meta); };
  const onKey = (e) => { if (e.code === 'Escape') finish(false); };
  addEventListener('keydown', onKey); ov.skip.addEventListener('click', () => finish(false));
  ov.root.querySelector('.hfade').style.opacity = 1;
  try {
    // ---- carga: locución, fotos, modelos
    let n = 0; const total = meta.beats.length + 3; const tick = () => { ov.loadBar.style.width = Math.min(100, (++n / total) * 100) + '%'; };
    const durs = await Promise.all(meta.beats.map((_, i) => audioDur('assets/historia/audio/c' + id + '_' + i + '.wav').then(d => { tick(); return d; })));
    await Promise.all(Object.values(W.PHOTOS).map(preloadImg)); tick();
    if (NEEDS_3D.has(id)) S = createStage(ov.canvas3d);
    A = withSamples(createAudio());
    const X = { S, A, ov };
    const built = await CH[id](X); tick();
    const beats = Array.isArray(built) ? built : built.beats, tickFn = (built && built.tick) || null;
    if (ended) return;
    const bd = durs.map(d => Math.max(5.5, d + 1.5)), starts = [0]; bd.forEach(d => starts.push(starts[starts.length - 1] + d));
    const total_t = starts[starts.length - 1];
    if (A) { A.moodFn = (tf) => (MOOD[id] || (() => 0.4))(clamp(tf / total_t, 0, 1)); A.resume(); A.startMusic(); }
    ov.title.innerHTML = '<div class="a">CAPÍTULO ' + id + '</div><div class="b">' + meta.title.toUpperCase() + '</div><div class="c">' + meta.date + ' · ' + meta.place + '</div>';
    ov.load.style.display = 'none';
    // ---- mapa en 2D
    const mp = { base: null, w: 0, h: 0, x0: 0, y0: 0 };
    const layoutMap = () => {
      const dpr = Math.min(devicePixelRatio, 1.5), W0 = Math.round(innerWidth * dpr), H0 = Math.round(innerHeight * dpr);
      ov.mapCanvas.width = W0; ov.mapCanvas.height = H0;
      mp.h = Math.round(H0 * 0.80); mp.w = Math.round(mp.h * ASPECT); if (mp.w > W0 * 0.92) { mp.w = Math.round(W0 * 0.92); mp.h = Math.round(mp.w / ASPECT); }
      mp.x0 = Math.round((W0 - mp.w) / 2); mp.y0 = Math.round((H0 - mp.h) / 2) + Math.round(H0 * 0.01);
      mp.base = document.createElement('canvas'); mp.base.width = mp.w; mp.base.height = mp.h; drawBase(mp.base.getContext('2d'), mp.w, mp.h);
    };
    layoutMap(); onResize = () => layoutMap(); addEventListener('resize', onResize);
    const drawMap = (spec, u) => {
      const c = ov.mapCanvas.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = '#0b0e11'; c.fillRect(0, 0, ov.mapCanvas.width, ov.mapCanvas.height);
      c.save(); c.translate(mp.x0, mp.y0); c.drawImage(mp.base, 0, 0);
      c.beginPath(); c.rect(0, 0, mp.w, mp.h); c.clip(); drawLayers(c, mp.w, mp.h, Object.assign({ t: u }, spec)); c.restore();
      c.strokeStyle = 'rgba(214,159,15,.55)'; c.lineWidth = 2; c.strokeRect(mp.x0 - 1, mp.y0 - 1, mp.w + 2, mp.h + 2);
    };
    // ---- bucle
    let beatIdx = -1, segIdx = -1, curSeg = null, last = performance.now(); const t0 = last + 400 - starts[startBeat] * 1000;
    const setLayer = (kind) => {
      ov.mapEl.classList.toggle('on', kind === 'map'); ov.photoEl.classList.toggle('on', kind === 'photo'); ov.cardEl.classList.toggle('on', kind === 'card');
    };
    const enterBeat = (i) => {
      beatIdx = i; segIdx = -1;
      try { narr && narr.pause(); } catch (e) {}
      narr = new Audio('assets/historia/audio/c' + id + '_' + i + '.wav'); narr.volume = 1; mastered(narr); const p = narr.play(); if (p && p.catch) p.catch(() => {});
      ov.sub.textContent = meta.beats[i]; ov.sub.style.opacity = 1;
    };
    const enterSeg = (beat, si) => {
      segIdx = si; curSeg = beat.segs[si];
      if (S) { S.fovBase = 52; S.fit(); }
      setLayer(curSeg.kind);
      if (curSeg.kind === 'photo') {
        const src = W.PHOTOS[curSeg.photo]; ov.photoImg.src = src; ov.photoImg.className = curSeg.fit || 'cover';
        ov.photoBg.style.backgroundImage = 'url("' + encodeURI(src) + '")';
      } else if (curSeg.kind === 'card') {
        ov.cardEl.innerHTML = curSeg.lines.map((t, k) => '<div class="l' + k + '">' + t + '</div>').join('');
      }
      ov.cap.style.opacity = 0; if (curSeg.caption) { setTimeout(() => { if (curSeg === beat.segs[segIdx]) { ov.cap.textContent = curSeg.caption; ov.cap.style.opacity = 1; } }, 700); }
      if (curSeg.enter) curSeg.enter();
    };
    const frame = (now) => {
      if (ended) return; raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const el = (now - t0) / 1000;
      if (el < 0) return;
      ov.fade.style.opacity = el < 1.2 ? 1 - e01(0, 1, el) : (el > total_t ? 1 : 0);
      ov.prog.style.width = clamp(el / total_t, 0, 1) * 100 + '%';
      // título del capítulo
      ov.title.style.opacity = (el > 0.8 && el < 5.6) ? 1 : 0;
      if (el >= total_t + 0.8) { showDone(); return; }
      let bi = beatIdx; while (bi + 1 < beats.length && el >= starts[bi + 1]) bi++;
      if (bi < 0) bi = 0;
      if (bi !== beatIdx) enterBeat(bi);
      const beat = beats[beatIdx], bt = el - starts[beatIdx], u = clamp(bt / bd[beatIdx], 0, 1);
      ov.sub.style.opacity = bt < durs[beatIdx] + 0.4 ? 1 : 0;
      let si = 0; while (si < beat.segs.length - 1 && u >= beat.segs[si].to) si++;
      if (si !== segIdx) enterSeg(beat, si);
      const from = si ? beat.segs[si - 1].to : 0, su = clamp((u - from) / (beat.segs[si].to - from), 0, 1);
      if (tickFn) tickFn(dt);
      if (S) S.update(dt);
      if (curSeg.kind === 'map') drawMap(curSeg.map, su);
      else if (curSeg.kind === 'photo' && curSeg.kb) { const [s0, x0, y0, s1, x1, y1] = curSeg.kb, k = e01(0, 1, su); ov.photoKb.style.transform = 'translate(' + lerp(x0, x1, k) * 100 + '%,' + lerp(y0, y1, k) * 100 + '%) scale(' + lerp(s0, s1, k) + ')'; }
      if (curSeg.update && curSeg.kind === '3d') curSeg.update(su, dt);
      if (S) S.renderer.render(S.scene, S.cam);
    };
    const showDone = () => {
      if (ov.done.dataset.on) return; ov.done.dataset.on = 1; cancelAnimationFrame(raf);
      ov.done.innerHTML = '<div class="a">HECHO DESBLOQUEADO</div><div class="b">' + meta.title.toUpperCase() + '</div><div class="c">' + meta.summary + '</div>';
      ov.done.style.opacity = 1; ov.fade.style.opacity = 0;
      setTimeout(() => finish(true), 4200);
    };
    enterBeat(startBeat); raf = requestAnimationFrame(frame);
  } catch (e) { console.error('[historia]', e); finish(false); }
  return { skip: () => finish(false) };
}
