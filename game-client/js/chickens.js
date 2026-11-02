// Gallinas decorativas (modelo "extras/animal__food__chicken_model_cs2.glb", con sus clips originales):
// idle / peck / walk / run. Caminan por la malla de navegación y huyen si te acercas.
import * as THREE from 'three';
import { makeLoader } from './loaders.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { makeBlobShadow } from './quality.js';

const FILE = 'assets/extras/animal__food__chicken_model_cs2.glb';
const HEIGHT = 0.30;            // m (el mundo está a escala ~0.62 de CS)

export function createChickens(A) {
  let proto = null, clips = null, minY = 0, height = 1;
  const list = [];
  async function load() {
    if (proto) return;
    await new Promise(res => makeLoader().load(FILE, g => {
      g.scene.updateMatrixWorld(true);
      g.scene.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); o.boundingBox = null; o.boundingSphere = null; o.frustumCulled = false; } });
      const b = new THREE.Box3().setFromObject(g.scene);
      proto = g.scene; clips = g.animations; minY = b.min.y; height = Math.max(0.01, b.max.y - b.min.y); res();
    }, undefined, e => { console.warn('gallina', e); res(); }));
  }
  const clip = n => THREE.AnimationClip.findByName(clips, n);
  function play(c, name, fade = 0.2, loop = true) {
    const clp = clip(name); if (!clp) return;
    const next = c.mixer.clipAction(clp);
    if (c.cur === next) return;
    next.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity).fadeIn(fade).play();
    if (c.cur) c.cur.fadeOut(fade);
    c.cur = next;
  }
  function spawn(positions) {
    if (!proto) return;
    for (const p of positions) {
      const model = cloneSkinned(proto);
      const s = HEIGHT / height;
      const root = new THREE.Group(); root.add(model);
      model.scale.multiplyScalar(s); model.position.y = -minY * s;
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      root.add(makeBlobShadow(0.22));
      root.position.set(p.x, p.y, p.z); root.rotation.y = Math.random() * 6.28;
      A.world.add(root);
      const c = { root, mixer: new THREE.AnimationMixer(model), cur: null, state: 'idle', t: 1 + Math.random() * 4, goal: null, path: null, idx: 0, yaw: root.rotation.y };
      play(c, 'idle01', 0);
      list.push(c);
    }
  }
  function update(dt, nav, playerPos) {
    for (const c of list) {
      c.mixer.update(dt);
      const pos = c.root.position;
      const near = playerPos && Math.hypot(playerPos.x - pos.x, playerPos.z - pos.z) < 2.6 && Math.abs(playerPos.y - pos.y) < 2.5;
      if (near && c.state !== 'flee' && nav) {
        c.state = 'flee'; c.t = 2.2;
        const away = pos.clone().sub(playerPos).setY(0).normalize().multiplyScalar(6).add(pos);
        const g = nav.nearest(away.x, pos.y, away.z, 8);
        if (g >= 0) { const n = nav.nodes[g]; c.path = nav.path(pos, { x: n.x, y: n.y, z: n.z }); c.idx = 0; }
        play(c, 'run01', 0.1);
      }
      if (c.state === 'idle') {
        c.t -= dt;
        if (c.t <= 0) {
          if (nav && Math.random() < 0.6) {
            const g = nav.randomNear(pos.x, pos.z, 5);
            if (g) { c.path = nav.path(pos, g); c.idx = 0; c.state = 'walk'; play(c, 'walk01'); }
          } else { play(c, Math.random() < 0.5 ? 'peck_idle2' : 'idle01'); c.t = 3 + Math.random() * 5; }
        }
      }
      if (c.state === 'walk' || c.state === 'flee') {
        const sp = c.state === 'flee' ? 3.2 : 0.7;
        if (!c.path || c.idx >= c.path.length) { c.state = 'idle'; c.t = 1 + Math.random() * 3; play(c, 'idle01'); continue; }
        const w = c.path[c.idx]; const dx = w.x - pos.x, dz = w.z - pos.z; const d = Math.hypot(dx, dz);
        if (d < 0.25) { c.idx++; continue; }
        const st = Math.min(d, sp * dt); pos.x += dx / d * st; pos.z += dz / d * st; pos.y += (w.y - pos.y) * Math.min(1, dt * 8);
        const want = Math.atan2(dx, dz); let da = want - c.yaw; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        c.yaw += da * Math.min(1, dt * 10); c.root.rotation.y = c.yaw;
        if (c.state === 'flee') { c.t -= dt; if (c.t <= 0) { c.state = 'idle'; c.t = 2; play(c, 'idle01'); } }
      }
    }
  }
  function clear() { for (const c of list) A.world.remove(c.root); list.length = 0; }
  return { load, spawn, update, clear };
}
