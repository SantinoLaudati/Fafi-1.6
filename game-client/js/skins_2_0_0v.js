// Catálogo de skins con diseños (patrones en shader), modelos para vistas previas y miniaturas 3D.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadWeaponPack, makeWorldWeapon, setWeaponSkin, loadExtraWeapon, EXTRA_WEAPON_IDS } from './characters_2_0_0v.js';
import { setPattern, patchMaterial } from './skinshader_2_0_0v.js';

export const RARITY = {
  comun: { label: 'COMÚN', color: '#b0bac6', hex: 0xb0bac6, odds: 'Alta' },
  epica: { label: 'ÉPICA', color: '#a64df0', hex: 0xa64df0, odds: 'Media' },
  legendaria: { label: 'LEGENDARIA', color: '#ffb81c', hex: 0xffb81c, odds: 'Baja' }
};
export const WEAPON_LABEL = { ak: 'AK-47', m4: 'M4A4', awp: 'AWP', deagle: 'Desert Eagle', knife: 'Cuchillo',
  five: 'Five-SeveN', p90: 'P90', smg: 'SMG Silenciada', shotgun: 'Escopeta Pump', shorty: 'Shorty', m4b: 'M4 Táctico', vandal: 'Vandal', vss: 'VSS Vintorez', negev: 'Negev' };
// Armas habilitadas: tienen tienda, inventario y cajas. Las demás (con modelo y skins ya hechos) están bloqueadas:
// para habilitar una basta con añadir su id a WEAPON_ORDER (y darle su lógica de arma en game_2_0_0v.js).
export const CORE_WEAPONS = ['ak', 'm4', 'awp', 'deagle', 'knife'];     // el equipo del menú principal
export const WEAPON_ORDER = [...CORE_WEAPONS, ...EXTRA_WEAPON_IDS];     // todas habilitadas: tienen tienda, inventario, cajas y skins
export const LOCKED_WEAPONS = EXTRA_WEAPON_IDS.filter(w => !WEAPON_ORDER.includes(w));

const S = (id, weapon, name, rarity, zones, pattern) => ({ id, weapon, name, rarity, zones, pattern });
const P = (type, c, o = {}) => Object.assign({ type, c }, o);
const BODY = ['wood', 'woodD', 'steel'];

