// Calidad gráfica: BAJA / MEDIA / ALTA.
// Controla resolución de render, sombras (tipo, tamaño del mapa y alcance), niebla, tone mapping y
// resolución de texturas de los mapas pesados. Las sombras del sol siguen al jugador (frustum
// ortográfico centrado en la cámara y ajustado a la grilla de texeles para evitar parpadeo).
import * as THREE from 'three';

// dirección HACIA el sol (la usan el sol de game_2_0_0v.js y las sombras de contacto)
export const SUN_DIR = new THREE.Vector3(0.45, 0.78, 0.38).normalize();

export const QUALITY_LEVELS = ['min', 'low', 'medium', 'high'];

export const QUALITY = {
  min: {
    label: 'MÍNIMA',
    desc: 'Para PC muy básicos (4 GB de RAM): 70 % de resolución, sin sombras ni antialiasing, menos bots y efectos, 30 FPS fijos.',
    maxPixelRatio: 0.7, aa: false, fpsCap: 30,
    shadows: false, shadowMapSize: 512, shadowType: THREE.BasicShadowMap, shadowRange: 0,
    tone: false, fogMul: 0.5, fill: false, tex: 'low', maxBots: 4
  },
  low: {
    label: 'BAJA',
    desc: 'Sin sombras en tiempo real, resolución reducida. Para equipos lentos.',
    maxPixelRatio: 0.85, aa: false,
    shadows: false, shadowMapSize: 512, shadowType: THREE.BasicShadowMap, shadowRange: 0,
    tone: false, fogMul: 0.75, fill: false, tex: 'low', maxBots: 6
  },
  medium: {
    label: 'MEDIA',
    desc: 'Sombras suaves cerca del jugador, resolución nativa hasta 1.25x.',
    maxPixelRatio: 1.25,
    shadows: true, shadowMapSize: 2048, shadowType: THREE.PCFShadowMap, shadowRange: 30,
    tone: true, fogMul: 1.0, fill: true, tex: 'med', maxBots: 9
  },
  high: {
    label: 'ALTA',
    desc: 'Sombras de alta resolución con bordes suaves, tone mapping cinematográfico y 2x de resolución.',
    maxPixelRatio: 2,
    shadows: true, shadowMapSize: 4096, shadowType: THREE.PCFSoftShadowMap, shadowRange: 40,
    tone: true, fogMul: 1.25, fill: true, tex: 'med', maxBots: 9
  }
};

export function loadQualityLevel() {
  try {
    const q = localStorage.getItem('fafi_quality_level');
    if (QUALITY[q]) return q;
  } catch (e) {}
  // primera vez: se elige según el equipo (memoria y núcleos del navegador)
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 4;
  if (mem <= 4 || cores <= 2) return 'min';
  if (mem <= 6 || cores <= 4) return 'low';
  return cores <= 6 ? 'medium' : 'high';
}
export function saveQualityLevel(level) {
  try { localStorage.setItem('fafi_quality_level', level); } catch (e) {}
}

// Aplica el preset al renderer y a la luz del sol (el mapa de sombras se recrea si cambia el tamaño).
export function applyQuality(renderer, sun, level) {
  const q = QUALITY[level] || QUALITY.high;
  renderer.setPixelRatio(pixelRatioFor(level));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = q.shadows;
  renderer.shadowMap.type = q.shadowType;
  renderer.shadowMap.needsUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = q.tone ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = q.tone ? (q.exposure || 1.05) : 1;
  if (sun) {
    sun.castShadow = q.shadows;
    if (q.shadows) {
      if (sun.shadow.mapSize.x !== q.shadowMapSize) {
        sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
        if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      }
      const R = q.shadowRange;
      const c = sun.shadow.camera;
      c.left = -R; c.right = R; c.top = R; c.bottom = -R;
      c.near = 1; c.far = 160;
      c.updateProjectionMatrix();
      const texel = (2 * R) / q.shadowMapSize;        // el sesgo escala con el tamaño del texel: sin acné ni sombras despegadas
      sun.shadow.bias = -0.0002;
      sun.shadow.normalBias = Math.max(0.02, texel * 2.2);
      sun.shadow.radius = level === 'high' ? 3 : 1.5;
    }
  }
  // los materiales deben recompilarse al cambiar el tipo de sombra / tone mapping
  return q;
}

