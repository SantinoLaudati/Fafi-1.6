// Personajes por bando (T / CT) para bots y NPCs.
// Los glb de personajes no traen animaciones, así que se animan por código:
//  - IK de 2 huesos en piernas (ciclo de caminata) y brazos (sostienen el arma),
//  - respiración / mirada en reposo,
//  - caída al morir.
// El IK trabaja con direcciones en espacio mundo, así que sirve para cualquier esqueleto
// (nuevo: leg_upper_L / arm_upper_L ..., viejo: ValveBiped_Bip01_L_Thigh ...).
import * as THREE from 'three';
import { makeLoader } from './loaders.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { makeBlobShadow, alignBlobToSun } from './quality.js';
import { patchMaterial, setPattern } from './skinshader.js';

export const CHAR_HEIGHT = 1.12;               // altura de un personaje en el mundo (m)
const ASSET = 'assets/';

export const CHAR_DEFS = {
  t: [
    { id: 'phoenix', name: 'Phoenix', file: ASSET + 'Personajes terror/tm_phoenix_v2-_csgo_terrorist_characters.glb' },
    { id: 'leet',    name: 'Leet',    file: ASSET + 'Personajes anti terror/csgo_terrorist_characters.glb' }
  ],
  ct: [
    { id: 'fbi', name: 'FBI', file: ASSET + 'Personajes terror/ctm_fbi_variantd_v2_-_csgo_karakteri.glb' },
    { id: 'st6', name: 'ST6', file: ASSET + 'Personajes anti terror/ctm_st6_variantd_-_csgo_character.glb' }
  ]
};

// Armas de bots: del pack "low poly weapon free pack" (cada arma = cuerpo + cargador, el eje largo es X)
const WEAPON_PACK = ASSET + 'armas por defecto/low_poly_weapon_free_pack.glb';
export const BOT_WEAPONS = {
  ak:     { node: 'ak',      length: 0.86 },
  m4:     { node: 'm4',      length: 0.80 },
  awp:    { node: 'sniper',  length: 1.15 },
  deagle: { node: 'magnum',  length: 0.26 }
};

const loader = makeLoader();
const cache = {};           // id -> { scene, height }
let weaponPack = null;

const RIG_NAMES = {
  thighL: [/^leg_upper_L_\d+$/, /^ValveBiped_Bip01_L_Thigh_\d+$/],
  calfL:  [/^leg_lower_L_\d+$/, /^ValveBiped_Bip01_L_Calf_\d+$/],
  footL:  [/^ankle_L_\d+$/, /^ValveBiped_Bip01_L_Foot_\d+$/],
  thighR: [/^leg_upper_R_\d+$/, /^ValveBiped_Bip01_R_Thigh_\d+$/],
  calfR:  [/^leg_lower_R_\d+$/, /^ValveBiped_Bip01_R_Calf_\d+$/],
  footR:  [/^ankle_R_\d+$/, /^ValveBiped_Bip01_R_Foot_\d+$/],
  armL:   [/^arm_upper_L_\d+$/, /^ValveBiped_Bip01_L_UpperArm_\d+$/],
  foreL:  [/^arm_lower_L_\d+$/, /^ValveBiped_Bip01_L_Forearm_\d+$/],
  handL:  [/^hand_L_\d+$/, /^ValveBiped_Bip01_L_Hand_\d+$/],
  armR:   [/^arm_upper_R_\d+$/, /^ValveBiped_Bip01_R_UpperArm_\d+$/],
  foreR:  [/^arm_lower_R_\d+$/, /^ValveBiped_Bip01_R_Forearm_\d+$/],
  handR:  [/^hand_R_\d+$/, /^ValveBiped_Bip01_R_Hand_\d+$/],
  spine2: [/^spine_2_\d+$/, /^ValveBiped_Bip01_Spine2_\d+$/],
  neck:   [/^neck_0_\d+$/, /^ValveBiped_Bip01_Neck_\d+$/],
  head:   [/^head_0_\d+$/, /^ValveBiped_Bip01_Head_\d+$/]
};
function findBone(root, list) {
  let r = null;
  root.traverse(o => { if (!r && o.isBone && list.some(re => re.test(o.name))) r = o; });
  return r;
}