const BASE_SKINS = [
  // ---- AK-47
  S('ak_urbana', 'ak', 'AK-47 | Camuflaje Urbano', 'comun', { steel: 0x2a2d31, steelD: 0x1a1c1f, magAk: 0x2a2d31 }, P('digital', [0x3a3f45, 0x5b6168, 0x1f2226], { zones: BODY, freq: 1.3 })),
  S('ak_selva', 'ak', 'AK-47 | Selva Tropical', 'comun', { steel: 0x2f3a22, steelD: 0x1c2415, magAk: 0x2f3a22 }, P('camo', [0x3d4a2a, 0x7a6234, 0x1f2a17], { zones: BODY, freq: 1.1 })),
  S('ak_arena', 'ak', 'AK-47 | Tormenta de Arena', 'comun', { steel: 0x8d7745, steelD: 0x5f4d2c, magAk: 0x8d7745 }, P('camo', [0xb9a26b, 0x8d7745, 0x6c5b38], { zones: BODY, freq: 1.1 })),
  S('ak_linea', 'ak', 'AK-47 | Línea Roja', 'epica', { steel: 0x16171b, steelD: 0x0c0d0f, magAk: 0x16171b }, P('stripes', [0xc4161c, 0x101114, 0xf5f5f5], { zones: ['wood', 'woodD'], freq: 1.0 })),
  S('ak_vulcano', 'ak', 'AK-47 | Vulcano Glacial', 'epica', { steel: 0x1b3550, steelD: 0x0e2133, magAk: 0x1b3550 }, P('hex', [0x1d6fb8, 0x6cc3ff, 0xeaf7ff], { zones: BODY, freq: 1.0, emit: 0.25 })),
  S('ak_serpiente', 'ak', 'AK-47 | Serpiente de Fuego', 'epica', { steel: 0x1a0a06, steelD: 0x0d0503, magAk: 0x3a0f05 }, P('flame', [0x8a0c05, 0xff5a00, 0xffd23a], { zones: BODY, freq: 1.0, emit: 0.7 })),
  S('ak_barroco', 'ak', 'AK-47 | Oro Barroco', 'legendaria', { steel: 0xd9a41a, steelD: 0x8a6408, magAk: 0xd9a41a }, P('scales', [0xc88f12, 0xf5d060, 0x5a3b02], { zones: BODY, freq: 1.0, emit: 0.1 })),
  S('ak_neon', 'ak', 'AK-47 | Circuito Neón', 'legendaria', { steel: 0x0b0716, steelD: 0x05030b, magAk: 0x0b0716 }, P('tech', [0x14072b, 0x00f0ff, 0xffffff], { zones: ['wood', 'woodD', 'steel', 'magAk'], freq: 1.0, emit: 1.4 })),
  // ---- M4A4
  S('m4_artico', 'm4', 'M4A4 | Degradado Ártico', 'comun', { steel: 0xaab4bb, steelD: 0x7d8890, mag: 0x8d98a0 }, P('fade', [0xf4f8fa, 0xb9c6ce, 0x65737d], { zones: ['poly', 'steel'], freq: 1.0 })),
  S('m4_desierto', 'm4', 'M4A4 | Píxel del Desierto', 'comun', { steel: 0x8c7447, steelD: 0x5f4d2c, mag: 0x7a643c }, P('digital', [0xb59a68, 0x8c7447, 0x6a5a38], { zones: ['poly', 'steel'], freq: 1.2 })),
  S('m4_bosque', 'm4', 'M4A4 | Bosque Profundo', 'comun', { steel: 0x2f3a25, steelD: 0x1c2315, mag: 0x333f28 }, P('camo', [0x3b4a2c, 0x59492a, 0x1d2716], { zones: ['poly', 'steel'], freq: 1.1 })),
  S('m4_cobalto', 'm4', 'M4A4 | Colmena Cobalto', 'epica', { steel: 0x16327a, steelD: 0x0a1a45, mag: 0x102a66 }, P('hex', [0x1f4fbf, 0x8fb4ff, 0xe8f0ff], { zones: ['poly', 'steel'], freq: 1.0, emit: 0.3 })),
  S('m4_carbono', 'm4', 'M4A4 | Carbono Carmesí', 'epica', { steel: 0x2a0709, steelD: 0x180406, mag: 0x240609 }, P('carbon', [0x14070a, 0x8e1118, 0xff4a56], { zones: ['poly', 'steel'], freq: 1.0 })),
  S('m4_tigre', 'm4', 'M4A4 | Tigre de Bengala', 'epica', { steel: 0x2a1c0a, steelD: 0x180f04, mag: 0x2a1c0a }, P('tiger', [0xd9731a, 0x120c05, 0xffb347], { zones: ['poly', 'steel'], freq: 1.0 })),
  S('m4_placas', 'm4', 'M4A4 | Placas Doradas', 'legendaria', { steel: 0xf5cc3a, steelD: 0xb58a12, mag: 0xc99a18 }, P('plates', [0xc99a18, 0xffe27a, 0x4a3402], { zones: ['poly', 'steel'], freq: 1.0, emit: 0.12 })),
  S('m4_toxico', 'm4', 'M4A4 | Residuo Tóxico', 'legendaria', { steel: 0x0b1f08, steelD: 0x05100a, mag: 0x143a0f }, P('splatter', [0x07140a, 0x1fb81a, 0xb6ff3a], { zones: ['poly', 'steel'], freq: 1.0, emit: 1.0 })),
  // ---- AWP
  S('awp_camo', 'awp', 'AWP | Camuflaje de Francotirador', 'comun', { steel: 0x2e3a28, steelD: 0x1b2316, mag: 0x2a3322 }, P('camo', [0x4c5a3a, 0x7b6a40, 0x273022], { zones: ['olive', 'steel'], freq: 1.1 })),
  S('awp_nieve', 'awp', 'AWP | Degradado Nevado', 'comun', { steel: 0x9aa6ad, steelD: 0x6c777e, mag: 0x7f8a91 }, P('fade', [0xf0f5f8, 0xb7c3cb, 0x6b7882], { zones: ['olive', 'steel'], freq: 1.0 })),
  S('awp_dunas', 'awp', 'AWP | Dunas Rojizas', 'comun', { steel: 0x7d6a40, steelD: 0x4e4125, mag: 0x6a5833 }, P('digital', [0xc2a56a, 0x9a7c44, 0x6f5830], { zones: ['olive', 'steel'], freq: 1.3 })),
  S('awp_oceano', 'awp', 'AWP | Oleaje del Océano', 'epica', { steel: 0x07425f, steelD: 0x042838, mag: 0x064a6e }, P('waves', [0x0a5f94, 0x16b6c9, 0xd8fbff], { zones: ['olive', 'steel'], freq: 1.0, emit: 0.35 })),
  S('awp_magma', 'awp', 'AWP | Colada de Magma', 'epica', { steel: 0x1a0805, steelD: 0x0d0402, mag: 0x2a0c06 }, P('flame', [0x6a0f00, 0xff4a0f, 0xffd23a], { zones: ['olive', 'steel'], freq: 1.0, emit: 0.9 })),
  S('awp_titanio', 'awp', 'AWP | Placas de Titanio', 'epica', { steel: 0x59616a, steelD: 0x2c3238, mag: 0x3a4148 }, P('plates', [0x6e7780, 0xa9b4be, 0x1a1e22], { zones: ['olive', 'steel'], freq: 1.0 })),
  S('awp_vacio', 'awp', 'AWP | Nebulosa del Vacío', 'legendaria', { steel: 0x1a0638, steelD: 0x0c031c, mag: 0x2c0a5a }, P('galaxy', [0x0c0024, 0x6a1bff, 0xff4fd8], { zones: ['olive', 'steel'], freq: 1.0, emit: 1.0 })),
  S('awp_dragon', 'awp', 'AWP | Dragón Esmeralda', 'legendaria', { steel: 0x1c5a22, steelD: 0x0e2f12, mag: 0xc4161c }, P('scales', [0x1c5a22, 0x2f9a38, 0xffc21a], { zones: ['olive', 'steel'], freq: 1.0, emit: 0.2 })),
  // ---- Desert Eagle
  S('d_carbono', 'deagle', 'Desert Eagle | Carbono Negro', 'comun', { steel: 0x23262b, poly: 0x15171a }, P('carbon', [0x0d0e10, 0x3a3f46, 0xc9ced4], { zones: ['chrome', 'poly'], freq: 1.4 })),
  S('d_desierto', 'deagle', 'Desert Eagle | Camuflaje del Desierto', 'comun', { steel: 0x8a7a52, poly: 0x5c4033 }, P('camo', [0xc2b280, 0x8a7a52, 0x5c4033], { zones: ['chrome', 'poly'], freq: 1.4 })),
  S('d_oceano', 'deagle', 'Desert Eagle | Marea Profunda', 'comun', { steel: 0x0a5f94, poly: 0x06304a }, P('waves', [0x0a5f94, 0x16b6c9, 0xd8fbff], { zones: ['chrome', 'poly'], freq: 1.6, emit: 0.2 })),
  S('d_amatista', 'deagle', 'Desert Eagle | Colmena Amatista', 'epica', { steel: 0x3a1a78, poly: 0x1a0a3a }, P('hex', [0x4a1fa8, 0xb27cff, 0xf0e4ff], { zones: ['chrome', 'poly'], freq: 1.5, emit: 0.35 })),
  S('d_carmesi', 'deagle', 'Desert Eagle | Rayas Carmesí', 'epica', { steel: 0x1a0a0a, poly: 0x0e0606 }, P('stripes', [0xe02a2a, 0x100505, 0xffffff], { zones: ['chrome', 'poly'], freq: 1.6 })),
  S('d_oro', 'deagle', 'Desert Eagle | Escamas Doradas', 'legendaria', { steel: 0xc99a18, poly: 0x2b2105 }, P('scales', [0xc88f12, 0xffd860, 0x4a3402], { zones: ['chrome', 'poly'], freq: 1.6, emit: 0.15 })),
  S('d_neon', 'deagle', 'Desert Eagle | Circuito Cian', 'legendaria', { steel: 0x06141a, poly: 0x03090c }, P('tech', [0x03141a, 0x00ffd0, 0xffffff], { zones: ['chrome', 'poly'], freq: 1.6, emit: 1.4 })),
  // ---- Cuchillo (el modelo ya trae textura: el diseño se mezcla con ella)
  S('k_tactico', 'knife', 'Cuchillo | Camuflaje Táctico', 'comun', null, P('digital', [0x4a4f55, 0x7a8087, 0x24272b], { freq: 3.0, tex: 0.7, zones: ['all'] })),
  S('k_bosque', 'knife', 'Cuchillo | Bosque Profundo', 'comun', null, P('camo', [0x3b4a2c, 0x6b8a4a, 0x1d2716], { freq: 3.0, tex: 0.7, zones: ['all'] })),
  S('k_sangre', 'knife', 'Cuchillo | Hoja de Sangre', 'epica', null, P('flame', [0x7a0505, 0xff2a2a, 0xffb0a0], { freq: 3.0, tex: 0.6, emit: 0.5, zones: ['all'] })),
  S('k_zafiro', 'knife', 'Cuchillo | Degradado Zafiro', 'legendaria', null, P('fade', [0x0a1f6e, 0x2f7bff, 0xbfe0ff], { freq: 1.0, tex: 0.7, emit: 0.2, zones: ['all'] })),
  S('k_oro', 'knife', 'Cuchillo | Escamas Doradas', 'legendaria', null, P('scales', [0xc88f12, 0xffd860, 0x4a3402], { freq: 3.0, tex: 0.5, emit: 0.15, zones: ['all'] })),
  S('k_neon', 'knife', 'Cuchillo | Filo Neón', 'legendaria', null, P('tech', [0x0b0716, 0xff2fd6, 0xffffff], { freq: 3.0, tex: 0.4, emit: 1.3, zones: ['all'] })),
  S('k_carbono', 'knife', 'Karambit | Carbono Carmesí', 'epica', null, P('carbon', [0x14070a, 0x8e1118, 0xff4a56], { freq: 2.4, tex: 0.5, zones: ['all'] })),
  S('k_oceano', 'knife', 'Karambit | Marea Profunda', 'epica', null, P('waves', [0x0a5f94, 0x16b6c9, 0xd8fbff], { freq: 2.4, tex: 0.5, emit: 0.3, zones: ['all'] })),
  S('k_toxico', 'knife', 'Karambit | Residuo Tóxico', 'legendaria', null, P('splatter', [0x07140a, 0x1fb81a, 0xb6ff3a], { freq: 2.4, tex: 0.4, emit: 1.0, zones: ['all'] })),
  S('k_galaxia', 'knife', 'Karambit | Nebulosa del Vacío', 'legendaria', null, P('galaxy', [0x0c0024, 0x6a1bff, 0xff4fd8], { freq: 2.4, tex: 0.4, emit: 1.0, zones: ['all'] }))
];

