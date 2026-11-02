// Modelos GLB reales de la cinemática (assets/historia). Autores y licencias en CREDITS.md.
// - soldado_swat.glb: personaje con esqueleto y animaciones; aquí se tiñe con el verde oliva del uniforme de 1944.
// - fusil_cerrojo.glb: fusil de cerrojo que lleva en la mano.
// - destructor / acorazado / carguero / avion: buques y aviones de la flota.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const DIR = 'assets/historia/';
export const GLB_FILES = {
  soldier: DIR + 'soldado_swat.glb', rifle: DIR + 'fusil_cerrojo.glb',
  destroyer: DIR + 'destructor.glb', battleship: DIR + 'acorazado.glb', cargo: DIR + 'carguero.glb', plane: DIR + 'avion.glb',
  sandbag: DIR + 'sacos_arena.glb'
};
export const glb = {};
let loading = null;
export function loadModels() {
  if (loading) return loading;
  const loader = new GLTFLoader();
  loading = Promise.all(Object.entries(GLB_FILES).map(([k, url]) =>
    loader.loadAsync(url).then(g => { glb[k] = g; }).catch(e => console.warn('[modelos] no se pudo cargar', url, e))));
  return loading;
}

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const GRAY = new THREE.Color();

// Apaga y entona los colores vivos del modelo (barcos de contenedores, avión de colores) hacia un tono militar.
export function militarize(root, hex, amount = 0.6, sat = 0.35) {
  const target = new THREE.Color(hex), done = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const out = list.map(m => {
      if (done.has(m)) return done.get(m);
      const c = m.clone();
      if (c.color) { const g = (c.color.r + c.color.g + c.color.b) / 3; GRAY.setRGB(g, g, g); c.color.lerp(GRAY, 1 - sat).lerp(target, amount); }
      if ('metalness' in c) { c.metalness = 0.05; c.roughness = 0.85; }
      if (c.emissive) c.emissive.setRGB(0, 0, 0);
      done.set(m, c); return c;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}

// Mide con la malla ya deformada (precise=true), escala a `length` metros en Z, apoya la base en y=0 (+raise) y centra.
export function fitModel(key, length, { yaw = 0, raise = 0, lengthAxis = 'z', clone = true } = {}) {
  const src = glb[key]; if (!src) return null;
  const inner = clone ? SkeletonUtils.clone(src.scene) : src.scene;
  inner.rotation.y = yaw;
  const holder = new THREE.Group(); holder.add(inner); holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder, true), sz = box.getSize(V3()), c = box.getCenter(V3());
  const s = length / (lengthAxis === 'x' ? sz.x : lengthAxis === 'y' ? sz.y : sz.z);
  holder.scale.setScalar(s);
  holder.position.set(-c.x * s, -box.min.y * s + raise, -c.z * s);
  holder.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  const out = new THREE.Group(); out.add(holder);
  out.userData.size = sz.multiplyScalar(s); out.userData.scale = s;
  return out;
}

// ---------------------------------------------------------------- soldado con esqueleto
const UNIFORM = {
  Swat_Legs_1: 0x646840, Swat_Legs_2: 0x4a4c32, Swat_Feet: 0x2b2118,
  Swat_Body_1: 0x676a40, Swat_Body_2: 0x57583a, Swat_Body_3: null,
  Swat_Head_1: 0x5a613c, Swat_Head_2: 0x3d402b, Swat_Head_3: 'hide'
};
let soldierMats = null;
function prepareMats() {
  soldierMats = {};
  glb.soldier.scene.traverse(o => {
    if (!o.isMesh || soldierMats[o.name] !== undefined) return;
    const hex = UNIFORM[o.name];
    if (hex === 'hide') { soldierMats[o.name] = 'hide'; return; }
    const m = (Array.isArray(o.material) ? o.material[0] : o.material).clone();
    if (hex != null) m.color.setHex(hex);
    if ('metalness' in m) { m.metalness = 0; m.roughness = 0.9; }
    soldierMats[o.name] = m;
  });
}
const ANIM = { idle: 'Idle_Gun', run: 'Run', walk: 'Walk', death: 'Death', shoot: 'Idle_Gun_Shoot', point: 'Idle_Gun_Pointing' };
const HEIGHT = 1.78;
export const GUN = { pos: [0, 0, 0], rot: [0, Math.PI / 2, 0] };
// Devuelve un grupo que mira hacia -Z y mide ~1,78 m. u = { set(pose), update(dt) }.
export function makeRiggedSoldier({ rifle = true } = {}) {
  if (!glb.soldier) return null;
  if (!soldierMats) prepareMats();
  const root = SkeletonUtils.clone(glb.soldier.scene);
  root.traverse(o => {
    if (!o.isMesh) return;
    const m = soldierMats[o.name];
    if (m === 'hide') { o.visible = false; return; }
    if (m) o.material = m;
    o.frustumCulled = false;
  });
  const mixer = new THREE.AnimationMixer(root), acts = {};
  for (const k in ANIM) { const clip = glb.soldier.animations.find(a => a.name.endsWith('|' + ANIM[k])); if (clip) { acts[k] = mixer.clipAction(clip); acts[k].enabled = true; } }
  acts.death && (acts.death.setLoop(THREE.LoopOnce, 1), acts.death.clampWhenFinished = true);
  const start = acts.idle || Object.values(acts)[0];
  start.play(); mixer.update(0); root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true), k = HEIGHT / (box.max.y - box.min.y);
  const holder = new THREE.Group(); holder.add(root); holder.scale.setScalar(k); holder.position.y = -box.min.y * k; root.rotation.y = Math.PI;
  const g = new THREE.Group(); g.add(holder);
  if (rifle && glb.rifle) {
    let hand = null; root.traverse(o => { if (o.isBone && o.name === 'WristR') hand = o; });
    const gun = fitModel('rifle', 1.15, { yaw: Math.PI / 2 });
    if (hand && gun) {
      g.updateMatrixWorld(true);
      gun.scale.setScalar(1 / hand.getWorldScale(V3()).x);                  // el hueso hereda la escala del esqueleto (cm)
      gun.position.set(...GUN.pos); gun.rotation.set(...GUN.rot); hand.add(gun); g.userData.gun = gun;
    }
  }
  let cur = start, curKey = 'idle';
  const u = {
    mixer, acts,
    set(pose, speed = 1) {
      const key = pose === 'run' ? 'run' : pose === 'wade' ? 'walk' : pose === 'down' ? 'idle' : 'idle';
      if (key !== curKey && acts[key]) { const n = acts[key]; n.reset().play(); n.crossFadeFrom(cur, 0.25, false); cur = n; curKey = key; }
      cur.timeScale = speed;
    },
    update(dt) { mixer.update(dt); }
  };
  mixer.update(Math.random() * 2);
  g.userData.rig = u;
  return g;
}
