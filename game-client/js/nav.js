// Malla de navegación para los bots: se genera una vez por mapa lanzando rayos contra las
// colisiones (BVH), y se busca con A* sobre una grilla multinivel.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);

class MinHeap {
  constructor() { this.a = []; }
  push(n, p) { const a = this.a; a.push([n, p]); let i = a.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (a[j][1] <= a[i][1]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][1] < a[m][1]) m = l; if (r < a.length && a[r][1] < a[m][1]) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } } return top[0]; }
  get size() { return this.a.length; }
}

export class NavGrid {
  // bounds: Box3 del mapa, colliders: meshes, cell: tamaño de celda (m)
  // opts.headroom: altura libre mínima sobre el suelo (m). Los mapas reducidos (Office ~0.55x) tienen techos y
  // escaleras más bajos que el valor por defecto: con 1.25 m no se generaban nodos bajo las escaleras ni en pasillos.
  constructor(bounds, colliders, cell = 1.0, opts = {}) {
    this.b = bounds; this.cols = colliders; this.cell = cell;
    this.head = opts.headroom || 1.25; this.hs = this.head / 1.25; this.step = opts.step || 0.62;
    this.nx = Math.ceil((bounds.max.x - bounds.min.x) / cell) + 1;
    this.nz = Math.ceil((bounds.max.z - bounds.min.z) / cell) + 1;
    this.nodes = [];          // {x,y,z,wall,links:[ids]}
    this.cells = new Map();   // iz*nx+ix -> [ids]
    this.ready = false;
  }
  key(ix, iz) { return iz * this.nx + ix; }
  cellOf(x, z) { return [Math.round((x - this.b.min.x) / this.cell), Math.round((z - this.b.min.z) / this.cell)]; }

  // Genera nodos y enlaces. Cede el hilo cada tanto para no congelar la pantalla.
  async build(onProgress) {
    const { b, cols, cell } = this;
    const ray = new THREE.Raycaster();
    const top = b.max.y + 0.5, len = (b.max.y - b.min.y) + 1;
    const hit = (o, d, far) => { ray.set(o, d); ray.far = far; ray.firstHitOnly = true; return ray.intersectObjects(cols, false).length > 0; };
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
    let n = 0, lastYield = performance.now();
    // 1) nodos: suelo caminable con espacio libre arriba
    for (let iz = 0; iz < this.nz; iz++) {
      for (let ix = 0; ix < this.nx; ix++) {
        const x = b.min.x + ix * cell, z = b.min.z + iz * cell;
        ray.set(tmp.set(x, top, z), DOWN); ray.far = len; ray.firstHitOnly = false;
        const hits = ray.intersectObjects(cols, false);
        let lastY = Infinity; const ids = [];
        for (const h of hits) {
          if (!h.face) continue;
          const nrm = h.face.normal.clone().transformDirection(h.object.matrixWorld);
          if (nrm.y < 0.72) continue;
          const y = h.point.y;
          if (lastY - y < 0.9) continue;                                // mismo piso (superficies dobles)
          if (hit(tmp2.set(x, y + 0.12, z), UP, this.head)) { lastY = y; continue; }   // sin altura libre
          // cerca de pared: 4 rayos cortos
          let wall = 0;
          for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (hit(tmp2.set(x, y + 0.45, z), new THREE.Vector3(d[0], 0, d[1]), 0.34)) wall++;
          const id = this.nodes.length;
          this.nodes.push({ x, y, z, wall, links: [], ix, iz });
          ids.push(id); lastY = y;
        }
        if (ids.length) this.cells.set(this.key(ix, iz), ids);
        n++;
        if (performance.now() - lastYield > 40) { lastYield = performance.now(); if (onProgress) onProgress(n / (this.nx * this.nz) * 0.5); await new Promise(r => setTimeout(r, 0)); }
      }
    }
    // 2) enlaces a 8 vecinos con chequeo de paso libre
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let done = 0;
    for (const nd of this.nodes) {
      for (const [dx, dz] of dirs) {
        const ids = this.cells.get(this.key(nd.ix + dx, nd.iz + dz));
        if (!ids) continue;
        for (const id of ids) {
          const m = this.nodes[id];
          const dy = m.y - nd.y;
          if (Math.abs(dy) > this.step) continue;
          if (nd.links.includes(id)) continue;
          // rayo a altura de rodilla/cintura desde nd hacia m
          const dist = Math.hypot(m.x - nd.x, m.z - nd.z);
          const ydir = Math.max(nd.y, m.y) + 0.7 * this.hs;
          const dirv = new THREE.Vector3(m.x - nd.x, 0, m.z - nd.z).normalize();
          if (hit(tmp.set(nd.x, ydir, nd.z), dirv, dist + 0.15)) continue;
          if (hit(tmp.set(nd.x, Math.max(nd.y, m.y) + 0.3 * this.hs, nd.z), dirv, dist + 0.1)) continue;
          nd.links.push(id);
        }
      }
      done++;
      if (performance.now() - lastYield > 40) { lastYield = performance.now(); if (onProgress) onProgress(0.5 + done / this.nodes.length * 0.5); await new Promise(r => setTimeout(r, 0)); }
    }
    this.ready = true;
    return this;
  }