// ---- Skins de las armas bloqueadas (modelos propios): 5 por arma (2 comunes, 2 épicas, 1 legendaria).
// No salen en cajas ni inventario hasta que el arma se habilite (ver WEAPON_ORDER).
const ZONE_ALL = ['wood', 'woodD', 'steel', 'steelD', 'poly', 'chrome', 'olive', 'mag'];
const RECIPES = {
  comun: [
    ['urbano', 'Camuflaje Urbano', 'digital', [0x3a3f45, 0x5b6168, 0x1f2226], 0, 1.3],
    ['selva', 'Selva Tropical', 'camo', [0x3d4a2a, 0x7a6234, 0x1f2a17], 0, 1.1],
    ['arena', 'Tormenta de Arena', 'camo', [0xb9a26b, 0x8d7745, 0x6c5b38], 0, 1.1],
    ['artico', 'Degradado Ártico', 'fade', [0xf4f8fa, 0xb9c6ce, 0x65737d], 0, 1.0]
  ],
  epica: [
    ['cobalto', 'Colmena Cobalto', 'hex', [0x1d6fb8, 0x6cc3ff, 0xeaf7ff], 0.3, 1.0],
    ['fuego', 'Serpiente de Fuego', 'flame', [0x8a0c05, 0xff5a00, 0xffd23a], 0.7, 1.0],
    ['carbono', 'Carbono Carmesí', 'carbon', [0x14070a, 0x8e1118, 0xff4a56], 0, 1.0],
    ['tigre', 'Tigre de Bengala', 'tiger', [0xd9731a, 0x120c05, 0xffb347], 0, 1.0],
    ['oceano', 'Oleaje del Océano', 'waves', [0x0a5f94, 0x16b6c9, 0xd8fbff], 0.35, 1.0]
  ],
  legendaria: [
    ['oro', 'Oro Barroco', 'scales', [0xc88f12, 0xf5d060, 0x5a3b02], 0.1, 1.0],
    ['neon', 'Circuito Neón', 'tech', [0x14072b, 0x00f0ff, 0xffffff], 1.0, 1.0],
    ['galaxia', 'Nebulosa del Vacío', 'galaxy', [0x0c0024, 0x6a1bff, 0xff4fd8], 1.0, 1.0],
    ['toxico', 'Residuo Tóxico', 'splatter', [0x07140a, 0x1fb81a, 0xb6ff3a], 1.0, 1.0]
  ]
};
const EXTRA_SKINS = [];
EXTRA_WEAPON_IDS.forEach((w, wi) => {
  const pick = [['comun', 0], ['comun', 1], ['epica', 0], ['epica', 1], ['legendaria', 0]];
  for (const [rar, k] of pick) {
    const list = RECIPES[rar], r = list[(wi + k) % list.length], [key, name, type, c, emit, freq] = r;
    const zones = { steel: c[0], steelD: c[2], poly: c[2], chrome: c[1], wood: c[0], woodD: c[2], olive: c[0], mag: c[2] };
    const opts = { zones: ZONE_ALL, freq }; if (emit) opts.emit = emit;
    EXTRA_SKINS.push(S(w + '_' + key, w, WEAPON_LABEL[w] + ' | ' + name, rar, zones, P(type, c, opts)));
  }
});
export const SKINS_ALL = [...BASE_SKINS, ...EXTRA_SKINS];
export const SKINS_DB = SKINS_ALL.filter(s => WEAPON_ORDER.includes(s.weapon));          // solo las de armas habilitadas (inventario y cajas)
export const SKINS_LOCKED = SKINS_ALL.filter(s => !WEAPON_ORDER.includes(s.weapon));
// "skins" estándar (sin diseño): una por arma, siempre disponibles
export const DEFAULTS = WEAPON_ORDER.map(w => ({ id: 'default_' + w, weapon: w, name: WEAPON_LABEL[w] + ' | Estándar', rarity: 'comun', zones: null, pattern: null, isDefault: true }));
const DEFAULTS_LOCKED = LOCKED_WEAPONS.map(w => ({ id: 'default_' + w, weapon: w, name: WEAPON_LABEL[w] + ' | Estándar', rarity: 'comun', zones: null, pattern: null, isDefault: true }));
export const skinById = (id) => SKINS_ALL.find(s => s.id === id) || DEFAULTS.find(s => s.id === id) || DEFAULTS_LOCKED.find(s => s.id === id) || null;

