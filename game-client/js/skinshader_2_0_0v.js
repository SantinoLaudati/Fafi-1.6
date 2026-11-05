// Diseños de skins: patrones procedurales (camuflaje, llamas, escamas, hexágonos, fibra de carbono, circuitos...) que se aplican
// en el shader a las zonas elegidas del arma. No necesitan UV: usan la posición en el espacio del modelo normalizada por su longitud.
import * as THREE from 'three';

export const PATTERN_ID = { camo: 1, stripes: 2, hex: 3, flame: 4, scales: 5, fade: 6, carbon: 7, digital: 8, tiger: 9, tech: 10, splatter: 11, galaxy: 12, waves: 13, plates: 14 };
export const ZONE_BIT = { wood: 1, woodD: 2, steel: 4, steelD: 8, poly: 16, chrome: 32, olive: 64, mag: 128, magAk: 256, all: 511 };

const NOISE = `
float skH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float skN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(skH(i), skH(i + vec2(1.0, 0.0)), f.x), mix(skH(i + vec2(0.0, 1.0)), skH(i + vec2(1.0, 1.0)), f.x), f.y); }
float skF(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * skN(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
vec3 skV(vec2 p){ vec2 g = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0; float id = 0.0; for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 o = vec2(float(i), float(j)); vec2 r = o + vec2(skH(g + o), skH(g + o + 7.3)) - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; id = skH(g + o + 3.1); } else if (d < d2) d2 = d; } return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id); }
`;

const PATTERN_FRAG = `
  vec3 skinGlow = vec3(0.0);
  if (uPat > 0.5) {
    float skBit = mod(floor(uZoneMask / exp2(floor(vZone + 0.5))), 2.0);
    if (skBit > 0.5) {
      vec3 q = (vObj - uMin) / uLen;
      vec3 pp = q * uFreq;
      vec3 base = diffuseColor.rgb / max(diffuse.r, 0.001); float lum = dot(base, vec3(0.3333));
      vec3 col = base; float gm = 0.0;
      int P = int(uPat + 0.5);
      if (P == 1) { float n = skF(pp.xy * vec2(7.0, 15.0) + pp.z * 5.0); col = n < 0.44 ? uC1 : (n < 0.58 ? uC2 : uC3); }
      else if (P == 2) { float s = sin((pp.x + pp.y * 4.0) * 6.2832); col = mix(uC1, uC2, smoothstep(0.15, 0.3, s)); col = mix(col, uC3, smoothstep(0.88, 0.97, s)); }
      else if (P == 3) { vec2 p = pp.xy * vec2(1.0, 2.2) * 3.2; vec2 r = vec2(1.0, 1.7320508); vec2 h = r * 0.5; vec2 a = mod(p, r) - h, b = mod(p - h, r) - h; vec2 gv = dot(a, a) < dot(b, b) ? a : b; float e = 0.5 - max(abs(gv.x) * 1.7320508 * 0.5 + abs(gv.y) * 0.5, abs(gv.y)); vec2 id = p - gv; col = mix(uC1, uC2, skH(floor(id * 2.0))); col = mix(uC3, col, smoothstep(0.02, 0.07, e)); gm = 1.0 - smoothstep(0.02, 0.06, e); }
      else if (P == 4) { float t = q.y * 4.2 + (skF(vec2(q.x * 11.0, q.z * 7.0) + vec2(0.0, uTime * 0.0)) - 0.5) * 1.1; col = mix(base, uC1, smoothstep(0.1, 0.35, t)); col = mix(col, uC2, smoothstep(0.38, 0.75, t)); col = mix(col, uC3, smoothstep(0.8, 1.1, t)); gm = smoothstep(0.4, 1.0, t); }
      else if (P == 5) { vec3 v = skV(pp.xy * vec2(1.0, 2.0) * 4.5 + pp.z * 2.0); col = mix(uC1, uC2, v.z); col *= 0.55 + 0.45 * smoothstep(0.0, 0.16, v.y); col = mix(col, uC3, (1.0 - smoothstep(0.0, 0.05, v.y)) * 0.8); gm = 1.0 - smoothstep(0.0, 0.05, v.y); }
      else if (P == 6) { float g = clamp(q.x, 0.0, 1.0); col = g < 0.5 ? mix(uC1, uC2, g * 2.0) : mix(uC2, uC3, (g - 0.5) * 2.0); }
      else if (P == 7) { vec2 pc = pp.xy * vec2(60.0, 60.0) + pp.z * 30.0; float chk = mod(floor(pc.x) + floor(pc.y), 2.0); float f = abs(fract(pc.x) - 0.5) * (1.0 - chk) + abs(fract(pc.y) - 0.5) * chk; col = mix(uC1, uC2, f * 1.6); col += uC3 * pow(max(0.0, 1.0 - f * 2.0), 3.0) * 0.5; }
      else if (P == 8) { vec2 c = floor(pp.xy * vec2(1.0, 3.0) * 16.0 + pp.z * 5.0); float n = skN(c * 0.35) * 0.65 + skH(c) * 0.35; col = n < 0.4 ? uC1 : (n < 0.62 ? uC2 : uC3); }
      else if (P == 9) { float s = sin(pp.y * 22.0 + skF(pp.xz * vec2(4.0, 6.0)) * 7.0 + pp.x * 3.0); col = mix(uC1, uC2, smoothstep(-0.1, 0.4, s)); col = mix(col, uC3, smoothstep(0.85, 0.98, s)); }
      else if (P == 10) { vec2 p = pp.xy * vec2(1.0, 2.5) * 9.0 + pp.z * 4.0; vec2 f = fract(p) - 0.5; vec2 id = floor(p); float hz = skH(id), hv = skH(id + 5.0); float lh = step(abs(f.y), 0.045) * step(hz, 0.55), lv = step(abs(f.x), 0.045) * step(hv, 0.55); float node = 1.0 - smoothstep(0.08, 0.14, length(f)); float m = max(max(lh, lv), node * step(0.7, hz)); col = mix(uC1, uC2, m); gm = m; }
      else if (P == 11) { float n = skF(pp.xy * vec2(8.0, 18.0) + pp.z * 4.0); col = mix(uC1, uC2, smoothstep(0.46, 0.5, n)); col = mix(col, uC3, smoothstep(0.62, 0.66, n)); gm = smoothstep(0.62, 0.66, n); }
      else if (P == 12) { float n = skF(pp.xy * vec2(4.0, 9.0) + pp.z * 2.6); float n2 = skF(pp.xy * vec2(9.0, 20.0) - 3.0); col = mix(uC1, uC2, n); col = mix(col, uC3, smoothstep(0.55, 0.85, n2) * 0.7); float st = step(0.985, skH(floor(pp.xy * 90.0 + pp.z * 40.0))); col += vec3(st); gm = st + n * 0.25; }
      else if (P == 13) { float w = sin(pp.x * 18.0 + sin(pp.y * 14.0 + pp.z * 6.0) * 2.4) * 0.5 + 0.5; col = mix(uC1, uC2, w); col = mix(col, uC3, smoothstep(0.9, 1.0, w)); gm = smoothstep(0.9, 1.0, w); }
      else if (P == 14) { vec2 p = pp.xy * vec2(1.0, 2.0) * vec2(5.0, 5.0); vec2 f = fract(p); vec2 id = floor(p); float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)); col = mix(uC1, uC2, skH(id) * 0.8); col = mix(uC3, col, smoothstep(0.02, 0.09, e)); gm = 1.0 - smoothstep(0.02, 0.07, e); }
      float wear = 0.9 + 0.1 * skN(pp.xy * 60.0 + pp.z * 40.0);
      col = mix(col, col * (0.3 + lum * 1.5), uTex);
      diffuseColor.rgb = col * wear * diffuse.r;
      skinGlow = (uC2 * gm + uC1 * 0.0) * uEmit;
    }
  }
`;