function loadGLB(url) {
  return new Promise((res, rej) => loader.load(url, g => res(g), undefined, rej));
}

// Carga (una vez) los modelos usados por los bandos y el pack de armas.
export async function loadCharacterAssets(teams = ['t', 'ct'], onProgress) {
  const jobs = [];
  for (const team of teams) for (const d of CHAR_DEFS[team]) {
    if (cache[d.id]) continue;
    jobs.push(loadGLB(d.file).then(g => {
      g.scene.updateMatrixWorld(true);
      g.scene.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); o.boundingBox = null; o.boundingSphere = null; o.frustumCulled = false; } });
      const box = new THREE.Box3().setFromObject(g.scene);
      cache[d.id] = { scene: g.scene, height: Math.max(0.0001, box.max.y - box.min.y), minY: box.min.y };
      if (onProgress) onProgress(d.id);
    }).catch(e => console.warn('No se pudo cargar personaje', d.file, e)));
  }
  if (!weaponPack) jobs.push(loadGLB(WEAPON_PACK).then(g => { weaponPack = g.scene; }).catch(e => console.warn('No se pudo cargar el pack de armas', e)));
  await Promise.all(jobs);
}

// El pack de armas trae UN solo material negro sin texturas ni colores de vértice: cada triángulo se pinta
// según su zona (u: 0 culata → 1 boca del cañón, v: 0 abajo → 1 arriba) para distinguir madera, metal y polímero.
const C = { wood: 0x8a5530, woodD: 0x58361d, steel: 0x474e58, steelD: 0x2b2f36, poly: 0x2f3339, chrome: 0xb7bfc9, olive: 0x59693f, mag: 0x373a40, magAk: 0x57402b };
// Devuelve la CLAVE de zona (se guarda por vértice para poder repintar con una skin sin recalcular la geometría).
const ZONE_KEYS = Object.keys(C);
function weaponZone(id, mag, u, v) {
  if (mag) return id === 'ak' ? 'magAk' : 'mag';
  switch (id) {
    case 'ak':     return u < 0.2 ? 'wood' : (u > 0.5 && u < 0.8 && v < 0.78) ? 'wood' : (u < 0.4 && v < 0.5) ? 'woodD' : 'steel';
    case 'm4':     return u < 0.22 ? 'poly' : u > 0.82 ? 'steelD' : v > 0.55 ? 'steel' : 'poly';
    case 'awp':    return u < 0.5 ? 'olive' : v > 0.7 ? 'steelD' : 'steel';
    case 'deagle': return v > 0.5 ? 'chrome' : u < 0.5 ? 'poly' : 'steel';
    default:       return 'steel';
  }
}
const _pc = new THREE.Color();
// Repinta un arma ya creada con los colores de una skin (zones = { wood, steel, ... }); null vuelve al aspecto por defecto.
// Aplica una skin completa: colores por zona + diseño (patrón). skin = null vuelve al aspecto estándar.
export function setWeaponSkin(root, skin) {
  repaintWeapon(root, skin && skin.zones);
  root.traverse(o => { if (o.isMesh && o.material && o.material.userData.bb) setPattern(o.material, skin && skin.pattern, o.material.userData.bb); });
}
export function repaintWeapon(root, zones) {
  const pal = Object.assign({}, C, zones || {});
  root.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.zone) return;
    const z = o.geometry.attributes.zone, col = o.geometry.attributes.color;
    for (let i = 0; i < z.count; i++) { _pc.setHex(pal[ZONE_KEYS[z.getX(i)]]); col.setXYZ(i, _pc.r, _pc.g, _pc.b); }
    col.needsUpdate = true;
  });
}
function weaponBounds(meshes, mtx) {
  const bb = new THREE.Box3(), p = new THREE.Vector3();
  for (const m of meshes) {
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) bb.expandByPoint(p.fromBufferAttribute(pos, i).applyMatrix4(mtx.get(m)));
  }
  return bb;
}
function paintWeaponGeometry(src, matrix, id, mag, bb, pal = C) {
  const g = src.index ? src.toNonIndexed() : src.clone();
  const pos = g.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3), zone = new Float32Array(n), p = new THREE.Vector3(), c = new THREE.Color();
  const dx = Math.max(1e-4, bb.max.x - bb.min.x), dy = Math.max(1e-4, bb.max.y - bb.min.y);
  for (let i = 0; i + 2 < n; i += 3) {
    let cx = 0, cy = 0;
    for (let k = 0; k < 3; k++) { p.fromBufferAttribute(pos, i + k).applyMatrix4(matrix); cx += p.x / 3; cy += p.y / 3; }
    const zk = weaponZone(id, mag, THREE.MathUtils.clamp((cx - bb.min.x) / dx, 0, 1), THREE.MathUtils.clamp((cy - bb.min.y) / dy, 0, 1));
    c.setHex(pal[zk]);
    for (let k = 0; k < 3; k++) { zone[i + k] = ZONE_KEYS.indexOf(zk); col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('zone', new THREE.BufferAttribute(zone, 1));
  g.applyMatrix4(matrix);                      // la posición queda en el espacio del arma: el shader de diseños usa estas coordenadas
  return g;
}

// Arma del pack lista para colgar de un Group: el cañón apunta a +Z, escalada a `length` metros.
export function makeWorldWeapon(id, opts = {}) {
  const def = Object.assign({}, BOT_WEAPONS[id] || BOT_WEAPONS.ak); if (opts.length) def.length = opts.length; else def.length *= 1.25;   // las armas de los bots se agrandan un poco para que se vean bien
  const g = new THREE.Group();
  if (!weaponPack) return g;
  const nodes = []; weaponPack.traverse(o => { if (o.name === def.node) nodes.push(o); });
  const meshes = [];
  for (const n of nodes) n.traverse(o => { if (o.isMesh && !meshes.includes(o)) meshes.push(o); });
  const holder = new THREE.Group();
  const rootNode = weaponPack.getObjectByName('RootNode') || weaponPack;
  rootNode.updateWorldMatrix(true, false);
  const invRoot = rootNode.matrixWorld.clone().invert();
  const mtx = new Map();     // malla -> matriz dentro del pack (espacio del arma)
  for (const m of meshes) { m.updateWorldMatrix(true, false); mtx.set(m, new THREE.Matrix4().multiplyMatrices(invRoot, m.matrixWorld)); }
  const bb = weaponBounds(meshes.filter(m => !/mag(?!num)/i.test(m.name)), mtx);
  const skin = opts.skin || null, pal = Object.assign({}, C, (skin && skin.zones) || {});
  const gunMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.5, side: THREE.DoubleSide });
  gunMat.userData.bb = { min: bb.min.clone(), len: Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) };
  patchMaterial(gunMat); setPattern(gunMat, skin && skin.pattern, gunMat.userData.bb);
  if (!opts.forward) { gunMat.color.setScalar(1.8); gunMat.emissive.setHex(0x14161a); }   // en tercera persona: más claras para no perderse contra el chaleco
  for (const m of meshes) {
    const c = m.clone();
    c.geometry = paintWeaponGeometry(m.geometry, mtx.get(m), id, /mag(?!num)/i.test(m.name), bb, pal);
    c.matrixAutoUpdate = false; c.matrix.identity(); c.matrixWorld.identity();
    c.material = gunMat;
    c.castShadow = true;
    holder.add(c);
  }
  const box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const longZ = size.z > size.x;
  const s = def.length / Math.max(longZ ? size.z : size.x, 0.0001);
  const pivot = new THREE.Group();
  holder.scale.setScalar(s);
  // origen en el centro del cuerpo y cañón hacia +Z (el pack apunta a +X)
  holder.position.set(-center.x * s, -center.y * s, -center.z * s);
  pivot.add(holder);
  pivot.rotation.y = (longZ ? 0 : -Math.PI / 2) + (opts.forward ? Math.PI : 0);   // cañón a +Z (bots) o a -Z (viewmodel)
  g.add(pivot);
  g.userData.length = def.length;
  return g;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();