// ---------------------------------------------------------------- cuchillo
const KNIFE_FILE = 'assets/Cuchillos/karambit.glb';
let knifeGLB = null, knifeLoading = null;
export function loadKnife() {
  if (!knifeLoading) knifeLoading = new GLTFLoader().loadAsync(KNIFE_FILE).then(g => {
    // el karambit trae ~50 piezas sueltas: se funden en una sola malla (en coordenadas del modelo) para dibujarla de una vez y aplicarle las skins completas
    g.scene.updateMatrixWorld(true);
    const geos = []; let mat = null;
    g.scene.traverse(o => { if (!o.isMesh) return; const ge = o.geometry.clone(); ge.applyMatrix4(o.matrixWorld); for (const k of Object.keys(ge.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ge.deleteAttribute(k); geos.push(ge); mat = mat || o.material; });
    const merged = geos.length ? mergeGeometries(geos, false) : null;
    if (!merged) { knifeGLB = g; return g; }
    const grp = new THREE.Group(); grp.add(new THREE.Mesh(merged, mat)); knifeGLB = { scene: grp }; return knifeGLB;
  }).catch(() => null);
  return knifeLoading;
}
// Aplica un diseño a un cuchillo ya cargado (cada material usa la caja de su malla para normalizar el patrón)
export function applyKnifeSkin(root, skin) {
  root.traverse(o => {
    if (!o.isMesh) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (!m || m.isShaderMaterial) continue;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox, len = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
      patchMaterial(m); setPattern(m, skin && skin.pattern, { min: b.min, len });
    }
  });
}

// ---------------------------------------------------------------- modelo de una skin para vistas previas (centrado, ~1.8 de largo)
export async function buildSkinModel(skin) {
  const out = new THREE.Group();
  if (skin.weapon === 'knife') {
    const g = await loadKnife(); if (!g) return out;
    const m = g.scene.clone(true);
    // materiales propios para que cada skin no contamine a las demás
    m.traverse(o => { if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map(x => x.clone()) : o.material.clone(); o.frustumCulled = false; } });
    applyKnifeSkin(m, skin.pattern ? skin : null);
    const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const s = 1.7 / Math.max(size.x, size.y, size.z);
    m.position.set(-c.x * s, -c.y * s, -c.z * s); m.scale.setScalar(s);
    const w = new THREE.Group(); w.add(m);
    // la hoja se orienta con su eje mayor en X y su cara ancha hacia la cámara (Z = el eje más fino)
    { const ext = [size.x, size.y, size.z], ord = [0, 1, 2].sort((a, b) => ext[b] - ext[a]), ax = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
      const bx = ax[ord[0]].clone(), by = ax[ord[1]].clone(), bz = new THREE.Vector3().crossVectors(bx, by);
      // columnas = nuevos ejes expresados en el modelo; invertimos para llevar el modelo a X/Y/Z
      const M = new THREE.Matrix4().makeBasis(bx, by, bz).invert(); w.quaternion.setFromRotationMatrix(M); }
    out.add(w); out.userData.kind = 'knife';
    return out;
  }
  await loadWeaponPack(); await loadExtraWeapon(skin.weapon);
  const len = { deagle: 1.0, five: 0.9, shorty: 1.3, p90: 1.5, smg: 1.5, shotgun: 1.9, negev: 1.9, vss: 1.9, awp: 1.9 }[skin.weapon] || 1.7;
  const g = makeWorldWeapon(skin.weapon, { length: len, forward: false, skin: skin.isDefault ? null : skin });
  g.rotation.y = -Math.PI / 2;                 // perfil con el cañón hacia la derecha
  g.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });
  out.add(g); out.userData.kind = 'gun';
  return out;
}

