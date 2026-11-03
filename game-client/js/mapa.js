// Mapa de Europa estilizado (polígonos en lon/lat) y utilidades de dibujo para el mapa del modo historia
// y para las escenas de contexto de las cinemáticas.
export const BOUNDS = { lon0: -14, lon1: 46, lat0: 34, lat1: 71.5 };
const KX = Math.cos(52 * Math.PI / 180);                        // corrección de la longitud a esa latitud
export const ASPECT = ((BOUNDS.lon1 - BOUNDS.lon0) * KX) / (BOUNDS.lat1 - BOUNDS.lat0);

// Proyección a [0..1]x[0..1]
export function proj(lon, lat) { return [(lon - BOUNDS.lon0) / (BOUNDS.lon1 - BOUNDS.lon0), (BOUNDS.lat1 - lat) / (BOUNDS.lat1 - BOUNDS.lat0)]; }

const CONTINENT = [[-5.6,36],[-6.4,36.8],[-8.9,37],[-8.8,38.7],[-9.5,38.8],[-8.8,41.9],[-9.3,43],[-8,43.8],[-5.5,43.6],[-1.8,43.4],[-1.3,44.6],[-1.2,46],[-2.2,47.2],[-4.5,47.9],[-4.7,48.5],[-3,48.8],[-1.6,48.6],[-1.4,49.7],[-0.2,49.3],[1.2,49.9],[1.6,50.9],[3.2,51.3],[4.2,52],[4.8,53],[7,53.5],[8.5,53.6],[8.7,54.5],[8.1,55.5],[8.2,56.8],[10.3,57.6],[10.5,56.5],[9.9,56],[10.4,55.1],[9.6,54.6],[10.8,54],[12.1,54.2],[14.2,53.9],[16.5,54.5],[18.7,54.5],[19.7,54.4],[21.2,55.2],[21,56.5],[21.8,57.5],[23,57],[24.4,57.3],[24.4,58.4],[23.5,59.2],[26.5,59.6],[28,59.5],[30,60],[28,60.7],[26.8,60.5],[23.5,60],[22.5,60.3],[21.4,61.2],[21.5,62.9],[23.7,64.6],[25.4,65.3],[25.4,65.8],[24,65.8],[22.2,65.6],[21.3,64.5],[18.8,62.8],[17.4,61.6],[17.2,60.7],[18.9,59.8],[18.2,59.2],[16.7,58.2],[16.6,56.8],[14.4,56],[12.9,55.4],[12.8,56.5],[11.9,57.7],[11.2,59],[10.5,59.8],[8.6,58.9],[7,58],[5.5,59],[5,60.5],[5.2,62],[7,63],[10,64.2],[12,66],[14,67.5],[16,68.8],[19,70],[23,70.8],[28,71.2],[31,70.3],[33,69.5],[46,69.5],[46,36],[36,36.6],[30,36.3],[27.4,37],[26.3,39.2],[26.2,40.2],[24,40.8],[23,40.3],[22.8,39.3],[24,38],[23.2,36.5],[21.7,36.8],[21.1,38.3],[20,39.8],[19.5,41.6],[18.5,42.5],[16,43.5],[14.5,45],[13.7,45.6],[12.3,45.4],[12.5,44.2],[14,42.6],[16,41.9],[18.5,40.2],[17,39.9],[16.6,38.5],[15.7,38],[16,39.5],[15.5,40],[14,40.8],[12.5,41.4],[11,42.3],[10.2,43.5],[8.8,44.4],[7.5,43.8],[6,43.1],[4.5,43.4],[3.2,43.1],[3.2,41.9],[1,41.1],[0,39.9],[-0.3,38.8],[-0.8,37.6],[-2.2,36.7],[-4.5,36.7]];
const ISLANDS = [
  [[-5.7,50],[-3,50.4],[1.4,51.2],[1.7,52.8],[0,53.6],[-1.8,55.5],[-2,57.6],[-3.5,58.6],[-5,58.6],[-6,56.5],[-5,55],[-3,54.8],[-3.2,53.4],[-4.6,52.5],[-5.2,51.7],[-4,51.2]],
  [[-10,51.7],[-6,52],[-6,54.5],[-8,55.3],[-10,54]],
  [[-24,64.5],[-14,64.5],[-14,66.4],[-22,66.4]],
  [[12.5,38],[15.6,38.2],[15.1,36.7],[12.5,37.6]],
  [[8.2,41],[9.7,41],[9.5,39.2],[8.4,39]],
  [[8.6,42.6],[9.5,43],[9.4,41.4],[8.7,41.6]],
  [[-14,30],[-14,33],[-5,35.8],[0,35.5],[10,37.2],[11,33.5],[20,32],[25,31.5],[32,31],[35,33],[36,36.6],[46,36],[46,30]]
];
const SEAS = [[[28,41.2],[31,41.1],[35,42],[38,41],[41.5,41.5],[41.5,43],[38,44.5],[37,45.3],[38,47],[35,46.5],[33,46],[31,46.5],[29.7,45.2],[28.7,44],[28,42.5]]];

function path(ctx, poly, W, H) { poly.forEach(([lo, la], i) => { const [x, y] = proj(lo, la); i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H); }); ctx.closePath(); }

