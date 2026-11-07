// Granadas: flash, humo, HE y molotov. Física con rebotes contra la geometría del mapa, efectos y viewmodels.
import * as THREE from 'three';
import { makeLoader } from './loaders_2_0_0v.js';
import { SFX } from './sfx_2_0_0v.js';

const DIR = 'assets/granadas/';
export const GRENADES = {
  flash: { label: 'FLASHBANG',  file: DIR + 'optimizados/flash_granade_1k.glb', size: 0.13, price: 200, max: 2, fuse: 1.45, icon: 'FL' },
  smoke: { label: 'HUMO',       file: DIR + 'smoke_granade.glb',                 size: 0.15, price: 300, max: 1, fuse: 1.3,  icon: 'HU' },
  he:    { label: 'GRANADA HE', file: DIR + 'granade_-_low_poly.glb',             size: 0.11, price: 300, max: 1, fuse: 1.7,  icon: 'HE' },
  molo:  { label: 'MOLOTOV',    file: DIR + 'chicken_gun_molotov_cocktail.glb',  size: 0.20, price: 400, max: 1, fuse: 2.2,  icon: 'MO' }
};

export function createGrenades(A) {
  const protos = {};
  const active = [];       // proyectiles en vuelo
  const effects = [];      // humo, fuego, destellos
  const ray = new THREE.Raycaster();
  const GRAV = -13, BOUNCE = 0.42, FRICTION = 0.72;
  let smokeTex = null, fireTex = null;

  function softTexture(rgb, inner = 0.15) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(inner + 0.35, `rgba(${rgb},0.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  async function load() {
    smokeTex = softTexture('205,208,214'); fireTex = softTexture('255,160,40');
    await Promise.all(Object.keys(GRENADES).map(k => new Promise(res => {
      makeLoader().load(GRENADES[k].file, g => {
        const m = g.scene; m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
        const box = new THREE.Box3().setFromObject(m); const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
        const s = GRENADES[k].size / Math.max(size.x, size.y, size.z);
        const holder = new THREE.Group(); m.scale.setScalar(s); m.position.set(-c.x * s, -c.y * s, -c.z * s); holder.add(m);
        protos[k] = holder; res();
      }, undefined, e => { console.warn('granada', k, e); protos[k] = new THREE.Mesh(new THREE.SphereGeometry(GRENADES[k].size / 2, 12, 10), new THREE.MeshStandardMaterial({ color: 0x556655 })); res(); });
    })));
  }
  const ready = () => Object.keys(GRENADES).every(k => protos[k]);
  function held(type) { return protos[type] ? protos[type].clone(true) : new THREE.Group(); }

  // ---- lanzamiento ----
  function throwG(type, origin, dir, owner, power = 1, inherit = null) {
    const m = held(type);
    m.position.copy(origin); A.world.add(m);
    const vel = dir.clone().multiplyScalar(13.5 * power); vel.y += 2.6 * power;
    if (inherit) vel.add(inherit);
    active.push({ type, mesh: m, vel, age: 0, owner, rest: false, spin: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6), bounced: 0 });
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const g = active[i]; g.age += dt;
      if (!g.rest) {
        g.vel.y += GRAV * dt; g.vel.multiplyScalar(Math.exp(-0.06 * dt));   // resistencia del aire
        const step = g.vel.clone().multiplyScalar(dt); const len = step.length();
        if (len > 1e-5) {
          ray.set(g.mesh.position, step.clone().divideScalar(len)); ray.far = len + 0.06; ray.firstHitOnly = true;
          const hit = ray.intersectObjects(A.colliders, false)[0];
          if (hit && hit.face) {
            const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
            if (n.dot(g.vel) > 0) n.negate();
            g.mesh.position.copy(hit.point).addScaledVector(n, 0.06);
            const vn = n.clone().multiplyScalar(g.vel.dot(n));
            const vt = g.vel.clone().sub(vn);
            const vnLen = vn.length(), rest = vnLen < 2.2 ? 0.12 : BOUNCE * Math.min(1, 0.55 + vnLen / 18);   // a baja velocidad casi no rebota
            g.vel.copy(vt.multiplyScalar(vnLen < 2.2 ? 0.9 : FRICTION)).addScaledVector(vn, -rest);
            g.spin.copy(n).cross(g.vel).multiplyScalar(-1 / 0.07).clampLength(0, 22);   // rueda al ritmo de su velocidad
            g.bounced++;
            { const sp = g.vel.length(); if (sp > 1.6) SFX.at("grenade_bounce", g.mesh.position, { vol: Math.min(1, sp / 8), ref: 5 }); }
            if (g.type === 'molo' && n.y > 0.5) g.age = 99;                  // el molotov estalla al tocar suelo
            if (g.vel.length() < 0.9 && n.y > 0.5) { g.rest = true; g.vel.set(0, 0, 0); }
          } else g.mesh.position.add(step);
        }
        g.mesh.rotation.x += g.spin.x * dt; g.mesh.rotation.y += g.spin.y * dt; g.mesh.rotation.z += g.spin.z * dt;
      }
      if (g.age >= GRENADES[g.type].fuse) { detonate(g); A.world.remove(g.mesh); active.splice(i, 1); }
    }
    // efectos
    const now = performance.now();
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i]; const t = (now - e.t0) / 1000;
      if (e.kind === 'smoke') {
        const grow = Math.min(1, t / 1.1), fade = t > e.life - 3 ? Math.max(0, (e.life - t) / 3) : 1;
        e.puffs.forEach((p, k) => { const s = e.r * (0.55 + 0.45 * grow) * p.userData.sc; p.scale.set(s, s, 1); p.material.opacity = 0.9 * fade; p.position.set(e.pos.x + p.userData.o.x * grow, e.pos.y + 0.4 + p.userData.o.y * grow, e.pos.z + p.userData.o.z * grow); });
        if (t > e.life) { remove(e); effects.splice(i, 1); }
      } else if (e.kind === 'fire') {
        e.puffs.forEach(p => { p.userData.ph += dt * 9; const f = 0.75 + 0.35 * Math.sin(p.userData.ph); p.scale.set(p.userData.sc * f, p.userData.sc * (1.2 + 0.4 * f), 1); p.position.y = e.pos.y + p.userData.sc * 0.5; p.material.opacity = Math.min(1, (e.life - t) * 0.6) * 0.85; });
        if (e.light) e.light.intensity = (14 + 6 * Math.sin(t * 20)) * Math.min(1, e.life - t);
        e.tick -= dt;
        if (e.tick <= 0) { e.tick = 0.5; A.areaDamage(e.pos, e.r, 9, e.owner, 'fire'); }
        if (t > e.life) { remove(e); effects.splice(i, 1); }
      } else if (e.kind === 'flash') {
        const k = t / 0.35; e.sprite.scale.setScalar(0.5 + k * 3.2); e.sprite.material.opacity = Math.max(0, 1 - k); if (e.light) e.light.intensity = Math.max(0, 40 * (1 - k));
        if (k >= 1) { remove(e); effects.splice(i, 1); }
      }
    }
  }
  function remove(e) { if (e.group) A.world.remove(e.group); if (e.sprite) A.world.remove(e.sprite); if (e.light) A.releaseLight(e.light); }

  function detonate(g) {
    const pos = g.mesh.position.clone();
    if (g.type === 'flash') {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      sprite.position.copy(pos); sprite.scale.setScalar(0.5); A.world.add(sprite);
      const light = A.acquireLight(0xffffff, 40, 14, pos);
      effects.push({ kind: 'flash', t0: performance.now(), sprite, light });
      A.flashArea(pos, g.owner);
      SFX.at("flash", pos, { ref: 14 });
    } else if (g.type === 'he') {
      A.explosion(pos, 5);
      SFX.at("he", pos, { ref: 22, rolloff: 0.9 });
      A.areaDamage(pos, 6.5, 98, g.owner, 'he');
    } else if (g.type === 'smoke') {
      const r = 2.7, group = new THREE.Group(), puffs = [];
      for (let i = 0; i < 16; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.9, depthWrite: false, fog: true, color: 0xdfe3ea }));
        sp.userData = { o: new THREE.Vector3((Math.random() - 0.5) * r * 0.9, Math.random() * r * 0.5, (Math.random() - 0.5) * r * 0.9), sc: 0.9 + Math.random() * 0.8 };
        group.add(sp); puffs.push(sp);
      }
      A.world.add(group);
      effects.push({ kind: 'smoke', t0: performance.now(), life: 18, pos, r: r * 1.5, puffs, group });
      A.registerSmoke(pos.clone().add(new THREE.Vector3(0, 0.8, 0)), r, 18000, null);
      SFX.at("smoke", pos, { ref: 10 });
    } else if (g.type === 'molo') {
      SFX.at("molotov", pos, { ref: 14 });
      const r = 2.6, group = new THREE.Group(), puffs = [];
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * r;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        sp.position.set(pos.x + Math.cos(a) * d, pos.y + 0.3, pos.z + Math.sin(a) * d);
        sp.userData = { sc: 0.8 + Math.random() * 0.9, ph: Math.random() * 6 };
        group.add(sp); puffs.push(sp);
      }
      const light = A.acquireLight(0xff7a20, 14, 9, new THREE.Vector3(pos.x, pos.y + 0.8, pos.z));
      A.world.add(group);
      effects.push({ kind: 'fire', t0: performance.now(), life: 7, pos, r, puffs, group, light, tick: 0.2, owner: g.owner });
    }
  }
  function clear() {
    for (const g of active) A.world.remove(g.mesh); active.length = 0;
    for (const e of effects) remove(e); effects.length = 0;
  }
  return { load, ready, held, throw: throwG, update, clear, protos };
}