// ---------------------------------------------------------------- miniaturas (PNG con transparencia) con un renderer compartido
let thumbR = null; const thumbCache = new Map();
function lightRig(scene, rim) {
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x303846, 1.5));
  const k = new THREE.DirectionalLight(0xffffff, 2.6); k.position.set(2.5, 3, 4); scene.add(k);
  const r = new THREE.DirectionalLight(rim, 2.2); r.position.set(-3, 1.5, -3); scene.add(r);
  const f = new THREE.DirectionalLight(0xffffff, 0.8); f.position.set(-2, -1, 3); scene.add(f);
}
export async function thumb(skin, w = 420, h = 240) {
  const key = skin.id + '|' + w; if (thumbCache.has(key)) return thumbCache.get(key);
  if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setPixelRatio(1); }
  thumbR.setSize(w, h, false);
  const scene = new THREE.Scene(); lightRig(scene, (RARITY[skin.rarity] || RARITY.comun).hex);
  const model = await buildSkinModel(skin); scene.add(model);
  const box = new THREE.Box3().setFromObject(model), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  model.position.sub(c); model.rotation.x = 0.12; model.rotation.y += 0.22;
  const cam = new THREE.PerspectiveCamera(28, w / h, 0.1, 50); const d = Math.max(sz.x / (cam.aspect * 0.78), sz.y / 0.78) / (2 * Math.tan(cam.fov * Math.PI / 360)) + sz.z * 0.5 + 0.2;
  cam.position.set(0.15 * d, 0.1 * d, d); cam.lookAt(0, 0, 0);
  thumbR.render(scene, cam);
  const url = thumbR.domElement.toDataURL('image/png');
  scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  thumbCache.set(key, url); return url;
}

