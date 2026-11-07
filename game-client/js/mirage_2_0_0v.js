// MIRAGE: aspecto del mapa (de_mirage). El glb original no trae texturas, así que cada vértice lleva un color base y un "tipo de superficie"
// (en el canal alfa del color: 0 muro, 1 suelo exterior, 2 techo, 3 cielorraso, 4 objetos/madera/puertas, 5 piso interior; ver herramientas/preparar-mirage_2_0_0v.html).
// Los detalles finos (revoque, piedra, baldosas, tejas, vetas de madera) se generan acá en el shader a partir de la posición en el mundo,
// así no hace falta ninguna imagen y el mapa pesa poco.
import * as THREE from 'three';

const GLSL_COMMON = `
varying vec3 vWp;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return v; }
float joint(float x, float w){ float f = abs(fract(x) - 0.5), fx = fwidth(x); float j = smoothstep(0.5 - max(w, fx), 0.5, f); return mix(j, 2.0 * w, smoothstep(0.3, 0.7, fx)); }   // juntas suavizadas según el tamaño del píxel (sin parpadeo a distancia)
float aaw(float cellSize, float fw){ return 1.0 - smoothstep(0.35 * cellSize, 0.9 * cellSize, fw); }
`;

const GLSL_FRAG = `
  {
    float kind = floor(vColor.a * 255.0 / 32.0 + 0.5);
    vec3 nrm = normalize(cross(dFdx(vWp), dFdy(vWp)));
    vec3 base = diffuseColor.rgb;
    float lum = dot(base, vec3(0.3333));
    vec3 c = vec3(1.0);
    float vdist = length(vViewPosition); float fw = length(fwidth(vWp));
    if (vdist < 34.0) {                                   // el detalle fino solo se calcula cerca (ahorra mucho en la placa de video)
    if (kind < 0.5) {                                   // MURO: revoque con parches de piedra a la vista
      float u = abs(nrm.x) > abs(nrm.z) ? vWp.z : vWp.x, v = vWp.y;
      float st = mix(0.5, fbm(vec2(u, v) * 5.5), aaw(0.05, fw)) * 0.28 + fbm(vec2(u, v) * 0.9) * 0.22;
      c *= 0.82 + st;
      float mask = smoothstep(0.52, 0.68, fbm(vec2(u * 0.55, v * 0.8) + 3.0));
      float row = floor(v / 0.42); float ux = u / 0.95 + 0.5 * mod(row, 2.0);
      float jl = max(joint(v / 0.42, 0.04), joint(ux, 0.03));
      float block = 0.88 + 0.22 * h21(vec2(floor(ux), row));
      c = mix(c, c * block * (1.0 - 0.38 * jl) * vec3(0.96, 0.94, 0.9), mask);
      c *= 1.0 - 0.18 * smoothstep(0.6, 1.0, fbm(vec2(u * 2.0, v * 0.45)));      // manchas de humedad
    } else if (kind < 1.5) {                            // SUELO EXTERIOR: arena o baldosas de piedra
      bool paved = (base.r - base.b) < 0.2;
      if (paved) { vec2 p = vWp.xz / 0.95; float jl = max(joint(p.x, 0.035), joint(p.y + 0.5 * mod(floor(p.x), 2.0), 0.035));
        c *= (0.84 + 0.3 * h21(floor(p))) * (1.0 - 0.34 * jl) * (0.92 + 0.16 * fbm(vWp.xz * 7.0)); }
      else { c *= 0.82 + 0.34 * mix(0.5, fbm(vWp.xz * 4.0), aaw(0.06, fw)) + 0.1 * (vn(vWp.xz * 38.0) - 0.5) * aaw(0.03, fw); }
    } else if (kind < 2.5) {                            // TECHO: tejas de barro o azotea revocada
      if ((base.r - base.b) > 0.3) { float row = floor(vWp.z * 3.2 + vWp.y * 1.2); float x = vWp.x * 5.0 + 0.5 * mod(row, 2.0);
        float jl = max(joint(x, 0.08), joint(vWp.z * 3.2 + vWp.y * 1.2, 0.07));
        c *= (0.82 + 0.3 * h21(vec2(floor(x), row))) * (1.0 - 0.42 * jl); }
      else { c *= 0.84 + 0.3 * fbm(vWp.xz * 3.0); }
    } else if (kind < 3.5) {                            // CIELORRASO
      c *= 0.88 + 0.2 * fbm(vWp.xz * 4.0);
    } else if (kind < 4.5) {                            // OBJETOS: madera con vetas o paneles pintados
      if (base.r > base.b * 1.2) { float g = vn(vec2((vWp.x + vWp.z) * 2.0, vWp.y * 38.0)) * 0.5 + vn(vec2((vWp.x + vWp.z) * 9.0, vWp.y * 5.0)) * 0.5;
        c *= 0.72 + 0.5 * g; }
      else { float pn = max(joint(vWp.y * 2.2, 0.05), joint((vWp.x + vWp.z) * 1.6, 0.05)); c *= (0.9 + 0.2 * fbm(vWp.xy * 6.0 + vWp.zz)) * (1.0 - 0.3 * pn); }
    } else {                                            // PISO INTERIOR: baldosas cuadradas
      vec2 p = vWp.xz / 0.6; float jl = max(joint(p.x, 0.04), joint(p.y, 0.04));
      c *= (0.8 + 0.36 * h21(floor(p))) * (1.0 - 0.36 * jl);
    }
    c = mix(vec3(1.0), c, 1.0 - smoothstep(16.0, 34.0, vdist));
    }
    vec3 col = base * c * vec3(1.12, 0.97, 0.76);                       // tono cálido de arena
    float l2 = dot(col, vec3(0.3333));
    diffuseColor.rgb = clamp(mix(vec3(l2), col, 1.3) * 1.12, 0.0, 1.0);   // más saturado y luminoso
  }
`;