// Gira `bone` (en mundo) para que la dirección bone->child apunte a `dir`.
export function aimBone(bone, child, dir) {
  bone.updateMatrixWorld(true);
  bone.getWorldPosition(_a); child.getWorldPosition(_b);
  _c.copy(_b).sub(_a); if (_c.lengthSq() < 1e-10) return;
  _c.normalize();
  _q1.setFromUnitVectors(_c, _d.copy(dir).normalize());
  bone.getWorldQuaternion(_q2);
  _q2.premultiply(_q1);
  if (bone.parent) { bone.parent.getWorldQuaternion(_q3); _q3.invert(); _q2.premultiply(_q3); }
  bone.quaternion.copy(_q2);
  bone.updateMatrixWorld(true);
}

// IK analítico de 2 huesos. Longitudes L1/L2 fijas (medidas en la pose base).
const _s = new THREE.Vector3(), _e = new THREE.Vector3(), _t = new THREE.Vector3(), _dir = new THREE.Vector3(), _perp = new THREE.Vector3(), _el = new THREE.Vector3(), _pole = new THREE.Vector3();
export function ik2(upper, lower, end, L1, L2, target, poleWorld) {
  upper.updateMatrixWorld(true);
  upper.getWorldPosition(_s);
  _t.copy(target).sub(_s);
  let d = _t.length();
  if (d < 1e-5) return;
  _dir.copy(_t).divideScalar(d);
  d = Math.min(d, L1 + L2 - 1e-4);
  d = Math.max(d, Math.abs(L1 - L2) + 1e-4);
  const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  _pole.copy(poleWorld).sub(_s);
  _perp.copy(_pole).addScaledVector(_dir, -_pole.dot(_dir));
  if (_perp.lengthSq() < 1e-8) _perp.set(0, -1, 0);
  _perp.normalize();
  _el.copy(_s).addScaledVector(_dir, L1 * cosA).addScaledVector(_perp, L1 * sinA);
  const reach = new THREE.Vector3().copy(_s).addScaledVector(_dir, d);
  aimBone(upper, lower, new THREE.Vector3().copy(_el).sub(_s));
  lower.updateMatrixWorld(true);
  aimBone(lower, end, new THREE.Vector3().copy(reach).sub(_el));
}