const _snapRight = new THREE.Vector3(), _snapUp = new THREE.Vector3(), _snapFwd = new THREE.Vector3();
// Sol que sigue al jugador. `dir` = dirección desde la que llega la luz (apunta HACIA el sol).
export function updateSun(sun, focus, level, dir) {
  const q = QUALITY[level] || QUALITY.high;
  if (!sun || !q.shadows) return;
  const R = q.shadowRange;
  const texel = (2 * R) / q.shadowMapSize;
  // base de la luz para fijar el foco a la grilla de texeles
  _snapFwd.copy(dir).normalize();
  _snapRight.crossVectors(new THREE.Vector3(0, 1, 0), _snapFwd).normalize();
  _snapUp.crossVectors(_snapFwd, _snapRight).normalize();
  const x = Math.round(focus.dot(_snapRight) / texel) * texel;
  const y = Math.round(focus.dot(_snapUp) / texel) * texel;
  const z = focus.dot(_snapFwd);
  const snapped = new THREE.Vector3()
    .addScaledVector(_snapRight, x)
    .addScaledVector(_snapUp, y)
    .addScaledVector(_snapFwd, z);
  sun.target.position.copy(snapped);
  sun.position.copy(snapped).addScaledVector(_snapFwd, 70);
  sun.target.updateMatrixWorld();
}

// Sombra "blob" bajo personajes y bots: sirve también en mapas con luz horneada (materiales unlit).
let _blobTex = null;
export function blobShadowTexture() {
  if (_blobTex) return _blobTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.65)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _blobTex = new THREE.CanvasTexture(c);
  return _blobTex;
}
// Orienta la sombra de contacto: se estira y se desplaza en sentido contrario al sol (también en mapas con luz horneada).
export function alignBlobToSun(blob, yaw) {
  const dx = -SUN_DIR.x, dz = -SUN_DIR.z, len = Math.hypot(dx, dz) || 1;
  const wx = dx / len, wz = dz / len, c = Math.cos(yaw), s = Math.sin(yaw);
  const lx = wx * c - wz * s, lz = wx * s + wz * c;          // mundo -> espacio del personaje
  const stretch = 1 + 0.9 * len / SUN_DIR.y * 0.55;
  blob.rotation.set(-Math.PI / 2, 0, Math.atan2(-lx, -lz));
  blob.scale.set(0.9, stretch, 1);
  blob.position.x = lx * 0.22 * stretch; blob.position.z = lz * 0.22 * stretch;
}
export function makeBlobShadow(radius = 0.42) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  m.renderOrder = 2;
  return m;
}

// ===== Ajustes gráficos detallados (se guardan en localStorage 'fafi_gfx'; ver js/ajustes_2_0_0v.js) =====
// Cada opción pisa el valor del preset elegido. Elegir un preset borra los ajustes manuales.
const BASE = {};
for (const k of QUALITY_LEVELS) BASE[k] = { ...QUALITY[k] };
const GFX_KEY = 'fafi_gfx';
const SHADOW_TYPES = { hard: THREE.BasicShadowMap, pcf: THREE.PCFShadowMap, soft: THREE.PCFSoftShadowMap };
export function loadOverrides() { try { return JSON.parse(localStorage.getItem(GFX_KEY) || '{}') || {}; } catch (e) { return {}; } }
export function saveOverrides(o) { try { localStorage.setItem(GFX_KEY, JSON.stringify(o)); } catch (e) {} }
// reconstruye QUALITY[nivel] = preset + ajustes manuales (el resto del juego lee QUALITY[nivel] en cada uso)
export function rebuildQuality() {
  const o = loadOverrides();
  for (const k of QUALITY_LEVELS) {
    const q = { ...BASE[k] };
    if (o.resScale != null) q.resScale = o.resScale;
    if (o.shadows != null) q.shadows = !!o.shadows;
    if (o.shadowSize) q.shadowMapSize = o.shadowSize;
    if (o.shadowRange) q.shadowRange = o.shadowRange;
    if (o.shadowType && SHADOW_TYPES[o.shadowType]) q.shadowType = SHADOW_TYPES[o.shadowType];
    if (q.shadows && !q.shadowRange) q.shadowRange = 30;
    if (o.tone != null) q.tone = !!o.tone;
    if (o.exposure) q.exposure = o.exposure;
    if (o.fogMul != null) q.fogMul = o.fogMul;
    if (o.fpsCap != null) q.fpsCap = o.fpsCap || 0;
    if (o.maxBots) q.maxBots = o.maxBots;
    if (o.aa != null) q.aa = !!o.aa;
    if (o.tex) q.tex = o.tex;
    if (o.fx != null) q.fx = o.fx;                 // cantidad de partículas (0.2 - 1.5)
    QUALITY[k] = q;
  }
}
rebuildQuality();

// escala dinámica de resolución (la ajusta el juego para sostener los FPS objetivo)
let dynScale = 1;
export function setDynScale(v) { dynScale = Math.max(0.4, Math.min(1, v)); }
export function getDynScale() { return dynScale; }
export function pixelRatioFor(level) {
  const q = QUALITY[level] || QUALITY.high, dpr = window.devicePixelRatio || 1;
  const r = q.resScale != null ? dpr * q.resScale : Math.min(dpr, q.maxPixelRatio);
  return Math.max(0.3, Math.min(2.5, r)) * dynScale;
}
