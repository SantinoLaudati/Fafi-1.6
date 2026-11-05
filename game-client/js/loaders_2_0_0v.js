// Cargador GLTF común del juego.
// three r160 ya no trae KHR_materials_pbrSpecularGlossiness (lo usan el pack de armas y el personaje ST6):
// sin este plugin esos materiales salían blancos/grises y sin textura. Se convierte a MeshStandardMaterial.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const EXT = 'KHR_materials_pbrSpecularGlossiness';

class SpecGlossPlugin {
  constructor(parser) { this.parser = parser; this.name = EXT; }
  _ext(i) { const d = this.parser.json.materials[i]; return d && d.extensions && d.extensions[EXT]; }
  getMaterialType(i) { return this._ext(i) ? THREE.MeshStandardMaterial : null; }
  extendMaterialParams(i, params) {
    const e = this._ext(i);
    if (!e) return Promise.resolve();
    const pending = [];
    params.color = new THREE.Color(1, 1, 1); params.opacity = 1;
    if (Array.isArray(e.diffuseFactor)) {
      params.color.setRGB(e.diffuseFactor[0], e.diffuseFactor[1], e.diffuseFactor[2], THREE.LinearSRGBColorSpace);
      params.opacity = e.diffuseFactor[3];
    }
    if (e.diffuseTexture) pending.push(this.parser.assignTexture(params, 'map', e.diffuseTexture, THREE.SRGBColorSpace));
    const spec = Array.isArray(e.specularFactor) ? Math.max(...e.specularFactor) : 1;
    const gloss = e.glossinessFactor !== undefined ? e.glossinessFactor : 1;
    params.metalness = Math.min(0.5, spec * 0.5);
    params.roughness = THREE.MathUtils.clamp(1 - gloss * 0.75, 0.35, 1);
    return Promise.all(pending);
  }
}

export function makeLoader() {
  const l = new GLTFLoader();
  l.register(p => new SpecGlossPlugin(p));
  return l;
}