// Crea una instancia de personaje. team: 't'|'ct', variant: índice (se hace módulo)
export function createCharacter(team, variant = 0) {
  const list = CHAR_DEFS[team];
  const def = list.filter(d => cache[d.id])[variant % Math.max(1, list.filter(d => cache[d.id]).length)] || list[0];
  const src = cache[def.id];
  if (!src) return null;
  const model = cloneSkinned(src.scene);
  const s = CHAR_HEIGHT / src.height;
  const root = new THREE.Group();
  root.add(model);
  model.scale.multiplyScalar(s);
  model.position.y = -src.minY * s;
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.isSkinnedMesh) { o.skeleton.update(); } } });
  root.updateMatrixWorld(true);
  const rig = {};
  for (const k in RIG_NAMES) {
    const b = findBone(model, RIG_NAMES[k]);
    if (b) rig[k] = { bone: b, bind: b.quaternion.clone() };
  }
  const len = (a, b) => (rig[a] && rig[b]) ? rig[a].bone.getWorldPosition(new THREE.Vector3()).distanceTo(rig[b].bone.getWorldPosition(new THREE.Vector3())) : 0;
  const inst = {
    team, def, root, model, rig, scale: s,
    L: { legL1: len('thighL', 'calfL'), legL2: len('calfL', 'footL'), armL1: len('armL', 'foreL'), armL2: len('foreL', 'handL'),
         legR1: len('thighR', 'calfR'), legR2: len('calfR', 'footR'), armR1: len('armR', 'foreR'), armR2: len('foreR', 'handR') },
    restFoot: {}, phase: Math.random(), groundFn: null, speedSm: 0, dead: false, deadT: 0,
    weaponId: null, weapon: null, aimPitch: 0, time: Math.random() * 10, crouch: 0
  };
  // posición de reposo de los pies (en espacio del root)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  for (const side of ['L', 'R']) {
    const f = rig['foot' + side];
    if (f) inst.restFoot[side] = f.bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
  }
  inst.blob = makeBlobShadow(0.5);
  root.add(inst.blob);
  inst.weaponPivot = new THREE.Group();       // posición del arma respecto a los hombros (espacio root)
  root.add(inst.weaponPivot);
  return inst;
}

