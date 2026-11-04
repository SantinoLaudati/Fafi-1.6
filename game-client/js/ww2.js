// Modelos de la carpeta assets/WW2 listos para usar en las cinemáticas del modo historia.
//  - Barcos/u.s._navy_higgins_boat__lcvp.glb  → lancha de desembarco (rampa y hélice animables)
//  - Barcos/lowpoly_kms_bismarck.glb          → acorazado Bismarck
//  - Aviones/light_carpet_bomber.glb          → bombardero (versión con texturas a 1k en WW2/optimizados)
//  - Skins personajes/ww2_prison_guard.glb    → soldado alemán con animación (versión 1k en WW2/optimizados)
//  - Armas/mp-40_fps_animation.glb            → MP-40 en primera persona con animación de recarga
// Los modelos estáticos se funden por material (pocas llamadas de dibujo aunque tengan cientos de piezas).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SU from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const D = 'assets/WW2/';
export const FILES = {
  higgins: D + 'Barcos/u.s._navy_higgins_boat__lcvp.glb',
  bismarck: D + 'Barcos/lowpoly_kms_bismarck.glb',
  bomber: D + 'optimizados/bombardero_1k.glb',
  guard: D + 'optimizados/soldado_aleman_1k.glb',
  mp40: D + 'Armas/mp-40_fps_animation.glb',
  hedgehog: D + 'Decoraciones/erizo_checo.glb', sandbags: D + 'Decoraciones/sacos_arena.glb', ammo: D + 'Decoraciones/caja_municion.glb'
};
export const PHOTOS = {
  hitler: D + 'Fotos para las ecenas de contexto/adolf-hitler-1889-1945-german-politician-leader-nazi-440nw-4423909a.jpg',
  ruins: D + 'Fotos para las ecenas de contexto/images.jpg',
  landing: D + 'Fotos para las ecenas de contexto/99583_slice.jpg.webp'
};

const loader = new GLTFLoader();
const cache = {};
export function loadGLB(key) {
  if (!cache[key]) cache[key] = loader.loadAsync(FILES[key]).catch(e => { console.warn('[ww2] no se pudo cargar', key, e); return null; });
  return cache[key];
}

// Quita el exceso de metal (sin mapa de entorno los materiales metálicos salen negros) y evita el recorte por cajas de hueso.
export function tame(root, { metal = 0.2, rough = 0.62 } = {}) {
  const done = new Set();
  root.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (done.has(m)) continue; done.add(m);
      if ('metalness' in m) {
        if (m.metalness > 0.5 && m.metalnessMap) { m.metalnessMap = null; m.roughnessMap = null; }      // mapas ORM pensados para reflejos: sin entorno dejan el modelo negro
        m.metalness = Math.min(m.metalness, metal); m.roughness = Math.max(m.roughness, rough);
      }
      if (m.map) m.map.anisotropy = 4;
      m.envMapIntensity = 0;
      if (m.emissive && !m.emissiveMap) m.emissive.setRGB(0, 0, 0);
    }
  });
}

// Funde todas las mallas estáticas por material. Los nodos de `animated` (por nombre) se conservan como objetos propios
// con su transformación en el espacio del modelo, para poder moverlos (rampa, hélice...).
export function bakeStatic(root, animated = []) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), out = new THREE.Group();
  const under = (o) => { for (let p = o; p; p = p.parent) if (animated.includes(p.name)) return true; return false; };
  const buckets = new Map(), tmp = new THREE.Matrix4();
  root.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || under(o) || Array.isArray(o.material)) return;
    let g = o.geometry.clone(); g.applyMatrix4(tmp.multiplyMatrices(inv, o.matrixWorld));
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k) && !(k === 'color' && o.material.vertexColors)) g.deleteAttribute(k);
    const key = o.material.uuid; if (!buckets.has(key)) buckets.set(key, { mat: o.material, list: [] });
    buckets.get(key).list.push(g);
  });
  for (const { mat, list } of buckets.values()) {
    const g = mergeGeometries(list, false); if (!g) continue;
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; out.add(m);
  }
  const moved = [];
  root.traverse(o => { if (animated.includes(o.name)) moved.push(o); });
  for (const o of moved) {
    o.updateWorldMatrix(true, false);
    tmp.multiplyMatrices(inv, o.matrixWorld);
    if (o.parent) o.parent.remove(o);
    o.matrix.copy(tmp); o.matrix.decompose(o.position, o.quaternion, o.scale); o.matrixAutoUpdate = true;
    out.add(o);
  }
  // los nodos animados cuelgan ahora de `out`; sus mallas llevan material propio
  return out;
}