// ---------------------------------------------------------------- visor 3D interactivo (arrastrar para girar, rueda para acercar)
export async function createWeaponViewer(canvas, onTick) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const rim = new THREE.DirectionalLight(0xffffff, 2.2); rim.position.set(-3, 1.5, -3);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x303846, 1.5)); const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(2.5, 3, 4); scene.add(key, rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8); fill.position.set(-2, -1, 3); scene.add(fill);
  // disco de luz bajo el arma
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = -0.75; scene.add(glow);
  const pivot = new THREE.Group(); scene.add(pivot);
  const st = { yaw: 0.4, pitch: 0.1, vy: 0.004, dist: 3.2, drag: false, last: [0, 0], idle: 0, model: null, size: [1.7, 0.5, 0.3] };
  const resize = () => { const w = canvas.clientWidth || 600, h = canvas.clientHeight || 360; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
  const down = (e) => { st.drag = true; st.last = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; };
  const move = (e) => { if (!st.drag) return; const dx = e.clientX - st.last[0], dy = e.clientY - st.last[1]; st.last = [e.clientX, e.clientY]; st.yaw += dx * 0.012; st.pitch = Math.max(-0.7, Math.min(0.7, st.pitch + dy * 0.008)); st.vy = dx * 0.0012; st.idle = 0; };
  const up = () => { st.drag = false; canvas.style.cursor = 'grab'; };
  const wheel = (e) => { e.preventDefault(); st.dist = Math.max(1.8, Math.min(6, st.dist + e.deltaY * 0.003)); };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('dblclick', () => { st.yaw = 0.4; st.pitch = 0.1; st.dist = 3.2; });
  let raf = 0, t = 0, last = performance.now(), inspect = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (!st.drag) { st.idle += dt; st.yaw += st.vy; st.vy += (0.004 - st.vy) * Math.min(1, dt * 1.5); }
    if (inspect > 0) { inspect -= dt; st.yaw += dt * 9 * Math.max(0, inspect / 1.2); }
    pivot.rotation.y = st.yaw; pivot.rotation.x = st.pitch; pivot.position.y = Math.sin(t * 1.3) * 0.03;
    cam.position.set(0, 0.25, st.dist); cam.lookAt(0, 0, 0);
    glow.material.opacity = 0.35 + Math.sin(t * 2) * 0.05;
    if (onTick) onTick(dt, t);
    renderer.render(scene, cam);
  };
  raf = requestAnimationFrame(loop);
  return {
    async show(skin) {
      const token = (st.token = (st.token || 0) + 1);
      const m = await buildSkinModel(skin); if (token !== st.token) return;
      if (st.model) { pivot.remove(st.model); st.model.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
      st.model = m; pivot.add(m);
      const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()); m.position.sub(c);
      const col = new THREE.Color((RARITY[skin.rarity] || RARITY.comun).hex); rim.color.copy(col); glow.material.color.copy(col);
    },
    inspect() { inspect = 1.2; },
    reset() { st.yaw = 0.4; st.pitch = 0.1; st.dist = 3.2; },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); }
  };
}