export function giveWeapon(inst, id) {
  if (inst.weapon) { inst.weaponPivot.remove(inst.weapon); inst.weapon = null; }
  inst.weaponId = id;
  if (!id) return;
  const w = makeWorldWeapon(id);
  inst.weapon = w;
  inst.weaponPivot.add(w);
  inst.isPistol = (id === 'deagle');
}

const _hip = new THREE.Vector3(), _foot = new THREE.Vector3(), _pole2 = new THREE.Vector3(), _tg = new THREE.Vector3(), _mw = new THREE.Matrix4();
const _sm = t => t * t * (3 - 2 * t);
// Ciclo de paso sincronizado con la velocidad real: el pie de apoyo retrocede exactamente a la velocidad del cuerpo
// (sin patinar), el de balanceo se levanta y avanza; los pies se apoyan en el suelo real (inst.groundFn) y la cadera baja al andar.
const STANCE = 0.55, STRIDE = 0.30, LIFT = 0.085;
// speed (m/s), dt (s). aimPitch: inclinación del arma (rad)
export function animateCharacter(inst, dt, speed, aimPitch = 0) {
  const { rig, root, L } = inst;
  inst.time += dt;
  if (inst.dead) {
    // caída física: el cuerpo vuelca sobre los pies por la gravedad (aceleración angular), rebota un poco al llegar al suelo
    // y se desliza unos centímetros en la dirección del impacto con fricción
    const d = inst.fall || (inst.fall = { th: 0, w: 0.5, lx: 0, lz: -1, sx: 0, sz: 0 });
    if (d.th < 1.5 || Math.abs(d.w) > 0.05) {
      d.w += 11 * Math.sin(Math.min(d.th, 1.5) + 0.2) * dt;
      d.th += d.w * dt;
      if (d.th >= 1.5) { d.th = 1.5; d.w = -d.w * 0.22; if (Math.abs(d.w) < 0.25) d.w = 0; }
    }
    inst.model.quaternion.setFromAxisAngle(_axis.set(d.lz, 0, -d.lx), d.th);
    const e = Math.min(1, d.th / 1.5);
    if (inst.model.userData.baseY === undefined) inst.model.userData.baseY = inst.model.position.y;
    inst.model.position.y = inst.model.userData.baseY * (1 - e) + 0.11 * e;
    const sl = Math.exp(-3.2 * dt);
    d.sx *= sl; d.sz *= sl; inst.model.position.x += d.sx * dt; inst.model.position.z += d.sz * dt;
    if (inst.weapon) inst.weapon.visible = false;
    inst.blob.visible = true;
    return;
  }
  if (inst.model.userData.baseY === undefined) inst.model.userData.baseY = inst.model.position.y;
  inst.speedSm += (speed - inst.speedSm) * Math.min(1, dt * 10);
  const sp = inst.speedSm;
  const walk = Math.min(1, sp / 2.0);
  const S = STRIDE * Math.min(1, Math.max(0.35, sp / 2.4));          // semipaso (m)
  if (sp > 0.15) inst.phase = (inst.phase + dt * STANCE * sp / (2 * S)) % 1;   // ciclos/s para que el apoyo vaya a la velocidad del cuerpo
  // cadera: baja un poco al caminar y rebota en cada paso
  const bob = Math.abs(Math.cos(inst.phase * Math.PI * 2)) * 0.014 * walk;
  inst.model.position.y = inst.model.userData.baseY - 0.045 * walk + bob;
  // restablecer huesos controlados (pose base) antes del IK
  for (const k of ['thighL', 'calfL', 'footL', 'thighR', 'calfR', 'footR', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'spine2', 'neck', 'head']) {
    if (rig[k]) rig[k].bone.quaternion.copy(rig[k].bind);
  }
  root.updateMatrixWorld(true);
  // respiración
  const br = Math.sin(inst.time * 1.8) * 0.012;
  if (rig.spine2) { rig.spine2.bone.rotation.x += br + 0.05 * walk; }       // ligera inclinación al correr
  if (rig.head) rig.head.bone.rotation.z += Math.sin(inst.time * 0.5) * 0.06 * (1 - walk);
  root.updateMatrixWorld(true);
  // ---- piernas ----
  for (const side of ['L', 'R']) {
    const th = rig['thigh' + side], ca = rig['calf' + side], ft = rig['foot' + side];
    if (!th || !ca || !ft || !inst.restFoot[side]) continue;
    const u = (inst.phase + (side === 'R' ? 0.5 : 0)) % 1;
    let z, lift = 0;
    if (sp <= 0.15) { z = 0; }
    else if (u < STANCE) { z = S * (1 - 2 * (u / STANCE)); }
    else { const t = (u - STANCE) / (1 - STANCE); z = -S + 2 * S * _sm(t); lift = Math.sin(Math.PI * t) * LIFT * walk; }
    _foot.copy(inst.restFoot[side]); _foot.z += z;
    _foot.applyMatrix4(root.matrixWorld);                       // posición mundo sobre el plano del personaje
    if (inst.groundFn) {                                        // el pie se apoya en el suelo real (escaleras, rampas, bordillos)
      const gy = inst.groundFn(_foot.x, _foot.z, root.position.y);
      if (gy !== null && Math.abs(gy - root.position.y) < 0.6) _foot.y = gy + inst.restFoot[side].y;
    }
    _foot.y += lift;
    th.bone.getWorldPosition(_hip);
    _pole2.set(0, 0, 1).transformDirection(root.matrixWorld).multiplyScalar(0.6).add(_hip);   // rodilla hacia delante
    ik2(th.bone, ca.bone, ft.bone, L['leg' + side + '1'], L['leg' + side + '2'], _foot, _pole2);
  }
  // ---- brazos sosteniendo el arma ----
  const wp = inst.weaponPivot;
  const rightHip = rig.thighR ? 0 : 0;
  // el arma sale del pecho: derecha-adelante; pitch según el objetivo
  const shoulderY = rig.armR ? rig.armR.bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert()).y : 0.9;
  const wl0 = (inst.weapon && inst.weapon.userData.length) || 0.8;
  wp.position.set(0.03, shoulderY - 0.10, 0.04 + wl0 * 0.40);
  wp.rotation.set(-aimPitch, 0, 0);
  if (!inst.isPistol) wp.rotation.z = 0;
  wp.updateMatrixWorld(true);
  const wlen = (inst.weapon && inst.weapon.userData.length) || 0.8;
  const grip = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(wp.matrixWorld);
  if (inst.weapon) {
    const gR = inst.isPistol ? grip(0.0, -0.03, -0.02) : grip(0.01, -0.06, -wlen * 0.12);
    const gL = inst.isPistol ? grip(0.0, -0.03, -0.02) : grip(0.0, -0.035, wlen * 0.22);
    if (rig.armR && rig.foreR && rig.handR) {
      rig.armR.bone.getWorldPosition(_hip);
      _pole2.copy(_hip).add(new THREE.Vector3(0.25, -0.5, -0.2).transformDirection(root.matrixWorld).multiplyScalar(0.5));
      ik2(rig.armR.bone, rig.foreR.bone, rig.handR.bone, L.armR1, L.armR2, gR, _pole2);
    }
    if (rig.armL && rig.foreL && rig.handL) {
      rig.armL.bone.getWorldPosition(_hip);
      _pole2.copy(_hip).add(new THREE.Vector3(-0.25, -0.5, -0.2).transformDirection(root.matrixWorld).multiplyScalar(0.5));
      ik2(rig.armL.bone, rig.foreL.bone, rig.handL.bone, L.armL1, L.armL2, inst.isPistol ? gR : gL, _pole2);
    }
  }
  // sombra blob pegada al suelo (y local 0.03)
  inst.blob.position.y = 0.03;
  alignBlobToSun(inst.blob, root.rotation.y);
  inst.blob.position.y = 0.03;
}