  nearest(x, y, z, maxR = 6) {
    const [cx, cz] = this.cellOf(x, z);
    let best = -1, bd = Infinity;
    const R = Math.ceil(maxR / this.cell);
    for (let r = 0; r <= R; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const ids = this.cells.get(this.key(cx + dx, cz + dz));
        if (!ids) continue;
        for (const id of ids) {
          const nd = this.nodes[id];
          const d = (nd.x - x) ** 2 + (nd.z - z) ** 2 + (y === undefined || y === null ? 0 : ((nd.y - y) * 2) ** 2);
          if (d < bd) { bd = d; best = id; }
        }
      }
      if (best >= 0 && r >= 1) break;
    }
    return best;
  }

  // Camino A* como lista de puntos {x,y,z}. Devuelve null si no hay.
  path(from, to) {
    const s = this.nearest(from.x, from.y, from.z), g = this.nearest(to.x, to.y, to.z);
    if (s < 0 || g < 0) return null;
    if (s === g) return [{ x: to.x, y: this.nodes[g].y, z: to.z }];
    const N = this.nodes;
    const gs = new Map([[s, 0]]), came = new Map(), open = new MinHeap(), closed = new Set();
    open.push(s, 0);
    let iter = 0;
    while (open.size && iter++ < 30000) {
      const cur = open.pop();
      if (cur === g) {
        const out = []; let c = g;
        while (c !== undefined) { out.push({ x: N[c].x, y: N[c].y, z: N[c].z }); c = came.get(c); }
        out.reverse();
        return this.smooth(out);
      }
      if (closed.has(cur)) continue; closed.add(cur);
      const a = N[cur];
      for (const id of a.links) {
        if (closed.has(id)) continue;
        const m = N[id];
        const step = Math.hypot(m.x - a.x, m.z - a.z) + Math.abs(m.y - a.y) * 0.5 + m.wall * 0.7;
        const ng = gs.get(cur) + step;
        if (ng < (gs.has(id) ? gs.get(id) : Infinity)) {
          gs.set(id, ng); came.set(id, cur);
          open.push(id, ng + Math.hypot(N[g].x - m.x, N[g].z - m.z));
        }
      }
    }
    return null;
  }

  // Quita puntos intermedios cuando el tramo directo es libre (3 rayos de ancho 0.5 m).
  smooth(pts) {
    if (pts.length < 3) return pts;
    const ray = new THREE.Raycaster(); ray.firstHitOnly = true;
    const free = (a, b) => {
      const d = new THREE.Vector3(b.x - a.x, 0, b.z - a.z); const L = d.length(); if (L < 0.01) return true; d.normalize();
      if (Math.abs(b.y - a.y) > 0.6 + L * 0.12) return false;
      const side = new THREE.Vector3(-d.z, 0, d.x);
      for (const off of [0, 0.28, -0.28]) {
        for (const h of [0.35 * this.hs, 0.9 * this.hs]) {
          ray.set(new THREE.Vector3(a.x + side.x * off, Math.max(a.y, b.y) + h, a.z + side.z * off), d); ray.far = L;
          if (ray.intersectObjects(this.cols, false).length) return false;
        }
      }
      // el suelo debe ser continuo a lo largo del tramo (sin vacíos ni saltos mayores que un escalón)
      const n = Math.max(2, Math.ceil(L / 0.4)); let prevY = a.y;
      for (let i = 1; i <= n; i++) {
        const t = i / n, sx = a.x + (b.x - a.x) * t, sz = a.z + (b.z - a.z) * t;
        ray.set(new THREE.Vector3(sx, Math.max(a.y, b.y) + this.step + 0.6 * this.hs, sz), DOWN); ray.far = 4; ray.firstHitOnly = false;
        let gy = null;
        for (const h of ray.intersectObjects(this.cols, false)) {
          if (!h.face) continue;
          if (h.face.normal.clone().transformDirection(h.object.matrixWorld).y < 0.5) continue;
          if (h.point.y > prevY + this.step + 0.05) continue;   // techos y repisas altas
          gy = h.point.y; break;
        }
        ray.firstHitOnly = true;
        if (gy === null || Math.abs(gy - prevY) > this.step + 0.02) return false;
        prevY = gy;
      }
      return true;
    };
    const out = [pts[0]]; let i = 0;
    while (i < pts.length - 1) {
      let j = Math.min(pts.length - 1, i + 14);
      while (j > i + 1 && !free(pts[i], pts[j])) j--;
      out.push(pts[j]); i = j;
    }
    return out;
  }

  randomNear(x, z, r, rng = Math.random) {
    const cand = [];
    const [cx, cz] = this.cellOf(x, z); const R = Math.ceil(r / this.cell);
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dz * dz > R * R) continue;
      const ids = this.cells.get(this.key(cx + dx, cz + dz)); if (!ids) continue;
      for (const id of ids) if (this.nodes[id].wall < 2) cand.push(id);
    }
    if (!cand.length) return null;
    const nd = this.nodes[cand[Math.floor(rng() * cand.length)]];
    return { x: nd.x, y: nd.y, z: nd.z };
  }
}
