// MODO SURF: mapa procedural de rampas y física estilo Source (colisionar y deslizar). En las rampas empinadas no se puede caminar:
// el jugador se desliza y gana velocidad moviendo el mouse y apretando A/D hacia el lado de la rampa (air strafe).
import * as THREE from 'three';

const ANG = 55 * Math.PI / 180, WD = 9, GAP = 1.2, SEG_L = 22, T = 0.5;
const SEGS = [0, 0, 8, 8, 8, 0, -9, -9, -9, -9, 0, 0, 10, 10, 10, 10, 0, -12, -12, -12, 0, 0];   // giro (grados) al pasar de un tramo al siguiente: la pista curva suave

export function buildSurfMap() {
  const group = new THREE.Group(), colliders = [];
  const mats = [new THREE.MeshStandardMaterial({ color: 0x4aa3d9, roughness: 0.7, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: 0x7b5be0, roughness: 0.7, side: THREE.DoubleSide })];
  const add = (geo, mat, pos, rot, parent) => { const m = new THREE.Mesh(geo, mat); m.position.copy(pos); m.rotation.set(rot[0], rot[1], rot[2]); m.receiveShadow = true; m.castShadow = true; parent.add(m); colliders.push(m); return m; };
  let pos = new THREE.Vector3(0, 0, 0), yaw = 0;
  const topX = -(GAP / 2 + WD * Math.cos(ANG)), topY = WD * Math.sin(ANG) + 0.14;      // borde alto de la rampa izquierda
  const startPos = new THREE.Vector3(topX - 3.5, topY + 0.7, -6);
  // plataforma de salida (a la altura del borde alto de la rampa izquierda)
  const startPlat = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xdddddd })); startPlat.position.set(topX - 5.0 + 0.35, topY - 0.3, startPos.z + 2); startPlat.receiveShadow = true; group.add(startPlat); colliders.push(startPlat);
  const total = SEGS.length;
  for (let i = 0; i < total; i++) {
    const seg = new THREE.Group(); seg.position.copy(pos); seg.rotation.y = yaw;
    const geo = new THREE.BoxGeometry(WD, T, SEG_L * 1.04), x = GAP / 2 + (WD / 2) * Math.cos(ANG), y = (WD / 2) * Math.sin(ANG), mat = mats[i % 2];
    add(geo, mat, new THREE.Vector3(-x, y, -SEG_L / 2), [0, 0, -ANG], seg);       // rampa izquierda (sube hacia -x)
    add(geo, mat, new THREE.Vector3(x, y, -SEG_L / 2), [0, 0, ANG], seg);        // rampa derecha (sube hacia +x)
    add(new THREE.BoxGeometry(GAP + 1.6, 0.3, SEG_L * 1.04), new THREE.MeshStandardMaterial({ color: 0x2b3340 }), new THREE.Vector3(0, -0.15, -SEG_L / 2), [0, 0, 0], seg);   // fondo del valle: si te caés ahí podés volver a saltar a la rampa
    group.add(seg);
    const dir = new THREE.Vector3(0, 0, -SEG_L).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); pos = pos.clone().add(dir);
    yaw += SEGS[i] * Math.PI / 180 * 0.5;
  }
  // meta: piso plano al final (fuera de las rampas)
  const finish = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 18), new THREE.MeshStandardMaterial({ color: 0x4ade80 })); finish.position.set(pos.x, -0.4, pos.z - 6); finish.receiveShadow = true; group.add(finish); colliders.push(finish);
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  return { group, colliders, bounds, start: startPos, finish: finish.position.clone() };
}

