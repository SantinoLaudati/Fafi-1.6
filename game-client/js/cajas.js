// Cajas: configuración, miniaturas/visor 3D de la caja y la secuencia de apertura (modelo assets/Cajas).
// La caja siempre se muestra de frente (con la etiqueta hacia la cámara); la tapa se abre con una bisagra propia en el borde trasero.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SFX } from './sfx.js';
import { RARITY, WEAPON_LABEL, buildSkinModel } from './skins.js';

const CRATE_FILE = 'assets/Cajas/optimizados/caja_1k.glb';
export const CRATES = {
  basic: { id: 'basic', name: 'CAJA BÁSICA', tag: 'Equipo de campaña', price: 200, color: 0xb4bdc9, odds: { comun: 85, epica: 15, legendaria: 0 } },
  advanced: { id: 'advanced', name: 'CAJA AVANZADA', tag: 'Material de élite', price: 500, color: 0xa64df0, odds: { comun: 30, epica: 50, legendaria: 20 } },
  legendary: { id: 'legendary', name: 'CAJA CLASIFICADA', tag: 'Alto secreto', price: 1000, color: 0xffb81c, odds: { comun: 0, epica: 50, legendaria: 50 } }
};
const loader = new GLTFLoader();
let crateGLB = null, crateLoading = null, movers = null;
export function preloadCrate() {
  if (!crateLoading) crateLoading = loader.loadAsync(CRATE_FILE).then(g => { crateGLB = g; return g; }).catch(e => { console.warn('[cajas] caja', e); return null; });
  return crateLoading;
}

function glowTexture(inner = 0.35) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(inner, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function beamTexture() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 128); const t = new THREE.CanvasTexture(c); return t;
}
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const easeIO = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const backOut = (t) => { t = Math.min(1, Math.max(0, t)); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// Caja lista para usar: 2,6 de ancho, base en y=0, centrada, con la tapa (y su asa) colgando de una bisagra trasera propia.
export function buildCrate() {
  const root = new THREE.Group(), model = crateGLB.scene.clone(true);
  const m0 = new THREE.AnimationMixer(model), act = m0.clipAction(crateGLB.animations[0]); act.play();
  // piezas que se mueven en la animación original (tapa y asa): se detectan una vez
  if (!movers) {
    const probe = crateGLB.scene.clone(true), mx = new THREE.AnimationMixer(probe), a = mx.clipAction(crateGLB.animations[0]); a.play();
    const meshes = []; probe.traverse(o => { if (o.isMesh) meshes.push(o); });
    const snap = (t) => { mx.setTime(t); probe.updateMatrixWorld(true); return meshes.map(o => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())); };
    const a0 = snap(0), a1 = snap(7.6); movers = new Set(); meshes.forEach((o, i) => { if (a0[i].distanceTo(a1[i]) > 0.4) movers.add(o.name); });
  }
  m0.setTime(0); model.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(model), size = b.getSize(new THREE.Vector3());
  const s = 2.6 / Math.max(size.x, size.z); model.scale.setScalar(s); model.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(model); model.position.set(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2);
  root.add(model); root.updateMatrixWorld(true);
  model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; } });
  const lids = []; model.traverse(o => { if (o.isMesh && movers.has(o.name)) lids.push(o); });
  const hinge = new THREE.Group(); root.add(hinge);
  if (lids.length) {
    const lb = new THREE.Box3(); lids.forEach(o => lb.expandByObject(o));
    hinge.position.set(0, lb.min.y + (lb.max.y - lb.min.y) * 0.1, lb.min.z + 0.02); root.updateMatrixWorld(true);
    // la bisagra queda en el borde trasero (el lado -Z, opuesto a la etiqueta frontal con la que se muestra la caja)
    lids.forEach(o => hinge.attach(o));
  }
  root.userData.hinge = hinge; root.userData.size = [2.6, b2.max.y - b2.min.y, 2.6 * size.z / Math.max(size.x, size.z)];
  root.userData.open = (angle) => { hinge.rotation.x = -angle; };    // 0 = cerrada, ~1,85 = abierta hacia atrás
  return root;
}