// Añade el patrón al material (una sola vez); los parámetros se cambian por uniformes sin recompilar.
export function patchMaterial(mat) {
  if (mat.userData.skinU) return mat.userData.skinU;
  const u = {
    uPat: { value: 0 }, uC1: { value: new THREE.Color(0xffffff) }, uC2: { value: new THREE.Color(0x888888) }, uC3: { value: new THREE.Color(0x222222) },
    uFreq: { value: new THREE.Vector3(1, 1, 1) }, uMin: { value: new THREE.Vector3() }, uLen: { value: 1 }, uZoneMask: { value: 511 }, uEmit: { value: 0 }, uTime: { value: 0 }, uTex: { value: 0 }
  };
  mat.userData.skinU = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float zone;\nvarying float vZone;\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZone = zone; vObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uPat, uLen, uZoneMask, uEmit, uTime, uTex;\nuniform vec3 uC1, uC2, uC3, uFreq, uMin;\nvarying float vZone;\nvarying vec3 vObj;\n' + NOISE)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + PATTERN_FRAG)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += skinGlow;');
  };
  mat.customProgramCacheKey = () => 'skinpat1';
  mat.needsUpdate = true;
  return u;
}

// Aplica (o quita, con spec = null) un diseño. bb = { min: Vector3, len: número } para normalizar las coordenadas.
export function setPattern(mat, spec, bb) {
  const u = patchMaterial(mat);
  if (bb) { u.uMin.value.copy(bb.min); u.uLen.value = Math.max(bb.len, 1e-4); }
  if (!spec) { u.uPat.value = 0; u.uEmit.value = 0; u.uTex.value = 0; return; }
  u.uPat.value = PATTERN_ID[spec.type] || 0;
  const c = spec.c || [0xffffff, 0x888888, 0x222222];
  u.uC1.value.setHex(c[0]); u.uC2.value.setHex(c[1] ?? c[0]); u.uC3.value.setHex(c[2] ?? c[1] ?? c[0]);
  const f = spec.freq || 1; u.uFreq.value.set(f, f, f);
  u.uEmit.value = spec.emit || 0; u.uTex.value = spec.tex || 0;
  let mask = 0; for (const z of (spec.zones || ['all'])) mask |= ZONE_BIT[z] || 0; u.uZoneMask.value = mask || 511;
}