// ---------------------------------------------------------------- física
const R = 0.34, CENTER_H = 0.5, EYE_H = 0.85, GRAV = 18, MAXSPEED = 2.6, FRICTION = 5.2, ACCEL = 5.5, AIR_ACCEL = 14, AIR_CAP = 0.45;
const ray = new THREE.Raycaster(), _n = new THREE.Vector3(), _d = new THREE.Vector3(), _w = new THREE.Vector3(), _tmp = new THREE.Vector3();
export function createSurf() {
  const S = { feet: new THREE.Vector3(), vel: new THREE.Vector3(), grounded: false, t0: 0, started: false, best: null, map: null, jumpHeld: false };
  const contact = (center, dir, len, colliders) => {
    ray.set(center, dir); ray.far = len; ray.firstHitOnly = true;
    const h = ray.intersectObjects(colliders, false)[0]; if (!h || !h.face) return null;
    _n.copy(h.face.normal).transformDirection(h.object.matrixWorld); if (_n.dot(dir) > 0) _n.negate();
    return { dist: h.distance, n: _n.clone() };
  };
  S.reset = (map) => { if (map) S.map = map; S.feet.copy(S.map.start); S.vel.set(0, 0, 0); S.grounded = false; S.started = false; };
  S.step = (dt, input, colliders) => {
    dt = Math.min(dt, 0.033);
    const { fx, fz, rx, rz, forward, right, jump } = input;      // vectores horizontales de la cámara (adelante y derecha) y entradas
    // movimiento deseado
    _w.set(fx * forward + rx * right, 0, fz * forward + rz * right); const wl = _w.length(); if (wl > 0) _w.multiplyScalar(1 / wl);
    const hv = Math.hypot(S.vel.x, S.vel.z);
    if (S.grounded) {
      if (hv > 0) { const ns = Math.max(0, hv - Math.max(hv, 0.8) * FRICTION * dt); S.vel.x *= ns / hv; S.vel.z *= ns / hv; }
      if (wl > 0) { const cur = S.vel.x * _w.x + S.vel.z * _w.z, add = MAXSPEED - cur; if (add > 0) { const a = Math.min(add, ACCEL * dt * MAXSPEED); S.vel.x += _w.x * a; S.vel.z += _w.z * a; } }
      if (jump && !S.jumpHeld) { S.vel.y = 5.4; S.grounded = false; }
    } else {
      if (wl > 0) { const cur = S.vel.x * _w.x + S.vel.z * _w.z, add = AIR_CAP - cur; if (add > 0) { const a = Math.min(add, AIR_ACCEL * dt * MAXSPEED); S.vel.x += _w.x * a; S.vel.z += _w.z * a; } }
    }
    S.jumpHeld = !!jump;
    S.vel.y -= GRAV * dt;
    // colisionar y deslizar (hasta 4 rebotes contra superficies)
    let remaining = dt; S.grounded = false;
    for (let it = 0; it < 4 && remaining > 1e-5; it++) {
      const sp = S.vel.length(); if (sp < 1e-4) break;
      _d.copy(S.vel).multiplyScalar(1 / sp);
      const move = sp * remaining, center = _tmp.copy(S.feet); center.y += CENTER_H;
      const hit = contact(center.clone(), _d.clone(), move + R, colliders);
      if (!hit) { S.feet.addScaledVector(S.vel, remaining); break; }
      const travel = Math.max(0, hit.dist - R - 0.01);
      S.feet.addScaledVector(_d, travel);
      remaining -= travel / sp;
      if (hit.n.y >= 0.7) S.grounded = true;                                 // suelo transitable
      const into = S.vel.dot(hit.n); if (into < 0) S.vel.addScaledVector(hit.n, -into * 1.0);     // recorta la velocidad contra la superficie (en rampas empinadas desliza)
      S.feet.addScaledVector(hit.n, 0.004);
    }
    // si quedó pegado al suelo, mantenerlo apoyado (pequeño empuje hacia abajo)
    if (!S.grounded) { const c = S.feet.clone(); c.y += CENTER_H; const g = contact(c, new THREE.Vector3(0, -1, 0), R + 0.12, colliders); if (g && g.n.y >= 0.7 && S.vel.y <= 0.2) { S.grounded = true; S.feet.y -= Math.max(0, g.dist - R - 0.005); S.vel.y = Math.max(S.vel.y, 0) * 0; } }
    // reaparición por caída y meta
    const out = { respawn: false, finished: false, time: 0 };
    if (S.feet.y < -22) { S.reset(); out.respawn = true; }
    if (!S.started && S.vel.length() > 0.3) { S.started = true; S.t0 = performance.now(); }
    if (S.started && S.map && S.feet.distanceTo(S.map.finish) < 8 && S.feet.y < 2) { out.finished = true; out.time = (performance.now() - S.t0) / 1000; S.best = S.best == null ? out.time : Math.min(S.best, out.time); S.started = false; }
    return out;
  };
  S.eye = (cam) => { cam.position.set(S.feet.x, S.feet.y + EYE_H, S.feet.z); };
  S.speed = () => Math.hypot(S.vel.x, S.vel.z);
  return S;
}