// ---------------------------------------------------------------- miniaturas y visor de la caja para la tienda
let thumbR = null; const thumbs = new Map();
export async function crateThumb(tier, w = 420, h = 300) {
  const key = tier + w; if (thumbs.has(key)) return thumbs.get(key);
  await preloadCrate(); if (!crateGLB) return '';
  if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setPixelRatio(1); }
  thumbR.setSize(w, h, false);
  const sc = new THREE.Scene(), col = new THREE.Color(CRATES[tier].color);
  sc.add(new THREE.HemisphereLight(0xdfe8ff, 0x303846, 1.6)); const k = new THREE.DirectionalLight(0xffffff, 2.4); k.position.set(2, 4, 5); sc.add(k);
  const r = new THREE.DirectionalLight(col, 3.0); r.position.set(-4, 2, -2); sc.add(r);
  const c = buildCrate(); c.userData.open(tier === 'basic' ? 0 : tier === 'advanced' ? 0.25 : 0.4); c.rotation.y = -0.45; sc.add(c);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 50); cam.position.set(1.6, 2.6, 6.4); cam.lookAt(0, 0.6, 0);
  thumbR.render(sc, cam); const url = thumbR.domElement.toDataURL('image/png');
  sc.traverse(o => { if (o.geometry) o.geometry.dispose(); }); thumbs.set(key, url); return url;
}
export async function createCrateViewer(canvas, tier) {
  await preloadCrate(); if (!crateGLB) return { dispose() {}, setTier() {} };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x303846, 1.6)); const k = new THREE.DirectionalLight(0xffffff, 2.4); k.position.set(2, 4, 5); scene.add(k);
  const rim = new THREE.DirectionalLight(0xffffff, 3.0); rim.position.set(-4, 2, -2); scene.add(rim);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ map: glowTexture(0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; scene.add(glow);
  const crate = buildCrate(); scene.add(crate);
  const pl = new THREE.PointLight(0xffffff, 0, 6, 1.6); pl.position.set(0, 0.8, 0); scene.add(pl);
  const st = { yaw: -0.5, vy: 0.006, drag: false, last: 0, t: 0, tier };
  const setTier = (t) => { st.tier = t; const c = new THREE.Color(CRATES[t].color); rim.color.copy(c); glow.material.color.copy(c); pl.color.copy(c); };
  setTier(tier);
  const resize = () => { const w = canvas.clientWidth || 500, h = canvas.clientHeight || 320; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }; resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas); canvas.style.cursor = 'grab'; canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => { st.drag = true; st.last = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!st.drag) return; const dx = e.clientX - st.last; st.last = e.clientX; st.yaw += dx * 0.012; st.vy = dx * 0.001; });
  canvas.addEventListener('pointerup', () => { st.drag = false; });
  let raf = 0, last = performance.now();
  const loop = (now) => {
    raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; st.t += dt;
    if (!st.drag) { st.yaw += st.vy; st.vy += (0.006 - st.vy) * Math.min(1, dt * 2); }
    crate.rotation.y = st.yaw; const lid = 0.12 + 0.1 * Math.sin(st.t * 1.4) + (st.tier === 'legendary' ? 0.25 : st.tier === 'advanced' ? 0.1 : 0);
    crate.userData.open(lid); pl.intensity = (st.tier === 'basic' ? 2 : 6) * (0.7 + 0.3 * Math.sin(st.t * 3)); glow.material.opacity = 0.55 + 0.2 * Math.sin(st.t * 2);
    const d = Math.max(7.0, 7.0 * (1.5 / cam.aspect)); cam.position.set(0, 2.9, d); cam.lookAt(0, 0.7, 0); renderer.render(scene, cam);
  };
  raf = requestAnimationFrame(loop);
  return { setTier, dispose() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); } };
}