// Fondo del mapa: pergamino oscuro, mar con retícula, tierra con relieve de trazo.
export function drawBase(ctx, W, H, { tint = '#1b2229', land = '#4b5a3f', landEdge = '#c9b98a', grid = true } = {}) {
  ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H);
  if (grid) {
    ctx.strokeStyle = 'rgba(210,190,140,.10)'; ctx.lineWidth = 1;
    for (let lo = -10; lo <= 46; lo += 10) { const [x] = proj(lo, 50); ctx.beginPath(); ctx.moveTo(x * W, 0); ctx.lineTo(x * W, H); ctx.stroke(); }
    for (let la = 35; la <= 70; la += 5) { const [, y] = proj(0, la); ctx.beginPath(); ctx.moveTo(0, y * H); ctx.lineTo(W, y * H); ctx.stroke(); }
  }
  ctx.fillStyle = land; ctx.strokeStyle = landEdge; ctx.lineWidth = Math.max(1, W / 700);
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = W / 60;
  for (const p of [CONTINENT, ...ISLANDS]) { ctx.beginPath(); path(ctx, p, W, H); ctx.fill(); }
  ctx.shadowBlur = 0;
  ctx.fillStyle = tint;
  for (const p of SEAS) { ctx.beginPath(); path(ctx, p, W, H); ctx.fill(); }
  ctx.globalAlpha = 0.65;
  for (const p of [CONTINENT, ...ISLANDS, ...SEAS]) { ctx.beginPath(); path(ctx, p, W, H); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

const P = (lo, la, W, H) => { const [x, y] = proj(lo, la); return [x * W, y * H]; };
export const lonlat = P;

// Elementos animados de contexto. o.t en [0,1] = progreso global de la escena.
//   zones:   [{ poly:[[lon,lat]...], color, from, to }]     zona que aparece (coloreada)
//   arrows:  [{ pts:[[lon,lat]...], color, from, to, dash }] flecha que avanza por la ruta
//   marks:   [{ at:[lon,lat], text, color, from }]            chincheta con texto
export function drawLayers(ctx, W, H, o) {
  const t = o.t, ease = v => v * v * (3 - 2 * v), seg = (a, b) => Math.min(1, Math.max(0, (t - a) / Math.max(1e-4, b - a)));
  for (const z of o.zones || []) {
    const k = ease(seg(z.from, z.to)); if (k <= 0) continue;
    ctx.globalAlpha = 0.55 * k; ctx.fillStyle = z.color; ctx.beginPath(); path(ctx, z.poly, W, H); ctx.fill();
    ctx.globalAlpha = k; ctx.strokeStyle = z.color; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const a of o.arrows || []) {
    const k = ease(seg(a.from, a.to)); if (k <= 0) continue;
    const pts = a.pts.map(([lo, la]) => P(lo, la, W, H)); let total = 0; const L = [0];
    for (let i = 1; i < pts.length; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(total); }
    const target = total * k; ctx.strokeStyle = a.color; ctx.fillStyle = a.color; ctx.lineWidth = Math.max(3, W / 170); ctx.lineCap = 'round';
    ctx.setLineDash(a.dash ? [W / 90, W / 120] : []);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); let end = pts[0], dir = [1, 0];
    for (let i = 1; i < pts.length; i++) {
      if (target >= L[i]) { ctx.lineTo(pts[i][0], pts[i][1]); end = pts[i]; dir = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]; }
      else { const f = (target - L[i - 1]) / (L[i] - L[i - 1]); end = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; dir = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]; ctx.lineTo(end[0], end[1]); break; }
    }
    ctx.stroke(); ctx.setLineDash([]);
    const d = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / d, uy = dir[1] / d, s = Math.max(10, W / 55);
    ctx.beginPath(); ctx.moveTo(end[0] + ux * s, end[1] + uy * s); ctx.lineTo(end[0] - ux * s * 0.6 - uy * s * 0.7, end[1] - uy * s * 0.6 + ux * s * 0.7); ctx.lineTo(end[0] - ux * s * 0.6 + uy * s * 0.7, end[1] - uy * s * 0.6 - ux * s * 0.7); ctx.closePath(); ctx.fill();
  }
  const fs = Math.max(13, W / 62);
  for (const m of o.marks || []) {
    const k = ease(seg(m.from, m.from + 0.08)); if (k <= 0) continue;
    const [x, y] = P(m.at[0], m.at[1], W, H), r = Math.max(5, W / 130) * (1 + 0.25 * Math.sin(t * 40));
    ctx.globalAlpha = k; ctx.fillStyle = m.color || '#e04a3a'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = m.color || '#e04a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 2.2 * (1 + (t * 6 % 1) * 0.5), 0, 6.283); ctx.globalAlpha = k * (1 - (t * 6 % 1)); ctx.stroke();
    ctx.globalAlpha = k; ctx.font = '700 ' + fs + 'px Oswald, Rajdhani, sans-serif'; ctx.textBaseline = 'middle';
    const tx = x + r * 3, w = ctx.measureText(m.text).width;
    ctx.fillStyle = 'rgba(8,10,12,.78)'; ctx.fillRect(tx - 6, y - fs * 0.85, w + 12, fs * 1.7);
    ctx.fillStyle = '#f2e6c4'; ctx.fillText(m.text, tx, y);
  }
  ctx.globalAlpha = 1;
}