// Marca muerte (se reinicia con revive)
const _axis = new THREE.Vector3();
// (dx, dz) = dirección del impacto en el mundo (de quien dispara hacia la víctima); sin dato cae hacia atrás
export function killCharacter(inst, dx = 0, dz = 0) {
  inst.dead = true; inst.deadT = 0; if (inst.weapon) inst.weapon.visible = false;
  const l = Math.hypot(dx, dz);
  if (l < 1e-4) { dx = -Math.sin(inst.root.rotation.y); dz = -Math.cos(inst.root.rotation.y); } else { dx /= l; dz /= l; }
  const c = Math.cos(inst.root.rotation.y), s = Math.sin(inst.root.rotation.y);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;        // mundo -> espacio del root
  inst.fall = { th: 0, w: 0.5 + Math.random() * 0.5, lx, lz, sx: lx * (0.9 + Math.random() * 0.7), sz: lz * (0.9 + Math.random() * 0.7) };
}
export function reviveCharacter(inst) {
  inst.dead = false; inst.deadT = 0;
  inst.model.rotation.x = 0;
  inst.model.quaternion.identity(); inst.model.position.x = 0; inst.model.position.z = 0; inst.fall = null;
  if (inst.model.userData.baseY !== undefined) inst.model.position.y = inst.model.userData.baseY;
  if (inst.weapon) inst.weapon.visible = true;
}
export function charactersReady(team) { return CHAR_DEFS[team].some(d => cache[d.id]); }

// Carga solo el pack de armas (para los viewmodels en primera persona)
export async function loadWeaponPack() {
  if (weaponPack) return;
  await new Promise(res => loader.load(WEAPON_PACK, g => { weaponPack = g.scene; res(); }, undefined, e => { console.warn('pack de armas', e); res(); }));
}
// Arma en primera persona: centrada en su origen y con el cañón hacia -Z
export function makeViewWeapon(id, length, skin) { return makeWorldWeapon(id, { length, dark: 0.4, forward: true, skin }); }

// Punta del cañón en coordenadas de mundo (null si no tiene arma)
export function muzzleWorld(inst, out) {
  if (!inst.weapon) return null;
  inst.weapon.updateWorldMatrix(true, false);
  return out.set(0, 0.015, (inst.weapon.userData.length || 0.8) * 0.5 + 0.03).applyMatrix4(inst.weapon.matrixWorld);
}