const box3 = new THREE.Box3(), v3 = new THREE.Vector3();
// Envuelve un modelo: centro en X/Z, base en y=0, escala para que su dimensión `axis` mida `size` metros.
function fit(model, size, axis, yaw = 0) {
  const holder = new THREE.Group(); holder.add(model); holder.rotation.y = yaw;
  const g = new THREE.Group(); g.add(holder); g.updateMatrixWorld(true);
  box3.setFromObject(g, true); const sz = box3.getSize(v3.clone()), c = box3.getCenter(new THREE.Vector3());
  const s = size / sz[axis];
  const w = new THREE.Group(); w.add(g); g.scale.setScalar(s); g.position.set(-c.x * s, -box3.min.y * s, -c.z * s);
  w.userData.size = sz.multiplyScalar(s); w.userData.s = s;
  return w;
}

// ---------------------------------------------------------------- lancha Higgins (LCVP): proa hacia -Z, 11,3 m
let boatT = null;
export async function makeBoat() {
  if (!boatT) {
    const g = await loadGLB('higgins'); if (!g) return null;
    const root = g.scene.clone(true); tame(root);
    const baked = bakeStatic(root, ['door_102', 'spin_196', 'line_78']);
    const door = baked.getObjectByName('door_102'), prop = baked.getObjectByName('spin_196'), line = baked.getObjectByName('line_78');
    if (line) line.visible = false;
    boatT = { baked, door, closedQ: door ? door.quaternion.clone() : null };
  }
  const t = boatT, root = t.baked.clone(true);
  const door = root.getObjectByName('door_102'), prop = root.getObjectByName('spin_196'), line = root.getObjectByName('line_78');
  if (line) line.visible = false;
  const w = fit(root, 11.3, 'z');
  w.userData.door = door; w.userData.prop = prop; w.userData.closedQ = t.closedQ;
  w.userData.downQ = new THREE.Quaternion(-0.78, 0, 0, 0.63).normalize();      // pose "down" del propio modelo
  w.userData.ramp = (k) => { if (door) door.quaternion.copy(t.closedQ).slerp(w.userData.downQ, k); };
  return w;
}

// ---------------------------------------------------------------- Bismarck: proa hacia -Z, 250 m
let bisT = null;
export async function makeBismarck() {
  if (!bisT) {
    const g = await loadGLB('bismarck'); if (!g) return null;
    const root = g.scene.clone(true); tame(root);
    bisT = bakeStatic(root, []);
  }
  const w = fit(bisT.clone(true), 250, 'z'); return w;
}

// ---------------------------------------------------------------- bombardero: morro hacia -Z, 31 m de envergadura
const bomberMixers = [];
export async function makeBomber() {
  const g = await loadGLB('bomber'); if (!g) return null;
  const root = SU.clone(g.scene); tame(root);
  const mixer = new THREE.AnimationMixer(root);
  if (g.animations[0]) { const a = mixer.clipAction(g.animations[0]); a.play(); mixer.setTime(Math.random() * 10); }
  root.updateMatrixWorld(true);
  root.traverse(o => { if (o.isMesh) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) m.color.setRGB(3.0, 3.1, 2.8); });   // la pintura negra del modelo se aclara a gris de noche
  const w = fit(root, 31, 'x'); w.userData.mixer = mixer; return w;
}

// ---------------------------------------------------------------- soldado alemán animado: 1,75 m, mira hacia -Z
export async function makeGuard(yaw = 0) {
  const g = await loadGLB('guard'); if (!g) return null;
  const root = SU.clone(g.scene); tame(root);
  const mixer = new THREE.AnimationMixer(root);
  if (g.animations[0]) { const a = mixer.clipAction(g.animations[0]); a.play(); mixer.setTime(Math.random() * 8); }
  root.updateMatrixWorld(true);
  const w = fit(root, 1.75, 'y', yaw); w.userData.mixer = mixer; return w;
}

// ---------------------------------------------------------------- MP-40 en primera persona (con su animación de recarga)
export async function makeMP40() {
  const g = await loadGLB('mp40'); if (!g) return null;
  const root = SU.clone(g.scene); tame(root);
  const mixer = new THREE.AnimationMixer(root); let action = null;
  if (g.animations[0]) { action = mixer.clipAction(g.animations[0]); action.play(); action.paused = true; }
  const w = new THREE.Group(); w.add(root);
  w.userData.mixer = mixer; w.userData.duration = g.animations[0] ? g.animations[0].duration : 1;
  w.userData.seek = (t) => { if (action) { action.time = t; mixer.update(0); } };
  return w;
}

// ---------------------------------------------------------------- decoración (erizo checo, sacos de arena, caja de munición)
const decoT = {};
// Devuelve una copia fundida del modelo, apoyada en y=0 y con su dimensión mayor = size metros (null si no cargó).
export async function makeDeco(key, size) {
  if (!decoT[key]) {
    const g = await loadGLB(key); if (!g) return null;
    const r = g.scene.clone(true); tame(r); decoT[key] = bakeStatic(r, []);
  }
  const m = decoT[key].clone(true); m.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const s = size / Math.max(sz.x, sz.y, sz.z), w = new THREE.Group(), g2 = new THREE.Group(); g2.add(m); w.add(g2);
  g2.scale.setScalar(s); g2.position.set(-c.x * s, -b.min.y * s, -c.z * s); return w;
}