// ---------------------------------------------------------------- secuencia de apertura
export async function openCrate({ skin, boxType = 'basic', refund = 0 }) {
  await preloadCrate();
  const rar = RARITY[skin.rarity] || RARITY.comun, accent = new THREE.Color(rar.hex), tier = skin.rarity === 'legendaria' ? 3 : skin.rarity === 'epica' ? 2 : 1;
  const hexs = '#' + accent.getHexString(), crateCol = new THREE.Color(CRATES[boxType].color);
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;z-index:70000;background:radial-gradient(ellipse at 50% 62%,#1a2130 0%,#06070a 72%);overflow:hidden;font-family:Oswald,Rajdhani,Segoe UI,sans-serif;color:#fff;user-select:none';
  root.innerHTML = '<canvas style="position:absolute;inset:0;width:100%;height:100%"></canvas>'
    + '<div class="cj-bar" style="position:absolute;left:0;right:0;top:0;height:0;background:#000;transition:height 1.2s"></div><div class="cj-bar2" style="position:absolute;left:0;right:0;bottom:0;height:0;background:#000;transition:height 1.2s"></div>'
    + '<div class="cj-title" style="position:absolute;top:8%;left:0;right:0;text-align:center;font-size:clamp(16px,2.6vw,30px);letter-spacing:10px;color:#d69f0f;text-shadow:0 2px 14px #000"></div>'
    + '<div class="cj-sub" style="position:absolute;top:calc(8% + 42px);left:0;right:0;text-align:center;font-size:clamp(11px,1.3vw,15px);letter-spacing:6px;color:#9aa3ad;opacity:.0;transition:opacity 1s"></div>'
    + '<div class="cj-name" style="position:absolute;bottom:16%;left:0;right:0;text-align:center;text-shadow:0 3px 20px #000"></div>'
    + '<button class="cj-ok" style="position:absolute;bottom:6%;left:50%;transform:translateX(-50%);opacity:0;pointer-events:none;transition:opacity .6s;background:#d69f0f;color:#111;border:0;padding:13px 44px;font-size:16px;font-weight:800;letter-spacing:5px;cursor:pointer;clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)">RECOGER</button>'
    + '<button class="cj-skip" style="position:absolute;right:2.5%;top:3%;background:none;border:1px solid rgba(255,255,255,.25);color:#aaa;padding:5px 12px;letter-spacing:3px;font-size:11px;cursor:pointer;opacity:.7">SALTAR ▸</button>'
    + '<div class="cj-flash" style="position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none"></div>'
    + '<div class="cj-vig" style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(0,0,0,.75) 100%)"></div>';
  document.body.appendChild(root);
  const $ = s => root.querySelector(s), canvas = root.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
  scene.add(new THREE.HemisphereLight(0xcfd8ee, 0x1a1a22, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(accent, 1.8); rim.position.set(-4, 3, -3); scene.add(rim);
  const inner = new THREE.PointLight(accent, 0, 9, 1.5); inner.position.set(0, 0.9, 0); scene.add(inner);

  const crate = buildCrate(); scene.add(crate);
  const glowTex = glowTexture(), beamTex = beamTexture();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ map: glowTex, color: accent, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; scene.add(floor);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.5, 9, 28, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: accent, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.position.y = 4.8; scene.add(beam);
  // abanico de rayos
  const rays = new THREE.Group(); rays.position.y = 1.1; scene.add(rays);
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28 + (i % 3) * 0.1, 6.5), new THREE.MeshBasicMaterial({ map: beamTex, color: accent, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.position.y = 3.25; const h = new THREE.Group(); h.add(m); h.rotation.set((i % 2 ? 0.25 : -0.25) * (0.3 + (i % 4) * 0.2), i * 0.45, (i % 5 - 2) * 0.12); rays.add(h); }
  // anillos de onda en el suelo
  const rings = []; for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.0, 64), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffffff : accent, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.y = 0.03; r.userData = { t: -1, speed: 1 }; scene.add(r); rings.push(r); }
  const wave = (k, delay = 0, speed = 1) => { const r = rings[k]; r.userData.t = -delay; r.userData.speed = speed; };
  // resplandor central
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: accent, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); halo.position.set(0, 1.0, 0.2); halo.scale.setScalar(2); scene.add(halo);
  // partículas
  const N = 420, pPos = new Float32Array(N * 3), pVel = new Float32Array(N * 3), pLife = new Float32Array(N), pMode = new Uint8Array(N);
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: glowTex, color: accent, size: 0.2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false; scene.add(pts);
  for (let i = 0; i < N; i++) pPos[i * 3 + 1] = -99;
  let pHead = 0;
  const spawn = (n, mode, spd) => { for (let k = 0; k < n; k++) { const i = pHead++ % N; pMode[i] = mode;
    if (mode === 0) { const a = Math.random() * 6.283, r = 2.2 + Math.random() * 2.4; pPos[i * 3] = Math.cos(a) * r; pPos[i * 3 + 1] = 0.1 + Math.random() * 2.8; pPos[i * 3 + 2] = Math.sin(a) * r; pLife[i] = 1.6 + Math.random(); }
    else { pPos[i * 3] = (Math.random() - 0.5) * 1.8; pPos[i * 3 + 1] = 0.9; pPos[i * 3 + 2] = (Math.random() - 0.5) * 1.2; pVel[i * 3] = (Math.random() - 0.5) * spd * 0.9; pVel[i * 3 + 1] = spd * (0.35 + Math.random()); pVel[i * 3 + 2] = (Math.random() - 0.5) * spd * 0.9; pLife[i] = 1.4 + Math.random() * 1.8; } } };

  const weapon = new THREE.Group(); weapon.visible = false; scene.add(weapon);
  buildSkinModel(skin).then(m => { weapon.add(m); const bb = new THREE.Box3().setFromObject(m), c = bb.getCenter(new THREE.Vector3()); m.position.sub(c); });

  SFX.init();
  const WN = { ak: 'AK-47', m4: 'M4A4', awp: 'AWP', deagle: 'DESERT EAGLE', knife: 'CUCHILLO' };
  $('.cj-title').textContent = CRATES[boxType].name; $('.cj-sub').textContent = CRATES[boxType].tag.toUpperCase();
  const nameEl = $('.cj-name'), okBtn = $('.cj-ok'), flash = $('.cj-flash'), sub = $('.cj-sub');
  nameEl.innerHTML = '<div class="n1" style="opacity:0;transform:translateY(16px);transition:all .8s;font-size:clamp(14px,2vw,24px);letter-spacing:9px;color:' + hexs + '">' + rar.label + ' · ' + (WN[skin.weapon] || '') + '</div>'
    + '<div class="n2" style="opacity:0;transform:translateY(22px) scale(.96);transition:all 1s .25s;font-size:clamp(26px,4.8vw,62px);font-weight:900;letter-spacing:3px;color:#fff;text-shadow:0 0 30px ' + hexs + '">' + skin.name.split('|').pop().trim().toUpperCase() + '</div>'
    + '<div class="n3" style="opacity:0;transition:opacity 1s .7s;margin-top:4px;font-size:clamp(11px,1.4vw,15px);letter-spacing:5px;color:#aab">' + (refund ? 'DUPLICADA · +' + refund + ' COINS' : 'NUEVA SKIN · AÑADIDA A TU INVENTARIO') + '</div>';

  return new Promise(resolve => {
    let t = 0, last = performance.now(), done = false, raf = 0, shake = 0;
    const ev = {};
    const T = { drop: 1.1, charge: 4.4, open: 5.6, reveal: 6.6, name: 8.4, ui: 9.6 };
    if (tier === 1) { T.charge = 3.6; T.open = 4.6; T.reveal = 5.4; T.name = 7.0; T.ui = 8.2; }
    const finish = () => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      removeEventListener('resize', resize); removeEventListener('keydown', onKey);
      renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      root.style.transition = 'opacity .4s'; root.style.opacity = 0; setTimeout(() => root.remove(), 420); resolve();
    };
    const onKey = e => { if (t > T.name && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) finish(); };
    addEventListener('keydown', onKey); okBtn.onclick = finish;
    $('.cj-skip').onclick = () => { if (t < T.name) t = T.name; else finish(); };
    const once = (k, fn) => { if (!ev[k]) { ev[k] = 1; fn(); } };
    const boom = (n) => { flash.style.transition = 'none'; flash.style.opacity = n; requestAnimationFrame(() => { flash.style.transition = 'opacity 1.1s'; flash.style.opacity = 0; }); };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      const aspect = cam.aspect, dist = Math.min(15, Math.max(7.6, 7.6 * (1.45 / Math.min(aspect, 1.45))));
      // 1) caída de la caja y golpe
      const fall = easeIO(t / T.drop);
      crate.position.y = (1 - Math.pow(fall, 2.2)) * 7 * (t < T.drop ? 1 : 0);
      if (t >= T.drop) once('land', () => { shake = 0.5; wave(0, 0, 1.2); wave(1, 0.12, 1); spawn(60, 1, 2.4); SFX.play('boom_big', { vol: 0.8 }); SFX.play('door', { vol: 0.9 }); boom(0.35); root.querySelector('.cj-bar').style.height = '9%'; root.querySelector('.cj-bar2').style.height = '9%'; });
      // 2) carga: la caja vibra, se filtra luz por la tapa y las partículas se arremolinan hacia ella
      const ch = easeIO((t - T.drop) / (T.charge - T.drop)), charging = t > T.drop && t < T.open;
      const jit = charging ? ch * 0.045 : 0;
      crate.position.x = (Math.random() - 0.5) * jit * 2; crate.position.z = (Math.random() - 0.5) * jit; crate.rotation.y = Math.sin(t * 0.7) * 0.05 + (Math.random() - 0.5) * jit * 0.5;
      crate.userData.open(charging ? ch * 0.09 * (0.6 + 0.4 * Math.sin(t * 40)) : 0);
      if (charging) { once('sub', () => { sub.style.opacity = 1; SFX.play('boom_far', { vol: 0.5 }); }); if (Math.random() < dt * (20 + ch * 90)) spawn(1, 0); if (Math.random() < dt * (1.2 + ch * 3)) SFX.play('hit', { vol: 0.25 + ch * 0.4, rate: 0.5 + ch * 0.8 }); }
      inner.intensity = charging ? ch * 6 * (0.7 + Math.random() * 0.4) : inner.intensity; floor.material.opacity = Math.max(floor.material.opacity, charging ? ch * 0.55 : 0);
      halo.material.opacity = charging ? ch * 0.7 : halo.material.opacity; halo.scale.setScalar(2 + ch * 2.5);
      // 3) la tapa salta
      const op = (t - T.open) / 1.0;
      if (t >= T.open) {
        once('pop', () => { shake = tier === 3 ? 1.1 : 0.7; boom(tier === 3 ? 0.9 : 0.6); spawn(160 + tier * 70, 1, 5.5 + tier); wave(0, 0, 1.6); wave(1, 0.1, 1.3); wave(2, 0.22, 1.0); if (tier > 1) wave(3, 0.38, 0.8);
          SFX.play('boom_mid', { vol: 0.9 }); SFX.play(tier === 3 ? 'round_win' : 'round_start', { vol: 0.8 }); setTimeout(() => SFX.play('horn_hit', { vol: 0.5 }), 200); if (tier === 3) setTimeout(() => SFX.play('naval', { vol: 0.6 }), 350); });
        crate.userData.open(1.85 * backOut(op)); crate.position.set(0, 0, 0);
        inner.intensity = (7 + tier * 4) * (0.85 + 0.15 * Math.sin(t * 6)); beam.material.opacity = Math.min(1, op * 1.4) * (0.12 + tier * 0.05); halo.material.opacity = Math.max(0.5, halo.material.opacity - dt * 0.2);
        floor.material.opacity = 0.7; rays.children.forEach((r, i) => { r.children[0].material.opacity = Math.min(1, op) * (0.10 + tier * 0.035) * (0.7 + 0.3 * Math.sin(t * 3 + i)); });
      }
      rays.rotation.y += dt * (0.35 + tier * 0.1); beam.rotation.y += dt * 0.5;
      // 4) el arma sale flotando
      const rise = easeIO((t - T.reveal) / 2.2);
      if (t >= T.reveal - 0.2) {
        once('rise', () => { weapon.visible = true; SFX.play('draw', { vol: 0.8 }); });
        weapon.position.set(0, 0.7 + rise * 2.7 + Math.sin(t * 1.7) * 0.07 * rise, rise * 0.5); weapon.scale.setScalar((0.2 + rise * 0.95) * 1.0);
        weapon.rotation.y = t * 0.8 + 0.5; weapon.rotation.z = Math.sin(t * 1.2) * 0.05; weapon.rotation.x = 0.12 * rise;
        if (Math.random() < dt * (30 + tier * 20) && rise > 0.05) spawn(1, 1, 1.4);
      }
      if (t >= T.name) once('name', () => { nameEl.querySelector('.n1').style.cssText += ';opacity:1;transform:none'; nameEl.querySelector('.n2').style.cssText += ';opacity:1;transform:none'; nameEl.querySelector('.n3').style.opacity = 1; SFX.play(tier === 3 ? 'round_win' : 'buy', { vol: 0.7 }); if (tier > 1) boom(0.2); });
      if (t >= T.ui) once('ui', () => { okBtn.style.opacity = 1; okBtn.style.pointerEvents = 'auto'; });
      // anillos
      for (const r of rings) { const u = r.userData; if (u.t > -1) { u.t += dt * u.speed; if (u.t >= 0) { const k = u.t / 1.6; r.scale.setScalar(1 + k * 7); r.material.opacity = Math.max(0, 0.9 * (1 - k)); } else r.material.opacity = 0; } }
      // cámara: se acerca durante la carga, retrocede y sube para el arma, con temblor
      const push = easeIO((t - T.drop) / (T.charge - T.drop)), pull = easeIO((t - T.open) / 2.4), sub2 = easeIO((t - T.reveal) / 2.5);
      shake = Math.max(0, shake - dt * 1.6);
      const ang = Math.sin(t * 0.22) * 0.18;
      cam.position.set(Math.sin(ang) * dist + (Math.random() - 0.5) * shake * 0.18, 2.4 + (1 - fall) * 3 - push * 0.35 + pull * 0.8 + sub2 * 0.8 + (Math.random() - 0.5) * shake * 0.14, Math.cos(ang) * (dist * (1 - push * 0.2 + pull * 0.12 + (sub2 * 0.1))));
      cam.lookAt(0, 0.8 + pull * 0.5 + sub2 * 0.7 - (1 - fall) * 1.0, 0);
      // partículas
      for (let i = 0; i < N; i++) {
        if (pLife[i] <= 0) continue; pLife[i] -= dt;
        if (pMode[i] === 0) { const x = pPos[i * 3], z = pPos[i * 3 + 2], d = Math.hypot(x, z) || 1, sp = 2.4 + ch * 3.5; pPos[i * 3] += (-x / d * sp - z / d * 2.2) * dt; pPos[i * 3 + 2] += (-z / d * sp + x / d * 2.2) * dt; pPos[i * 3 + 1] += (0.9 - pPos[i * 3 + 1]) * dt * 1.5; if (d < 0.7) pLife[i] = 0; }
        else { pVel[i * 3 + 1] -= 1.3 * dt; pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt; }
        if (pLife[i] <= 0) pPos[i * 3 + 1] = -99;
      }
      pGeo.attributes.position.needsUpdate = true;
      renderer.render(scene, cam);
    };
    loop();
  });
}