let cached = null;
export function mirageMaterial() {
  if (cached) return cached;
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + "varying vec3 vWp;")
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + GLSL_FRAG);
  };
  m.customProgramCacheKey = () => 'mirage-v5';
  cached = m; return m;
}

// Reemplaza los materiales del modelo cargado por el material procedural de Mirage.
export function applyMirageLook(model) {
  const mat = mirageMaterial();
  model.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = true; o.receiveShadow = true; } });
}

// Simplificación por agrupación de vértices: el modelo original trae ~590 000 triángulos, más de la mitad diminutos (detalle de ladrillos y bordes).
// Los vértices que caen en la misma celda (y son del mismo tipo de superficie) se fusionan en su promedio y se descartan los triángulos que quedan
// degenerados o repetidos. Con celdas de 12 cm baja a ~250 000 triángulos sin cambiar la forma visible del mapa (y la colisión también se aligera).
export function simplifyMirage(model, cell = 0.12) {
  let before = 0, after = 0;
  model.traverse((m) => {
    if (!m.isMesh) return;
    const g = m.geometry, p = g.attributes.position, col = g.attributes.color, ix = g.index;
    if (!p || !col) return;
    const n = ix ? ix.count : p.count; before += n / 3;
    const map = new Map(), remap = new Int32Array(p.count).fill(-1);
    const sx = [], sy = [], sz = [], cn = [], cc = [];
    const idx = [], seen = new Set(), inv = 1 / cell;
    const get = (vi) => {
      if (remap[vi] >= 0) return remap[vi];
      const x = p.getX(vi), y = p.getY(vi), z = p.getZ(vi), k = col.getW(vi);   // k va de 0 a 1 (atributo normalizado)
      const key = Math.round(x * inv) + ',' + Math.round(y * inv) + ',' + Math.round(z * inv) + ',' + k;
      let id = map.get(key);
      if (id === undefined) { id = sx.length; map.set(key, id); sx.push(0); sy.push(0); sz.push(0); cn.push(0); cc.push(Math.round(col.getX(vi) * 255), Math.round(col.getY(vi) * 255), Math.round(col.getZ(vi) * 255), Math.round(k * 255)); }
      sx[id] += x; sy[id] += y; sz[id] += z; cn[id]++; remap[vi] = id; return id;
    };
    for (let i = 0; i < n; i += 3) {
      const a = get(ix ? ix.getX(i) : i), b = get(ix ? ix.getX(i + 1) : i + 1), c = get(ix ? ix.getX(i + 2) : i + 2);
      if (a === b || b === c || a === c) continue;
      const lo = Math.min(a, b, c), hi = Math.max(a, b, c), mid = a + b + c - lo - hi, key = lo + '_' + mid + '_' + hi;
      if (seen.has(key)) continue; seen.add(key); idx.push(a, b, c);
    }
    const nv = sx.length, pos = new Float32Array(nv * 3), colors = new Uint8Array(cc);
    for (let i = 0; i < nv; i++) { pos[i * 3] = sx[i] / cn[i]; pos[i * 3 + 1] = sy[i] / cn[i]; pos[i * 3 + 2] = sz[i] / cn[i]; }
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    ng.setAttribute('color', new THREE.BufferAttribute(colors, 4, true));
    ng.setIndex(new THREE.BufferAttribute(nv > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
    ng.computeBoundingBox(); ng.computeBoundingSphere();
    g.dispose(); m.geometry = ng; after += idx.length / 3;
  });
  console.log('Mirage simplificado:', Math.round(before), '->', Math.round(after), 'triángulos');
}
